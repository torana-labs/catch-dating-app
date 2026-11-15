import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {ISSUE_TITLE, KEY_PAGES, PROBE_FORWARDED_HOST, checkRevisionPages, decideRollback, issueReport,
  pinnedRuntimeTag, rollbackSwitch, servedRelease, taggedRevision} from "./rollbackDecision.mjs";

const failedSha = "a".repeat(40), verifiedSha = "b".repeat(40);
const tag = "fh-r123-1";
const tagUrl = `https://${tag}---catch-website-next-abc123-el.a.run.app`;
const healthy = {checksFailed: true, alreadyAttempted: false, switchEnabled: true, snapshotVersion: "prev1",
  candidateVersion: "new2", liveVersion: "new2", verifiedSha,
  target: {tag, revision: "catch-website-next-00041-xyz", url: tagUrl, servedSha: verifiedSha}};

test("the switch rolls back only when it is exactly on", () => {
  assert.deepEqual(rollbackSwitch("on"), {enabled: true, setting: "on"});
  assert.deepEqual(rollbackSwitch(" on "), {enabled: true, setting: "on"});
  for (const value of [undefined, null, "", "off"]) assert.equal(rollbackSwitch(value).enabled, false);
  assert.equal(rollbackSwitch(undefined).setting, "off");
  for (const value of ["true", "ON", "yes", "1"]) {
    const state = rollbackSwitch(value);
    assert.equal(state.enabled, false, value);
    assert.match(state.warning, /reporting only/u);
  }
});

test("a failed release rolls back to the preserved, verified release when every guard holds", () => {
  assert.deepEqual(decideRollback(healthy), {action: "rollback", reason: "checks_failed"});
});

test("each guard stops or downgrades the rollback", () => {
  const cases = [
    [{checksFailed: false}, "none", "checks_passed"],
    [{alreadyAttempted: true}, "none", "already_attempted"],
    [{snapshotVersion: null}, "report", "no_snapshot"],
    [{liveVersion: "prev1"}, "none", "live_unchanged"],
    [{liveVersion: "other9"}, "report", "live_changed_elsewhere"],
    [{liveVersion: null}, "report", "live_changed_elsewhere"],
    [{candidateVersion: null}, "report", "live_changed_elsewhere"],
    [{snapshotVersion: "new2"}, "none", "live_unchanged"],
    [{verifiedSha: null}, "report", "no_verified_release"],
    [{target: null}, "report", "target_revision_missing"],
    [{target: {error: "tag gone"}}, "report", "target_revision_missing"],
    [{target: {...healthy.target, servedSha: failedSha}}, "report", "target_not_verified"],
    [{target: {...healthy.target, servedSha: null}}, "report", "target_not_verified"],
    [{switchEnabled: false}, "report", "switch_off"],
  ];
  for (const [change, action, reason] of cases) {
    const decision = decideRollback({...healthy, ...change});
    assert.equal(decision.action, action, JSON.stringify(change));
    assert.equal(decision.reason, reason, JSON.stringify(change));
  }
  // Report-only names the release it would have restored.
  assert.match(decideRollback({...healthy, switchEnabled: false}).detail, new RegExp(verifiedSha, "u"));
  // A missing revision carries its cause.
  assert.equal(decideRollback({...healthy, target: {error: "tag gone"}}).detail, "tag gone");
});

test("the target can never be the release that just failed", () => {
  // The candidate is what live serves after the clone; a snapshot equal to it
  // means live never moved, so there is nothing to undo.
  assert.notEqual(decideRollback({...healthy, snapshotVersion: healthy.candidateVersion}).action, "rollback");
  // A preserved revision serving any commit other than deployed/prod-website is refused.
  assert.equal(decideRollback({...healthy, target: {...healthy.target, servedSha: failedSha}}).action, "report");
});

const hostingVersion = (rewrite) => ({config: {rewrites: [{source: "/api/**", function: "x"}, rewrite]}});

