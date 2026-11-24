import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import test from "node:test";
import vm from "node:vm";
import crypto from "node:crypto";
import {deflateRawSync, inflateRawSync} from "node:zlib";
import {pathToFileURL} from "node:url";
import {extractSteps} from "../harness/lib/workflow_steps.mjs";
import {fromRepo} from "../lib/repo_paths.mjs";
import {canonicalInventory, exportHostedCaptures, MAX_CAPTURES, resolveCaptureRequest} from "./export_hosted_captures.mjs";
import {planHostedCaptures, SEED_RUN_LOOKUPS} from "./lib/capture_seeds.mjs";
import {brand} from "@catch/brand";
import {editProvenance, evaluate, fixture, flutterVersion, labelEvent, packBundle, preserveAndAdvance, producerWorkflowIds, repository, requestOptions, seedHarness, webStubs, writeCaptureCatalog} from "./lib/hosted_capture_support.test.mjs";


test("mutable refs, source mismatch, dirty inputs and Linux fail before rendering", t => {
  const f = fixture(t);
  for (const sourceSha of ["main", "543a4512e862", "$(false)"]) {
    assert.throws(() => exportHostedCaptures({...f.options, sourceSha}), /immutable/);
  }
  assert.throws(() => exportHostedCaptures({...f.options, sourceSha: "b".repeat(40)}), /does not match/);
  assert.throws(() => exportHostedCaptures({...f.options, platform: "linux"}), /requires macOS/);
  f.write("lib/leaf.dart", "dirty source");
  assert.throws(() => exportHostedCaptures(f.options), /must be clean/);
  assert.ok(!fs.existsSync(f.calls));
  assert.ok(!fs.existsSync(f.options.outputDir));
});


test("render failure cannot package stale captures", t => {
  const f = fixture(t);
  f.executable("flutter", `if (process.argv.includes('--version')) process.stdout.write(JSON.stringify({frameworkVersion:${JSON.stringify(flutterVersion)}})); else process.exit(1);`);
  assert.throws(() => exportHostedCaptures(f.options), /failed/);
  assert.ok(!fs.existsSync(f.options.outputDir));
  for (const c of f.manifest.captures) assert.ok(!fs.existsSync(path.join(f.root, c.sourcePath)));
});


test("actual request-check step verifies controller checkout and event binding before rendering", t => {
  const f = fixture(t);
  const event = labelEvent(); event.pull_request.base.sha = f.options.sourceSha;
  const eventPath = path.join(path.dirname(f.options.outputDir), "event.json");
  fs.writeFileSync(eventPath, JSON.stringify(event));
  const source = fs.readFileSync(fromRepo(".github/workflows/marketing-captures.yml"), "utf8");
  const step = extractSteps(source).find(s => s.name === "Validate capture request and controller identity");
  const env = {...process.env, GITHUB_EVENT_NAME: "pull_request", GITHUB_EVENT_PATH: eventPath,
    GITHUB_REPOSITORY: repository, GITHUB_SHA: "c".repeat(40),
    CAPTURE_SOURCE_SHA: event.pull_request.head.sha, CAPTURE_WORKFLOW_SHA: event.pull_request.base.sha,
    CAPTURE_WORKFLOW_DEFINITION_SHA: "d".repeat(40)};
  const run = (overrides = {}) => spawnSync("bash", ["-c", step.run], {
    cwd: f.root, env: {...env, ...overrides}, encoding: "utf8"});
  const accepted = run();
  assert.equal(accepted.status, 0, accepted.stderr);
  const request = JSON.parse(accepted.stdout);
  assert.equal(request.sourceSha, event.pull_request.head.sha);
  assert.equal(request.workflowSha, f.options.sourceSha);
  assert.notEqual(request.workflowSha, env.GITHUB_SHA);
  assert.match(run({CAPTURE_SOURCE_SHA: "e".repeat(40)}).stderr, /environment differs/);
  assert.match(run({CAPTURE_WORKFLOW_SHA: "e".repeat(40)}).stderr, /environment differs/);
  event.pull_request.base.sha = "e".repeat(40);
  fs.writeFileSync(eventPath, JSON.stringify(event));
  assert.match(run({CAPTURE_WORKFLOW_SHA: event.pull_request.base.sha}).stderr, /controller checkout/);
  event.pull_request.head.repo.full_name = "fork/repo";
  fs.writeFileSync(eventPath, JSON.stringify(event));
  assert.match(run().stderr, /same-repository/);
  assert.ok(!fs.existsSync(f.calls));
  assert.ok(!fs.existsSync(f.options.outputDir));
});


