#!/usr/bin/env node
// Read-map selection shadow (RE decision, 24 Nov 2026). The Flutter test
// selector keeps some tests on every pull request because their file reads
// cannot be bounded (`--probes-only`: the always-run set). The nightly read map
// records what each test actually read at runtime. For each always-run test,
// this classifies those reads (font, asset and engine files; fixture and data
// files; directory listings), says whether they are fully enumerable, and asks
// whether reads alone would have selected the test for the commits since the
// previous read map. Enumerable-only tests are the candidates to leave the
// always-run set and be selected on exactly what they read. Report-only: it
// changes no selection, and removing a test from the set needs a clean shadow
// week and the release engineer's and owner's sign-off.
//
//   node tool/ci/read_map_selection_shadow.mjs --read-map <test-read-map.jsonl>
//     --probes <probes.json> [--changed <file of changed paths> | --day <YYYY-MM-DD> --head <sha>]
//     [--out <report.json>] [--summary <markdown file>]
//
// --day and --head find the changes since the previous day's read map through
// the Actions and compare APIs (GH_TOKEN and GITHUB_REPOSITORY set).
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import {fileURLToPath} from "node:url";

/** Font, asset and engine files: fonts, shaders, the native assets manifest and asset folders. */
const ASSET = /^(NativeAssetsManifest\.json$|shaders\/|assets\/|packages\/[^/]+\/assets\/|.*\.(ttf|otf)$)/u;

export const isAsset = (file) => ASSET.test(file);

/** Paths the Flutter engine looks for in every test's working directory (ICU data); never a test's own read. */
const ENGINE_LOOKUP = /^icudtl\.dat$/u;

/**
 * One always-run test's runtime reads, classified. `enumerable` means every
 * read is a named path: no directory listing and no probe of a path that does
 * not exist (which a later change could create anywhere).
 */
export function classifyReads(runtime = {}) {
  const named = [...new Set([...(runtime.opened ?? []), ...(runtime.probed ?? [])])].sort();
  const listing = [...(runtime.listed ?? [])].sort();
  const missing = (runtime.missing ?? []).filter((file) => !ENGINE_LOOKUP.test(file)).sort();
  const assets = named.filter(isAsset);
  const fixtures = named.filter((file) => !isAsset(file));
  return {assets, fixtures, listing, missing, enumerable: listing.length === 0 && missing.length === 0,
    assetOnly: fixtures.length === 0 && listing.length === 0 && missing.length === 0};
}

/** The changed paths a test's reads would select it on: a named read, a missing path, or a path under a listing. */
export function readMatches(classified, changed) {
  const named = new Set([...classified.assets, ...classified.fixtures, ...classified.missing]);
  return changed.filter((file) => named.has(file) ||
    classified.listing.some((directory) => file.startsWith(`${directory.replace(/\/$/u, "")}/`))).sort();
}

/**
 * The shadow report. Pure, so every case is testable.
 *
 * @param {object} input
 * @param {Array<{test:string, runtime:object, exit:number}>} input.rows The read-map rows.
 * @param {Array<{test:string, why:string}>} input.probes The selector's always-run set.
 * @param {string[]|null} input.changed Paths changed since the previous read map, or null when unknown.
 */
export function shadowReport({rows, probes, changed = null}) {
  const byTest = new Map(rows.map((row) => [row.test, row]));
  const tests = probes.map(({test, why}) => {
    const row = byTest.get(test);
    if (!row) return {test, why, traced: false};
    const reads = classifyReads(row.runtime);
    return {test, why, traced: true, exit: row.exit, ...reads,
      ...(changed ? {wouldSelect: readMatches(reads, changed)} : {})};
  });
  const traced = tests.filter((entry) => entry.traced);
  return {
    alwaysRun: tests.length, traced: traced.length, untraced: tests.length - traced.length,
    enumerable: traced.filter((entry) => entry.enumerable).length,
    assetOnly: traced.filter((entry) => entry.assetOnly).length,
    listing: traced.filter((entry) => entry.listing.length).length,
    changedPaths: changed ? changed.length : null,
    selectedByReads: changed ? traced.filter((entry) => entry.wouldSelect.length).length : null,
    tests,
  };
}

