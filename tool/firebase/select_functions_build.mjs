#!/usr/bin/env node
// Ships Functions CI's tested build instead of compiling again (rec 8). The
// backend deploy computes its own input hash (functions_build_hash.mjs), finds
// the artifact CI published under that hash, checks where it came from,
// verifies every file, and installs functions/lib from it. Exit 0 means the
// CI build is installed; any other exit means the deploy compiles as before,
// so the artifact can never fail a deploy, only fail to shorten it.
//
// A candidate is used only if it is named for this hash, has not expired, and
// came from a successful ci.yml (or a dispatched functions-ci.yml) run in this
// repository, not a fork, on a trusted source: main or main's merge queue, on
// a push, merge_group, schedule or workflow_dispatch event. A branch can edit
// a workflow and still run "ci.yml, this repository, success", so a branch
// dispatch or a pull request never supplies a build. The newest match wins.
//
// Usage (Deploy backend, after npm ci and npm run prebuild):
//   select_functions_build.mjs --functions-dir functions --node-version 24
//     --repository owner/name [--summary $GITHUB_STEP_SUMMARY]
// GH_TOKEN must allow actions: read.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {parseArgs} from "node:util";
import {BUILD_FORMAT, artifactName, buildInputsHash, isTrustedSource, libDigest} from "./functions_build_hash.mjs";

export const TRUSTED_WORKFLOWS = new Set([".github/workflows/ci.yml", ".github/workflows/functions-ci.yml"]);
const ALLOWED_ENTRIES = /^(functions\/lib\/.+|build\/functions-build\/(build|lib-digest)\.json)$/u;

/** Why a candidate artifact cannot supply the build, or null when it can. */
export function rejectReason({hash, artifact, run, repositoryId}) {
  if (artifact.name !== artifactName(hash)) return "named for another hash";
  if (artifact.expired) return "expired";
  if (!run) return "its run could not be read";
  if (run.status !== "completed" || run.conclusion !== "success") return `its run ${run.id} did not succeed`;
  if (!TRUSTED_WORKFLOWS.has(run.path)) return `run ${run.id} is ${run.path}, not CI`;
  if (run.repository?.id !== repositoryId || run.head_repository?.id !== repositoryId) {
    return `run ${run.id} is not from this repository`;
  }
  if (!isTrustedSource({event: run.event, branch: run.head_branch})) {
    return `run ${run.id} is a ${run.event} run of ${run.head_branch}, not main or its merge queue`;
  }
  return null;
}

/**
 * The artifact to use and its run, or the reasons there is none.
 *
 * @param {object} input
 * @param {string} input.hash This commit's input hash.
 * @param {Array<object>} input.artifacts Artifacts as the API lists them.
 * @param {Map<number, object>} input.runs Each candidate's workflow run, by id.
 * @param {number} input.repositoryId This repository's id.
 */
export function selectBuild({hash, artifacts, runs, repositoryId}) {
  const reasons = [];
  const candidates = [...artifacts].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  for (const artifact of candidates) {
    const run = runs.get(artifact.workflow_run?.id);
    const reason = rejectReason({hash, artifact, run, repositoryId});
    if (!reason) return {artifact, run};
    reasons.push(`artifact ${artifact.id}: ${reason}`);
  }
  return {reasons: reasons.length ? reasons : [`no ${artifactName(hash)} artifact was published`]};
}

/** Checks an extracted artifact: only the expected files, this hash, and every lib file as digested. */
export function verifyExtracted({dir, hash, entries}) {
  const stray = entries.filter((entry) => !entry.endsWith("/") && !ALLOWED_ENTRIES.test(entry));
  if (stray.length) return `the artifact holds unexpected files (${stray.slice(0, 3).join(", ")})`;
  if (entries.some((entry) => entry.split("/").includes(".."))) return "the artifact holds a path outside its folder";
  let record;
  let digest;
  try {
    record = JSON.parse(fs.readFileSync(path.join(dir, "build/functions-build/build.json"), "utf8"));
    digest = JSON.parse(fs.readFileSync(path.join(dir, "build/functions-build/lib-digest.json"), "utf8"));
  } catch {
    return "the artifact's build record or digest is missing or unreadable";
  }
  if (record.format !== BUILD_FORMAT) return `the build record has format ${record.format}, not ${BUILD_FORMAT}`;
  if (record.hash !== hash) return "the build record names another hash";
  let actual;
  try {
    actual = libDigest(path.join(dir, "functions/lib"));
  } catch {
    return "the artifact holds no built files";
  }
  const expected = Object.keys(digest).sort();
  const files = Object.keys(actual).sort();
  if (JSON.stringify(files) !== JSON.stringify(expected)) return "the built files differ from the digest's list";
  const changed = files.filter((file) => actual[file] !== digest[file]);
  if (changed.length) return `${changed.length} built file(s) do not match the digest (${changed[0]})`;
  return null;
}

