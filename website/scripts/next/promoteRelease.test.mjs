import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import {spawnSync} from "node:child_process";
import {assertPromotionInvocation, selectPreviewArtifact, productionHostingConfig, assertPreviewRuntime, assertProductionTarget, production,
  releaseTagUpdate} from "./promoteRelease.mjs";
import {liveVersionName, usesNextRuntime} from "./hostingState.mjs";
import {LIVE_RELEASE_TAG, preview} from "./previewRelease.mjs";
import {CANONICAL_REPOSITORY_ID} from "../../../tool/lib/canonical_repository.mjs";
const sourceSha = "a".repeat(40), repository = "suvratgarg/catch-dating-app";
const env = {GITHUB_EVENT_NAME: "workflow_dispatch", GITHUB_REF: "refs/heads/main", GITHUB_REPOSITORY: repository, GITHUB_REPOSITORY_ID: "1170579691",
  GITHUB_WORKFLOW_REF: `${repository}/${production.workflow}@refs/heads/main`, GITHUB_RUN_ATTEMPT: "1", GITHUB_SHA: sourceSha, PREVIEW_RUN_ID: "123"};
const fixture = () => ({sourceSha, workflow: {id: 7, path: preview.workflow}, run: {id: 123, run_attempt: 1, workflow_id: 7,
  path: preview.workflow, head_sha: sourceSha, head_branch: "main", event: "workflow_dispatch", status: "completed", conclusion: "success",
  repository: {id: CANONICAL_REPOSITORY_ID, full_name: repository}, head_repository: {id: CANONICAL_REPOSITORY_ID}}, artifacts: [{id: 456, name: `next-preview-${sourceSha}-123-1`, expired: false,
    digest: `sha256:${"b".repeat(64)}`, workflow_run: {id: 123, head_sha: sourceSha, repository_id: CANONICAL_REPOSITORY_ID, head_repository_id: CANONICAL_REPOSITORY_ID}}]});
