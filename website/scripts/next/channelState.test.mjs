import assert from "node:assert/strict";
import test from "node:test";
import {channelVersion, readChannel} from "./channelState.mjs";
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
