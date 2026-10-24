import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import fs from "node:fs";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {isMainCiSource, waitMainMarketingValidation} from "../../../tool/ci/wait_main_marketing_validation.mjs";
import {canonicalRepository} from "../../../tool/lib/canonical_repository.mjs";

export const preview = Object.freeze({
  project: "catch-dating-app-64e51", region: "asia-south1",
  service: "catch-website-next-preview", repository: "catch-website",
  runtimeIdentity: "github-actions-web-reader@catch-dating-app-64e51.iam.gserviceaccount.com",
  workflow: ".github/workflows/website-next-preview.yml",
});
const sha = value => assert.match(value ?? "", /^[a-f0-9]{40}$/u, "Invalid source SHA");
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
function command(name, args, options = {}) {
  const result = spawnSync(name, args, {encoding: "utf8", maxBuffer: 32 * 1024 * 1024, ...options});
  assert.equal(result.status, 0, result.stderr || `${name} failed`);
  return result.stdout.trim();
}
function github(endpoint) {
  return JSON.parse(command("gh", ["api", "-H", "Cache-Control: no-cache", endpoint]));
}
export function assertPreviewInvocation(env) {
  assert.equal(env.GITHUB_EVENT_NAME, "workflow_dispatch", "Preview is manual only");
  assert.equal(env.GITHUB_REF, "refs/heads/main", "Preview must use accepted main");
  canonicalRepository(env);
  assert.equal(env.GITHUB_WORKFLOW_REF, `${env.GITHUB_REPOSITORY}/${preview.workflow}@refs/heads/main`);
  sha(env.GITHUB_SHA);
}
/** Successful same-source main CI that must also still be the head of main. */
export function assertSuccessfulSource({run, sourceSha, repository, mainSha}) {
  sha(sourceSha);
  assert.equal(mainSha, sourceSha, "Preview source is no longer current main");
  assertSuccessfulSourceRun({run, sourceSha, repository});
}

/**
 * Successful same-source CI for a commit on main, whatever main has merged
 * since: main's push run, or the merge queue run that tested the exact commit
 * main received. A later merge cancels the first, never the second.
 */
export function assertSuccessfulSourceRun({run, sourceSha, repository}) {
  sha(sourceSha);
  assert.equal(run.head_sha, sourceSha);
  assert.ok(isMainCiSource(run), "Source CI must be main's push run or the merge queue run of the same commit");
  assert.equal(run.path?.split("@")[0], ".github/workflows/ci.yml");
  assert.equal(run.repository?.full_name, repository);
  assert.equal(run.head_repository?.full_name, repository);
  assert.equal(run.status, "completed", "Required CI has not finished");
  assert.equal(run.conclusion, "success", "Required CI must pass before preview deployment");
}
// A website release never needs to be the head of main: merges keep landing
// while a release is previewed, approved and promoted. It needs to be on main,
// validated for its exact source, and not older than what is live, so live
// only ever moves forward. The tag records the last promoted commit; before
// the first tagged release, the live runtime's own release header answers.
export const LIVE_RELEASE_TAG = "deployed/prod-website";
const FORWARD = new Set(["ahead", "identical"]);

export function assertReleaseLineage({sourceSha, sourceToMain, liveSha, liveToSource}) {
  sha(sourceSha);
  assert.ok(FORWARD.has(sourceToMain?.status), "Release source is not on main");
  sha(liveSha);
  assert.ok(FORWARD.has(liveToSource?.status), "Release source is older than the live release; live never moves backwards");
}

export async function liveReleaseSha(repository, {request = github, fetchLive = fetch} = {}) {
  const tagged = request(`repos/${repository}/git/matching-refs/tags/${LIVE_RELEASE_TAG}`)
    .filter((ref) => ref.ref === `refs/tags/${LIVE_RELEASE_TAG}`);
  assert.ok(tagged.length <= 1, "Ambiguous live release tag");
  if (tagged.length === 1) {
    assert.equal(tagged[0].object?.type, "commit", "The live release tag must point at a commit");
    return tagged[0].object.sha;
  }
  const response = await fetchLive(`https://catchdates.com/?release-probe=${Date.now()}`,
    {method: "HEAD", redirect: "manual", headers: {"cache-control": "no-cache"}});
  const header = response.headers.get("x-catch-release");
  sha(header);
  return header;
}

