#!/usr/bin/env node
// Dart test blast radius: for every test file, the lib/ libraries in its
// import closure. A library reached by many tests reruns many tests when it
// changes, so the averages here measure how well the import graph is cut.
// Report only; it reads tracked Dart files and changes nothing.
//
// The graph comes from import, export and part directives (conditional URIs
// included), with package: URIs mapped to each pubspec's lib/. It is an
// approximation of the selector in tool/harness/lib/flutter_test_selection.dart,
// not a replacement: untracked generated files are missing, so counts are
// lower bounds.
//
//   node tool/architecture/dart_blast_radius.mjs [--root <dir>] [--top <n>]
//     [--reach <lib file>]... [--cut <from>:<to>]... [--chokepoints] [--json]
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const directivePattern = /^\s*(import|export|part)\s+(?!of\b)((?:'[^']*'|"[^"]*")(?:\s+if\s*\([^)]*\)\s*(?:'[^']*'|"[^"]*"))*)/gmu;
const uriPattern = /'([^']*)'|"([^"]*)"/gu;
const testPattern = /^(test|integration_test)\/.*_test\.dart$/u;

/** Each directive's kind and URIs (a conditional import lists every URI). */
export function parseDirectives(source) {
  return [...source.matchAll(directivePattern)].map(match => ({
    kind: match[1],
    uris: [...match[2].matchAll(uriPattern)].map(uri => uri[1] ?? uri[2]),
  }));
}

/** The repository path a URI names, or null for dart: and third-party packages. */
export function resolveUri(from, uri, packages) {
  if (uri.startsWith("dart:")) return null;
  if (uri.startsWith("package:")) {
    const [name, ...rest] = uri.slice("package:".length).split("/");
    const lib = packages.get(name);
    return lib ? path.posix.join(lib, rest.join("/")) : null;
  }
  return path.posix.normalize(path.posix.join(path.posix.dirname(from), uri));
}

/**
 * The directive graph over `files` ({path: source}). Edges to files outside
 * the set are dropped. `partOf` maps each part file to its library.
 */
export function buildGraph({files, packages}) {
  const edges = new Map();
  const partOf = new Map();
  const kinds = new Map(); // file -> {import, export, part} counts of in-repo edges
  for (const [file, source] of Object.entries(files)) {
    const list = [];
    const counts = {import: 0, export: 0, part: 0};
    for (const {kind, uris} of parseDirectives(source)) {
      for (const uri of uris) {
        const target = resolveUri(file, uri, packages);
        if (target === null || !(target in files)) continue;
        list.push(target);
        counts[kind] += 1;
        if (kind === "part") partOf.set(target, file);
      }
    }
    edges.set(file, list);
    kinds.set(file, counts);
  }
  return {edges, partOf, kinds, tests: Object.keys(files).filter(file => testPattern.test(file)).sort()};
}

/** Every file reachable from `start`, skipping the edges named in `cuts` ("from:to"). */
export function closure(graph, start, cuts = new Set()) {
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const file = queue.shift();
    for (const to of graph.edges.get(file) ?? []) {
      if (seen.has(to) || cuts.has(`${file}:${to}`)) continue;
      seen.add(to);
      queue.push(to);
    }
  }
  return seen;
}

const isLibrary = (graph, file) => file.startsWith("lib/") && !graph.partOf.has(file);

/** Tests reaching each lib/ library, and the average per test. */
export function measure(graph, cuts = new Set()) {
  const reach = new Map();
  let pairs = 0;
  for (const test of graph.tests) {
    for (const file of closure(graph, test, cuts)) {
      if (!isLibrary(graph, file)) continue;
      reach.set(file, (reach.get(file) ?? 0) + 1);
      pairs += 1;
    }
  }
  const tests = graph.tests.length;
  return {tests, pairs, librariesPerTest: tests ? +(pairs / tests).toFixed(1) : 0, reach};
}

/**
 * Files whose removal from the graph cuts the most test-to-library reach.
 * Candidates have at least 5 direct importers and are a barrel (3+ exports),
 * widely imported (25+ importers) or a hub (60+ imports, like a router).
 */
export function candidate(graph, file, importers) {
  const counts = graph.kinds.get(file) ?? {import: 0, export: 0};
  return importers >= 5 && !graph.partOf.has(file) &&
    (counts.export >= 3 || importers >= 25 || counts.import >= 60);
}

export function chokepoints(graph, {baseline, top = 10} = {}) {
  const importers = new Map();
  for (const list of graph.edges.values()) for (const to of list) importers.set(to, (importers.get(to) ?? 0) + 1);
  const base = baseline ?? measure(graph).pairs;
  const rows = [];
  for (const [file, count] of importers) {
    if (!candidate(graph, file, count)) continue;
    // Cutting every edge into the file removes it and what only it reaches.
    const cuts = new Set();
    for (const [from, list] of graph.edges) if (list.includes(file)) cuts.add(`${from}:${file}`);
    const removed = base - measure(graph, cuts).pairs;
    rows.push({file, importers: count, removedPairs: removed, share: base ? +(removed / base).toFixed(3) : 0});
  }
  return rows.sort((left, right) => right.removedPairs - left.removedPairs).slice(0, top);
}

