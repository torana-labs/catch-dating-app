#!/usr/bin/env node
// Shadow read map for the root and app-package Flutter tests that read files
// (RE decision, 22 Nov 2026: shadow only, nothing consumes it yet): those
// that import dart:io or read repository paths through repoFile()
// (packages/catch_test_support/lib/repo_file.dart).
//
// Each such test file runs in its own `flutter test`, from its package
// directory, under `strace -f`, and
// the log is reduced to the repository paths each kind of process touched:
// the test runtime (flutter_tester, where a test's own dart:io reads happen),
// the compiler (frontend_server, which reads every imported source) and
// everything else (the flutter tool). Each log is parsed as soon as its test
// finishes and deleted, so a shard holds one log at a time (up to ~60 MB).
//
// The selector does not read the output. A later report compares it with the
// selector's always-run set; removing a test from that set needs a clean
// shadow week and sign-off.
//
// Usage (Linux, strace installed, from the repo root after flutter pub get):
//   node tool/ci/test_read_map.mjs --shard <i> --shards <n> --out <file.jsonl>
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

export const TRACED_CALLS = ["execve", "clone", "clone3", "fork", "vfork", "open", "openat", "openat2", "stat",
  "lstat", "newfstatat", "statx", "access", "faccessat", "faccessat2"];
// Generated or tool state, not repository inputs, at the root or an app.
const IGNORED = /^(?:apps\/[^/]+\/)?(\.dart_tool|build|\.git)(\/|$)/u;

const newKind = () => ({opened: new Set(), listed: new Set(), probed: new Set(), missing: new Set()});

function kindOf(executable) {
  if (executable === "flutter_tester") return "runtime";
  if (/frontend_server|dartaotruntime/u.test(executable ?? "")) return "compiler";
  return "tool";
}

/**
 * Reduces one `strace -f` log to repository paths per process kind. Pure, so
 * every case is testable without strace.
 *
 * @param {string} log The strace output (`-f`, one `PID call(...)` per line).
 * @param {string} root The repository root the test ran in.
 */
/**
 * @param {string} [cwd] The directory the test ran in, which relative paths
 *   in the log resolve against (default: the repository root).
 */
export function parseStraceLog(log, root, cwd = root) {
  const base = path.resolve(root) + "/";
  const workingDirectory = path.resolve(cwd);
  const exe = new Map();
  const kinds = {runtime: newKind(), compiler: newKind(), tool: newKind()};
  const repoPath = (raw) => {
    const absolute = path.isAbsolute(raw) ? path.normalize(raw) : path.normalize(path.join(workingDirectory, raw));
    if (!absolute.startsWith(base)) return null;
    const relative = absolute.slice(base.length);
    return relative && !IGNORED.test(relative) ? relative : null;
  };
  for (const line of log.split("\n")) {
    const resumed = /^(\d+)\s+<\.\.\. (clone3?|v?fork) resumed>.*= (\d+)\s*$/u.exec(line);
    if (resumed) {
      exe.set(Number(resumed[3]), exe.get(Number(resumed[1])));
      continue;
    }
    const match = /^(\d+)\s+(\w+)\((.*)$/u.exec(line);
    if (!match) continue;
    const [, pidText, call, rest] = match;
    const pid = Number(pidText);
    if (call === "execve") {
      const file = /^"([^"]+)"/u.exec(rest)?.[1];
      if (file && !/= -1/u.test(rest)) exe.set(pid, path.basename(file));
      continue;
    }
    if (["clone", "clone3", "fork", "vfork"].includes(call)) {
      const child = /= (\d+)\s*$/u.exec(rest)?.[1];
      if (child) exe.set(Number(child), exe.get(pid));
      continue;
    }
    const quoted = /"((?:[^"\\]|\\.)*)"/u.exec(rest)?.[1];
    const relative = quoted && repoPath(quoted);
    if (!relative) continue;
    const kind = kinds[kindOf(exe.get(pid))];
    if (/= -1 ENOENT/u.test(rest)) kind.missing.add(relative);
    else if (/^open/u.test(call)) (/O_DIRECTORY/u.test(rest) ? kind.listed : kind.opened).add(relative);
    else kind.probed.add(relative);
  }
  const sorted = (set) => [...set].sort();
  const out = {executables: [...new Set([...exe.values()].filter(Boolean))].sort()};
  for (const [name, kind] of Object.entries(kinds)) {
    out[name] = {opened: sorted(kind.opened), listed: sorted(kind.listed), probed: sorted(kind.probed),
      missing: sorted(kind.missing)};
  }
  return out;
}