test("changed transitive inputs and changed native font invalidate reuse", t => {
  const f = fixture(t);
  exportHostedCaptures(f.options);
  f.write("lib/leaf.dart", "const title = 'Changed';\n");
  preserveAndAdvance(f, "Change render dependency");
  assert.ok(exportHostedCaptures(f.options).captures.every(c => c.disposition === "rendered"));
  preserveAndAdvance(f, "Preserve new captures");
  fs.writeFileSync(f.options.sfFont, "new font version");
  assert.ok(exportHostedCaptures(f.options).captures.every(c => c.disposition === "rendered"));
});


test("a successful no-op render cannot package an invalidated capture", t => {
  const f = fixture(t);
  // A render that passes but writes no screen: an unframed capture has nothing to copy.
  const flutter = fs.readFileSync(path.join(path.dirname(f.calls), "bin/flutter"), "utf8");
  f.executable("flutter", flutter.split("\n").slice(1).join("\n").replace("fs.writeFileSync(out + '/' + id + '/light.png'", "void (out + '/' + id + '/light.png'"));
  assert.throws(() => exportHostedCaptures(f.options), /failed/);
  assert.ok(!fs.existsSync(f.options.outputDir));
});


test("a release import refuses images rendered from older capture inputs", async t => {
  const f = fixture(t);
  const sha = f.options.sourceSha;
  const request = {eventName: "merge_group", mode: "automatic", sourceSha: sha, workflowSha: sha, eventSha: sha, runHeadSha: sha,
    workflowRef: `${f.options.repository}/.github/workflows/ci.yml@refs/heads/gh-readonly-queue/main/pr-1-${"b".repeat(40)}`,
    workflowDefinitionSha: sha};
  const options = {...f.options, workflowSha: sha, request};
  const rendered = exportHostedCaptures(options);
  const seeds = new Map(rendered.captures.map(c => [c.id, fs.readFileSync(path.join(options.outputDir, c.sourcePath))]));
  f.git("checkout", "--", ".");
  const outputDir = path.join(path.dirname(options.outputDir), "reused");
  const receipt = exportHostedCaptures({...options, outputDir, platform: "linux", mode: "reuse", seeds});
  const files = new Map([...receipt.files.map(file => [file.path, fs.readFileSync(path.join(outputDir, file.path))]),
    ["capture-receipt.json", fs.readFileSync(path.join(outputDir, "capture-receipt.json"))]]);
  // The app moved on, and the same images are offered for the new commit with
  // every identity field current. Only the capture inputs can give them away.
  f.write("lib/leaf.dart", "const title = 'Changed';\n");
  f.git("add", "lib/leaf.dart");
  f.git("-c", "user.name=Capture Test", "-c", "user.email=capture@example.invalid", "commit", "-qm", "Change render dependency");
  const next = f.git("rev-parse", "HEAD");
  const stale = structuredClone(receipt);
  Object.assign(stale, {sourceSha: next, workflowSha: next, workflowDefinitionSha: next, sourceTree: f.git("rev-parse", "HEAD^{tree}")});
  Object.assign(stale.request, {sourceSha: next, workflowSha: next, workflowDefinitionSha: next, eventSha: next, runHeadSha: next});
  for (const capture of stale.captures) capture.verifiedSourceSha = next;
  files.set("capture-receipt.json", Buffer.from(JSON.stringify(stale)));
  const binding = {repository: options.repository, sourceSha: next, workflowRef: request.workflowRef, workflowSha: next,
    workflowDefinitionSha: next, eventSha: next, runHeadSha: next, runId: receipt.runId, runAttempt: receipt.runAttempt,
    artifactId: "100", artifactDigest: `sha256:${"0".repeat(64)}`};
  const consumer = await import(pathToFileURL(path.join(f.root, "tool/marketing/import_hosted_captures.mjs")));
  assert.throws(() => consumer.verifyCaptureFiles({files, binding}), /Capture inputs changed/);
});