test("production promotion rejects other workflows, refs, automatic calls and reruns", () => {
  assertPromotionInvocation(env);
  for (const [key, value] of Object.entries({GITHUB_EVENT_NAME: "push", GITHUB_REF: "refs/heads/feature", GITHUB_REPOSITORY: "fork/repo", GITHUB_REPOSITORY_ID: "1",
    GITHUB_WORKFLOW_REF: `${repository}/${preview.workflow}@refs/heads/main`, GITHUB_RUN_ATTEMPT: "2", GITHUB_SHA: "short", PREVIEW_RUN_ID: "1; bad"})) {
    assert.throws(() => assertPromotionInvocation({...env, [key]: value}));
  }
});
test("only the successful exact-source preview attempt and immutable artifact authorize promotion", () => {
  const good = fixture(); assert.equal(selectPreviewArtifact(good).artifactId, "456");
  for (const change of [{head_sha: "c".repeat(40)}, {head_branch: "feature"}, {event: "pull_request"}, {status: "in_progress"},
    {conclusion: "failure"}, {workflow_id: 8}, {run_attempt: 2}, {head_repository: {id: 11}}, {repository: {id: 11, full_name: repository}, head_repository: {id: 11}}, {path: ".github/workflows/other.yml"}]) {
    assert.throws(() => selectPreviewArtifact({...good, run: {...good.run, ...change}}));
  }
  for (const change of [{expired: true}, {digest: null}, {name: "other"}, {workflow_run: {...good.artifacts[0].workflow_run, head_sha: "c".repeat(40)}}]) {
    assert.throws(() => selectPreviewArtifact({...good, artifacts: [{...good.artifacts[0], ...change}]}));
  }
  assert.throws(() => selectPreviewArtifact({...good, artifacts: [...good.artifacts, ...good.artifacts]}));
});
test("production config changes only runtime destination and global preview indexing", () => {
  const original = JSON.parse(fs.readFileSync(new URL("../../next-hosting.preview.json", import.meta.url))); original.hosting.public = "hosting";
  const result = productionHostingConfig(original);
  assert.equal(original.hosting.rewrites.at(-1).run.serviceId, preview.service);
  assert.equal(result.hosting.rewrites.at(-1).run.serviceId, production.service);
  assert.equal(result.hosting.rewrites.at(-1).run.pinTag, true);
  assert.deepEqual(result.hosting.rewrites.slice(0, -1), original.hosting.rewrites.slice(0, -1));
  assert.deepEqual(result.hosting.redirects, original.hosting.redirects);
  assert.deepEqual(result.hosting.ignore, original.hosting.ignore);
  assert.deepEqual(result.hosting.headers, original.hosting.headers.filter(rule => rule.source !== "**"));
  assert.throws(() => productionHostingConfig({...original, hosting: {...original.hosting, target: "admin"}}));
  assert.throws(() => productionHostingConfig({...original, hosting: {...original.hosting, rewrites: []}}));
});
test("deployed preview must still serve the tested digest, source and read-only identity", () => {
  const image = `${preview.region}-docker.pkg.dev/${preview.project}/${preview.repository}/next@sha256:${"d".repeat(64)}`;
  const service = {metadata: {name: preview.service, labels: {"source-sha": sourceSha}}, status: {latestCreatedRevisionName: "rev1", latestReadyRevisionName: "rev1"},
    spec: {template: {spec: {serviceAccountName: preview.runtimeIdentity, containers: [{image, env: [{name: "CATCH_WEBSITE_STAGE", value: "preview"}, {name: "CATCH_PUBLIC_FIRESTORE_PROJECT", value: preview.project}]}]}}}};
  assertPreviewRuntime(service, sourceSha, image);
  for (const change of [s => {s.status.latestReadyRevisionName = "rev0";}, s => {s.metadata.labels["source-sha"] = "c".repeat(40);},
    s => {s.spec.template.spec.serviceAccountName = "other";}, s => {s.spec.template.spec.containers[0].image += "x";},
    s => {s.spec.template.spec.containers[0].env[0].value = "production";}]) {
    const wrong = structuredClone(service); change(wrong); assert.throws(() => assertPreviewRuntime(wrong, sourceSha, image));
  }
});
test("live Hosting guard detects Next ownership and refuses incomplete metadata", () => {
  const name = "projects/catch-dating-app-64e51/sites/catch-dating-app-64e51/versions/abc123";
  assert.equal(liveVersionName({releases: [{version: {name}}]}), name);
  assert.throws(() => liveVersionName({releases: []}));
  assert.throws(() => liveVersionName({releases: [{version: {name: "projects/other/sites/other/versions/a"}}]}));
  assert.equal(usesNextRuntime({status: "FINALIZED", config: {rewrites: [{source: "**", destination: "/index.html"}]}}), false);
  assert.equal(usesNextRuntime({status: "FINALIZED", config: {rewrites: [{source: "**", run: {serviceId: production.service}}]}}), true);
  assert.throws(() => usesNextRuntime({status: "CREATED", config: {rewrites: []}}));
  assert.throws(() => usesNextRuntime({status: "FINALIZED"}));
});
test("production workflow preserves credentials boundary, tested bytes, shared lock and rollback", () => {
  const workflow = fs.readFileSync(new URL("../../../.github/workflows/website-next-promote.yml", import.meta.url), "utf8");
  assert.match(workflow, /group: web-hosting-marketing/u);
  assert.ok(workflow.indexOf("promoteRelease.mjs prepare") < workflow.indexOf("google-github-actions/auth"));
  assert.doesNotMatch(workflow, /docker build|npm ci|npm run build|--force|firebase deploy/u);
  assert.ok(workflow.indexOf("hostingState.mjs snapshot") < workflow.indexOf("gcloud run deploy"));
  assert.ok(workflow.indexOf("candidate-checks.json") < workflow.indexOf("firebase hosting:clone"));
  assert.match(workflow, /hosting:clone "catch-dating-app-64e51@\$version" catch-dating-app-64e51:live/u);
  assert.match(workflow, /--min-instances 0 --max-instances 3/u);
  assert.match(workflow, /hostingState.mjs assert-current/u);
  assert.match(workflow, /EXPECTED_HOSTING_VERSION="\$version"/u);
  assert.match(workflow, /channelState.mjs" record next-release/u);
  assert.ok(workflow.indexOf("channelState.mjs verify") < workflow.indexOf("firebase hosting:clone"));
  assert.ok(workflow.includes("jq -er .version build/next-promote/candidate-channel.json"));
  assert.doesNotMatch(workflow, /result.marketing.version/u);
  const legacy = fs.readFileSync(new URL("../../../.github/workflows/_web-hosting-promote.yml", import.meta.url), "utf8");
  assert.ok(legacy.indexOf("hostingState.mjs legacy-guard") < legacy.indexOf("prod deploy"));
  // The deploy also waits on both superseded checks; the legacy guard comes first.
  assert.match(legacy, /if: \$\{\{ steps.legacy-runtime.outputs.retired != 'true' && steps.authorize.outputs.superseded != 'true' && steps.freshness.outputs.superseded != 'true' \}\}/u);
  const lines = workflow.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!/^        run: \|$/u.test(lines[i])) continue;
    const script = [];
    while (++i < lines.length && (lines[i].startsWith("          ") || lines[i] === "")) script.push(lines[i].slice(10));
    i--;
    const checked = spawnSync("bash", ["-n"], {input: script.join("\n"), encoding: "utf8"});
    assert.equal(checked.status, 0, checked.stderr);
  }
});

