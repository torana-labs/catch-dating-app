import fs from "node:fs";
import path from "node:path";
import {cruiseModules, loadDependencyCruiser} from "./dependency_cruiser.mjs";
import {repoRoot} from "./repo_paths.mjs";

export const functionsRoot = path.join(repoRoot, "functions");

/** The dependency-cruiser modules of functions/src and functions/test, relative to functions/. */
export async function functionsModules() {
  const depcruise = await loadDependencyCruiser();
  if (!depcruise) throw new Error("Functions test selection needs `npm ci --prefix tool/impact`.");
  const tsConfigFile = path.join(functionsRoot, "tsconfig.json");
  const previous = process.cwd();
  process.chdir(functionsRoot);
  try {
    const modules = cruiseModules(await depcruise.cruise(["src", "test", "scripts"], {
      tsConfig: {fileName: tsConfigFile},
      doNotFollow: {path: "(^|/)node_modules/"},
      exclude: {path: "(^|/)node_modules/"},
    }, {}, {tsConfig: depcruise.extractTSConfig(tsConfigFile)}));
    return {modules, graph: {tool: "dependency-cruiser", version: depcruise.version}};
  } finally {
    process.chdir(previous);
  }
}

/** Reads a functions/ file for data-path mentions; a missing file reads as empty. */
export function readFunctionsSource(file) {
  try { return fs.readFileSync(path.join(functionsRoot, file), "utf8"); } catch { return ""; }
}

/**
 * The node --test files `npm test` discovers, named as run-tests.cjs names them,
 * from authored sources so no build is needed: src/**.test.ts compiles to
 * lib/**.test.js; test/ and scripts/ .test.cjs run as written; rules specs
 * belong to the emulator lane.
 */
export function discoverableFunctionsTests(root = functionsRoot) {
  return fs.globSync(["src/**/*.test.ts", "test/**/*.test.cjs", "scripts/**/*.test.cjs"], {cwd: root})
    .map((file) => file.split(path.sep).join("/"))
    .filter((file) => !file.endsWith(".rules.test.cjs"))
    .map((file) => file.startsWith("src/") ? `lib/${file.slice(4, -3)}.js` : file)
    .sort();
}