test("the consumer allows untracked only what the verified commit's catalog marks as regenerated", async t => {
  const f = fixture(t, {catalog: {compileCodegen: [
    {id: "regenerated", tracked: false, outputs: ["website/src/shared/contracts/generated/**", "lib/contexts/*/data/generated/**"]},
    {id: "committed", outputs: ["website/src/committed/**"]},
  ]}});
  const sha = f.options.sourceSha;
  const workflowRef = `${f.options.repository}/.github/workflows/ci.yml@refs/heads/main`;
  f.options.workflowSha = sha;
  f.options.request = {eventName: "push", sourceSha: sha, workflowRef, workflowSha: sha, workflowDefinitionSha: sha,
    eventSha: sha, runHeadSha: sha};
  const receipt = exportHostedCaptures(f.options);
  const consumer = await import(pathToFileURL(path.join(f.root, "tool/marketing/import_hosted_captures.mjs")));
  const files = new Map([...receipt.files.map(file => [file.path, fs.readFileSync(path.join(f.options.outputDir, file.path))]),
    ["capture-receipt.json", fs.readFileSync(path.join(f.options.outputDir, "capture-receipt.json"))]]);
  const binding = {repository: f.options.repository, sourceSha: sha, workflowRef, workflowSha: sha, workflowDefinitionSha: sha,
    eventSha: sha, runHeadSha: sha, runId: receipt.runId, runAttempt: receipt.runAttempt,
    artifactId: "100", artifactDigest: `sha256:${"0".repeat(64)}`};
  f.write("website/src/shared/contracts/generated/nested/record.ts", "regenerated");
  f.write("lib/contexts/events/data/generated/event.g.dart", "regenerated");
  assert.equal(consumer.verifyCaptureFiles({files, binding}).receipt.captures.length, 12);
  for (const refused of [
    "website/src/committed/output.ts", // a generator whose outputs are committed
    "website/src/shared/contracts/record.ts", // beside the tree
    "website/src/shared/contracts/generated_extra/record.ts", // a name that only starts the same
    "lib/contexts/events/data/record.dart", // beside the wildcard's tree
  ]) {
    f.write(refused, "authored");
    assert.throws(() => consumer.verifyCaptureFiles({files, binding}), /Untracked consumer source/, refused);
    fs.rmSync(path.join(f.root, refused));
  }
  // The working copy of the catalog can't widen what the commit says.
  const committed = fs.readFileSync(path.join(f.root, "tool/harness/component_graph.json"), "utf8");
  f.write("tool/harness/component_graph.json", committed.replace("website/src/committed/**", "website/src/**"));
  assert.throws(() => consumer.verifyCaptureFiles({files, binding}), /authored source differs/);
});


test("a change that leaves capture inputs alone is planned entirely from an earlier main-line bundle", async t => {
  const h = seedHarness(t);
  const plan = await h.plan();
  assert.deepEqual([plan.render, plan.renderIds], [false, []]);
  assert.deepEqual(plan.seedIds.sort(), h.manifest.captures.map(c => c.id).sort());
  assert.deepEqual(plan.seedSources.map(s => s.event), ["merge_group"]);
});


test("a bundle behind many newer runs is still found, and a plan that finds none stops after the lookup cap", async t => {
  // CI runs dozens of times an hour: a fresh render must survive 30 newer runs.
  const found = seedHarness(t, {}, {}, {newerRuns: 30});
  const plan = await found.plan();
  assert.deepEqual([plan.render, plan.renderIds], [false, []]);
  assert.deepEqual(plan.seedSources.map(s => s.runId), [70]);
  // Behind 150 newer runs (50 per producer, all listed) the plan lists
  // artifacts for exactly SEED_RUN_LOOKUPS runs and gives up before the bundle.
  const missed = seedHarness(t, {}, {}, {newerRuns: 150});
  const fallback = await missed.plan();
  assert.equal(fallback.render, true);
  assert.equal(missed.endpoints.filter(endpoint => endpoint.endsWith("/artifacts?per_page=100")).length, SEED_RUN_LOOKUPS);
  assert.ok(missed.endpoints.every(endpoint => !endpoint.endsWith("/runs/70/artifacts?per_page=100")));
});


