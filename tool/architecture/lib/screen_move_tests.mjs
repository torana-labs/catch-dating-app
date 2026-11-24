// Tests follow their imports. A root-package test that, after the move,
// imports a file now in apps/<app>/lib moves to apps/<app>/test (or
// integration_test), with the support files only such tests use and the
// golden baselines it names. Tests of files moving within lib/ stay in the
// root package but are re-mirrored under their subject's new folder. A test
// that the group's own entries move (a test-only move into apps/<app>/test)
// keeps its entry's target; its golden baselines and fixture reads are
// checked like any other test moving into an app.
import path from "node:path";
import {isGeneratedPart, usedLibraries} from "./screen_move_graph.mjs";
import {resolveUri} from "./dart_moves.mjs";

const testRoot = /^(test|integration_test)\//u;
const goldenBaselines = "test/goldens/baseline/";

export function isRootTest(file) {
  return testRoot.test(file) && file.endsWith(".dart") && !isGeneratedPart(file);
}

// The repository libraries a test depends on: from the graph, or from its
// directive text when the analyzer did not see it.
function testDependencies(graph, file, read, packages) {
  const entry = graph.files.get(file);
  if (entry != null) {
    return entry.directives
      .filter((directive) => directive.kind === "import" || directive.kind === "export")
      .flatMap(usedLibraries);
  }
  const source = read(file) ?? "";
  return [...source.matchAll(/^(?:import|export)\s+['"]([^'"]+)['"]/gmu)]
    .map((match) => resolveUri(file, match[1], packages))
    .filter(Boolean);
}

function appLib(app) {
  return `apps/${app}/lib/`;
}

