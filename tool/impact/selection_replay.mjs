#!/usr/bin/env node
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {parseArgs} from "node:util";
import {readsPath} from "../lib/functions_test_reads.mjs";
import {elsewherePath, repoPathIndex, selectEmulatorTests} from "../lib/functions_test_selection.mjs";
import {discoverableFunctionsTests, functionsModules, readFunctionsSource} from "../lib/functions_module_graph.mjs";
import {repoRoot} from "../lib/repo_paths.mjs";

// Replays the Functions test selection over recent main commits to show what
// the repository-path rule (tool/lib/functions_test_reads.mjs) drops compared
// with the broad rule it replaced: a change outside functions/ and contracts/
// used to select every test whose tree names the changed path's top-level
// folder. Changes inside functions/, contracts/ and the data inputs go through
// the same code either way, so each commit's selection is that shared part plus
// each rule's selection for the other paths. --baseline names an older copy of
// functions_test_selection.mjs; on --check commits the replay also runs both
// whole selectors and fails unless they agree with it. The module graph and
// sources are today's for every commit. Prints JSON: per-commit counts for the
// unit and emulator lists, the median and p90 of each, and every dropped test
// with all the paths its tree can read.
const {values} = parseArgs({options: {
  baseline: {type: "string"}, commits: {type: "string", default: "100"}, ref: {type: "string", default: "origin/main"},
  check: {type: "string", default: "4"}, output: {type: "string"},
}});
if (!values.baseline) {
  console.error("Usage: selection_replay.mjs --baseline <older functions_test_selection.mjs> [--commits 100] [--ref origin/main] [--check 4] [--output file]");
  process.exit(64);
}
const baseline = await import(pathToFileURL(path.resolve(values.baseline)).href);
const git = (...args) => execFileSync("git", args, {cwd: repoRoot, encoding: "utf8"});
const commits = git("log", "--first-parent", "--format=%H %s", `-${values.commits}`, values.ref).trim().split("\n")
  .map((line) => ({sha: line.slice(0, 40), subject: line.slice(41)}));
const lists = {
  unit: discoverableFunctionsTests(),
  emulator: JSON.parse(fs.readFileSync(path.join(repoRoot, "functions/test/emulator-tests.json"), "utf8")),
};
const {modules} = await functionsModules();
// Every selector call reads the same sources; read each once.
const sources = new Map();
const readSource = (file) => {
  if (!sources.has(file)) sources.set(file, readFunctionsSource(file));
  return sources.get(file);
};
const changedOf = new Map(commits.map(({sha}) => [sha, git("diff", "--name-only", `${sha}^1`, sha).trim().split("\n").filter(Boolean)]));

const percentile = (counts, p) => {
  const sorted = [...counts].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
};
const report = {ref: values.ref, commits: commits.length, note: "Today's module graph and sources for every commit.", lanes: {}};
for (const [lane, listed] of Object.entries(lists)) {
  const index = repoPathIndex({listed, modules, readSource});
  const rows = [];
  const dropped = new Map();
  const checked = [];
  for (const {sha, subject} of commits) {
    const changedPaths = changedOf.get(sha);
    const elsewhere = changedPaths.filter(elsewherePath);
    const other = changedPaths.filter((changed) => !elsewherePath(changed));
    const shared = other.length > 0 ? selectEmulatorTests({changedPaths: other, listed, modules, readSource}) : {mode: "selected", tests: []};
    let before;
    let after;
    if (shared.mode === "full") {
      before = new Set(listed);
      after = new Set(listed);
    } else {
      before = new Set(shared.tests);
      after = new Set(shared.tests);
      for (const changed of elsewhere) {
        const top = changed.split("/")[0];
        for (const test of listed) {
          const reads = index.reads(test);
          const broad = index.namesTop(test, top);
          if (broad) before.add(test);
          if (reads === null ? broad : readsPath(reads, changed)) after.add(test);
        }
      }
    }
    if (elsewhere.length > 0 && checked.length < Number(values.check)) {
      const real = {
        before: baseline.selectEmulatorTests({changedPaths, listed, modules, readSource}).tests.length,
        after: selectEmulatorTests({changedPaths, listed, modules, readSource}).tests.length,
      };
      if (real.before !== before.size || real.after !== after.size) {
        throw new Error(`${lane} ${sha}: the replay says ${before.size} -> ${after.size}, the selectors say ${real.before} -> ${real.after}`);
      }
      checked.push(sha.slice(0, 8));
    }
    const lost = [...before].filter((test) => !after.has(test));
    rows.push({sha: sha.slice(0, 8), subject, before: before.size, after: after.size, dropped: lost.length,
      gained: [...after].filter((test) => !before.has(test)).length});
    for (const test of lost) {
      if (!dropped.has(test)) dropped.set(test, {commits: 0, paths: new Set()});
      const entry = dropped.get(test);
      entry.commits++;
      for (const changed of elsewhere) entry.paths.add(changed);
    }
  }
  const counts = (key) => rows.map((row) => row[key]);
  report.lanes[lane] = {
    listed: listed.length,
    median: {before: percentile(counts("before"), 0.5), after: percentile(counts("after"), 0.5)},
    p90: {before: percentile(counts("before"), 0.9), after: percentile(counts("after"), 0.9)},
    checkedAgainstBothSelectors: checked,
    rows,
    // A dropped test's tree is bounded: these are all the paths it can read, and
    // none of them covers the changed paths it was dropped for.
    dropped: [...dropped].map(([test, {commits: count, paths}]) => ({
      test, commits: count, changedPaths: [...paths].sort(), reads: index.reads(test),
    })).sort((a, b) => b.commits - a.commits || a.test.localeCompare(b.test)),
  };
  process.stderr.write(`${lane}: median ${report.lanes[lane].median.before} -> ${report.lanes[lane].median.after}, ` +
    `p90 ${report.lanes[lane].p90.before} -> ${report.lanes[lane].p90.after}, ${dropped.size} tests ever dropped, ` +
    `checked against both selectors on ${checked.join(" ")}\n`);
}

const text = `${JSON.stringify(report, null, 2)}\n`;
if (values.output) fs.writeFileSync(values.output, text);
else process.stdout.write(text);
