#!/usr/bin/env node
// Downloads the sqlite3 package's native library before `flutter test`, with
// retries, so its build hook finds a verified copy instead of downloading it
// mid-test. Main run 43716269314 failed its macOS goldens when the hook's
// one download attempt hit a DNS failure.
//
// The hook (package:sqlite3, doc/hook.md) keeps downloads in
// .dart_tool/hooks_runner/shared/sqlite3/build/download-<hash8>/ and reuses a
// file there whose sha256 matches the hash the package pins. This tool writes
// exactly that file, checked against the same pinned hash. If the package's
// layout ever differs, it warns and exits 0, and the hook downloads as before.
//   node tool/ci/prefetch_sqlite3_asset.mjs [--workspace <dir>]
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

export const ATTEMPTS = 4;
export const BACKOFF_SECONDS = Object.freeze([5, 15, 45]);
const TIMEOUT_MS = 60_000;

/** The locked sqlite3 version, or null when the workspace doesn't use it. */
export function lockedVersion(lockText) {
  return /^ {2}sqlite3:\n(?: {4}.*\n)*? {4}version: "([^"]+)"/mu.exec(lockText)?.[1] ?? null;
}

/** The release tag and pinned hashes from the package's asset_hashes.dart. */
export function pinnedAssets(hashesSource) {
  const releaseTag = /const String\? releaseTag = '([^']+)';/u.exec(hashesSource)?.[1] ?? null;
  const hashes = new Map([...hashesSource.matchAll(/'([^']+)': '([0-9a-f]{64})'/gu)].map(match => [match[1], match[2]]));
  return {releaseTag, hashes};
}

/** The release asset name and the hook's own file name for this machine. */
export function assetFor({platform, arch}) {
  const osName = {darwin: "macos", linux: "linux"}[platform];
  const archName = {arm64: "arm64", x64: "x64"}[arch];
  if (!osName || !archName) return null;
  const extension = osName === "macos" ? "dylib" : "so";
  return {source: `libsqlite3.${archName}.${osName}.${extension}`, target: `libsqlite3.${extension}`};
}

export function targetPath(workspace, hash, target) {
  return path.join(workspace, ".dart_tool", "hooks_runner", "shared", "sqlite3", "build", `download-${hash.slice(0, 8)}`, target);
}

const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");

// A failure worth another attempt: no response at all, a rate limit or a
// server error. A 404 or a wrong hash fails at once.
function transient(error) {
  return error.status === undefined || error.status === 429 || error.status >= 500;
}

export async function download(url, expectedHash, {fetchImpl = fetch, sleep = seconds => new Promise(resolve => setTimeout(resolve, seconds * 1000)),
  log = message => console.error(message)} = {}) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const response = await fetchImpl(url, {signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "follow"});
      if (!response.ok) throw Object.assign(new Error(`HTTP ${response.status}`), {status: response.status});
      const bytes = Buffer.from(await response.arrayBuffer());
      const actual = sha256(bytes);
      if (actual !== expectedHash) {
        throw Object.assign(new Error(`sha256 ${actual} does not match the pinned ${expectedHash}`), {status: 0});
      }
      return bytes;
    } catch (error) {
      const reason = `${error.message}${error.cause?.code ? ` (${error.cause.code})` : ""}`;
      if (!transient(error) || attempt === ATTEMPTS) {
        throw new Error(`Cannot download ${url}: ${reason}${transient(error) ? ` after ${ATTEMPTS} attempts` : ""}.`);
      }
      const wait = BACKOFF_SECONDS[attempt - 1];
      log(`::warning::prefetch_sqlite3_asset: ${url}: ${reason}. Retrying in ${wait} s (attempt ${attempt + 1} of ${ATTEMPTS}).`);
      await sleep(wait);
    }
  }
}

export async function prefetch({workspace, pubCache, platform = process.platform, arch = process.arch,
  log = message => console.error(message), ...downloadOptions}) {
  const skip = reason => {
    log(`::warning::prefetch_sqlite3_asset: ${reason}; the sqlite3 hook will download the library itself.`);
    return {status: "skipped", reason};
  };
  const lockPath = path.join(workspace, "pubspec.lock");
  const version = fs.existsSync(lockPath) ? lockedVersion(fs.readFileSync(lockPath, "utf8")) : null;
  if (!version) return skip(`no sqlite3 entry in ${lockPath}`);
  const hashesPath = path.join(pubCache, "hosted", "pub.dev", `sqlite3-${version}`, "lib", "src", "hook", "asset_hashes.dart");
  if (!fs.existsSync(hashesPath)) return skip(`${hashesPath} not found (run flutter pub get first)`);
  const {releaseTag, hashes} = pinnedAssets(fs.readFileSync(hashesPath, "utf8"));
  const asset = assetFor({platform, arch});
  if (!asset) return skip(`no prebuilt library for ${platform}/${arch}`);
  const hash = hashes.get(asset.source);
  if (!releaseTag || !hash) return skip(`${hashesPath} pins no ${asset.source}`);
  const destination = targetPath(workspace, hash, asset.target);
  if (fs.existsSync(destination) && sha256(fs.readFileSync(destination)) === hash) {
    log(`prefetch_sqlite3_asset: ${destination} is already current.`);
    return {status: "current", destination};
  }
  const url = `https://github.com/simolus3/sqlite3.dart/releases/download/${releaseTag}/${asset.source}`;
  const bytes = await download(url, hash, {log, ...downloadOptions});
  fs.mkdirSync(path.dirname(destination), {recursive: true});
  fs.writeFileSync(`${destination}.tmp`, bytes);
  fs.renameSync(`${destination}.tmp`, destination);
  log(`prefetch_sqlite3_asset: wrote ${destination} (${asset.source}, ${releaseTag}).`);
  return {status: "downloaded", destination};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args[0] === "--help") {
    console.log("Usage: node tool/ci/prefetch_sqlite3_asset.mjs [--workspace <dir>]");
  } else if (args.length && (args.length !== 2 || args[0] !== "--workspace")) {
    console.error("Usage: node tool/ci/prefetch_sqlite3_asset.mjs [--workspace <dir>]");
    process.exitCode = 2;
  } else {
    try {
      await prefetch({workspace: path.resolve(args[1] ?? "."),
        pubCache: process.env.PUB_CACHE || path.join(os.homedir(), ".pub-cache")});
    } catch (error) {
      console.error(`::error::prefetch_sqlite3_asset: ${error.message}`);
      process.exitCode = 1;
    }
  }
}
