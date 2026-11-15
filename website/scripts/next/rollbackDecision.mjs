import assert from "node:assert/strict";
import fs from "node:fs";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {LIVE_RELEASE_TAG} from "./previewRelease.mjs";
import {readLiveHosting} from "./hostingState.mjs";
import {checkLiveOrigin} from "./liveOriginCheck.mjs";
import {canonicalRepository} from "../../../tool/lib/canonical_repository.mjs";
/**
 * Post-deploy checks and automatic rollback for Next Website Promotion
 * (audit recommendation 8, owner decision 15 Nov 2026).
 *
 * After the tested Hosting version is cloned to live, promotion checks that
 * live serves the release (liveOriginCheck.mjs) and that the revision live
 * Hosting pins renders the key pages. If those checks fail, `decideRollback`
 * chooses between doing nothing, reporting, and re-cloning the Hosting version
 * that was live before this promotion (rollback.json, `hostingState.mjs
 * snapshot`). Rollback restores Hosting only: the earlier release's tagged
 * Cloud Run revision serves again, while the service's warm instance stays on
 * the newer revision until the next promotion.
 *
 * The repository variable WEBSITE_AUTO_ROLLBACK turns rollback on (`on`).
 * Unset, `off` or any other value reports only: the checks and the decision
 * still run, the run fails and the issue says what would have been restored.
 * Turning it on is the owner's decision.
 */
const directory = "build/next-promote";
const project = "catch-dating-app-64e51", region = "asia-south1", service = "catch-website-next";
const site = `projects/${project}/sites/${project}`;
const releaseSha = /^[a-f0-9]{40}$/u, versionId = /^[a-z0-9]+$/u;
export const ISSUE_TITLE = "Website release failed its post-deploy checks";
/**
 * Hosting forwards the visitor's host to the runtime, and the runtime serves
 * public pages only for Catch hosts (`websiteRequestHostname`, proxy.ts). A
 * bare run.app request gets the private shell and a 404 for /api/. The checks
 * send the host form Hosting uses for a production preview channel: the
 * runtime serves it like the public site, without the canonical redirect that
 * the production Firebase hosts get.
 */
export const PROBE_FORWARDED_HOST = `${project}--post-deploy-check.web.app`;
/** Pages every release serves; checked only for status, release and a heading, never copy. */
export const KEY_PAGES = Object.freeze(["/", "/explore/", "/host/", "/privacy/"]);

/** WEBSITE_AUTO_ROLLBACK: only `on` enables rollback; anything else reports only. */
export function rollbackSwitch(value) {
  const setting = String(value ?? "").trim();
  if (setting === "on") return {enabled: true, setting};
  const switchState = {enabled: false, setting: setting || "off"};
  if (setting && setting !== "off") switchState.warning = `WEBSITE_AUTO_ROLLBACK="${setting}" is not "on"; reporting only`;
  return switchState;
}

/** The Cloud Run tag a live Hosting version's catch-all pins. */
export function pinnedRuntimeTag(version) {
  const rewrite = version?.config?.rewrites?.at(-1);
  assert.equal(rewrite?.glob, "**", "The Hosting version's last rewrite is not the catch-all");
  assert.equal(rewrite.run?.serviceId, service, `The Hosting version does not route to ${service}`);
  assert.equal(rewrite.run.region, region);
  assert.match(rewrite.run.tag ?? "", /^[a-z0-9-]+$/u, "The Hosting version pins no runtime tag");
  return rewrite.run.tag;
}

/** The revision and URL behind a tag, from `gcloud run services describe`, or null when the tag is gone. */
export function taggedRevision(serviceJson, tag) {
  const targets = (serviceJson?.status?.traffic ?? []).filter((target) => target.tag === tag);
  if (targets.length !== 1 || !targets[0].revisionName || !targets[0].url) return null;
  assert.match(targets[0].url, new RegExp(`^https://${tag}---${service}-[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\.run\\.app$`, "u"));
  return {tag, revision: targets[0].revisionName, url: targets[0].url};
}

/**
 * Whether to restore the Hosting version that was live before this promotion.
 * Each guard keeps rollback to one attempt, onto a release that passed its own
 * live checks:
 * - the target is exactly this promotion's snapshot, and live now serves this
 *   promotion's candidate, so nothing else changed live meanwhile;
 * - the target's revision still exists and serves the commit the
 *   deployed/prod-website tag names. Promotion moves that tag only after its
 *   live checks pass, so a release that failed them is never a target.
 * @returns {{action: "none"|"report"|"rollback", reason: string, detail?: string}}
 */
