#!/usr/bin/env node
import {execFileSync} from "node:child_process";
import {createRequire} from "node:module";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {functionsCatalogModule} from "../admin/generate_admin_action_catalog.mjs";

const require = createRequire(new URL("../../functions/package.json", import.meta.url));
const ts = require("typescript");
const SOURCE_ROOT = "functions/src/";
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts"];
// Built from contracts by the Functions build, so no index or commit holds it.
const BUILT_MODULES = new Set([functionsCatalogModule]);

export class FunctionsSourceClosureError extends Error {}

function git(repoRoot, args, options = {}) {
  return execFileSync("git", ["-C", repoRoot, ...args], {
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    ...options,
  });
}

export function readIndexedFunctionsSource(repoRoot) {
  const entries = git(repoRoot, ["ls-files", "--stage", "-z", "--", "functions/src"])
    .split("\0").filter(Boolean).map((entry) => {
      const [header, name] = entry.split("\t");
      const [mode, object, stage] = header.split(" ");
      if (stage !== "0") throw new FunctionsSourceClosureError(`Unmerged index entry: ${name}`);
      if (mode !== "100644" && mode !== "100755") {
        throw new FunctionsSourceClosureError(`Unsupported Functions source entry: ${name}`);
      }
      return {name, object};
    });
  const bytes = git(repoRoot, ["cat-file", "--batch"], {
    encoding: null,
    input: entries.map(({object}) => object).join("\n") + "\n",
  });
  let offset = 0;
  const tree = new Map();
  for (const {name, object} of entries) {
    const headerEnd = bytes.indexOf(10, offset);
    const [actual, type, sizeText] = bytes.subarray(offset, headerEnd).toString().split(" ");
    const size = Number(sizeText);
    if (actual !== object || type !== "blob" || !Number.isSafeInteger(size)) {
      throw new FunctionsSourceClosureError(`Invalid indexed source object: ${name}`);
    }
    if (SOURCE_EXTENSIONS.some((extension) => name.endsWith(extension))) {
      tree.set(name, bytes.subarray(headerEnd + 1, headerEnd + 1 + size).toString("utf8"));
    }
    offset = headerEnd + 1 + size + 1;
  }
  return tree;
}

function importedSpecifiers(source) {
  const specifiers = [];
  const add = (literal) => {
    if (literal && ts.isStringLiteralLike(literal)) specifiers.push(literal.text);
  };
  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      add(node.moduleSpecifier);
    } else if (ts.isImportEqualsDeclaration(node) &&
        ts.isExternalModuleReference(node.moduleReference)) {
      add(node.moduleReference.expression);
    } else if (ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
         ts.isIdentifier(node.expression) && node.expression.text === "require")) {
      add(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return specifiers;
}

function candidates(importer, specifier) {
  const stem = path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier));
  if (!stem.startsWith(SOURCE_ROOT)) return {escaped: true, paths: []};
  const extension = path.posix.extname(stem);
  const withoutRuntimeExtension = [".js", ".jsx", ".mjs", ".cjs"].includes(extension) ?
    stem.slice(0, -extension.length) : stem;
  const paths = new Set([stem]);
  if (!SOURCE_EXTENSIONS.includes(extension)) {
    for (const sourceExtension of SOURCE_EXTENSIONS) {
      paths.add(withoutRuntimeExtension + sourceExtension);
      paths.add(withoutRuntimeExtension + "/index" + sourceExtension);
    }
  }
  return {escaped: false, paths: [...paths]};
}

export function checkFunctionsSourceClosure(tree) {
  const unresolved = [];
  let relativeImports = 0;
  for (const [name, text] of [...tree].sort(([left], [right]) => left.localeCompare(right))) {
    const source = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true);
    if (source.parseDiagnostics.length > 0) {
      throw new FunctionsSourceClosureError(`Cannot parse indexed Functions module: ${name}`);
    }
    for (const specifier of importedSpecifiers(source)) {
      if (!specifier.startsWith(".")) continue;
      relativeImports += 1;
      const resolution = candidates(name, specifier);
      if (resolution.escaped || !resolution.paths.some((candidate) =>
        tree.has(candidate) || BUILT_MODULES.has(candidate))) {
        unresolved.push(`${name}: ${specifier}`);
      }
    }
  }
  if (unresolved.length > 0) {
    throw new FunctionsSourceClosureError(
      `Unresolved indexed Functions imports:\n${unresolved.map((item) => `  ${item}`).join("\n")}`,
    );
  }
  return {modules: tree.size, relativeImports};
}

export function checkIndexedFunctionsSourceClosure(repoRoot) {
  return checkFunctionsSourceClosure(readIndexedFunctionsSource(repoRoot));
}

function main() {
  const repoIndex = process.argv.indexOf("--repo");
  if (repoIndex >= 0 && (!process.argv[repoIndex + 1] || process.argv.length !== repoIndex + 2)) {
    throw new FunctionsSourceClosureError("Usage: check_functions_source_closure.mjs [--repo PATH]");
  }
  const repoRoot = repoIndex >= 0 ? path.resolve(process.argv[repoIndex + 1]) :
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const result = checkIndexedFunctionsSourceClosure(repoRoot);
  console.log(`Functions source closure passed: ${result.modules} modules, ` +
    `${result.relativeImports} relative imports.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
