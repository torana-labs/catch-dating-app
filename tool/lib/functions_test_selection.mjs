import path from "node:path";
import {contractReads} from "./contract_reads.mjs";
import {readsPath, sourceReads} from "./functions_test_reads.mjs";

// Pull requests run only the strict emulator tests a change can reach; the
// merge queue, main and nightly still run every listed test. Code inputs come
// from the dependency-cruiser graph of functions/; files a test reads as data
// count when the test or anything it imports names them.

// The emulators load the rules for every test at startup, so a rules change
// can affect tests that never name the file.
const fullInputs = [
  /^(?:firestore|storage)\.rules$/u,
  /^functions\/package(?:-lock)?\.json$/u,
  /^functions\/tsconfig[^/]*\.json$/u,
  /^functions\/scripts\//u,
  /^firebase\.json$/u,
  /^\.firebaserc$/u,
];
const dataInputs = [
  {pattern: /^firestore\.indexes\.json$/u, mentions: ["firestore.indexes"]},
  // Nothing imports the entry point, so its import graph reaches no test. The
  // tests that read its export list (functions/scripts/functionExports.cjs) or
  // its text run instead, including the resolver's TypeScript cross-check.
  {pattern: /^functions\/src\/index\.ts$/u,
    mentions: ["functionExports", "functions/scripts/functionExports.cjs", "src/index.ts"]},
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
 * The repository paths each test's whole import tree can read
 * (tool/lib/functions_test_reads.mjs): of(test) is the list, or null when a
 * file in the tree is unbounded, unreadable, or outside functions/ (the graph
 * does not follow that file's own imports); unboundedFile(test) names the first
 * such file.
 */
function treeReader({closureOf, readSource}) {
  const fileReads = new Map();
  const readsOfFile = (file) => {
    if (!fileReads.has(file)) {
      const source = file.startsWith("../") ? null : readSource(file);
      let result;
      if (source === null || source === undefined || source === "") {
        // Generated contract modules are written by the build and never read files.
        result = file.startsWith(generatedRoot) ? {bounded: true, reads: []} : {bounded: false};
      } else {
        result = sourceReads({file: path.posix.normalize(`functions/${file}`), source});
      }
      fileReads.set(file, result.bounded ? result.reads : null);
    }
    return fileReads.get(file);
  };
  const cache = new Map();
  return {
    of(test) {
      if (!cache.has(test)) {
        let reads = [];
        for (const file of closureOf(test)) {
          const own = readsOfFile(file);
          if (own === null) { reads = null; break; }
          reads.push(...own);
        }
        cache.set(test, reads === null ? null : [...new Set(reads)].sort());
      }
      return cache.get(test);
    },
    unboundedFile: (test) => closureOf(test).find((file) => readsOfFile(file) === null),
  };
}

/**
 * Whether selectEmulatorTests applies the repository-path rule to a changed
 * path: anything outside functions/ and contracts/ that is neither a shared
 * input nor a named data input.
 */
export function elsewherePath(changed) {
  return !fullInputs.some((pattern) => pattern.test(changed)) && !changed.startsWith("contracts/") &&
    !dataInputs.some(({pattern}) => pattern.test(changed)) && !changed.startsWith("functions/");
}

/**
 * The two repository-path rules for each listed test, for
 * tool/impact/selection_replay.mjs: namesTop(test, top) is the broad rule (the
 * tree names that top-level folder as a path) and reads(test) is what the tree
 * can read, or null when it is unbounded.
 */
export function repoPathIndex({listed, modules, readSource}) {
  const edges = importEdges(modules);
  const closures = new Map();
  const closureOf = (test) => {
    if (!closures.has(test)) closures.set(test, [...closure([sourceForListedTest(test)], edges)]);
    return closures.get(test);
  };
  const texts = new Map();
  const text = (file) => {
    if (!texts.has(file)) texts.set(file, readSource(file) ?? "");
    return texts.get(file);
  };
  const names = new Map();
  const reader = treeReader({closureOf, readSource});
  return {
    namesTop(test, top) {
      const key = `${test}\0${top}`;
      if (!names.has(key)) names.set(key, closureOf(test).some((file) => mentions(text(file), top)));
      return names.get(key);
    },
    reads: (test) => reader.of(test),
    unboundedFile: (test) => reader.unboundedFile(test),
  };
}

/**
 * For each listed test, the repository paths its import tree can read, or the
 * file that leaves it unbounded. Used by tool/impact/selection_replay.mjs to
 * show why a narrower selection can drop a test.
 */
export function functionsTestReads({listed, modules, readSource}) {
  const edges = importEdges(modules);
  const closureOf = (test) => [...closure([sourceForListedTest(test)], edges)];
  const reader = treeReader({closureOf, readSource});
  return new Map(listed.map((test) => {
    const reads = reader.of(test);
    return [test, reads === null ? {bounded: false, unbounded: reader.unboundedFile(test)} : {bounded: true, reads}];
  }));
}

/**
 * Chooses the listed emulator tests a pull request can affect.
 * changedPaths are repository-relative; modules are dependency-cruiser modules
 * relative to functions/; readSource(file) returns a functions/ file's text.
 */
export function selectEmulatorTests({changedPaths, listed, modules, readSource, explain = false}) {
  // With explain, the result also says why each selected test runs.
  const why = new Map();
  const pick = (test, reason) => {
    selected.add(test);
    if (explain && !why.has(test)) why.set(test, reason);
  };
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
  const treeReads = treeReader({closureOf, readSource});
  const unboundedIn = (test) => treeReads.unboundedFile(test);
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
      for (const test of listed) if (readsContract(test, changed)) pick(test, `reads ${changed}`);
      seeds.push(...generatedFrom(changed));
      continue;
    }
    const data = dataInputs.find(({pattern}) => pattern.test(changed));
    if (data) {
      for (const test of listed) if (readsAny(test, data.mentions)) pick(test, `names ${changed}`);
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
      for (const test of readers) pick(test, `names ${path.posix.basename(file)}`);
      continue;
    }
    // Elsewhere in the repository: a test runs when a file in its tree can read
    // the path (tool/lib/functions_test_reads.mjs). A tree with a read it can't
    // bound keeps the broad rule: the test runs when it names the path's
    // top-level folder anywhere.
    const top = changed.split("/")[0];
    for (const test of listed) {
      const reads = treeReads.of(test);
      if (reads === null) {
        if (readsAny(test, [top])) pick(test, `broad: ${unboundedIn(test)} has an unbounded read; the tree names ${top}`);
      } else {
        const read = reads.find((entry) => readsPath([entry], changed));
        if (read !== undefined) pick(test, `reads ${read || "the whole repository"}`);
      }
    }
  }
  const affected = new Set();
  const pending = [...seeds];
  while (pending.length > 0) {
    const file = pending.pop();
    if (affected.has(file)) continue;
    affected.add(file);
    pending.push(...(reverse.get(file) ?? []));
  }
  for (const [test, source] of testSources) if (affected.has(source)) pick(test, "imports a changed source");
  if (reasons.length > 0) return {mode: "full", tests: [...listed], reasons};
  const tests = listed.filter((test) => selected.has(test));
  return explain ? {mode: "selected", tests, reasons: [], why: Object.fromEntries(tests.map((test) => [test, why.get(test)]))} :
    {mode: "selected", tests, reasons: []};
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