function gh(args, options = {}) {
  const result = spawnSync("gh", args, {encoding: options.encoding ?? "utf8", maxBuffer: 256 * 1024 * 1024, timeout: 300_000});
  assert.equal(result.status, 0, `gh ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout;
}

function main() {
  const {values} = parseArgs({options: {
    "functions-dir": {type: "string", default: "functions"}, "node-version": {type: "string"},
    repository: {type: "string"}, summary: {type: "string"},
  }});
  const summary = (line) => {
    console.log(line);
    if (values.summary) fs.appendFileSync(values.summary, `${line}\n`);
  };
  const rebuild = (reason) => {
    console.log(`::warning::Compiling Functions here instead of using CI's tested build: ${reason}.`);
    summary(`- Functions build: compiled here (${reason}).`);
    return 3;
  };
  if (!values["node-version"] || !/^[\w.-]+\/[\w.-]+$/u.test(values.repository ?? "")) {
    console.error("Usage: select_functions_build.mjs --functions-dir functions --node-version <v> --repository <owner/name> [--summary <file>]");
    return 64;
  }
  const functionsDir = values["functions-dir"];
  let hash;
  try {
    const typescriptVersion = JSON.parse(fs.readFileSync(
      path.join(functionsDir, "node_modules/typescript/package.json"), "utf8")).version;
    hash = buildInputsHash({functionsDir, nodeVersion: values["node-version"], typescriptVersion});
  } catch (error) {
    return rebuild(`the input hash could not be computed (${error.message})`);
  }
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "catch-functions-build-"));
  try {
    const repositoryId = JSON.parse(gh(["api", `repos/${values.repository}`])).id;
    const artifacts = JSON.parse(gh(["api", `repos/${values.repository}/actions/artifacts?name=${artifactName(hash)}&per_page=30`])).artifacts;
    const runs = new Map();
    for (const id of new Set(artifacts.map((artifact) => artifact.workflow_run?.id).filter(Boolean))) {
      try {
        runs.set(id, JSON.parse(gh(["api", `repos/${values.repository}/actions/runs/${id}`])));
      } catch {
        // An unreadable run rejects only its own artifacts.
      }
    }
    const choice = selectBuild({hash, artifacts, runs, repositoryId});
    if (!choice.artifact) return rebuild(choice.reasons.join("; "));
    const zip = path.join(work, "build.zip");
    fs.writeFileSync(zip, gh(["api", `repos/${values.repository}/actions/artifacts/${choice.artifact.id}/zip`], {encoding: "buffer"}));
    const listing = spawnSync("unzip", ["-Z1", zip], {encoding: "utf8"});
    if (listing.status !== 0) return rebuild("the artifact could not be listed");
    const entries = listing.stdout.split("\n").filter(Boolean);
    const extract = path.join(work, "x");
    const unzip = spawnSync("unzip", ["-q", zip, "-d", extract], {encoding: "utf8"});
    if (unzip.status !== 0) return rebuild("the artifact could not be extracted");
    const problem = verifyExtracted({dir: extract, hash, entries});
    if (problem) return rebuild(problem);
    const lib = path.join(functionsDir, "lib");
    fs.rmSync(lib, {recursive: true, force: true});
    fs.cpSync(path.join(extract, "functions/lib"), lib, {recursive: true});
    const files = Object.keys(libDigest(lib)).length;
    summary(`- Functions build: using CI's tested build ${hash.slice(0, 12)} from run ${choice.run.id} ` +
      `(${choice.run.event}, ${choice.run.head_branch}, ${String(choice.run.head_sha).slice(0, 8)}; ${files} files verified).`);
    console.log(`Using the CI build of ${hash} from run ${choice.run.id} (${choice.run.html_url}).`);
    return 0;
  } catch (error) {
    return rebuild(error.message.split("\n")[0]);
  } finally {
    fs.rmSync(work, {recursive: true, force: true});
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = main();