export function decideRollback({checksFailed, alreadyAttempted = false, switchEnabled, snapshotVersion,
  candidateVersion, liveVersion, verifiedSha, target}) {
  if (!checksFailed) return {action: "none", reason: "checks_passed"};
  if (alreadyAttempted) return {action: "none", reason: "already_attempted",
    detail: "This run already decided once; a rollback is attempted at most once per run."};
  if (!snapshotVersion) return {action: "report", reason: "no_snapshot",
    detail: "No preserved previous Hosting version for this promotion."};
  if (liveVersion === snapshotVersion) return {action: "none", reason: "live_unchanged",
    detail: "Live still serves the previous version; this promotion did not change it."};
  if (!candidateVersion || liveVersion !== candidateVersion) return {action: "report", reason: "live_changed_elsewhere",
    detail: `Live serves ${liveVersion ?? "an unreadable version"}, neither this promotion's candidate nor the preserved version.`};
  if (snapshotVersion === candidateVersion) return {action: "report", reason: "target_is_failed_release",
    detail: "The preserved version is the release that just failed."};
  if (!verifiedSha) return {action: "report", reason: "no_verified_release",
    detail: `No ${LIVE_RELEASE_TAG} tag names a release that passed its live checks.`};
  if (!target?.url) return {action: "report", reason: "target_revision_missing",
    detail: target?.error ?? "The preserved version's runtime revision is no longer tagged."};
  if (target.servedSha !== verifiedSha) return {action: "report", reason: "target_not_verified",
    detail: `The preserved revision serves ${target.servedSha ?? "no release"}, not ${LIVE_RELEASE_TAG} (${verifiedSha}).`};
  if (!switchEnabled) return {action: "report", reason: "switch_off",
    detail: `WEBSITE_AUTO_ROLLBACK is off; it would have rolled back to ${verifiedSha}.`};
  return {action: "rollback", reason: "checks_failed"};
}

function request(url, fetchImpl) {
  return fetchImpl(url, {redirect: "manual", signal: AbortSignal.timeout(30_000),
    headers: {"user-agent": "catch-production-probe/1", "x-forwarded-host": PROBE_FORWARDED_HOST}});
}

/**
 * The key pages and the public catalog on a tagged revision, as that release.
 * A tagged revision that receives no traffic starts cold, so the first request
 * waits, within a bound, for it to answer.
 */
export async function checkRevisionPages(url, expectedSha, {fetchImpl = fetch, attempts = 6, delayMs = 10_000,
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))} = {}) {
  assert.match(expectedSha ?? "", releaseSha);
  assert.match(url ?? "", /^https:\/\/[a-z0-9-]+---catch-website-next-[a-z0-9-]+(?:\.[a-z0-9-]+)*\.run\.app$/u);
  const checks = [];
  for (const [index, path] of KEY_PAGES.entries()) {
    let response;
    for (let attempt = 1; ; attempt++) {
      try {response = await request(`${url}${path}`, fetchImpl); break;} catch (error) {
        if (index > 0 || attempt >= attempts) throw new Error(`${url}${path} did not answer: ${error?.message ?? error}`);
        await sleep(delayMs);
      }
    }
    const text = await response.text();
    assert.equal(response.status, 200, `${path} HTTP status`);
    assert.equal(response.headers.get("x-catch-release"), expectedSha, `${path} is not release ${expectedSha}`);
    assert.ok(text.includes("<h1"), `${path} rendered no heading`);
    checks.push({path, status: response.status});
  }
  const catalog = await request(`${url}/api/public-catalog`, fetchImpl);
  const body = await catalog.text();
  assert.equal(catalog.status, 200, "/api/public-catalog HTTP status");
  assert.equal(catalog.headers.get("x-catch-release"), expectedSha, `/api/public-catalog is not release ${expectedSha}`);
  assert.ok(Array.isArray(JSON.parse(body).listings), "/api/public-catalog listings");
  checks.push({path: "/api/public-catalog", status: catalog.status});
  return {url, release: expectedSha, checks};
}

/** The commit a tagged revision serves, read from its own headers. */
export async function servedRelease(url, {fetchImpl = fetch, attempts = 6, delayMs = 10_000,
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))} = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await request(`${url}/robots.txt`, fetchImpl);
      await response.body?.cancel();
      const served = response.headers.get("x-catch-release");
      return response.status === 200 && releaseSha.test(served ?? "") ? served : null;
    } catch (error) {
      if (attempt >= attempts) throw new Error(`${url} did not answer: ${error?.message ?? error}`);
      await sleep(delayMs);
    }
  }
}

