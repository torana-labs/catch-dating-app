import path from "node:path";
import {contractReads} from "./contract_reads.mjs";

// Pull requests run only the strict emulator tests a change can reach; the
// merge queue, main and nightly still run every listed test. Code inputs come
// from the dependency-cruiser graph of functions/; files a test reads as data
// count when the test or anything it imports names them.

// The emulators load the rules for every test at startup, so a rules change
// can affect tests that never name the file.
const fullInputs = [
  /^(?:firestore|storage)\.rules$/u,
  /^functions\/package(?:-lock)?\.json$/u,
  /^functions\/test\/emulator-tests\.json$/u,
  /^functions\/tsconfig[^/]*\.json$/u,
  /^functions\/scripts\//u,
  /^firebase\.json$/u,
  /^\.firebaserc$/u,
];
const dataInputs = [
  {pattern: /^firestore\.indexes\.json$/u, mentions: ["firestore.indexes"]},
];
// A contract change selects the tests that read that file (tool/lib/contract_reads.mjs),
// the tests whose sources read contracts dynamically, and the importers of the
// generated modules built from it, which name it in their schema $id.
const generatedRoot = "src/shared/generated/";
const generatedSchemaId = /"\$id":\s*"https:\/\/catch\.app\/(contracts\/[^"#]+)"/gu;

/** The authored source of a listed test: compiled lib/**.test.js comes from src/**.test.ts. */
export function sourceForListedTest(test) {
  return /^lib\/.*\.js$/u.test(test) ? `src/${test.slice(4, -3)}.ts` : test;
}

function authoredPath(file) {
  if (/^lib\/.*\.js$/u.test(file)) return `src/${file.slice(4, -3)}.ts`;
  if (/^lib\//u.test(file)) return `src/${file.slice(4)}.ts`;
  return file;
}

function importEdges(modules) {
  const edges = new Map();
  for (const module of modules) {
    const targets = [];
    for (const dependency of module.dependencies ?? []) {
      if (dependency.coreModule) continue;
      if (!dependency.couldNotResolve && dependency.resolved && !dependency.resolved.includes("node_modules/")) {
        targets.push(authoredPath(dependency.resolved));
      } else if (/^\.{1,2}\//u.test(dependency.module)) {
        targets.push(authoredPath(path.posix.normalize(path.posix.join(path.posix.dirname(module.source), dependency.module))));
      }
    }
    edges.set(module.source, targets);
  }
  return edges;
}

function closure(start, edges) {
  const seen = new Set();
  const pending = [...start];
  while (pending.length > 0) {
    const file = pending.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    pending.push(...(edges.get(file) ?? []));
  }
  return seen;
}

// A data read names a repository path in a string: "../../contracts/x.json" or
// path.join(root, "contracts", ...). Import specifiers such as
// "./sales/contracts" are code edges and are already in the graph.
// A file name may sit anywhere inside its string ("fixtures/sample.json").
function mentions(source, key, {fileName = false} = {}) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const prefix = fileName ? "[^\"'\`\\n]*" : "(?:\\.\\.?/)*";
  return new RegExp(`["'\`]${prefix}${escaped}(?:["'\`/.]|$)`, "u").test(source);
}

/**
 * Chooses the listed emulator tests a pull request can affect.
 * changedPaths are repository-relative; modules are dependency-cruiser modules
 * relative to functions/; readSource(file) returns a functions/ file's text.
 */