test("the pinned runtime tag comes only from a catch-all to the production service", () => {
  assert.equal(pinnedRuntimeTag(hostingVersion({glob: "**", run: {serviceId: "catch-website-next", region: "asia-south1", tag}})), tag);
  for (const rewrite of [
    {glob: "/x", run: {serviceId: "catch-website-next", region: "asia-south1", tag}},
    {glob: "**", run: {serviceId: "catch-website-next-preview", region: "asia-south1", tag}},
    {glob: "**", run: {serviceId: "catch-website-next", region: "us-central1", tag}},
    {glob: "**", run: {serviceId: "catch-website-next", region: "asia-south1"}},
    {glob: "**", destination: "/index.html"},
  ]) assert.throws(() => pinnedRuntimeTag(hostingVersion(rewrite)), JSON.stringify(rewrite));
  assert.throws(() => pinnedRuntimeTag(null));
});

test("a tagged revision is found by tag, and a removed tag reads as missing", () => {
  const service = {status: {traffic: [{percent: 100, revisionName: "catch-website-next-00042-new", latestRevision: true},
    {tag, revisionName: "catch-website-next-00041-xyz", url: tagUrl}]}};
  assert.deepEqual(taggedRevision(service, tag), {tag, revision: "catch-website-next-00041-xyz", url: tagUrl});
  assert.equal(taggedRevision(service, "fh-r999-1"), null);
  assert.equal(taggedRevision({}, tag), null);
  assert.equal(taggedRevision({status: {traffic: [{tag, url: tagUrl}]}}, tag), null);
  assert.throws(() => taggedRevision({status: {traffic: [{tag, revisionName: "r", url: "https://evil.example"}]}}, tag));
});

function fakeSite(pages, {failFirst = 0} = {}) {
  const calls = [];
  let failures = failFirst;
  const fetchImpl = async (url, options) => {
    calls.push({url, options});
    if (failures > 0) {failures--; throw new Error("connection refused");}
    const path = new URL(url).pathname;
    const page = pages[path] ?? {status: 404, body: ""};
    return new Response(page.body, {status: page.status, headers: {"x-catch-release": page.release ?? failedSha}});
  };
  return {fetchImpl, calls};
}
const goodPages = (release) => Object.fromEntries([
  ...KEY_PAGES.map((path) => [path, {status: 200, body: `<html><h1>${path}</h1></html>`, release}]),
  ["/api/public-catalog", {status: 200, body: JSON.stringify({listings: []}), release}],
  ["/robots.txt", {status: 200, body: "User-agent: *", release}]]);
const noWait = {sleep: async () => {}};

test("the key pages pass only as the expected release, each with a heading", async () => {
  const site = fakeSite(goodPages(failedSha));
  const result = await checkRevisionPages(tagUrl, failedSha, {fetchImpl: site.fetchImpl, ...noWait});
  assert.deepEqual(result.checks.map((check) => check.path), [...KEY_PAGES, "/api/public-catalog"]);
  // Every request carries the forwarded host Hosting would send, so the runtime serves public pages.
  for (const call of site.calls) assert.equal(call.options.headers["x-forwarded-host"], PROBE_FORWARDED_HOST);
  assert.match(PROBE_FORWARDED_HOST, /^catch-dating-app-64e51--[a-z0-9-]+\.web\.app$/u);

  await assert.rejects(checkRevisionPages(tagUrl, verifiedSha, {fetchImpl: fakeSite(goodPages(failedSha)).fetchImpl, ...noWait}),
    /is not release/u);
  const broken = goodPages(failedSha); broken["/explore/"] = {status: 503, body: "<h1>Unavailable</h1>", release: failedSha};
  await assert.rejects(checkRevisionPages(tagUrl, failedSha, {fetchImpl: fakeSite(broken).fetchImpl, ...noWait}), /\/explore\/ HTTP status/u);
  const empty = goodPages(failedSha); empty["/host/"] = {status: 200, body: "<html></html>", release: failedSha};
  await assert.rejects(checkRevisionPages(tagUrl, failedSha, {fetchImpl: fakeSite(empty).fetchImpl, ...noWait}), /no heading/u);
  const catalog = goodPages(failedSha); catalog["/api/public-catalog"] = {status: 200, body: "{}", release: failedSha};
  await assert.rejects(checkRevisionPages(tagUrl, failedSha, {fetchImpl: fakeSite(catalog).fetchImpl, ...noWait}), /listings/u);
  await assert.rejects(checkRevisionPages("https://example.com", failedSha, {fetchImpl: site.fetchImpl, ...noWait}));
});

