import {execFileSync} from "node:child_process";
import fs from "node:fs";
import {createRequire} from "node:module";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {parseArgs} from "node:util";
import {listFirebaseFunctionTargets} from "./list_firebase_function_targets.mjs";

const require = createRequire(import.meta.url);
const INDEX = "functions/src/index.ts";
const SHA = /^[0-9a-f]{40}$/;

function git(root, args, options = {}) {
  return execFileSync("git", ["-C", root, ...args], {
    encoding: "utf8", maxBuffer: 128 * 1024 * 1024, ...options,
  });
}

// Read committed objects, never the potentially dirty verification checkout.
function sourceTree(root, sha) {
  const entries = git(root, ["ls-tree", "-rz", sha, "--", "functions/src"])
    .split("\0").filter(Boolean).map((entry) => {
      const [header, name] = entry.split("\t");
      const [mode, type, object] = header.split(" ");
      if (mode !== "100644" && mode !== "100755" || type !== "blob") {
        throw new Error(`Unsupported source entry: ${name}`);
      }
      return {name, object};
    });
  const bytes = git(root, ["cat-file", "--batch"], {
    encoding: null, input: entries.map(({object}) => object).join("\n") + "\n",
  });
  let offset = 0;
  const tree = new Map();
  for (const {name, object} of entries) {
    const end = bytes.indexOf(10, offset);
    const [actual, type, sizeText] = bytes.subarray(offset, end).toString().split(" ");
    const size = Number(sizeText);
    if (actual !== object || type !== "blob" || !Number.isSafeInteger(size)) {
      throw new Error("Git returned an invalid source object.");
    }
    tree.set(name, bytes.subarray(end + 1, end + 1 + size).toString("utf8"));
    offset = end + 1 + size + 1;
  }
  return tree;
}

function parse(ts, tree, name) {
  const text = tree.get(name);
  if (text === undefined) throw new Error(`Missing source module: ${name}`);
  const source = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true);
  if (source.parseDiagnostics.length) throw new Error(`Cannot parse module: ${name}`);
  return source;
}

function resolveModule(tree, importer, specifier) {
  if (!specifier.startsWith(".")) return null; // Node built-ins or npm packages.
  const stem = path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier));
  if (!stem.startsWith("functions/src/")) {
    throw new Error(`Module escapes Functions source: ${specifier}`);
  }
  const sourceStem = stem.replace(/\.js$/, "");
  const candidates = [stem, sourceStem + ".ts", sourceStem + "/index.ts"];
  const found = candidates.find((name) => tree.has(name));
  if (!found || !found.endsWith(".ts")) {
    throw new Error(`Unresolved or non-TypeScript module: ${specifier} in ${importer}`);
  }
  return found;
}

function indexExports(ts, tree) {
  const source = parse(ts, tree, INDEX);
  const exports = new Map();
  const bootstrap = [];
  const printer = ts.createPrinter({removeComments: true});
  for (const statement of source.statements) {
    if (ts.isExportDeclaration(statement)) {
      if (statement.isTypeOnly) continue;
      if (!statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier) ||
          !statement.exportClause || !ts.isNamedExports(statement.exportClause)) {
        throw new Error("Unsupported Functions entrypoint export.");
      }
      const module = resolveModule(tree, INDEX, statement.moduleSpecifier.text);
      if (!module) throw new Error("Entrypoint must export local modules.");
      for (const element of statement.exportClause.elements) {
        if (element.isTypeOnly) continue;
        const name = "functions:" + element.name.text;
        if (exports.has(name)) throw new Error(`Duplicate entrypoint export: ${name}`);
        exports.set(name, {module, symbol: (element.propertyName ?? element.name).text});
      }
    } else {
      bootstrap.push(printer.printNode(ts.EmitHint.Unspecified, statement, source));
    }
  }
  return {exports, bootstrap: bootstrap.join("\n"), source};
}