const readsFiles = /^import\s+['"](?:dart:io|package:catch_test_support\/repo_file\.dart)['"]/mu;

/**
 * The root and app-package test files that import dart:io or repoFile(),
 * sorted.
 */
export function fileReadingTests(files, read) {
  return files.filter((file) => packageOf(file) != null && file.endsWith("_test.dart"))
    .filter((file) => readsFiles.test(read(file))).sort();
}

/** The package directory a test runs from: "." or apps/<app>, else null. */
export function packageOf(test) {
  if (test.startsWith("test/")) return ".";
  return /^(apps\/[^/]+)\/test\//u.exec(test)?.[1] ?? null;
}

/** Round-robin shard `index` of `count`, so slow directories spread out. */
export function shardOf(tests, index, count) {
  assert.ok(Number.isInteger(count) && count > 0 && Number.isInteger(index) && index >= 0 && index < count,
    "shard must satisfy 0 <= index < count");
  return tests.filter((_, position) => position % count === index);
}

/**
 * One JSONL row for a traced test: the runtime's reads in full, the compiler's
 * and the tool's as counts plus the compiler's opened list (they are the
 * import closure, kept separate from the test's own reads).
 */
export function readMapRow({test, seconds, exit, logBytes, map}) {
  return {test, seconds: Math.round(seconds * 10) / 10, exit, logBytes, executables: map.executables,
    runtime: map.runtime, compiler: {opened: map.compiler.opened, listed: map.compiler.listed},
    toolOpened: map.tool.opened.length};
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const [flag, value] = [argv[index], argv[index + 1]];
    assert.ok(["--shard", "--shards", "--out"].includes(flag), `Unknown argument: ${flag}`);
    assert.ok(value, `${flag} needs a value`);
    args[flag.slice(2)] = value;
  }
  assert.ok(args.out, "--out is required");
  return {shard: Number(args.shard ?? 0), shards: Number(args.shards ?? 1), out: args.out};
}

function main() {
  const {shard, shards, out} = parseArgs(process.argv.slice(2));
  const root = process.cwd();
  const listed = spawnSync("git", ["ls-files", "test", "apps"], {encoding: "utf8", maxBuffer: 32 * 1024 * 1024});
  assert.equal(listed.status, 0, listed.stderr);
  const tests = shardOf(fileReadingTests(listed.stdout.split("\n").filter(Boolean),
    (file) => fs.readFileSync(path.join(root, file), "utf8")), shard, shards);
  console.log(`Read map shard ${shard}/${shards}: ${tests.length} file-reading test files`);
  const log = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "read-map-")), "strace.log");
  fs.writeFileSync(out, "");
  let failed = 0;
  for (const test of tests) {
    const started = Date.now();
    // Golden-tagged tests are excluded on Linux, as in the CI shards; a file
    // with only golden tests exits 79 (no tests ran) and still yields a map.
    const cwd = path.join(root, packageOf(test));
    const result = spawnSync("strace", ["-f", "-qq", "-e", `trace=${TRACED_CALLS.join(",")}`, "-o", log,
      "flutter", "test", "--concurrency=1", "--exclude-tags=golden", path.relative(cwd, path.join(root, test))],
    {cwd, stdio: ["ignore", "ignore", "ignore"], timeout: 15 * 60 * 1000});
    const seconds = (Date.now() - started) / 1000;
    const text = fs.existsSync(log) ? fs.readFileSync(log, "utf8") : "";
    const row = readMapRow({test, seconds, exit: result.status ?? -1, logBytes: Buffer.byteLength(text),
      map: parseStraceLog(text, root, cwd)});
    fs.rmSync(log, {force: true});
    if (row.exit !== 0 && row.exit !== 79) failed += 1;
    fs.appendFileSync(out, `${JSON.stringify(row)}\n`);
    console.log(`${test}: ${row.seconds}s exit ${row.exit}, runtime opened ${row.runtime.opened.length}, ` +
      `listed ${row.runtime.listed.length}, compiler opened ${row.compiler.opened.length}`);
  }
  // Shadow only: a failing test is recorded, never fails the job.
  console.log(`Read map shard ${shard}/${shards} done: ${tests.length} files, ${failed} failed.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