test("a cold revision gets a bounded wait on its first request only", async () => {
  const warming = fakeSite(goodPages(verifiedSha), {failFirst: 2});
  await checkRevisionPages(tagUrl, verifiedSha, {fetchImpl: warming.fetchImpl, attempts: 3, ...noWait});
  const cold = fakeSite(goodPages(verifiedSha), {failFirst: 3});
  await assert.rejects(checkRevisionPages(tagUrl, verifiedSha, {fetchImpl: cold.fetchImpl, attempts: 3, ...noWait}), /did not answer/u);
});

test("the served release is read from the revision's own header", async () => {
  assert.equal(await servedRelease(tagUrl, {fetchImpl: fakeSite(goodPages(verifiedSha)).fetchImpl, ...noWait}), verifiedSha);
  const missing = goodPages(verifiedSha); missing["/robots.txt"] = {status: 200, body: "", release: "not-a-sha"};
  assert.equal(await servedRelease(tagUrl, {fetchImpl: fakeSite(missing).fetchImpl, ...noWait}), null);
  await assert.rejects(servedRelease(tagUrl, {fetchImpl: fakeSite({}, {failFirst: 9}).fetchImpl, attempts: 2, ...noWait}));
});

test("the issue names the failing check, both releases and what happened", () => {
  const base = {runUrl: "https://github.com/o/r/actions/runs/1", failed: {sha: failedSha, version: "new2"},
    previous: {sha: verifiedSha, version: "prev1"}, checkLog: "line\nAssertionError: / is not release"};
  const rolled = issueReport({...base, decision: {action: "rollback", reason: "checks_failed"}, rollbackOutcome: "success"});
  assert.equal(rolled.title, ISSUE_TITLE);
  for (const text of [failedSha, verifiedSha, "new2", "prev1", "Rolled back", "is not release", base.runUrl]) {
    assert.ok(rolled.body.includes(text), text);
  }
  const failed = issueReport({...base, decision: {action: "rollback"}, rollbackOutcome: "failure"});
  assert.match(failed.body, /did not complete or failed its checks/u);
  assert.match(failed.body, /Nothing retries it/u);
  const off = issueReport({...base, decision: {action: "report", reason: "switch_off"}, rollbackOutcome: ""});
  assert.match(off.body, /WEBSITE_AUTO_ROLLBACK is off.*would have rolled back to `b{40}`/su);
  const refused = issueReport({...base, decision: {action: "report", reason: "target_revision_missing", detail: "tag gone"}});
  assert.match(refused.body, /Not rolled back \(target_revision_missing\)\.\*\* tag gone/u);
  const undecided = issueReport({...base, decision: null, checkLog: ""});
  assert.match(undecided.body, /decision did not complete/u);
  assert.doesNotMatch(undecided.body, /Failing check output/u);
});

const workflow = fs.readFileSync(new URL("../../../.github/workflows/website-next-promote.yml", import.meta.url), "utf8");
const step = (name) => {
  const start = workflow.indexOf(`      - name: ${name}\n`);
  assert.ok(start > 0, `step "${name}" exists`);
  const end = workflow.indexOf("\n      - ", start + 1);
  return workflow.slice(start, end < 0 ? workflow.length : end);
};

test("promotion checks live after the clone and records the release only when they pass", () => {
  const order = ["Promote only the exact tested Hosting version", "Check the live release after promotion",
    "Record the released commit", "Decide whether to roll back", "Roll back live to the preserved release",
    "Report the failed release", "Retain exact release and rollback identities"].map((name) => workflow.indexOf(`- name: ${name}\n`));
  assert.ok(order.every((index, i) => index > 0 && (i === 0 || index > order[i - 1])), "steps run in order");
  const clone = step("Promote only the exact tested Hosting version");
  assert.match(clone, /id: clone\n/u);
  assert.match(clone, /hosting:clone "catch-dating-app-64e51@\$version" catch-dating-app-64e51:live/u);
  const checks = step("Check the live release after promotion");
  assert.match(checks, /id: live-checks\n/u);
  assert.doesNotMatch(checks, /\n        if:/u);
  assert.match(checks, /liveOriginCheck\.mjs --release "\$RELEASE_SHA" --attempts 18/u);
  assert.match(checks, /rollbackDecision\.mjs pages "\$RELEASE_SHA" build\/next-promote\/production-hosting\.json/u);
  // record keeps its implicit success(), so a failed check never moves deployed/prod-website.
  assert.doesNotMatch(step("Record the released commit"), /\n        if:/u);
  // A record that fails after the checks passed must not reach the decision.
  for (const name of ["Decide whether to roll back", "Report the failed release"]) {
    assert.doesNotMatch(step(name), /steps\.record|outcome != 'skipped'/u, name);
  }
});

