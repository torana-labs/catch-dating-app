import assert from "node:assert/strict";
import fs from "node:fs";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
const site = "projects/catch-dating-app-64e51/sites/catch-dating-app-64e51";

export function channelVersion(channel, channelId, service) {
  assert.ok(["next-candidate", "next-release"].includes(channelId));
  assert.equal(service, channelId === "next-candidate" ? "catch-website-next-preview" : "catch-website-next");
  assert.equal(channel.name, `${site}/channels/${channelId}`);
  const version = channel.release?.version;
  assert.match(version?.name ?? "", new RegExp(`^${site}/versions/[a-z0-9]+$`, "u"));
  assert.equal(version.status, "FINALIZED");
  assert.equal(channel.release.type, "DEPLOY");
  const run = version.config?.rewrites?.at(-1)?.run;
  assert.equal(version.config?.rewrites?.at(-1)?.glob, "**");
  assert.equal(run?.serviceId, service);
  assert.equal(run?.region, "asia-south1");
  assert.match(run?.tag ?? "", /^[a-z0-9-]+$/u, "Hosting must pin a concrete runtime tag");
  assert.match(channel.url ?? "", new RegExp(`^https://catch-dating-app-64e51--${channelId}-[a-z0-9-]+\\.web\\.app$`, "u"));
  return {channelId, version: version.name.split("/").at(-1), url: channel.url, release: channel.release};
}

/**
 * The Cloud Run tag a preview run gives the revision it deploys
 * (`gcloud run deploy --tag`). Hosting's `pinTag` reuses a tag already on the
 * service's latest ready revision, so the candidate channel is pinned to this
 * run's revision by name, not by whatever the CLI reads as latest when the
 * channel deploys. The `fh-` prefix lets the CLI's tag garbage collection treat
 * it as one of its own. Cloud Run allows at most 46 characters of tag and
 * service name together.
 */
export function previewRevisionTag(runId, runAttempt, service = "catch-website-next-preview") {
  assert.match(String(runId ?? ""), /^[1-9][0-9]*$/u, "Invalid run id");
  assert.match(String(runAttempt ?? ""), /^[1-9][0-9]*$/u, "Invalid run attempt");
  const tag = `fh-r${runId}-${runAttempt}`;
  assert.ok(tag.length + service.length <= 46, "Revision tag too long for Cloud Run");
  return tag;
}
const release = (container, name) => container?.env?.find(item => item.name === name)?.value;
/**
 * The revision this run deployed, from `gcloud run services describe` right
 * after the deploy: the service's latest revision, carrying this source and
 * this run's tag.
 */
export function deployedRevision(service, serviceId, sourceSha, tag) {
  assert.equal(service.metadata?.name, serviceId);
  const revision = service.status?.latestReadyRevisionName;
  assert.ok(revision?.startsWith(`${serviceId}-`), "The service has no ready revision");
  assert.equal(service.status.latestCreatedRevisionName, revision, "The latest revision this run created is not ready");
  assert.equal(service.metadata.labels?.["source-sha"], sourceSha, "The service is not labelled with this source");
  const containers = service.spec?.template?.spec?.containers ?? [];
  assert.equal(containers.length, 1);
  assert.equal(release(containers[0], "CATCH_RELEASE_SHA"), sourceSha, "The deployed revision does not serve this source");
  const tagged = (service.status.traffic ?? []).filter(target => target.tag === tag);
  assert.equal(tagged.length, 1, `Tag ${tag} is not on the service`);
  assert.equal(tagged[0].revisionName, revision, `Tag ${tag} names ${tagged[0].revisionName}, not the deployed ${revision}`);
  assert.match(tagged[0].url ?? "", new RegExp(`^https://${tag}---${serviceId}-[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\.run\\.app$`, "u"));
  return {revision, tag, url: tagged[0].url};
}
/**
 * The candidate channel must route its catch-all to the exact revision this
 * run deployed. Run 41075702618 deployed 57a65a76f to a new revision and its
 * channel then answered with the previous release, 3f2c6d349.
 */
export function assertChannelPinsRevision(channel, deployed) {
  const run = channel.release?.version?.config?.rewrites?.at(-1)?.run;
  assert.equal(run?.tag, deployed.tag, `The channel pins ${run?.tag}, not this run's revision ${deployed.revision} (${deployed.tag})`);
  return {channel: channel.channelId, version: channel.version, ...deployed};
}
/** The tagged revision itself, without Hosting or its CDN, must answer as the release. */
export async function assertRevisionServes(url, sourceSha, {fetchImpl = fetch} = {}) {
  const response = await fetchImpl(`${url}/robots.txt`, {redirect: "manual", signal: AbortSignal.timeout(30_000)});
  assert.equal(response.headers.get("x-catch-release"), sourceSha, `${url} does not serve ${sourceSha}`);
  await response.body?.cancel();
}

export async function readChannel(channelId, service, {runCommand = spawnSync, fetchImpl = fetch} = {}) {
  assert.ok(["next-candidate", "next-release"].includes(channelId));
  const token = runCommand("gcloud", ["auth", "print-access-token"], {encoding: "utf8"});
  assert.equal(token.status, 0); assert.ok(token.stdout.trim());
  const response = await fetchImpl(`https://firebasehosting.googleapis.com/v1beta1/${site}/channels/${channelId}`, {
    headers: {Authorization: `Bearer ${token.stdout.trim()}`}, signal: AbortSignal.timeout(20_000)});
  assert.equal(response.status, 200, "Cannot read the deployed Hosting channel");
  return channelVersion(await response.json(), channelId, service);
}
if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv[2] === "pinned") {
  // pinned <channel.json> <service.json>: the recorded channel against the
  // revision this run deployed and tagged.
  const [channelFile, serviceFile] = process.argv.slice(3);
  const sourceSha = process.env.GITHUB_SHA, tag = previewRevisionTag(process.env.GITHUB_RUN_ID, process.env.GITHUB_RUN_ATTEMPT);
  const deployed = deployedRevision(JSON.parse(fs.readFileSync(serviceFile, "utf8")), "catch-website-next-preview", sourceSha, tag);
  const pinned = assertChannelPinsRevision(JSON.parse(fs.readFileSync(channelFile, "utf8")), deployed);
  await assertRevisionServes(deployed.url, sourceSha);
  console.log(JSON.stringify(pinned));
} else if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [mode, channelId, service, output] = process.argv.slice(2);
  assert.ok(["record", "verify"].includes(mode));
  const current = await readChannel(channelId, service);
  if (mode === "record") fs.writeFileSync(output, JSON.stringify(current), {flag: "wx"});
  else {
    const prior = JSON.parse(fs.readFileSync(output, "utf8"));
    assert.equal(current.version, prior.version, "Candidate Hosting version changed after acceptance");
    assert.equal(current.url, prior.url);
    assert.deepEqual(current.release.version.config, prior.release.version.config);
  }
  console.log(JSON.stringify({channel: channelId, version: current.version, url: current.url}));
}