/** Tracked Dart files and pubspec package roots of the repository at `root`. */
export function readRepository(root) {
  const git = (...args) => execFileSync("git", args, {cwd: root, encoding: "utf8", maxBuffer: 1 << 30});
  const packages = new Map();
  for (const pubspec of git("ls-files", "*pubspec.yaml").split("\n").filter(Boolean)) {
    const name = /^name:\s*(\S+)/mu.exec(fs.readFileSync(path.join(root, pubspec), "utf8"))?.[1];
    if (name) packages.set(name, path.posix.join(path.posix.dirname(pubspec), "lib"));
  }
  const files = {};
  for (const file of git("ls-files", "*.dart").split("\n").filter(Boolean)) {
    try {
      files[file] = fs.readFileSync(path.join(root, file), "utf8");
    } catch {
      // Deleted in the working tree but still tracked.
    }
  }
  return {files, packages};
}

export function parseArgs(argv) {
  const options = {root: ".", top: 20, reach: [], cuts: [], chokepoints: false, json: false};
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = () => {
      const next = argv[++index];
      if (next === undefined) throw new Error(`${flag} needs a value.`);
      return next;
    };
    if (flag === "--root") options.root = value();
    else if (flag === "--top") options.top = Number(value());
    else if (flag === "--reach") options.reach.push(value());
    else if (flag === "--cut") {
      const cut = value();
      if (!/^[^:]+\.dart:[^:]+\.dart$/u.test(cut)) throw new Error(`--cut takes <from.dart>:<to.dart>, not ${cut}.`);
      options.cuts.push(cut);
    } else if (flag === "--chokepoints") options.chokepoints = true;
    else if (flag === "--json") options.json = true;
    else throw new Error(`Unknown option ${flag}.`);
  }
  if (!Number.isInteger(options.top) || options.top < 1) throw new Error("--top must be a positive integer.");
  return options;
}

export function report(graph, options) {
  const base = measure(graph);
  const result = {
    tests: base.tests,
    librariesPerTest: base.librariesPerTest,
    pairs: base.pairs,
    top: [...base.reach].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, options.top).map(([file, tests]) => ({file, tests, share: +(tests / base.tests).toFixed(3)})),
    reach: Object.fromEntries(options.reach.map(file => [file, base.reach.get(file) ?? 0])),
  };
  if (options.cuts.length) {
    const cut = measure(graph, new Set(options.cuts));
    result.withCuts = {cuts: options.cuts, librariesPerTest: cut.librariesPerTest, pairs: cut.pairs,
      removedShare: base.pairs ? +((base.pairs - cut.pairs) / base.pairs).toFixed(3) : 0,
      reach: Object.fromEntries(options.reach.map(file => [file, cut.reach.get(file) ?? 0]))};
  }
  if (options.chokepoints) result.chokepoints = chokepoints(graph, {baseline: base.pairs, top: options.top});
  return result;
}

function printText(result) {
  const lines = [`${result.tests} tests; ${result.librariesPerTest} lib libraries per test on average (${result.pairs} test-library pairs).`];
  if (result.withCuts) {
    lines.push(`With ${result.withCuts.cuts.length} edge(s) cut: ${result.withCuts.librariesPerTest} per test ` +
      `(${(result.withCuts.removedShare * 100).toFixed(1)}% of pairs removed).`);
  }
  for (const [file, tests] of Object.entries(result.reach)) {
    lines.push(`${file}: reached by ${tests} tests${result.withCuts ? `, ${result.withCuts.reach[file]} with cuts` : ""}.`);
  }
  lines.push("", "Most-reached libraries:");
  for (const row of result.top) lines.push(`  ${row.tests}\t${(row.share * 100).toFixed(1)}%\t${row.file}`);
  if (result.chokepoints) {
    lines.push("", "Chokepoints (share of pairs removed if every edge into the file is cut):");
    for (const row of result.chokepoints) lines.push(`  ${(row.share * 100).toFixed(1)}%\t${row.importers} importers\t${row.file}`);
  }
  console.log(lines.join("\n"));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    console.error("Usage: node tool/architecture/dart_blast_radius.mjs [--root <dir>] [--top <n>] [--reach <lib file>]... " +
      "[--cut <from>:<to>]... [--chokepoints] [--json]");
    process.exit(2);
  }
  const result = report(buildGraph(readRepository(path.resolve(options.root))), options);
  if (options.json) console.log(JSON.stringify(result, null, 2));
  else printText(result);
}