/** One issue, opened or commented on, in the style of main_red_alert.mjs. */
export function issueReport({decision, rollbackOutcome, runUrl, failed, previous, checkLog = ""}) {
  const outcome = decision?.action === "rollback"
    ? rollbackOutcome === "success"
      ? `**Rolled back.** Live serves \`${previous.sha}\` (Hosting \`${previous.version}\`) again, and its live checks passed.`
      : `**The rollback to \`${previous.sha}\` (Hosting \`${previous.version}\`) did not complete or failed its checks.** ` +
        "Nothing retries it. Check what live serves and recover by hand (docs/release_operations.md, \"Website release train\")."
    : decision?.reason === "switch_off"
      ? `**Not rolled back: WEBSITE_AUTO_ROLLBACK is off.** It would have rolled back to \`${previous.sha}\` (Hosting \`${previous.version}\`). ` +
        "Live still serves the failed release."
      : decision
        ? `**Not rolled back (${decision.reason}).** ${decision.detail ?? ""}`.trim()
        : "**Not rolled back: the rollback decision did not complete.** Check what live serves.";
  const tail = checkLog.trim().split("\n").slice(-20).join("\n");
  const body = [
    `A website promotion failed after the new release reached live: ${runUrl}`, "",
    `- Failed release: \`${failed.sha ?? "unknown"}\` (Hosting \`${failed.version ?? "unknown"}\`)`,
    `- Previous release: \`${previous.sha ?? "unknown"}\` (Hosting \`${previous.version ?? "unknown"}\`)`, "",
    outcome,
    ...(tail ? ["", "Failing check output:", "", "```", tail, "```"] : []),
    "", "This issue stays open for a person to close once live is confirmed healthy.",
  ].join("\n");
  return {title: ISSUE_TITLE, body};
}

function command(name, args, options = {}) {
  const result = spawnSync(name, args, {encoding: "utf8", maxBuffer: 32 * 1024 * 1024, ...options});
  assert.equal(result.status, 0, result.stderr || `${name} failed`); return result.stdout;
}
const github = (endpoint) => JSON.parse(command("gh", ["api", "-H", "Cache-Control: no-cache", endpoint]));
const describeService = () => JSON.parse(command("gcloud", ["run", "services", "describe", service,
  "--project", project, "--region", region, "--format=json"]));
const readJson = (file) => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
const output = (values) => {
  if (!process.env.GITHUB_OUTPUT) return;
  fs.appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(values).map(([key, value]) => `${key}=${value}\n`).join(""));
};
const versionOf = (name) => name?.startsWith(`${site}/versions/`) ? name.slice(`${site}/versions/`.length) : null;

/** The commit deployed/prod-website names: the last release that passed its live checks. */
function verifiedRelease(repository) {
  const tags = github(`repos/${repository}/git/matching-refs/tags/${LIVE_RELEASE_TAG}`)
    .filter((ref) => ref.ref === `refs/tags/${LIVE_RELEASE_TAG}`);
  return tags.length === 1 && tags[0].object?.type === "commit" ? tags[0].object.sha : null;
}

async function pages(expectedSha, versionFile) {
  const version = JSON.parse(fs.readFileSync(versionFile, "utf8")).version;
  const revision = taggedRevision(describeService(), pinnedRuntimeTag(version));
  assert.ok(revision, "The revision live Hosting pins is not tagged on the service");
  console.log(JSON.stringify({...revision, ...await checkRevisionPages(revision.url, expectedSha)}));
}