test("committed captures whose render commit is missing or unrelated reuse by fingerprint", async t => {
  const f = fixture(t);
  const rendered = exportHostedCaptures(f.options);
  preserveAndAdvance(f, "Preserve current-input captures");
  const calls = fs.readFileSync(f.calls, "utf8");
  const request = async endpoint => {
    if (endpoint === "repos/owner/repo") return {id: 1};
    for (const [file, id] of Object.entries(producerWorkflowIds)) {
      if (endpoint.endsWith(`/workflows/${file}`)) return {id};
      if (endpoint.includes(`/workflows/${id}/runs?`)) return {workflow_runs: []};
    }
    throw new Error(`Unexpected endpoint ${endpoint}`);
  };
  const plan = (sourceDir, sourceSha) => planHostedCaptures({sourceDir, sourceSha,
    repository: "owner/repo", eventName: "pull_request", request});
  assert.equal((await plan(f.root, f.options.sourceSha)).render, false,
    "a valid committed ancestor still reuses without an artifact");
  // A fresh repository with the same files models a squash snapshot whose
  // PNGs still record the original, unavailable PR render commit.
  const fresh = path.join(path.dirname(f.root), "squashed-source");
  fs.cpSync(f.root, fresh, {recursive: true,
    filter: source => !path.relative(f.root, source).split(path.sep).includes(".git")});
  const git = (...args) => {
    const result = spawnSync("git", args, {cwd: fresh, encoding: "utf8"});
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  git("init", "-q");
  git("add", ".");
  git("-c", "user.name=Capture Test", "-c", "user.email=capture@example.invalid", "commit", "-qm", "Squashed source snapshot");
  const sha = git("rev-parse", "HEAD");
  const inputs = spawnSync(process.execPath,
    ["tool/marketing/export_app_screenshots.mjs", "--plan", "--inputs-only"], {cwd: fresh, encoding: "utf8"});
  assert.equal(inputs.status, 0, inputs.stderr);
  assert.ok(JSON.parse(inputs.stdout).every(capture => !capture.render), "all render inputs remain current");
  assert.notEqual(spawnSync("git", ["cat-file", "-e", `${rendered.sourceSha}^{commit}`], {cwd: fresh}).status, 0);
  // Owner decision (12 Nov 2026): an exact input fingerprint replaces the
  // ancestry rule, so a squash-merged PR render is reused, not re-rendered.
  for (const state of ["missing", "unrelated"]) {
    if (state === "unrelated") git("fetch", "--no-tags", f.root, rendered.sourceSha);
    const result = await plan(fresh, sha);
    assert.equal(result.render, false, state);
    assert.deepEqual(result.renderIds, [], state);
  }
  assert.equal(fs.readFileSync(f.calls, "utf8"), calls, "planning never renders or reframes");
});


for (const [label, runOverrides] of [
  ["a same-repository pull request render", {event: "pull_request", head_branch: "feature"}],
  ["a Marketing Website release render", {event: "push", head_branch: "main", workflow_id: 8, path: ".github/workflows/marketing-website.yml"}],
  ["a labelled capture run", {event: "pull_request", head_branch: "feature", workflow_id: 9, path: ".github/workflows/marketing-captures.yml"}],
]) {
  test(`${label} seeds captures whose fingerprints match`, async t => {
    const h = seedHarness(t, runOverrides);
    const plan = await h.plan();
    assert.deepEqual([plan.render, plan.renderIds], [false, []]);
    assert.deepEqual(plan.seedIds.sort(), h.manifest.captures.map(c => c.id).sort());
  });
}


test("the nightly reuses unless the native font or macOS runner image changed, and fails closed", async t => {
  const image = "macos-26-arm64/20261101.1";
  const previous = process.env.ImageVersion;
  process.env.ImageVersion = image; // The renders record the runner image they ran on.
  t.after(() => { if (previous === undefined) delete process.env.ImageVersion; else process.env.ImageVersion = previous; });
  const h = seedHarness(t);
  const font = crypto.createHash("sha256").update(fs.readFileSync(h.options.sfFont)).digest("hex");
  const all = h.manifest.captures.map(c => c.id).sort();
  let plan = await h.plan("schedule", {fontSha256: font, runnerImage: image});
  assert.deepEqual([plan.render, plan.nativeChanged, plan.seedIds.length], [false, false, all.length]);
  for (const probe of [{fontSha256: "0".repeat(64), runnerImage: image}, {fontSha256: font, runnerImage: "macos-26-arm64/20261201.1"},
    {fontSha256: font, runnerImage: null}, null]) {
    h.git("checkout", "--", ".");
    plan = await h.plan("schedule", probe);
    assert.deepEqual([plan.nativeChanged, plan.renderIds.sort()], [true, all], JSON.stringify(probe));
  }
});