export function planTestMoves({graph, files, moves, packages, folderEntries, read}) {
  const errors = [];
  const tracked = new Set(files);
  const after = (file) => moves.get(file) ?? file;
  // Tests the group's own entries move (a test-only move into
  // apps/<app>/test) are placed by those entries, not by their imports.
  const tests = files.filter((file) => isRootTest(file) && !moves.has(file)).sort();
  const dependencies = new Map(tests.map((test) =>
    [test, [...new Set(testDependencies(graph, test, read, packages))]]));
  const appsReached = (test) => new Set(dependencies.get(test)
    .map((library) => /^apps\/([^/]+)\/lib\//u.exec(after(library))?.[1])
    .filter(Boolean));

  const destination = new Map();
  for (const test of tests) {
    const apps = appsReached(test);
    if (apps.size > 1) {
      errors.push({kind: "testTwoApps", file: test, message: `${test} imports files of ${[...apps].map((app) => `apps/${app}`).join(" and ")}; split it first.`});
    } else if (apps.size === 1) {
      destination.set(test, [...apps][0]);
    }
  }
  const importersOf = (support) => tests.filter((test) => dependencies.get(test).includes(support));
  // Support files go along when every test that uses them goes to one app.
  for (let changed = true; changed;) {
    changed = false;
    for (const support of tests) {
      if (destination.has(support) || support.endsWith("_test.dart")) continue;
      const importers = importersOf(support);
      const moving = importers.filter((importer) => destination.has(importer));
      if (moving.length === 0) continue;
      const apps = new Set(moving.map((importer) => destination.get(importer)));
      if (apps.size === 1 && moving.length === importers.length) {
        destination.set(support, [...apps][0]);
        changed = true;
      }
    }
  }
  const sharedSupport = new Set();
  for (const [test, app] of destination) {
    for (const library of dependencies.get(test)) {
      if (!isRootTest(library) || destination.get(library) === app || sharedSupport.has(library)) continue;
      if (after(library).startsWith(`apps/${app}/`)) continue;
      sharedSupport.add(library);
      errors.push({
        kind: "testSupport",
        file: library,
        message: `${library} is shared by tests moving to apps/${app} and tests that do not; move it into packages/catch_test_support (P5) first.`,
      });
    }
  }

  const testMoves = new Map();
  for (const test of [...destination.keys()].sort()) {
    testMoves.set(test, appTestTarget({test, app: destination.get(test), dependencies, after, folderEntries}));
  }
  for (const test of tests) {
    if (destination.has(test)) continue;
    const deps = dependencies.get(test);
    if (!deps.some((library) => moves.has(library))) continue;
    const target = rootTestTarget({test, deps, moves, folderEntries});
    if (target != null && target !== test) testMoves.set(test, target);
  }

  const goldenMoves = new Map();
  const groupTestMoves = [...moves].filter(([from, to]) => isRootTest(from) && /^apps\//u.test(to));
  for (const [test, target] of [...testMoves, ...groupTestMoves]) {
    if (!/^apps\//u.test(target)) continue;
    const source = read(test) ?? "";
    for (const name of goldenNames(source)) {
      const pattern = new RegExp(`^${escape(name)}(?:@[0-9.]+)?\\.(?:[A-Za-z0-9_-]+\\.)*png$`, "u");
      const baselines = files.filter((file) => file.startsWith(goldenBaselines) &&
        pattern.test(file.slice(goldenBaselines.length)));
      if (baselines.length === 0) {
        errors.push({kind: "golden", file: test, message: `${test} names golden ${name}, but ${goldenBaselines} has no baseline for it.`});
      }
      const app = appOfPath(target);
      for (const baseline of baselines) {
        goldenMoves.set(baseline, `apps/${app}/test/goldens/baseline/${baseline.slice(goldenBaselines.length)}`);
      }
    }
    for (const fixture of fixtureReads(source, files)) {
      errors.push({kind: "fixtureRead", file: test, message: `${test} reads ${fixture} relative to the repository root; it would break in apps/${appOfPath(target)}. Read it through repoFile() (P5) first.`});
    }
  }

  const all = new Map([...testMoves, ...goldenMoves]);
  const byTarget = new Map();
  for (const [from, to] of all) byTarget.set(to, [...(byTarget.get(to) ?? []), from]);
  for (const [target, sources] of byTarget) {
    if (sources.length > 1) {
      errors.push({kind: "collision", file: target, message: `${sources.join(", ")} would all land on ${target}.`});
    } else if (tracked.has(target) && !all.has(target) && !moves.has(target)) {
      errors.push({kind: "collision", file: target, message: `${sources[0]} would overwrite ${target}.`});
    }
  }
  return {testMoves, goldenMoves, errors};
}

function appOfPath(file) {
  return /^apps\/([^/]+)\//u.exec(file)[1];
}

// Where a test moving to an app lands, in order of preference: beside the
// mirror of the source it is named after, under its own folder mapped the way
// its source folder moved, or in the destination it imports most. A support
// file keeps its own layout (mapped like its folder, or the same path under
// the app), so the helpers it sits with stay together. Golden tests stay
// under test/goldens/, which the goldens lane runs.
function appTestTarget({test, app, dependencies, after, folderEntries}) {
  const [, base] = testRoot.exec(test);
  const rest = test.slice(base.length + 1);
  const fileName = path.posix.basename(test);
  const lib = appLib(app);
  if (test.startsWith("test/goldens/")) {
    return `apps/${app}/test/goldens/${test.slice("test/goldens/".length)}`;
  }
  const isTest = test.endsWith("_test.dart");
  const inApp = dependencies.get(test).map(after).filter((file) => file.startsWith(lib));
  if (isTest) {
    const subject = `${fileName.slice(0, -"_test.dart".length)}.dart`;
    const folders = new Set(inApp.filter((file) => path.posix.basename(file) === subject)
      .map((file) => path.posix.dirname(file)));
    if (folders.size === 1) {
      return path.posix.join(`apps/${app}/${base}`, path.posix.relative(lib, [...folders][0]), fileName);
    }
  }
  const mapped = mapThroughFolders(`lib/${rest}`, folderEntries);
  if (mapped != null && mapped.startsWith(lib)) {
    return `apps/${app}/${base}/${mapped.slice(lib.length)}`;
  }
  if (isTest) {
    const counts = new Map();
    for (const file of inApp) {
      const destination = file.slice(lib.length).split("/")[0];
      if (destination.endsWith(".dart")) continue;
      counts.set(destination, (counts.get(destination) ?? 0) + 1);
    }
    const best = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
    if (best != null) return `apps/${app}/${base}/${best}/${fileName}`;
  }
  return `apps/${app}/${base}/${rest}`;
}

// A test of a file moving within lib/ is re-mirrored under its new folder,
// by name or by its own folder's mapping; otherwise it stays.
function rootTestTarget({test, deps, moves, folderEntries}) {
  const [, base] = testRoot.exec(test);
  const fileName = path.posix.basename(test);
  if (test.endsWith("_test.dart")) {
    const subject = `${fileName.slice(0, -"_test.dart".length)}.dart`;
    const folders = new Set(deps.filter((file) => moves.has(file) && path.posix.basename(file) === subject)
      .map((file) => moves.get(file))
      .filter((file) => file.startsWith("lib/"))
      .map((file) => path.posix.dirname(file)));
    if (folders.size === 1) {
      return path.posix.join(base, path.posix.relative("lib", [...folders][0]), fileName);
    }
  }
  const mapped = mapThroughFolders(`lib/${test.slice(base.length + 1)}`, folderEntries);
  if (mapped != null && mapped.startsWith("lib/")) return `${base}/${mapped.slice("lib/".length)}`;
  return null;
}

function mapThroughFolders(libPath, folderEntries) {
  const entry = [...folderEntries]
    .filter(([from]) => from.endsWith("/") && libPath.startsWith(from))
    .sort((a, b) => b[0].length - a[0].length)[0];
  return entry == null ? null : `${entry[1]}${libPath.slice(entry[0].length)}`;
}

export function goldenNames(source) {
  return [...new Set([...source.matchAll(/\bmatchCatchGolden\(\s*[^,()]+,\s*(['"])([^'"$]+)\1/gu)]
    .map((match) => match[2]))];
}

// Paths a test opens relative to the working directory. Such reads find the
// repository's files only while tests run from its root.
export function fixtureReads(source, files) {
  const topLevel = new Set([".dart_tool", ...files.filter((file) => file.includes("/"))
    .map((file) => file.split("/")[0])]);
  return [...new Set([...source.matchAll(/\b(?:File|Directory)\(\s*r?(['"])([^'"$]+)\1/gu)]
    .map((match) => match[2])
    .filter((value) => !value.startsWith("/") && topLevel.has(value.split("/")[0])))];
}

function escape(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