async function decide() {
  const decisionFile = `${directory}/rollback-decision.json`;
  const switchState = rollbackSwitch(process.env.WEBSITE_AUTO_ROLLBACK);
  if (switchState.warning) console.log(`::warning::${switchState.warning}`);
  const snapshot = readJson(`${directory}/rollback.json`);
  const candidate = readJson(`${directory}/candidate-channel.json`);
  const live = await readLiveHosting();
  const facts = {checksFailed: true, alreadyAttempted: fs.existsSync(decisionFile), switchEnabled: switchState.enabled,
    snapshotVersion: versionOf(snapshot?.version?.name), candidateVersion: candidate?.version ?? null,
    liveVersion: versionOf(live.version.name), verifiedSha: verifiedRelease(canonicalRepository(process.env)), target: null};
  if (snapshot?.version) {
    try {
      const revision = taggedRevision(describeService(), pinnedRuntimeTag(snapshot.version));
      facts.target = revision ? {...revision, servedSha: await servedRelease(revision.url)}
        : {error: "The preserved version's runtime tag is no longer on the service."};
    } catch (error) {facts.target = {error: String(error?.message ?? error)};}
  }
  const decision = decideRollback(facts);
  const record = {...decision, switch: switchState.setting, ...facts};
  if (!fs.existsSync(decisionFile)) fs.writeFileSync(decisionFile, JSON.stringify(record, null, 2), {flag: "wx"});
  output({action: decision.action, reason: decision.reason,
    target_version: decision.action === "rollback" ? facts.snapshotVersion : "",
    target_sha: decision.action === "rollback" ? facts.verifiedSha : ""});
  console.log(JSON.stringify(record));
}

/** Right before the rollback clone: live still serves this promotion's candidate. */
async function assertLiveCandidate() {
  const decision = JSON.parse(fs.readFileSync(`${directory}/rollback-decision.json`, "utf8"));
  assert.equal(decision.action, "rollback");
  const live = await readLiveHosting();
  assert.equal(versionOf(live.version.name), decision.candidateVersion, "Live changed after the rollback decision; do not overwrite it");
  assert.equal(process.env.TARGET_VERSION, decision.snapshotVersion);
  assert.equal(process.env.TARGET_SHA, decision.verifiedSha);
}

async function verifyRollback() {
  const decision = JSON.parse(fs.readFileSync(`${directory}/rollback-decision.json`, "utf8"));
  const live = await readLiveHosting();
  assert.equal(versionOf(live.version.name), decision.snapshotVersion, "Live does not serve the restored version");
  const origin = await checkLiveOrigin({sourceSha: decision.verifiedSha, attempts: 18});
  const pagesChecked = await checkRevisionPages(decision.target.url, decision.verifiedSha);
  fs.writeFileSync(`${directory}/rollback-checks.json`, JSON.stringify({origin, pages: pagesChecked}, null, 2));
  console.log(`Rolled back live to ${decision.verifiedSha} (Hosting ${decision.snapshotVersion}); its live checks passed.`);
}

async function report() {
  const repository = canonicalRepository(process.env);
  const decision = readJson(`${directory}/rollback-decision.json`);
  const snapshot = readJson(`${directory}/rollback.json`), candidate = readJson(`${directory}/candidate-channel.json`);
  const runUrl = `${process.env.GITHUB_SERVER_URL ?? "https://github.com"}/${repository}/actions/runs/${process.env.GITHUB_RUN_ID}`;
  const checkLog = ["live-checks.log", "rollback-checks.log"].map((name) => `${directory}/${name}`)
    .filter((file) => fs.existsSync(file)).map((file) => fs.readFileSync(file, "utf8")).join("\n");
  const {title, body} = issueReport({decision, rollbackOutcome: process.env.ROLLBACK_OUTCOME, runUrl, checkLog,
    failed: {sha: process.env.RELEASE_SHA, version: candidate?.version},
    previous: {sha: decision?.verifiedSha, version: decision?.snapshotVersion ?? versionOf(snapshot?.version?.name)}});
  const issues = github(`repos/${repository}/issues?state=open&creator=github-actions%5Bbot%5D&per_page=100`);
  const open = issues.find((issue) => issue.title === title && !issue.pull_request);
  if (open) command("gh", ["api", "-X", "POST", `repos/${repository}/issues/${open.number}/comments`, "-F", "body=@-"], {input: body});
  else command("gh", ["api", "-X", "POST", `repos/${repository}/issues`, "-f", `title=${title}`, "-F", "body=@-"], {input: body});
  console.log(open ? `Commented on #${open.number}` : `Opened "${title}"`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [mode, ...args] = process.argv.slice(2);
  if (mode === "pages") {
    assert.match(args[0] ?? "", releaseSha); await pages(args[0], args[1]);
  } else if (mode === "decide") await decide();
  else if (mode === "assert-live-candidate") {
    assert.match(process.env.TARGET_VERSION ?? "", versionId); assert.match(process.env.TARGET_SHA ?? "", releaseSha);
    await assertLiveCandidate();
  } else if (mode === "verify-rollback") await verifyRollback();
  else if (mode === "report") await report();
  else throw new Error("Expected pages, decide, assert-live-candidate, verify-rollback or report");
}
