// Splits the one Functions package into the Firebase codebases listed in
// deploy-codebases.json, so the Firebase CLI can skip every codebase whose
// code, parameters and secrets are unchanged (it hashes each one) instead of
// rebuilding all Functions on every deploy.
//
// Each codebase directory holds the process setup from src/index.ts (global
// options, Admin SDK initialization), the compiled files its Functions
// actually load (traced from the compiled entry by esbuild, keeping lib/ paths
// so module-relative reads work), the Operations runtime when one of those
// files reads files beside itself, the Functions manifest and lockfile cut
// down to the packages that code imports, and the materialized .env lines it
// reads. So a dependency bump or a parameter change redeploys only the
// codebases that use it. It also writes a Firebase config whose functions
// section lists these codebases. Build Functions and materialize parameters
// first. Docs: docs/release_operations.md, "Deploy backend".
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const {isBuiltin} = require("node:module");
const {pathToFileURL} = require("node:url");
const {parseArgs} = require("node:util");
const esbuild = require("esbuild");
const ts = require("typescript");

const functionsRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(functionsRoot, "..");
const codebaseNamePattern = /^[a-z0-9_-]{1,62}$/u;
// Copied into lib by functions/scripts/copy-operations-runtime.cjs and read
// through paths relative to the reading module, so tracing cannot see them.
const runtimeTrees = ["lib/operations", "lib/contracts"];

// Functions deliberately never deployed (tool/firebase/list_firebase_function_targets.mjs).
async function dormantFunctionNames() {
  const {dormantFirebaseFunctionTargets} = await import(pathToFileURL(
    path.join(repoRoot, "tool/firebase/list_firebase_function_targets.mjs")).href);
  return new Set(dormantFirebaseFunctionTargets.map((target) => target.slice("functions:".length)));
}

/** Exported Function names per top-level source area, from src/index.ts. */
function functionExportsByArea(indexSource, dormant) {
  const source = ts.createSourceFile("index.ts", indexSource, ts.ScriptTarget.Latest, true);
  const areas = new Map();
  for (const statement of source.statements) {
    if (!ts.isExportDeclaration(statement) || statement.isTypeOnly) continue;
    if (!statement.moduleSpecifier || !statement.exportClause ||
        !ts.isNamedExports(statement.exportClause)) {
      throw new Error("src/index.ts may only re-export named Functions from modules.");
    }
    const module = statement.moduleSpecifier.text;
    if (!module.startsWith("./")) throw new Error(`Unexpected export source: ${module}`);
    const area = module.slice(2).split("/")[0];
    const names = statement.exportClause.elements.filter((element) => !element.isTypeOnly)
      .map((element) => ({name: element.name.text, symbol: (element.propertyName ?? element.name).text}))
      .filter(({name}) => !dormant.has(name));
    if (!names.length) continue;
    if (!areas.has(area)) areas.set(area, []);
    areas.get(area).push({module: module.slice(2), names});
  }
  return areas;
}

/** Assigns every area to exactly one configured codebase. */
function assignCodebases(areas, config) {
  const owner = new Map();
  for (const [codebase, members] of Object.entries(config.codebases ?? {})) {
    if (!codebaseNamePattern.test(codebase)) throw new Error(`Invalid codebase name: ${codebase}`);
    for (const area of members) {
      if (owner.has(area)) throw new Error(`Area ${area} is listed in two codebases.`);
      owner.set(area, codebase);
    }
  }
  const missing = [...areas.keys()].filter((area) => !owner.has(area));
  if (missing.length) {
    throw new Error(`Add these Functions areas to functions/deploy-codebases.json: ${missing.join(", ")}`);
  }
  const stale = [...owner.keys()].filter((area) => !areas.has(area));
  if (stale.length) {
    throw new Error(`These areas export no deployable Functions; remove them from functions/deploy-codebases.json: ${stale.join(", ")}`);
  }
  const codebases = new Map();
  for (const [area, modules] of areas) {
    const codebase = owner.get(area);
    if (!codebases.has(codebase)) codebases.set(codebase, []);
    codebases.get(codebase).push(...modules);
  }
  return new Map([...codebases].sort(([a], [b]) => a.localeCompare(b)));
}

/**
 * The statements of src/index.ts that are not exports, compiled to CommonJS:
 * the setup every Function needs before it is defined. src/index.ts stays the
 * one place global options are set (tool/firebase/function_binding_intent.mjs
 * reads them there).
 */
function setupSource(indexSource) {
  const source = ts.createSourceFile("index.ts", indexSource, ts.ScriptTarget.Latest, true);
  const setup = source.statements.filter((statement) => !ts.isExportDeclaration(statement));
  for (const statement of setup) {
    if (ts.isImportDeclaration(statement) && statement.moduleSpecifier.text.startsWith(".")) {
      throw new Error("src/index.ts setup may import packages only, not Functions source.");
    }
  }
  const text = setup.map((statement) => statement.getFullText(source)).join("");
  return ts.transpileModule(text, {compilerOptions: {module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022, esModuleInterop: true}}).outputText;
}

