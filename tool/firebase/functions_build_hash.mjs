#!/usr/bin/env node
// Describes a tested Functions build so the backend deploy can ship exactly
// what CI tested instead of compiling again (rec 8).
//
// - The input hash covers everything `tsc` reads for functions/lib: every file
//   under functions/src (the generated contracts included, so hash after
//   generating them), package.json, package-lock.json and tsconfig*.json, plus
//   the Node and TypeScript versions. Two builds with the same hash produce the
//   same lib, so the deploy can look a build up by hash, whichever commit or run
//   produced it.
// - The lib digest lists the sha256 of every file under functions/lib, so the
//   deploy can verify a downloaded build file by file.
// - A build is trusted only from a run of main or of main's merge queue, on a
//   push, merge_group, schedule or workflow_dispatch event. A branch can edit a
//   workflow file and still run "ci.yml, this repository, success", so CI
//   publishes, and the deploy accepts, only those runs.
//
// Usage (Functions CI, after the tests built lib):
//   functions_build_hash.mjs --functions-dir functions --node-version 24
//     --out build/functions-build [--github-output $GITHUB_OUTPUT]
// writes build.json and lib-digest.json, and outputs hash=, name= and publish=.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {parseArgs} from "node:util";

export const BUILD_FORMAT = 1;
export const TRUSTED_EVENTS = new Set(["push", "merge_group", "schedule", "workflow_dispatch"]);
const MERGE_QUEUE_PREFIX = "gh-readonly-queue/main/";

/** Every file under a directory, as sorted paths relative to it. */
function listFiles(root, relative = "") {
  const directory = path.join(root, relative);
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, {withFileTypes: true})
    .flatMap((entry) => {
      const child = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) return listFiles(root, child);
      return entry.isFile() ? [child] : [];
    })
    .sort();
}

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

/** The files `tsc` reads for functions/lib, relative to the Functions directory. */
export function buildInputs(functionsDir) {
  const top = fs.readdirSync(functionsDir)
    .filter((name) => /^(package\.json|package-lock\.json|tsconfig[^/]*\.json)$/u.test(name));
  return [...top, ...listFiles(functionsDir, "src")].sort();
}

/** The input hash of a Functions build. */
export function buildInputsHash({functionsDir, nodeVersion, typescriptVersion}) {
  if (!nodeVersion || !typescriptVersion) throw new Error("The Node and TypeScript versions are part of the hash.");
  const hash = crypto.createHash("sha256");
  hash.update(`format ${BUILD_FORMAT}\nnode ${nodeVersion}\ntypescript ${typescriptVersion}\n`);
  for (const file of buildInputs(functionsDir)) {
    hash.update(`${file}\n${sha256(fs.readFileSync(path.join(functionsDir, file)))}\n`);
  }
  return hash.digest("hex");
}

/** The sha256 of every file under a built lib. */
export function libDigest(libDir) {
  const files = listFiles(libDir);
  if (!files.length) throw new Error(`${libDir} holds no built files.`);
  return Object.fromEntries(files.map((file) => [file, sha256(fs.readFileSync(path.join(libDir, file)))]));
}

/**
 * Whether a run may publish, or the deploy may use, a build: main or main's
 * merge queue, on a trusted event. Never a pull request, and never a dispatch
 * on another branch.
 */
export function isTrustedSource({event, branch}) {
  if (!TRUSTED_EVENTS.has(event)) return false;
  return branch === "main" || String(branch ?? "").startsWith(MERGE_QUEUE_PREFIX);
}

/** The artifact name a build is published and looked up under. */
export const artifactName = (hash) => `functions-build-${hash}`;

function main() {
  const {values} = parseArgs({options: {
    "functions-dir": {type: "string", default: "functions"}, "node-version": {type: "string"},
    out: {type: "string"}, "github-output": {type: "string"},
  }});
  if (!values["node-version"] || !values.out) {
    console.error("Usage: functions_build_hash.mjs --functions-dir functions --node-version <v> --out <dir> [--github-output <file>]");
    return 64;
  }
  const functionsDir = values["functions-dir"];
  const typescriptVersion = JSON.parse(fs.readFileSync(
    path.join(functionsDir, "node_modules/typescript/package.json"), "utf8")).version;
  const hash = buildInputsHash({functionsDir, nodeVersion: values["node-version"], typescriptVersion});
  const digest = libDigest(path.join(functionsDir, "lib"));
  const ref = process.env.GITHUB_REF ?? "";
  const branch = ref.startsWith("refs/heads/") ? ref.slice("refs/heads/".length) : "";
  const publish = isTrustedSource({event: process.env.GITHUB_EVENT_NAME, branch});
  fs.mkdirSync(values.out, {recursive: true});
  fs.writeFileSync(path.join(values.out, "lib-digest.json"), `${JSON.stringify(digest, null, 2)}\n`);
  fs.writeFileSync(path.join(values.out, "build.json"), `${JSON.stringify({
    format: BUILD_FORMAT, hash, node: values["node-version"], typescript: typescriptVersion,
    files: Object.keys(digest).length, sha: process.env.GITHUB_SHA ?? null,
    runId: process.env.GITHUB_RUN_ID ?? null, runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
    event: process.env.GITHUB_EVENT_NAME ?? null, branch: branch || null,
  }, null, 2)}\n`);
  console.log(`Functions build ${hash}: ${Object.keys(digest).length} lib files` +
    (publish ? `; publishing ${artifactName(hash)}.` : "; not published (only main and its merge queue publish)."));
  if (values["github-output"]) {
    fs.appendFileSync(values["github-output"], `hash=${hash}\nname=${artifactName(hash)}\npublish=${publish}\n`);
  }
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = main();
