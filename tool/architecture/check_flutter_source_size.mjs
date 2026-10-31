#!/usr/bin/env node
import path from "node:path";
import {fileURLToPath} from "node:url";
import {fromRepo} from "../lib/repo_paths.mjs";
import {createRepositorySnapshot} from "../lib/repository_snapshot.mjs";
import {checkSizes, lineCount, sizeCeiling, sizeExemption} from "../test/check_flutter_test_size.mjs";

// Handwritten Dart stays within 800 lines. A larger file states why in a
// `// size-exemption: <reason>` comment near its top (shared rules in
// tool/test/check_flutter_test_size.mjs), and nothing passes the ceiling.
export const sourceSizeLimit = 800;
const sourceRoots = /^(?:lib\/|packages\/|widgetbook\/lib\/)/u;

export function isHandwrittenSource(file) {
  if (!sourceRoots.test(file) || !file.endsWith(".dart")) return false;
  if (/\.(?:g|freezed|mocks|gr)\.dart$/u.test(file)) return false;
  // gen_l10n emits no generated-file header. This is its configured output home.
  if (/^lib\/l10n\/generated\/app_localizations(?:_[a-zA-Z_]+)?\.dart$/u.test(file)) return false;
  return true;
}

export function discoverFlutterSources({root = fromRepo(), snapshot = createRepositorySnapshot({root})} = {}) {
  const files = snapshot.listFiles().filter(file => sourceRoots.test(file) && file.endsWith(".dart"));
  const sources = snapshot.readTexts(files, {required: true});
  return files.filter(file => isHandwrittenSource(file))
    .map(file => {
      const source = sources.get(file);
      return {path: file, lines: lineCount(source), exemption: sizeExemption(source)};
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

export function checkFlutterSourceSizes(rows) {
  if (rows.length === 0) return ["source-size check cannot pass without handwritten source files"];
  return checkSizes(rows, {limit: sourceSizeLimit});
}

function parseArgs(argv) {
  const args = {root: fromRepo(), json: false};
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--check") continue;
    if (arg === "--json") args.json = true;
    else if (arg === "--root") {
      const value = argv[++index];
      if (!value || value.startsWith("--")) throw new Error(`${arg} requires a value`);
      args.root = value;
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function main(argv) {
  if (argv.includes("--help")) {
    console.log("Usage: node tool/architecture/check_flutter_source_size.mjs [--check] [--json] [--root path]");
    return;
  }
  const args = parseArgs(argv);
  const rows = discoverFlutterSources({root: args.root});
  const errors = checkFlutterSourceSizes(rows);
  const exempt = rows.filter(row => row.lines > sourceSizeLimit);
  const result = {checkedFiles: rows.length, exemptFiles: exempt.map(row => ({path: row.path, lines: row.lines,
    reason: row.exemption})), errors};
  if (args.json) console.log(JSON.stringify(result, null, 2));
  if (errors.length > 0) {
    if (!args.json) console.error(`Flutter source size check failed:\n${errors.map(error => `- ${error}`).join("\n")}`);
    process.exitCode = 1;
    return;
  }
  if (!args.json) {
    console.log(`Flutter source size check passed: ${rows.length} handwritten files; ` +
      `${exempt.length} over ${sourceSizeLimit} lines with a stated exemption; ceiling ${sizeCeiling}.`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