/** npm package names a bundle's inputs import, from an esbuild metafile. */
function importedPackages(metafile) {
  const packages = new Set();
  for (const input of Object.values(metafile.inputs)) {
    for (const {path: specifier, external} of input.imports) {
      if (!external || isBuiltin(specifier)) continue;
      const parts = specifier.split("/");
      packages.add(specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]);
    }
  }
  return packages;
}

/**
 * The Functions manifest and lockfile cut down to the given packages and what
 * they depend on, so a dependency bump changes (and redeploys) only the
 * codebases that load the bumped package. npm ci accepts the pair as is.
 */
function prunedManifestAndLock(manifest, lock, packages) {
  const dependencies = {};
  for (const name of [...packages].sort()) {
    if (!manifest.dependencies?.[name]) {
      throw new Error(`Deployed code imports ${name}; add it to dependencies in functions/package.json.`);
    }
    dependencies[name] = manifest.dependencies[name];
  }
  const all = lock.packages;
  // Node resolution: the nearest node_modules/<name> up from the requiring package.
  const resolve = (from, name) => {
    for (let base = from; ; base = base.slice(0, Math.max(base.lastIndexOf("/node_modules/"), 0))) {
      const key = `${base ? `${base}/` : ""}node_modules/${name}`;
      if (all[key]) return key;
      if (!base) return null;
    }
  };
  const kept = new Set();
  const visit = (key) => {
    if (!key || kept.has(key)) return;
    kept.add(key);
    const entry = all[key];
    for (const name of Object.keys({...entry.dependencies, ...entry.optionalDependencies,
      ...entry.peerDependencies})) visit(resolve(key, name));
  };
  for (const name of Object.keys(dependencies)) visit(resolve("", name));
  const {devDependencies: _dev, ...root} = all[""];
  const {devDependencies: _devDependencies, ...rest} = manifest;
  return {
    manifest: {...rest, main: "index.js", scripts: {}, dependencies},
    lock: {...lock, packages: Object.fromEntries([["", {...root, dependencies}],
      ...Object.keys(all).filter((key) => kept.has(key)).map((key) => [key, all[key]])])},
  };
}

/**
 * The dotenv lines whose key the codebase's code names, so changing a
 * parameter redeploys only the codebases that read it. Parameters and
 * process.env reads name their key literally; a computed read would hide one.
 */
