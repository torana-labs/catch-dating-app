import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {ATTEMPTS, BACKOFF_SECONDS, assetFor, lockedVersion, pinnedAssets, prefetch, targetPath} from "./prefetch_sqlite3_asset.mjs";

const library = Buffer.from("example native library bytes");
const hash = crypto.createHash("sha256").update(library).digest("hex");
const lock = `packages:
  sqflite:
    dependency: transitive
    version: "9.9.9"
  sqlite3:
    dependency: "direct main"
    description:
      name: sqlite3
      sha256: "${"0".repeat(64)}"
      url: "https://pub.dev"
    source: hosted
    version: "3.8.0"
  stack_trace:
    version: "1.0.0"
`;
const hashes = `const String? releaseTag = 'sqlite3-3.8.0';
const Map<String, String> assetNameToSha256Hash = {
  'libsqlite3.arm64.linux.so': '${"1".repeat(64)}',
  'libsqlite3.arm64.macos.dylib': '${hash}',
};
`;

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "prefetch-sqlite3-"));
  const workspace = path.join(root, "ws");
  const pubCache = path.join(root, "cache");
  fs.mkdirSync(workspace);
  fs.writeFileSync(path.join(workspace, "pubspec.lock"), lock);
  const hook = path.join(pubCache, "hosted", "pub.dev", "sqlite3-3.8.0", "lib", "src", "hook");
  fs.mkdirSync(hook, {recursive: true});
  fs.writeFileSync(path.join(hook, "asset_hashes.dart"), hashes);
  return {root, workspace, pubCache, cleanup: () => fs.rmSync(root, {recursive: true, force: true})};
}

// Replies in order; a reply is bytes, an HTTP status, or a network error.
function fakeFetch(replies) {
  const urls = [];
  const fetchImpl = async url => {
    urls.push(url);
    const reply = replies.shift();
    if (reply instanceof Error) throw reply;
    if (typeof reply === "number") return {ok: false, status: reply};
    return {ok: true, status: 200, arrayBuffer: async () => reply};
  };
  return {urls, fetchImpl};
}
const dnsFailure = () => Object.assign(new TypeError("fetch failed"), {cause: {code: "ENOTFOUND"}});
const quiet = {platform: "darwin", arch: "arm64", log: () => {}};

test("parsing: the locked version, the pinned hashes and this machine's asset", () => {
  assert.equal(lockedVersion(lock), "3.8.0");
  assert.equal(lockedVersion("packages:\n  sqflite:\n    version: \"1.0.0\"\n"), null);
  const pinned = pinnedAssets(hashes);
  assert.equal(pinned.releaseTag, "sqlite3-3.8.0");
  assert.equal(pinned.hashes.get("libsqlite3.arm64.macos.dylib"), hash);
  assert.deepEqual(assetFor({platform: "darwin", arch: "arm64"}), {source: "libsqlite3.arm64.macos.dylib", target: "libsqlite3.dylib"});
  assert.deepEqual(assetFor({platform: "linux", arch: "x64"}), {source: "libsqlite3.x64.linux.so", target: "libsqlite3.so"});
  assert.equal(assetFor({platform: "win32", arch: "x64"}), null);
  // The hook's documented location: shared/sqlite3/build/download-<first 8 of the hash>/.
  assert.equal(targetPath("/ws", hash, "libsqlite3.dylib"),
    `/ws/.dart_tool/hooks_runner/shared/sqlite3/build/download-${hash.slice(0, 8)}/libsqlite3.dylib`);
});

test("a DNS failure is retried with backoff and the verified file lands where the hook reuses it", async () => {
  const f = fixture();
  try {
    const fake = fakeFetch([dnsFailure(), 503, library]);
    const waits = [];
    const result = await prefetch({workspace: f.workspace, pubCache: f.pubCache, ...quiet, fetchImpl: fake.fetchImpl,
      sleep: async seconds => { waits.push(seconds); }});
    assert.equal(result.status, "downloaded");
    assert.deepEqual(fake.urls, Array(3).fill("https://github.com/simolus3/sqlite3.dart/releases/download/sqlite3-3.8.0/libsqlite3.arm64.macos.dylib"));
    assert.deepEqual(waits, BACKOFF_SECONDS.slice(0, 2));
    assert.deepEqual(fs.readFileSync(targetPath(f.workspace, hash, "libsqlite3.dylib")), library);
    // A second run finds the current file and fetches nothing.
    const again = await prefetch({workspace: f.workspace, pubCache: f.pubCache, ...quiet, fetchImpl: fakeFetch([]).fetchImpl});
    assert.equal(again.status, "current");
  } finally {
    f.cleanup();
  }
});

test("a network failure on every attempt fails the step with the cause", async () => {
  const f = fixture();
  try {
    const fake = fakeFetch(Array.from({length: ATTEMPTS}, dnsFailure));
    await assert.rejects(prefetch({workspace: f.workspace, pubCache: f.pubCache, ...quiet, fetchImpl: fake.fetchImpl, sleep: async () => {}}),
      /Cannot download .*libsqlite3\.arm64\.macos\.dylib: fetch failed \(ENOTFOUND\) after 4 attempts\./u);
    assert.equal(fake.urls.length, ATTEMPTS);
  } finally {
    f.cleanup();
  }
});

test("a wrong hash or a 404 fails at once and writes nothing", async () => {
  for (const reply of [Buffer.from("tampered"), 404]) {
    const f = fixture();
    try {
      const fake = fakeFetch([reply, library]);
      await assert.rejects(prefetch({workspace: f.workspace, pubCache: f.pubCache, ...quiet, fetchImpl: fake.fetchImpl, sleep: async () => {}}),
        /Cannot download .*(does not match the pinned|HTTP 404)/u);
      assert.equal(fake.urls.length, 1);
      assert.equal(fs.existsSync(path.join(f.workspace, ".dart_tool")), false);
    } finally {
      f.cleanup();
    }
  }
});

test("an unexpected layout skips with a warning, leaving the download to the hook", async () => {
  const f = fixture();
  try {
    const logs = [];
    const noFetch = fakeFetch([]);
    const run = extra => prefetch({workspace: f.workspace, pubCache: f.pubCache, ...quiet, log: message => logs.push(message),
      fetchImpl: noFetch.fetchImpl, ...extra});
    assert.equal((await run({platform: "win32"})).status, "skipped");
    assert.equal((await run({arch: "x64"})).status, "skipped"); // no pinned x64 macOS hash in the fixture
    assert.equal((await run({pubCache: path.join(f.root, "missing")})).status, "skipped");
    fs.writeFileSync(path.join(f.workspace, "pubspec.lock"), "packages:\n");
    assert.equal((await run({})).status, "skipped");
    assert.equal(noFetch.urls.length, 0);
    assert.ok(logs.every(message => message.startsWith("::warning::")));
  } finally {
    f.cleanup();
  }
});