test("production target cannot replace an unrelated or secret-bearing service", () => {
  assertProductionTarget([]);
  const service = {metadata: {name: production.service, labels: {"catch-surface": "website"}}, spec: {template: {spec: {serviceAccountName: preview.runtimeIdentity, containers: [{env: [{name: "CATCH_WEBSITE_STAGE", value: "production"}]}]}}}};
  assertProductionTarget([service]);
  for (const change of [s => {s.metadata.labels["catch-surface"] = "other";}, s => {s.spec.template.spec.serviceAccountName = "other";},
    s => {s.spec.template.spec.containers[0].env.push({name: "PRIVATE", valueFrom: {secretKeyRef: {name: "secret"}}});}]) {
    const wrong = structuredClone(service); change(wrong); assert.throws(() => assertProductionTarget([wrong]));
  }
});

test("promotion releases the preview's own source and moves the live tag only forward", () => {
  const workflow = fs.readFileSync(new URL("../../../.github/workflows/website-next-promote.yml", import.meta.url), "utf8");
  // Main may have moved since the preview; the release is the preview's source.
  assert.match(workflow, /release="\$\(jq -er \.sourceSha build\/next-promote\/authorization\.json\)"/u);
  assert.doesNotMatch(workflow, /CATCH_RELEASE_SHA=\$GITHUB_SHA|source-sha=\$GITHUB_SHA|process\.env\.GITHUB_SHA/u);
  assert.match(workflow, /CATCH_RELEASE_SHA=\$RELEASE_SHA/u);
  assert.ok(workflow.indexOf("deployedSmoke.mjs https://catchdates.com") < workflow.indexOf("promoteRelease.mjs record"),
    "the tag moves only after the live checks pass");
  const live = "c".repeat(40);
  assert.deepEqual(releaseTagUpdate({existing: null, sourceSha, lineage: {sourceSha, liveSha: live}}),
    {method: "POST", endpoint: "git/refs", fields: {ref: `refs/tags/${LIVE_RELEASE_TAG}`, sha: sourceSha}});
  assert.deepEqual(releaseTagUpdate({existing: live, sourceSha, lineage: {sourceSha, liveSha: live}}),
    {method: "PATCH", endpoint: `git/refs/tags/${LIVE_RELEASE_TAG}`, fields: {sha: sourceSha, force: true}});
  assert.throws(() => releaseTagUpdate({existing: "d".repeat(40), sourceSha, lineage: {sourceSha, liveSha: live}}),
    /moved during promotion/u);
  assert.throws(() => releaseTagUpdate({existing: live, sourceSha, lineage: {sourceSha: "e".repeat(40), liveSha: live}}));
});