function envForCode(envText, code) {
  if (/process\.env\[/u.test(code)) {
    throw new Error("Deployed code reads process.env[...] by a computed name; name the key literally.");
  }
  return envText.split("\n").filter((line) => {
    const key = /^([A-Za-z_][A-Za-z0-9_]*)=/u.exec(line)?.[1];
    return key && code.includes(key);
  }).map((line) => `${line}\n`).join("");
}

// Each export loads its module on first read, as lib/index.js does: Cloud Run
// reads only its FUNCTION_TARGET export, so a cold instance loads one Function.
function exportLines(modules) {
  return modules.flatMap(({module, names}) => names.map(({name, symbol}) =>
    `Object.defineProperty(exports, ${JSON.stringify(name)}, {enumerable: true, ` +
    `get: () => require(${JSON.stringify(`./lib/${module}.js`)}).${symbol}});`));
}

function entrySource(modules) {
  return `${["\"use strict\";", "// Generated by functions/scripts/build-deploy-codebases.cjs.",
    "require(\"./setup.js\");", ...exportLines(modules)].join("\n")}\n`;
}

async function buildFunctionCodebases({
  functionsDir = functionsRoot,
  outDir = path.join(repoRoot, "build/functions-codebases"),
  configPath = path.join(functionsRoot, "deploy-codebases.json"),
  firebaseConfigPath = path.join(repoRoot, "firebase.json"),
  firebaseConfigOut = path.join(repoRoot, "firebase.deploy.json"),
} = {}) {
  if (!fs.existsSync(path.join(functionsDir, "lib/index.js"))) {
    throw new Error("Build Functions first: lib/index.js is missing.");
  }
  const indexSource = fs.readFileSync(path.join(functionsDir, "src/index.ts"), "utf8");
  const areas = functionExportsByArea(indexSource, await dormantFunctionNames());
  const setup = setupSource(indexSource);
  const codebases = assignCodebases(areas, JSON.parse(fs.readFileSync(configPath, "utf8")));
  const manifest = JSON.parse(fs.readFileSync(path.join(functionsDir, "package.json"), "utf8"));
  const lock = JSON.parse(fs.readFileSync(path.join(functionsDir, "package-lock.json"), "utf8"));
  const trace = async (entryPoints, format) => (await esbuild.build({entryPoints, bundle: true,
    write: false, outdir: "trace", metafile: true, platform: "node", format, packages: "external",
    logLevel: "silent", absWorkingDir: functionsDir})).metafile;
  let runtime;
  let runtimePackages;
  const envFiles = fs.readdirSync(functionsDir).filter((name) => /^\.env(\.|$)/u.test(name));

  fs.rmSync(outDir, {recursive: true, force: true});
  const summary = [];
  for (const [codebase, modules] of codebases) {
    const dir = path.join(outDir, codebase);
    const entry = entrySource(modules);
    // Trace the Function modules from a temporary entry beside lib so imports
    // resolve as deployed. The setup imports packages only.
    const tracer = path.join(functionsDir, `.codebase-entry-${codebase}.cjs`);
    fs.writeFileSync(tracer, `${setup}${exportLines(modules).join("\n")}\n`);
    let inputs;
    let packages;
    try {
      const metafile = await trace([tracer], "cjs");
      inputs = Object.keys(metafile.inputs).filter((file) => file.startsWith("lib/")).sort();
      packages = importedPackages(metafile);
    } finally {
      fs.rmSync(tracer, {force: true});
    }
    let readsBeside = false;
    const code = [setup];
    for (const file of inputs) {
      fs.mkdirSync(path.dirname(path.join(dir, file)), {recursive: true});
      fs.copyFileSync(path.join(functionsDir, file), path.join(dir, file));
      code.push(fs.readFileSync(path.join(functionsDir, file), "utf8"));
      readsBeside ||= code.at(-1).includes("__dirname");
    }
    if (readsBeside) {
      const trees = runtimeTrees.filter((tree) => fs.existsSync(path.join(functionsDir, tree)));
      for (const tree of trees) {
        fs.cpSync(path.join(functionsDir, tree), path.join(dir, tree), {recursive: true});
      }
      runtime ??= trees.flatMap((tree) => fs.readdirSync(path.join(functionsDir, tree), {recursive: true})
        .filter((file) => /\.(c|m)?js$/u.test(file) && !/\.test\./u.test(file))
        .map((file) => path.join(tree, file)));
      runtimePackages ??= importedPackages(await trace(runtime, "esm"));
      for (const name of runtimePackages) packages.add(name);
      for (const file of runtime) code.push(fs.readFileSync(path.join(functionsDir, file), "utf8"));
    }
    fs.writeFileSync(path.join(dir, "setup.js"), setup);
    fs.writeFileSync(path.join(dir, "index.js"), entry);
    const pruned = prunedManifestAndLock(manifest, lock, packages);
    fs.writeFileSync(path.join(dir, "package.json"), `${JSON.stringify(pruned.manifest, null, 2)}\n`);
    fs.writeFileSync(path.join(dir, "package-lock.json"), `${JSON.stringify(pruned.lock, null, 2)}\n`);
    for (const name of envFiles) {
      fs.writeFileSync(path.join(dir, name),
        envForCode(fs.readFileSync(path.join(functionsDir, name), "utf8"), code.join("\n")));
    }
    // The CLI loads each codebase locally to discover its Functions; the
    // ignore list keeps node_modules out of the upload.
    fs.symlinkSync(path.join(functionsDir, "node_modules"), path.join(dir, "node_modules"), "dir");
    const count = modules.reduce((total, {names}) => total + names.length, 0);
    summary.push({codebase, functions: count, files: inputs.length, runtime: readsBeside,
      packages: Object.keys(pruned.manifest.dependencies)});
  }

  const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf8"));
  const {source: _source, codebase: _codebase, predeploy: _predeploy, ...shared} = firebaseConfig.functions;
  const relativeOut = path.relative(path.dirname(firebaseConfigOut), outDir);
  firebaseConfig.functions = [...codebases.keys()].map((codebase) =>
    ({...shared, source: path.posix.join(relativeOut.split(path.sep).join("/"), codebase), codebase}));
  fs.writeFileSync(firebaseConfigOut, `${JSON.stringify(firebaseConfig, null, 2)}\n`);
  return summary;
}

module.exports = {assignCodebases, buildFunctionCodebases, entrySource, envForCode,
  functionExportsByArea, prunedManifestAndLock, setupSource};

async function main() {
  const {values} = parseArgs({options: {
    "functions-dir": {type: "string"}, out: {type: "string"},
    "firebase-config": {type: "string"}, "config-out": {type: "string"},
  }});
  const resolve = (value) => value && path.resolve(value);
  const summary = await buildFunctionCodebases({
    ...(values["functions-dir"] && {functionsDir: resolve(values["functions-dir"])}),
    ...(values.out && {outDir: resolve(values.out)}),
    ...(values["firebase-config"] && {firebaseConfigPath: resolve(values["firebase-config"])}),
    ...(values["config-out"] && {firebaseConfigOut: resolve(values["config-out"])}),
  });
  for (const {codebase, functions, files, runtime, packages} of summary) {
    process.stdout.write(`${codebase}: ${functions} Functions, ${files} files${runtime ? ", Operations runtime" : ""}; ${packages.join(", ")}\n`);
  }
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