export function selectEmulatorTests({changedPaths, listed, modules, readSource}) {
  const reasons = [];
  for (const changed of changedPaths) {
    if (fullInputs.some((pattern) => pattern.test(changed))) reasons.push(`shared emulator input changed: ${changed}`);
  }
  const edges = importEdges(modules);
  const known = new Set(edges.keys());
  const reverse = new Map();
  for (const [file, targets] of edges) {
    for (const target of targets) {
      if (!reverse.has(target)) reverse.set(target, new Set());
      reverse.get(target).add(file);
    }
  }
  const testSources = new Map(listed.map((test) => [test, sourceForListedTest(test)]));
  const textCache = new Map();
  const text = (file) => {
    if (!textCache.has(file)) textCache.set(file, readSource(file) ?? "");
    return textCache.get(file);
  };
  const closures = new Map();
  const closureOf = (test) => {
    if (!closures.has(test)) closures.set(test, [...closure([testSources.get(test)], edges)]);
    return closures.get(test);
  };
  const readsAny = (test, keys, options) =>
    closureOf(test).some((file) => keys.some((key) => mentions(text(file), key, options)));
  const contractCache = new Map();
  const contractsOf = (file) => {
    if (!contractCache.has(file)) contractCache.set(file, contractReads(text(file), {file}));
    return contractCache.get(file);
  };
  const readsContract = (test, changed) => closureOf(test).some((file) => {
    const reads = contractsOf(file);
    return reads.dynamic || reads.paths.includes(changed);
  });
  let generatedByContract;
  const generatedFrom = (changed) => {
    if (!generatedByContract) {
      generatedByContract = new Map();
      for (const file of known) {
        if (!file.startsWith(generatedRoot)) continue;
        for (const [, id] of text(file).matchAll(generatedSchemaId)) {
          if (!generatedByContract.has(id)) generatedByContract.set(id, []);
          generatedByContract.get(id).push(file);
        }
      }
    }
    return generatedByContract.get(changed) ?? [];
  };

  const selected = new Set();
  const seeds = [];
  for (const changed of changedPaths) {
    if (fullInputs.some((pattern) => pattern.test(changed))) continue;
    // The Functions build generates this module from the contract, so no diff names it.
    // Before that build its importers' edges have no extension.
    if (changed === "contracts/admin/admin_action_catalog.json" || changed.startsWith("contracts/admin/actions/")) {
      seeds.push("src/shared/generated/adminActionCatalog", "src/shared/generated/adminActionCatalog.ts");
    }
    if (changed.startsWith("contracts/")) {
      for (const test of listed) if (readsContract(test, changed)) selected.add(test);
      seeds.push(...generatedFrom(changed));
      continue;
    }
    const data = dataInputs.find(({pattern}) => pattern.test(changed));
    if (data) {
      for (const test of listed) if (readsAny(test, data.mentions)) selected.add(test);
      continue;
    }
    if (changed.startsWith("functions/")) {
      const file = changed.slice("functions/".length);
      if (file.endsWith(".md")) continue;
      const importable = /\.(?:ts|cts|mts|js|cjs|mjs)$/u.test(file) && /^(?:src|test)\//u.test(file);
      if (known.has(file) || reverse.has(file) || importable) {
        seeds.push(file);
        continue;
      }
      const readers = listed.filter((test) => readsAny(test, [path.posix.basename(file)], {fileName: true}));
      if (readers.length === 0) reasons.push(`no test reaches functions file: ${changed}`);
      for (const test of readers) selected.add(test);
      continue;
    }
    // Elsewhere in the repository: only tests that name that top-level folder can read it.
    const top = changed.split("/")[0];
    for (const test of listed) if (readsAny(test, [top])) selected.add(test);
  }
  const affected = new Set();
  const pending = [...seeds];
  while (pending.length > 0) {
    const file = pending.pop();
    if (affected.has(file)) continue;
    affected.add(file);
    pending.push(...(reverse.get(file) ?? []));
  }
  for (const [test, source] of testSources) if (affected.has(source)) selected.add(test);
  if (reasons.length > 0) return {mode: "full", tests: [...listed], reasons};
  return {mode: "selected", tests: listed.filter((test) => selected.has(test)), reasons: []};
}

// Each emulator shard pays about two minutes of setup (dependencies, the
// Functions build and the emulator boot), and the strict tests average about
// eight seconds each. A small selection therefore runs fastest in one shard;
// a full or large selection keeps the three-way split.
export const emulatorShardCount = 3;
export const singleShardTestLimit = 15;

/**
 * The emulator shard indexes CI should start for a selection: none when no
 * listed test can be affected, one for a small selection, otherwise all three.
 * A missing selection (merge queue, main, nightly) runs every shard.
 */
export function emulatorShards(selection) {
  const all = Array.from({length: emulatorShardCount}, (_, index) => index + 1);
  if (!selection || selection.mode === "full") return all;
  if (selection.mode !== "selected" || !Array.isArray(selection.tests)) {
    throw new Error("An emulator selection needs mode full or selected and a tests array.");
  }
  if (selection.tests.length === 0) return [];
  return selection.tests.length <= singleShardTestLimit ? [1] : all;
}