test("the rollback runs at most once, only on the decision's word and onto its target", () => {
  const decide = step("Decide whether to roll back");
  assert.match(decide, /id: decide\n/u);
  assert.match(decide, /if: \$\{\{ failure\(\) && \(steps\.clone\.outcome == 'failure' \|\| steps\.live-checks\.outcome == 'failure'\) \}\}/u);
  assert.match(decide, /WEBSITE_AUTO_ROLLBACK: \$\{\{ vars\.WEBSITE_AUTO_ROLLBACK \}\}/u);
  assert.match(decide, /run: node website\/scripts\/next\/rollbackDecision\.mjs decide$/u);
  const rollback = step("Roll back live to the preserved release");
  assert.match(rollback, /if: \$\{\{ failure\(\) && steps\.decide\.outputs\.action == 'rollback' \}\}/u);
  assert.match(rollback, /TARGET_VERSION: \$\{\{ steps\.decide\.outputs\.target_version \}\}/u);
  assert.match(rollback, /TARGET_SHA: \$\{\{ steps\.decide\.outputs\.target_sha \}\}/u);
  // Expressions reach the shell only through env, and nothing loops or retries.
  assert.doesNotMatch(rollback.slice(rollback.indexOf("run: |")), /\$\{\{/u);
  assert.doesNotMatch(rollback.slice(rollback.indexOf("run: |")), /\bfor\b|\bwhile\b|\buntil\b|retry/u);
  assert.doesNotMatch(rollback, /continue-on-error|timeout-minutes/u);
  assert.equal(rollback.match(/firebase hosting:clone/gu)?.length, 1);
  assert.ok(rollback.indexOf("assert-live-candidate") < rollback.indexOf("firebase hosting:clone"));
  assert.ok(rollback.indexOf("firebase hosting:clone") < rollback.indexOf("verify-rollback"));
  assert.match(rollback, /hosting:clone "catch-dating-app-64e51@\$TARGET_VERSION" catch-dating-app-64e51:live/u);
  // Exactly two clones to live in the whole workflow: the promotion and the one rollback.
  assert.equal(workflow.match(/firebase hosting:clone/gu)?.length, 2);
  const report = step("Report the failed release");
  assert.match(report, /if: \$\{\{ failure\(\) && \(steps\.clone\.outcome == 'failure' \|\| steps\.live-checks\.outcome == 'failure'\) \}\}/u);
  assert.match(report, /ROLLBACK_OUTCOME: \$\{\{ steps\.rollback\.outcome \}\}/u);
  assert.match(report, /run: node website\/scripts\/next\/rollbackDecision\.mjs report$/u);
});

test("only the promotion job may write issues, and environments are unchanged", () => {
  const topLevel = workflow.slice(workflow.indexOf("\npermissions:"), workflow.indexOf("\njobs:"));
  assert.doesNotMatch(topLevel, /issues/u);
  assert.equal(workflow.match(/issues: write/gu)?.length, 1);
  assert.match(workflow, /\n      issues: write\n/u);
  assert.deepEqual(workflow.match(/environment: .+/gu), ["environment: prod-hosting"]);
  // Nothing turns the switch on by default.
  assert.doesNotMatch(workflow, /WEBSITE_AUTO_ROLLBACK: (?!\$\{\{ vars\.WEBSITE_AUTO_ROLLBACK \}\})/u);
});

test("the retained artifact keeps the decision and rollback evidence", () => {
  const retained = step("Retain exact release and rollback identities");
  for (const file of ["live-pages.json", "live-checks.log", "rollback-decision.json", "rollback-clone.json",
    "rollback-checks.json", "rollback-checks.log", "rollback.json"]) assert.ok(retained.includes(`build/next-promote/${file}`), file);
});
