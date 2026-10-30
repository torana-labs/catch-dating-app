import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import {assertChannelPinsRevision, assertRevisionServes, channelVersion, deployedRevision, previewRevisionTag, readChannel} from "./channelState.mjs";
import {brand} from "@catch/brand";

const site = "projects/catch-dating-app-64e51/sites/catch-dating-app-64e51";
const channel = () => ({name: `${site}/channels/next-release`,
  url: "https://catch-dating-app-64e51--next-release-proof.web.app",
  release: {type: "DEPLOY", version: {name: `${site}/versions/abc123`, status: "FINALIZED",
    config: {rewrites: [{glob: "**", run: {serviceId: "catch-website-next", region: "asia-south1", tag: "fh-abc123"}}]}}}});
test("channel readback binds the exact finalized version and pinned runtime", () => {
  const result = channelVersion(channel(), "next-release", "catch-website-next");
  assert.equal(result.version, "abc123"); assert.equal(result.url, channel().url);
  for (const mutate of [
    c => c.name = `${site}/channels/live`,
    c => c.release.version.name = "projects/other/sites/other/versions/abc123",
    c => c.release.version.status = "CREATED",
    c => c.release.type = "ROLLBACK",
    c => c.release.version.config.rewrites[0].run.serviceId = "unrelated",
    c => c.release.version.config.rewrites[0].run.region = "us-central1",
    c => delete c.release.version.config.rewrites[0].run.tag,
    c => c.url = brand.web.origin,
    c => c.url = "https://catch-dating-app-64e51--next-release-proofXwebXapp",
  ]) {const c = channel(); mutate(c); assert.throws(() => channelVersion(c, "next-release", "catch-website-next"));}
});
test("channel API failures and empty credentials cannot produce a version", async () => {
  const runCommand = () => ({status: 0, stdout: "short-lived-token"});
  let calls = 0;
  const result = await readChannel("next-release", "catch-website-next", {runCommand, fetchImpl: async (url, init) => {
    calls++; assert.equal(url, `https://firebasehosting.googleapis.com/v1beta1/${site}/channels/next-release`);
    assert.equal(init.headers["x-goog-user-project"], undefined);
    return Response.json(channel());
  }});
  assert.equal(calls, 1); assert.equal(result.version, "abc123");
  await assert.rejects(readChannel("next-release", "catch-website-next", {runCommand,
    fetchImpl: async () => new Response("", {status: 403})}));
  await assert.rejects(readChannel("next-release", "catch-website-next", {runCommand: () => ({status: 0, stdout: ""}),
    fetchImpl: () => {throw new Error("must not fetch");}}));
  await assert.rejects(readChannel("live", "catch-website-next", {runCommand}));
});

const sourceSha = "5".repeat(40), previous = "3".repeat(40);
const tag = "fh-r41075702618-1", serviceUrl = "574779808785.asia-south1.run.app";
// `gcloud run services describe` right after this run's deploy: the previous
// run's revision keeps its Hosting tag, the new one has this run's tag and all traffic.
const described = () => ({metadata: {name: "catch-website-next-preview", labels: {"source-sha": sourceSha}},
  spec: {template: {spec: {containers: [{env: [{name: "CATCH_WEBSITE_STAGE", value: "preview"}, {name: "CATCH_RELEASE_SHA", value: sourceSha}]}]}}},
  status: {latestReadyRevisionName: "catch-website-next-preview-00028-ql4", latestCreatedRevisionName: "catch-website-next-preview-00028-ql4",
    traffic: [{revisionName: "catch-website-next-preview-00028-ql4", percent: 100, latestRevision: true},
      {revisionName: "catch-website-next-preview-00027-shm", tag: "fh-4d21e678e0f4ddb0", url: `https://fh-4d21e678e0f4ddb0---catch-website-next-preview-${serviceUrl}`},
      {revisionName: "catch-website-next-preview-00028-ql4", tag, url: `https://${tag}---catch-website-next-preview-${serviceUrl}`}]}});