// A computed import or require cannot be traced, so its module is marked
// dynamic: every Function that reaches it is treated as affected.
function dependencies(ts, tree, source) {
  const result = new Set();
  const add = (literal) => {
    if (!literal || !ts.isStringLiteralLike(literal)) {
      result.dynamic = true;
      return;
    }
    const resolved = resolveModule(tree, source.fileName, literal.text);
    if (resolved) result.add(resolved);
  };
  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      // Whole-declaration type imports/exports are always erased by TypeScript.
      // Keep inline type specifiers conservative: some compiler configurations
      // preserve their module evaluation even with no value bindings.
      const typeOnly = ts.isImportDeclaration(node) ?
        node.importClause?.isTypeOnly : node.isTypeOnly;
      if (node.moduleSpecifier && !typeOnly) add(node.moduleSpecifier);
    } else if (ts.isImportEqualsDeclaration(node) &&
        ts.isExternalModuleReference(node.moduleReference) && !node.isTypeOnly) {
      add(node.moduleReference.expression);
    } else if (ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
         ts.isIdentifier(node.expression) && node.expression.text === "require")) {
      add(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return result;
}

function isNonRuntimeFile(name) {
  // These CLI helpers are outside compiled Functions source: test runners,
  // operator scripts and backfills. The invoker helper is packaged for
  // post-deploy IAM checks, not loaded by the runtime. The prebuild cleaner is
  // deliberately absent because it runs inside the build.
  if (name === "functions/scripts/run-local-emulators.cjs" ||
      name === "functions/scripts/run-local-emulators.test.cjs" ||
      name === "functions/scripts/run-tests.cjs" ||
      name === "functions/scripts/run-tests.test.cjs" ||
      name === "functions/scripts/set-callable-invokers-public.cjs" ||
      /^functions\/scripts\/(?:operations\/|backfill-[a-z0-9-]+\.cjs$)/.test(name)) return true;
  return /\.(?:md|test\.ts|spec\.ts)$/.test(name) ||
    /^functions\/(?:test|tests|__tests__)\//.test(name) ||
    /\/(?:__tests__|__mocks__)\//.test(name);
}

// firebase.json also configures Hosting, Flutter and emulators; only the
// backend sections change what a backend deploy does.
function backendConfigChanged(root, baseSha, headSha) {
  const sections = (sha) => {
    try {
      const config = JSON.parse(git(root, ["show", `${sha}:firebase.json`], {stdio: ["ignore", "pipe", "ignore"]}));
      return JSON.stringify(["functions", "firestore", "storage"].map((key) => config[key] ?? null));
    } catch {
      return undefined; // Missing or unreadable config is treated as changed.
    }
  };
  const before = sections(baseSha);
  const after = sections(headSha);
  return before === undefined || after === undefined || before !== after;
}

/**
 * Narrows an already verified package's eligible targets. This never authorizes
 * new targets or edits historical package bytes. Uncertain analysis retains the
 * full authorized set. Queue/cursor verification owns the deployed base.
 */
export function affectedFunctionTargets({
  sourceRoot, sourceSha, baseSha, authorizedTargets, fullSnapshot = false,
}) {
  if (!SHA.test(sourceSha) || !SHA.test(baseSha)) throw new Error("Invalid Git source/base SHA.");
  if (!authorizedTargets.length || authorizedTargets.some((name) =>
    !/^functions:[A-Za-z][A-Za-z0-9_-]*$/.test(name))) {
    throw new Error("Affected selection requires exact authorized Function targets.");
  }
  git(sourceRoot, ["cat-file", "-e", sourceSha + "^{commit}"]);
  git(sourceRoot, ["merge-base", "--is-ancestor", baseSha, sourceSha]);
  const all = (reason) => ({mode: "full", reason, targets: [...authorizedTargets]});
  if (fullSnapshot || sourceSha === baseSha) return all("Cumulative snapshot or bootstrap");
  const changed = new Set(git(sourceRoot, [
    "diff", "--name-only", "--no-renames", "-z", baseSha, sourceSha,
  ]).split("\0").filter(Boolean));
  if (changed.has(".firebaserc") ||
    changed.has("firebase.json") && backendConfigChanged(sourceRoot, baseSha, sourceSha) ||
    [...changed].some((name) =>
      name.startsWith("functions/") && !name.startsWith("functions/src/") &&
      !isNonRuntimeFile(name))) {
    return all("Functions runtime, dependency, build, or deployment configuration changed");
  }
  try {
    // Loaded only by the promotion selector; ordinary package verification has
    // no npm dependency. The control plane installs its pinned TypeScript.
    const ts = require("typescript");
    const configText = git(sourceRoot, ["show", sourceSha + ":functions/tsconfig.json"]);
    const config = ts.parseConfigFileTextToJson("tsconfig.json", configText);
    const options = config.config?.compilerOptions ?? {};
    if (config.error || config.config?.extends ||
        ["paths", "baseUrl", "rootDirs", "moduleSuffixes", "allowJs"].some((key) => options[key]) ||
        options.rootDir && options.rootDir !== "src") {
      return all("Compiler module resolution requires a full deployment");
    }
    const before = sourceTree(sourceRoot, baseSha);
    const after = sourceTree(sourceRoot, sourceSha);
    const oldIndex = indexExports(ts, before);
    const newIndex = indexExports(ts, after);
    if (oldIndex.bootstrap !== newIndex.bootstrap) return all("Global Functions initialization changed");
    if (authorizedTargets.some((name) => !newIndex.exports.has(name))) {
      return all("Authorized export cannot be mapped to its source module");
    }
    const cache = new Map();
    const closure = (root) => {
      const visited = new Set();
      let dynamic = false;
      const walk = (name) => {
        if (visited.has(name)) return;
        visited.add(name);
        if (!cache.has(name)) cache.set(name, dependencies(ts, after, parse(ts, after, name)));
        dynamic ||= cache.get(name).dynamic === true;
        for (const dependency of cache.get(name)) walk(dependency);
      };
      walk(root);
      return {modules: visited, dynamic};
    };
    // Imports used by entrypoint initialization affect every function.
    // Exports are evaluated separately below.
    const bootstrapSource = ts.createSourceFile(INDEX, newIndex.bootstrap, ts.ScriptTarget.Latest, true);
    const bootstrapDependencies = dependencies(ts, after, bootstrapSource);
    if (bootstrapDependencies.dynamic) return all("Global initialization loads modules dynamically");
    for (const module of bootstrapDependencies) {
      const reachable = closure(module);
      if (reachable.dynamic) return all("Global initialization loads modules dynamically");
      if ([...reachable.modules].some((name) => changed.has(name))) {
        return all("A global initialization dependency changed");
      }
    }
    if ([...changed].some((name) =>
      name.startsWith("functions/src/") && !name.endsWith(".ts") && !isNonRuntimeFile(name))) {
      return all("Runtime asset changed");
    }
    // Untraceable loads resolve against Functions source and the Operations
    // files the build copies into lib (functions/scripts/
    // copy-operations-runtime.cjs), so only those inputs can change what they load.
    const dynamicInputsChanged = [...changed].some((name) =>
      name.startsWith("functions/src/") && !isNonRuntimeFile(name) ||
      name.startsWith("operations/") || name.startsWith("contracts/"));
    const targets = authorizedTargets.filter((target) => {
      const current = newIndex.exports.get(target);
      const previous = oldIndex.exports.get(target);
      const reachable = closure(current.module);
      return !previous || previous.module !== current.module || previous.symbol !== current.symbol ||
        reachable.dynamic && dynamicInputsChanged || [...reachable.modules].some((name) => changed.has(name));
    });
    return {
      mode: targets.length ? "affected" : "no-op",
      reason: "Entrypoint exports and transitive module dependencies",
      targets,
    };
  } catch (error) {
    return all(`Conservative fallback: ${error.message}`);
  }
}


// Dependency selection proves scope, not the absence of sensitive behavior.
// Runtime changes require an explicit review of the exact source. The caller
// may replace this protected default only with live GitHub review evidence.
export function productionPromotionEnvironment({
  sourceRoot, sourceSha, baseSha, stages, fullSnapshot = false, noOp = false,
}) {
  if (!SHA.test(sourceSha) || !SHA.test(baseSha)) throw new Error("Invalid Git source/base SHA.");
  git(sourceRoot, ["merge-base", "--is-ancestor", baseSha, sourceSha]);
  if (fullSnapshot || sourceSha === baseSha ||
      stages.length !== 1 || stages[0] !== "functions") {
    return {environment: "prod", reason: "Snapshots and non-Functions stages require production review"};
  }
  if (noOp) return {environment: "prod-backend", reason: "Verified Functions no-op"};
  return {
    environment: "prod", preMergeReviewEligible: true,
    reason: "Runtime changes require an explicit review of the exact source",
  };
}

const STAGE_FILES = [
  ["firestore:indexes", "firestore.indexes.json"],
  ["firestore:rules", "firestore.rules"],
  ["storage", "storage.rules"],
];

/**
 * Plans one environment's next backend deploy, from the commit it last
 * received (its `deployed/<env>` tag) to `headSha`: affected Functions plus
 * each index or rules stage whose file changed. With no recorded commit, or
 * when Firebase deploy configuration changed, every stage deploys.
 */
export function backendDeployTargets({
  sourceRoot, baseSha, headSha, eligibleFunctionTargets, fullDeploy = false,
}) {
  if (!SHA.test(headSha) || baseSha !== undefined && !SHA.test(baseSha)) {
    throw new Error("Invalid Git base/head SHA.");
  }
  const full = (reason) => ({
    mode: "full", reason,
    targets: [STAGE_FILES[0][0], ...eligibleFunctionTargets, ...STAGE_FILES.slice(1).map(([target]) => target)],
  });
  if (fullDeploy) return full("Full deploy requested");
  if (baseSha === undefined) return full("No recorded deployment for this environment");
  if (baseSha === headSha) return {mode: "no-op", reason: "Already deployed", targets: []};
  try {
    git(sourceRoot, ["merge-base", "--is-ancestor", baseSha, headSha], {stdio: "ignore"});
  } catch {
    throw new Error("The recorded deployment is not an ancestor of this commit; review it, then deploy with full=true.");
  }
  const changed = new Set(git(sourceRoot, [
    "diff", "--name-only", "--no-renames", "-z", baseSha, headSha,
  ]).split("\0").filter(Boolean));
  if (changed.has(".firebaserc") ||
      changed.has("firebase.json") && backendConfigChanged(sourceRoot, baseSha, headSha)) {
    return full("Firebase backend deploy configuration changed");
  }
  const functions = affectedFunctionTargets({
    sourceRoot, sourceSha: headSha, baseSha, authorizedTargets: eligibleFunctionTargets,
  });
  const stages = STAGE_FILES.filter(([, file]) => changed.has(file)).map(([target]) => target);
  const targets = [
    ...stages.filter((target) => target === "firestore:indexes"),
    ...functions.targets,
    ...stages.filter((target) => target !== "firestore:indexes"),
  ];
  return {
    mode: targets.length ? "changed" : "no-op",
    reason: `Functions: ${functions.mode} (${functions.reason})`,
    targets,
  };
}

// --environment reads the base from that environment's deployed/<environment>
// tag; in GitHub Actions the plan is also written to the step outputs.
function main() {
  const {values} = parseArgs({options: {
    base: {type: "string"}, head: {type: "string"}, environment: {type: "string"},
    full: {type: "boolean", default: false},
  }});
  const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  let baseSha = values.base || undefined;
  if (values.environment !== undefined) {
    if (!/^[a-z][a-z0-9-]*$/.test(values.environment)) throw new Error("Invalid environment name.");
    try {
      baseSha = git(sourceRoot, ["rev-parse", "-q", "--verify",
        `refs/tags/deployed/${values.environment}^{commit}`], {stdio: ["ignore", "pipe", "ignore"]}).trim();
    } catch {
      baseSha = undefined;
    }
  }
  const plan = backendDeployTargets({
    sourceRoot, baseSha, headSha: values.head,
    eligibleFunctionTargets: listFirebaseFunctionTargets(sourceRoot), fullDeploy: values.full,
  });
  process.stderr.write(`${plan.mode}: ${plan.targets.length} targets from ${baseSha ?? "no recorded deploy"} ` +
    `to ${values.head} (${plan.reason})\n`);
  process.stdout.write(`${JSON.stringify(plan)}\n`);
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `mode=${plan.mode}\ntargets=${plan.targets.join(",")}\n`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