/** Markdown for the step summary. */
export function formatSummary(report) {
  const lines = ["### Read-map selection shadow (report-only)", "",
    `${report.alwaysRun} always-run tests; ${report.traced} traced, ${report.untraced} not in the read map.`,
    `${report.enumerable} read only named paths (enumerable): ${report.assetOnly} of them only font, asset and engine files. ` +
      `${report.listing} list directories.`];
  if (report.window && report.changedPaths === null) {
    lines.push(`No change window: ${report.window.note}.`);
  }
  if (report.changedPaths !== null) {
    lines.push(`Since the previous read map ${report.changedPaths} paths changed; reads alone would have selected ` +
      `${report.selectedByReads} of the ${report.traced} traced always-run tests.`);
  }
  lines.push("", "| Test | Kept as | Reads | Assets | Fixtures | Listings | Missing | Selected by reads |",
    "|---|---|---|---:|---:|---:|---:|---|");
  for (const entry of report.tests) {
    if (!entry.traced) {
      lines.push(`| \`${entry.test}\` | ${entry.why} | not traced | | | | | |`);
      continue;
    }
    const kind = entry.assetOnly ? "assets only" : entry.enumerable ? "enumerable" : "not enumerable";
    const selected = entry.wouldSelect === undefined ? "" : entry.wouldSelect.length ?
      entry.wouldSelect.slice(0, 3).map((file) => `\`${file}\``).join(", ") + (entry.wouldSelect.length > 3 ? " …" : "") : "no";
    lines.push(`| \`${entry.test}\` | ${entry.why} | ${kind} | ${entry.assets.length} | ${entry.fixtures.length} | ` +
      `${entry.listing.length} | ${entry.missing.length} | ${selected} |`);
  }
  return `${lines.join("\n")}\n`;
}

/** The UTC day before a YYYY-MM-DD day. */
export function previousDay(day) {
  assert.match(day, /^\d{4}-\d{2}-\d{2}$/u, "day must be YYYY-MM-DD");
  return new Date(Date.parse(`${day}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
}

/**
 * The paths changed on main since the previous read map: its marker artifact
 * (test-read-map-day-<previous day>) names the commit it traced, and the
 * compare API lists the files changed from there to `head` (renames count
 * under both names). null when there is no previous map or GitHub cannot
 * compare, so the report says so instead of guessing.
 */
export function changedSincePreviousMap({repository, day, head, api}) {
  const name = `test-read-map-day-${previousDay(day)}`;
  const listed = api(`repos/${repository}/actions/artifacts?name=${name}&per_page=100`);
  const marker = (listed.artifacts ?? []).find((artifact) => artifact.name === name && !artifact.expired);
  const base = marker?.workflow_run?.head_sha;
  if (!base) return {base: null, changed: null, note: `no ${name} artifact`};
  if (base === head) return {base, changed: [], note: "same commit as the previous map"};
  const pages = api(`repos/${repository}/compare/${base}...${head}?per_page=100`, {paginate: true});
  const changed = new Set();
  for (const page of pages) {
    for (const file of page.files ?? []) {
      changed.add(file.filename);
      if (file.previous_filename) changed.add(file.previous_filename);
    }
  }
  return {base, changed: [...changed].sort(), note: null};
}

function gh(endpoint, {paginate = false} = {}) {
  const result = spawnSync("gh", ["api", ...(paginate ? ["--paginate", "--slurp"] : []), endpoint],
    {encoding: "utf8", maxBuffer: 256 * 1024 * 1024});
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const [flag, value] = [argv[index], argv[index + 1]];
    assert.ok(["--read-map", "--probes", "--changed", "--day", "--head", "--out", "--summary"].includes(flag),
      `Unknown argument: ${flag}`);
    assert.ok(value, `${flag} needs a value`);
    args[flag.slice(2)] = value;
  }
  assert.ok(args["read-map"] && args.probes, "--read-map and --probes are required");
  assert.ok(!args.day === !args.head, "--day and --head go together");
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rows = fs.readFileSync(args["read-map"], "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
  const {probesRetained} = JSON.parse(fs.readFileSync(args.probes, "utf8"));
  assert.ok(Array.isArray(probesRetained), "--probes must be the selector's --probes-only output");
  let changed = args.changed ? fs.readFileSync(args.changed, "utf8").split("\n").filter(Boolean) : null;
  let window = null;
  if (args.day) {
    const repository = process.env.GITHUB_REPOSITORY;
    assert.match(repository ?? "", /^[\w.-]+\/[\w.-]+$/u, "GITHUB_REPOSITORY is required with --day");
    window = changedSincePreviousMap({repository, day: args.day, head: args.head, api: gh});
    changed = window.changed;
  }
  const report = {...shadowReport({rows, probes: probesRetained, changed}),
    ...(window ? {window: {base: window.base, head: args.head, note: window.note}} : {})};
  if (args.out) fs.writeFileSync(args.out, `${JSON.stringify(report, null, 2)}\n`);
  const summary = formatSummary(report);
  if (args.summary) fs.appendFileSync(args.summary, summary);
  console.log(summary);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