const candidate = pinned => channelVersion({name: `${site}/channels/next-candidate`,
  url: "https://catch-dating-app-64e51--next-candidate-tnpxnhes.web.app",
  release: {type: "DEPLOY", version: {name: `${site}/versions/752dd92bea43b8bd`, status: "FINALIZED",
    config: {rewrites: [{glob: "**", run: {serviceId: "catch-website-next-preview", region: "asia-south1", tag: pinned}}]}}}},
"next-candidate", "catch-website-next-preview");

test("each preview run tags the revision it creates, within Cloud Run's name limit", () => {
  assert.equal(previewRevisionTag("41075702618", "1"), tag);
  assert.match(previewRevisionTag(999999999999, 99), /^fh-r[0-9]+-[0-9]+$/u);
  for (const [run, attempt] of [["", "1"], ["0", "1"], ["1", "0"], ["1; rm", "1"], [undefined, "1"]]) assert.throws(() => previewRevisionTag(run, attempt));
  assert.throws(() => previewRevisionTag("1".repeat(17), "1"), /too long/u);
});

test("the candidate channel must pin the revision this run deployed, never the previous run's", () => {
  const deployed = deployedRevision(described(), "catch-website-next-preview", sourceSha, tag);
  assert.deepEqual(deployed, {revision: "catch-website-next-preview-00028-ql4", tag, url: `https://${tag}---catch-website-next-preview-${serviceUrl}`});
  assert.equal(assertChannelPinsRevision(candidate(tag), deployed).revision, "catch-website-next-preview-00028-ql4");
  // Run 41075702618: the channel answered with the previous release. A pin on
  // the previous run's tag is exactly that, and fails naming both revisions.
  assert.throws(() => assertChannelPinsRevision(candidate("fh-4d21e678e0f4ddb0"), deployed),
    /pins fh-4d21e678e0f4ddb0, not this run's revision catch-website-next-preview-00028-ql4/u);
  assert.throws(() => assertChannelPinsRevision(candidate("fh-752dd92bea43b8bd"), deployed));
  for (const mutate of [
    s => s.status.traffic[2].revisionName = "catch-website-next-preview-00027-shm",
    s => s.status.traffic.pop(),
    s => s.status.traffic.push({...s.status.traffic[2]}),
    s => s.status.latestCreatedRevisionName = "catch-website-next-preview-00029-new",
    s => s.spec.template.spec.containers[0].env[1].value = previous,
    s => s.metadata.labels["source-sha"] = previous,
    s => s.metadata.name = "catch-website-next",
    s => s.status.traffic[2].url = "https://unrelated.example",
  ]) {const s = described(); mutate(s); assert.throws(() => deployedRevision(s, "catch-website-next-preview", sourceSha, tag));}
});

test("the pinned revision itself must answer as the release", async () => {
  const url = `https://${tag}---catch-website-next-preview-${serviceUrl}`;
  const answering = release => async requested => {
    assert.equal(requested, `${url}/robots.txt`);
    return new Response("User-agent: *\nDisallow: /\n", {headers: {"x-catch-release": release}});
  };
  await assertRevisionServes(url, sourceSha, {fetchImpl: answering(sourceSha)});
  await assert.rejects(assertRevisionServes(url, sourceSha, {fetchImpl: answering(previous)}), /does not serve/u);
});

test("the preview deploy tags its revision and checks the channel pin before any smoke check", () => {
  const workflow = fs.readFileSync(new URL("../../../.github/workflows/website-next-preview.yml", import.meta.url), "utf8");
  assert.match(workflow, /previewRevisionTag\(process\.env\.GITHUB_RUN_ID, process\.env\.GITHUB_RUN_ATTEMPT\)/u);
  assert.match(workflow, /gcloud run deploy catch-website-next-preview [^\n]*\n\s+--image "\$pinned" --tag "\$tag" /u);
  const record = workflow.indexOf("channelState.mjs record next-candidate"), pin = workflow.indexOf("channelState.mjs pinned build/next-preview/channel.json build/next-preview/service.json");
  assert.ok(workflow.indexOf("> build/next-preview/service.json") < workflow.indexOf("hosting:channel:deploy next-candidate"));
  assert.ok(record > 0 && record < pin && pin < workflow.indexOf("deployedSmoke.mjs"));
});
