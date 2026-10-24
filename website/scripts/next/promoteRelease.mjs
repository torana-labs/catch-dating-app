import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import fs from "node:fs";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {LIVE_RELEASE_TAG, preview, assertSuccessfulSourceRun, currentReleaseLineage, unpackPreview} from "./previewRelease.mjs";
import {waitMainMarketingValidation} from "../../../tool/ci/wait_main_marketing_validation.mjs";
import {CANONICAL_REPOSITORY_ID, canonicalRepository} from "../../../tool/lib/canonical_repository.mjs";

export const production = Object.freeze({service: "catch-website-next", channel: "next-release",
  workflow: ".github/workflows/website-next-promote.yml"});
const directory = "build/next-promote";
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
function command(name, args, options = {}) {
  const result = spawnSync(name, args, {encoding: "utf8", maxBuffer: 32 * 1024 * 1024, ...options});
  assert.equal(result.status, 0, result.stderr || `${name} failed`); return result.stdout;
}
const github = endpoint => JSON.parse(command("gh", ["api", "-H", "Cache-Control: no-cache", endpoint]));
export function assertPromotionInvocation(env) {
  assert.equal(env.GITHUB_EVENT_NAME, "workflow_dispatch"); assert.equal(env.GITHUB_REF, "refs/heads/main");
  const repository = canonicalRepository(env);
  assert.equal(env.GITHUB_WORKFLOW_REF, `${repository}/${production.workflow}@refs/heads/main`);
  assert.equal(env.GITHUB_RUN_ATTEMPT, "1", "Use a new dispatch after inspecting a failed or partial promotion");
  assert.match(env.GITHUB_SHA ?? "", /^[a-f0-9]{40}$/u);
  assert.match(env.PREVIEW_RUN_ID ?? "", /^[1-9][0-9]*$/u);
}
export function selectPreviewArtifact({run, workflow, artifacts, sourceSha}) {
  assert.equal(workflow.path, preview.workflow); assert.equal(run.workflow_id, workflow.id);
  assert.equal(run.path?.split("@")[0], preview.workflow);
  assert.equal(run.head_sha, sourceSha); assert.equal(run.head_branch, "main");
  assert.equal(run.event, "workflow_dispatch"); assert.equal(run.status, "completed"); assert.equal(run.conclusion, "success");
  assert.equal(run.repository?.id, CANONICAL_REPOSITORY_ID); assert.equal(run.head_repository?.id, run.repository?.id);
  assert.ok(Number.isSafeInteger(run.id) && run.id > 0 && Number.isSafeInteger(run.run_attempt) && run.run_attempt > 0);
  const name = `next-preview-${sourceSha}-${run.id}-${run.run_attempt}`;
  const matches = artifacts.filter(item => item.name === name); assert.equal(matches.length, 1, "Exact preview artifact is missing or ambiguous");
  const artifact = matches[0]; assert.ok(Number.isSafeInteger(artifact.id) && artifact.id > 0); assert.equal(artifact.expired, false);
  assert.match(artifact.digest ?? "", /^sha256:[a-f0-9]{64}$/u);
  assert.equal(artifact.workflow_run?.id, run.id); assert.equal(artifact.workflow_run?.head_sha, sourceSha);
  assert.equal(artifact.workflow_run?.repository_id, run.repository.id);
  assert.equal(artifact.workflow_run?.head_repository_id, run.repository.id);
  return {sourceSha, previewRunId: String(run.id), previewAttempt: String(run.run_attempt), artifactId: String(artifact.id), artifactDigest: artifact.digest};
}
export function productionHostingConfig(previewConfig) {
  const config = structuredClone(previewConfig), hosting = config.hosting;
  assert.equal(hosting.target, "marketing"); assert.equal(hosting.public, "hosting");
  assert.deepEqual(hosting.rewrites.at(-1), {source: "**", run: {serviceId: preview.service, region: preview.region, pinTag: true}});
  hosting.rewrites.at(-1).run.serviceId = production.service;
  const global = hosting.headers.filter(rule => rule.source === "**");
  assert.equal(global.length, 1); assert.deepEqual(global[0].headers, [{key: "X-Robots-Tag", value: "noindex, nofollow"}]);
  hosting.headers = hosting.headers.filter(rule => rule.source !== "**");
  return config;
}
export function assertPreviewRuntime(service, sourceSha, expectedImage) {
  assert.equal(service.metadata?.name, preview.service);
  assert.equal(service.metadata?.labels?.["source-sha"], sourceSha);
  assert.ok(service.status?.latestReadyRevisionName);
  assert.equal(service.status.latestCreatedRevisionName, service.status.latestReadyRevisionName);
  const spec = service.spec?.template?.spec;
  assert.equal(spec?.serviceAccountName, preview.runtimeIdentity);
  assert.equal(spec.containers.length, 1); assert.equal(spec.containers[0].image, expectedImage);
  assert.match(expectedImage, new RegExp(`^${preview.region}-docker\\.pkg\\.dev/${preview.project}/${preview.repository}/next@sha256:[a-f0-9]{64}$`, "u"));
  assert.equal(spec.containers[0].env.find(item => item.name === "CATCH_WEBSITE_STAGE")?.value, "preview");
  assert.equal(spec.containers[0].env.find(item => item.name === "CATCH_PUBLIC_FIRESTORE_PROJECT")?.value, preview.project);
}
export function assertProductionTarget(services) {
  assert.ok(Array.isArray(services));
  const matches = services.filter(service => service.metadata?.name === production.service);
  assert.ok(matches.length <= 1, "Ambiguous production service");
  if (!matches.length) return;
  const service = matches[0];
  assert.equal(service.metadata.labels?.["catch-surface"], "website", "Production service is not owned by this release path");
  assert.equal(service.spec?.template?.spec?.serviceAccountName, preview.runtimeIdentity);
  const containers = service.spec.template.spec.containers;
  assert.equal(containers.length, 1);
  for (const item of containers[0].env ?? []) {
    assert.ok(["CATCH_WEBSITE_STAGE", "CATCH_PUBLIC_FIRESTORE_PROJECT", "CATCH_RELEASE_SHA"].includes(item.name), "Unexpected production environment binding");
    assert.equal(item.valueFrom, undefined, "Do not replace a secret-bearing runtime");
  }
}
// The release is the accepted preview's own source, which main may have
// moved past since; the workflow's checkout only supplies trusted scripts.
async function authorize() {
  assertPromotionInvocation(process.env);
  const repository = canonicalRepository(process.env);
  const run = github(`repos/${repository}/actions/runs/${process.env.PREVIEW_RUN_ID}`);
  const sourceSha = run.head_sha;
  const validation = await waitMainMarketingValidation({repository, sourceSha, maxWaitMs: 0});
  assert.equal(validation.validated, true); assert.ok(validation.captureBinding);
  const ci = github(`repos/${repository}/actions/runs/${validation.sourceCiRunId}`);
  assert.equal(ci.run_attempt, validation.sourceCiRunAttempt);
  assertSuccessfulSourceRun({run: ci, sourceSha, repository});
  await currentReleaseLineage(repository, sourceSha);
  const workflow = github(`repos/${repository}/actions/workflows/website-next-preview.yml`);
  const artifacts = JSON.parse(command("gh", ["api", "--paginate", "--slurp", `repos/${repository}/actions/runs/${run.id}/artifacts?per_page=100`])).flatMap(page => page.artifacts);
  return selectPreviewArtifact({run, workflow, artifacts, sourceSha});
}
async function prepare() {
  const binding = await authorize(), repository = canonicalRepository();
  assert.ok(!fs.existsSync(directory)); fs.mkdirSync(directory, {recursive: true});
  fs.writeFileSync(`${directory}/authorization.json`, JSON.stringify(binding));
  const descriptor = fs.openSync(`${directory}/artifact.zip`, "wx");
  try { command("gh", ["api", `repos/${repository}/actions/artifacts/${binding.artifactId}/zip`], {stdio: ["ignore", descriptor, "pipe"]}); }
  finally {fs.closeSync(descriptor);}
  assert.equal(`sha256:${hash(fs.readFileSync(`${directory}/artifact.zip`))}`, binding.artifactDigest);
  fs.mkdirSync("build/next-preview", {recursive: true});
  command("python3", ["-c", `import zipfile,sys,shutil,stat
with zipfile.ZipFile(sys.argv[1]) as archive:
 members=archive.infolist()
 assert len(members)==1 and members[0].filename=='release.tgz'
 assert members[0].file_size <= 3*1024**3 and not stat.S_ISLNK(members[0].external_attr>>16)
 with archive.open(members[0]) as source, open(sys.argv[2],'xb') as target: shutil.copyfileobj(source,target)`, `${directory}/artifact.zip`, "build/next-preview/release.tgz"]);
  const archiveHash = hash(fs.readFileSync("build/next-preview/release.tgz"));
  unpackPreview({sourceSha: binding.sourceSha, runId: binding.previewRunId, runAttempt: binding.previewAttempt, archiveHash});
  const verified = "build/next-preview/verified";
  const config = productionHostingConfig(JSON.parse(fs.readFileSync(`${verified}/firebase.json`, "utf8")));
  fs.writeFileSync(`${verified}/firebase.production.json`, JSON.stringify(config));
  const image = `${preview.region}-docker.pkg.dev/${preview.project}/${preview.repository}/next:${binding.sourceSha}-${binding.previewRunId}-${binding.previewAttempt}`;
  fs.writeFileSync(`${directory}/image-tag.txt`, image);
  console.log(JSON.stringify(binding));
}
async function recheck() {
  const binding = await authorize();
  assert.deepEqual(binding, JSON.parse(fs.readFileSync(`${directory}/authorization.json`, "utf8")));
}
/** Moves deployed/prod-website forward to the promoted commit, never back. */
export function releaseTagUpdate({existing, sourceSha, lineage}) {
  assert.equal(lineage.sourceSha, sourceSha);
  if (existing === null) return {method: "POST", endpoint: "git/refs", fields: {ref: `refs/tags/${LIVE_RELEASE_TAG}`, sha: sourceSha}};
  assert.equal(lineage.liveSha, existing, "The live release tag moved during promotion");
  return {method: "PATCH", endpoint: `git/refs/tags/${LIVE_RELEASE_TAG}`, fields: {sha: sourceSha, force: true}};
}
async function record() {
  const binding = await authorize();
  assert.deepEqual(binding, JSON.parse(fs.readFileSync(`${directory}/authorization.json`, "utf8")));
  const repository = canonicalRepository();
  const lineage = await currentReleaseLineage(repository, binding.sourceSha);
  const existing = github(`repos/${repository}/git/matching-refs/tags/${LIVE_RELEASE_TAG}`)
    .find((ref) => ref.ref === `refs/tags/${LIVE_RELEASE_TAG}`)?.object?.sha ?? null;
  const update = releaseTagUpdate({existing, sourceSha: binding.sourceSha, lineage});
  const fields = Object.entries(update.fields).flatMap(([key, value]) =>
    typeof value === "boolean" ? ["-F", `${key}=${value}`] : ["-f", `${key}=${value}`]);
  command("gh", ["api", "-X", update.method, `repos/${repository}/${update.endpoint}`, ...fields]);
  console.log(`${LIVE_RELEASE_TAG} -> ${binding.sourceSha}`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === "prepare") await prepare();
  else if (process.argv[2] === "recheck") await recheck();
  else if (process.argv[2] === "record") await record();
  else throw new Error("Expected prepare, recheck or record");
}