export async function currentReleaseLineage(repository, sourceSha, options = {}) {
  const request = options.request ?? github;
  const liveSha = await liveReleaseSha(repository, options);
  const lineage = {sourceSha, liveSha,
    sourceToMain: request(`repos/${repository}/compare/${sourceSha}...main`),
    liveToSource: request(`repos/${repository}/compare/${liveSha}...${sourceSha}`)};
  assertReleaseLineage(lineage);
  return {sourceSha, liveSha, alreadyLive: lineage.liveToSource.status === "identical"};
}

async function authorize() {
  assertPreviewInvocation(process.env);
  const repository = canonicalRepository(process.env), sourceSha = process.env.GITHUB_SHA;
  const result = await waitMainMarketingValidation({repository, sourceSha, maxWaitMs: 0});
  assert.equal(result.validated, true, "Preview requires actual same-source marketing validation");
  assert.ok(result.captureBinding, "Preview requires exact-source captures");
  const run = github(`repos/${repository}/actions/runs/${result.sourceCiRunId}`);
  assert.equal(run.run_attempt, result.sourceCiRunAttempt);
  assertSuccessfulSourceRun({run, sourceSha, repository});
  await currentReleaseLineage(repository, sourceSha);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT,
    `capture_binding=${JSON.stringify(result.captureBinding)}\n`);
  console.log(JSON.stringify(result));
}
export function assertRuntimePolicy(policy) {
  const roles = (policy.bindings ?? []).filter(binding => binding.members?.includes(`serviceAccount:${preview.runtimeIdentity}`));
  assert.equal(roles.length, 1, "Runtime identity must have only one project role");
  assert.equal(roles[0].role, "roles/datastore.viewer", "Runtime identity must be read-only");
  assert.equal(roles[0].condition, undefined, "Unexpected runtime role condition");
}
export function safeArchiveMembers(entries) {
  const names = new Set();
  for (const {name, regular, size} of entries) {
    assert.equal(regular, true, `Non-regular archive member: ${name}`);
    assert.ok(typeof name === "string" && !name.includes("\\") && !name.startsWith("/") &&
      name.split("/").every(segment => segment && segment !== "." && segment !== ".."), "Unsafe archive path");
    assert.ok(["image.tar", "release.json", "firebase.json", ".firebaserc"].includes(name) || name.startsWith("hosting/"), `Unexpected archive member: ${name}`);
    assert.ok(!names.has(name), "Duplicate archive member"); names.add(name);
    assert.ok(Number.isSafeInteger(size) && size >= 0 && size <= 2 * 1024 ** 3, "Invalid member size");
  }
  for (const required of ["image.tar", "release.json", "firebase.json", ".firebaserc"]) assert.ok(names.has(required), `Missing ${required}`);
  assert.ok(entries.reduce((sum, entry) => sum + entry.size, 0) <= 3 * 1024 ** 3, "Archive too large");
}
function prepare() {
  sha(process.env.GITHUB_SHA);
  const output = "build/next-preview/package";
  assert.ok(!fs.existsSync(output), "Preview package already exists");
  fs.mkdirSync(output, {recursive: true});
  fs.copyFileSync("build/next-preview/image.tar", `${output}/image.tar`);
  fs.cpSync("website/public", `${output}/hosting`, {recursive: true});
  const config = JSON.parse(fs.readFileSync("website/next-hosting.preview.json", "utf8"));
  assert.equal(config.hosting.public, "public"); config.hosting.public = "hosting";
  fs.writeFileSync(`${output}/firebase.json`, JSON.stringify(config));
  const rc = JSON.parse(fs.readFileSync(".firebaserc", "utf8"));
  assert.deepEqual(rc.targets[preview.project].hosting.marketing, [preview.project]);
  fs.writeFileSync(`${output}/.firebaserc`, JSON.stringify({projects: {prod: preview.project},
    targets: {[preview.project]: {hosting: {marketing: [preview.project]}}}}));
  const imageId = command("docker", ["image", "inspect", "catch-website-preview:build", "--format", "{{.Id}}"]);
  assert.match(imageId, /^sha256:[a-f0-9]{64}$/u);
  fs.writeFileSync(`${output}/release.json`, JSON.stringify({schema: "catch.next-preview/v1",
    sourceSha: process.env.GITHUB_SHA, runId: process.env.GITHUB_RUN_ID,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT, imageId, ...preview}));
  // Archive regular files only; the deployment reader rejects links and unsafe names.
  const list = command("find", [".", "-type", "f"], {cwd: output}).split("\n").map(name => name.replace(/^\.\//u, "")).sort();
  command("tar", ["-czf", "../release.tgz", ...list], {cwd: output, env: {...process.env, COPYFILE_DISABLE: "1"}});
  const hash = digest(fs.readFileSync("build/next-preview/release.tgz"));
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `release_sha256=${hash}\n`);
}
export function unpackPreview({sourceSha, runId, runAttempt, archiveHash}) {
  const archive = "build/next-preview/release.tgz";
  assert.match(archiveHash ?? "", /^[a-f0-9]{64}$/u);
  assert.equal(digest(fs.readFileSync(archive)), archiveHash, "Preview bytes differ from build job");
  const entries = JSON.parse(command("python3", ["-c", `import json,tarfile,sys
with tarfile.open(sys.argv[1],'r:gz') as archive:
 print(json.dumps([{'name':m.name,'regular':m.isfile(),'size':m.size} for m in archive.getmembers()]))`, archive]));
  safeArchiveMembers(entries);
  const output = "build/next-preview/verified";
  assert.ok(!fs.existsSync(output)); fs.mkdirSync(output);
  command("python3", ["-c", `import tarfile,sys,pathlib,shutil
root=pathlib.Path(sys.argv[2]).resolve()
with tarfile.open(sys.argv[1],'r:gz') as archive:
 for member in archive.getmembers():
  relative=pathlib.PurePosixPath(member.name)
  assert member.isfile() and not relative.is_absolute() and '..' not in relative.parts
  destination=root.joinpath(*relative.parts)
  destination.parent.mkdir(parents=True,exist_ok=True)
  with archive.extractfile(member) as source, destination.open('xb') as target:
   shutil.copyfileobj(source,target)`, archive, output]);
  const release = JSON.parse(fs.readFileSync(`${output}/release.json`, "utf8"));
  assert.equal(release.schema, "catch.next-preview/v1");
  assert.equal(release.sourceSha, sourceSha);
  assert.equal(release.runId, runId);
  assert.equal(release.runAttempt, runAttempt);
  for (const [key, value] of Object.entries(preview)) assert.equal(release[key], value);
  const expectedConfig = JSON.parse(fs.readFileSync("website/next-hosting.preview.json", "utf8"));
  expectedConfig.hosting.public = "hosting";
  assert.deepEqual(JSON.parse(fs.readFileSync(`${output}/firebase.json`, "utf8")), expectedConfig);
  assert.deepEqual(JSON.parse(fs.readFileSync(`${output}/.firebaserc`, "utf8")), {projects: {prod: preview.project},
    targets: {[preview.project]: {hosting: {marketing: [preview.project]}}}});
  command("docker", ["load", "--input", `${output}/image.tar`]);
  assert.equal(command("docker", ["image", "inspect", "catch-website-preview:build", "--format", "{{.Id}}"]), release.imageId);
  console.log(JSON.stringify(release));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === "authorize") await authorize();
  else if (process.argv[2] === "prepare") prepare();
  else if (process.argv[2] === "unpack") unpackPreview({sourceSha: process.env.GITHUB_SHA, runId: process.env.GITHUB_RUN_ID, runAttempt: process.env.GITHUB_RUN_ATTEMPT, archiveHash: process.env.RELEASE_SHA256});
  else throw new Error("Expected authorize, prepare, or unpack");
}
