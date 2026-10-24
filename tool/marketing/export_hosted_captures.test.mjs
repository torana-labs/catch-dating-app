import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import test from "node:test";
import vm from "node:vm";
import crypto from "node:crypto";
import {pathToFileURL} from "node:url";
import {extractSteps} from "../harness/lib/workflow_steps.mjs";
import {fromRepo} from "../lib/repo_paths.mjs";
import {canonicalInventory, exportHostedCaptures, MAX_CAPTURES, resolveCaptureRequest} from "./export_hosted_captures.mjs";

const repository = "owner/repo";
function labelEvent() {
  return {repository: {full_name: repository}, action: "labeled", label: {name: "capture:requested"},
    number: 543, pull_request: {number: 543, state: "open", draft: true,
      head: {sha: "a".repeat(40), repo: {full_name: repository}},
      base: {sha: "b".repeat(40), ref: "main", repo: {full_name: repository}}}};
}
const requestOptions = event => ({eventName: "pull_request", event, repository,
  runSha: "c".repeat(40), workflowDefinitionSha: "d".repeat(40)});
function evaluate(expression, options) {
  return vm.runInNewContext(expression, {
    github: {event_name: options.eventName, event: options.event, repository: options.repository,
      sha: options.runSha, workflow_sha: options.workflowDefinitionSha, run_id: "123", run_attempt: "2"},
    env: {CAPTURE_SOURCE_SHA: options.sourceSha},
    inputs: {automatic_source_sha: "", ...options.event.inputs}, cancelled: () => false,
    contains: (values, value) => values.includes(value), fromJSON: JSON.parse,
  }, {timeout: 1000});
}

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "hosted-captures-"));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const root = path.join(directory, "source");
  const write = (file, bytes) => {
    const destination = path.join(root, file);
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.writeFileSync(destination, bytes);
    return destination;
  };
  for (const file of ["tool/lib/repo_paths.mjs", "tool/ui_capture/run_captures.mjs",
    "tool/marketing/export_app_screenshots.mjs", "tool/marketing/export_hosted_captures.mjs",
    "tool/marketing/import_hosted_captures.mjs",
    "tool/design/generate_widget_catalog.mjs", "tool/design/generate_widget_classification.mjs",
    "tool/design/component_concepts.mjs", "tool/design/lib/component_naming.mjs",
    "tool/design/lib/new_widget_inventory_declarations.mjs", "tool/design/lib/production_widget_roots.mjs",
    "design/components/catch.components.schema.json",
    "tool/marketing/lib/capture_provenance.mjs",
    "tool/marketing/sync_website_media.mjs", "tool/ci/toolchain.env"]) {
    write(file, fs.readFileSync(fromRepo(file)));
  }
  const manifest = JSON.parse(fs.readFileSync(fromRepo("tool/marketing/capture_manifest.json"), "utf8"));
  const png = fs.readFileSync(fromRepo(manifest.captures[0].sourcePath));
  write("tool/marketing/capture_manifest.json", JSON.stringify(manifest));
  write("tool/marketing/app_screenshots_design_context.json", "{}");
  write("website/public/assets/app-screenshots/manifest.json", "{}");
  for (const capture of manifest.captures) {
    write(capture.sourcePath, png);
    write(capture.websitePath, png);
  }
  write("test/ui_captures/catalog/screen_capture_catalog.dart", manifest.captures.map((c, i) =>
    `ScreenCaptureEntry(id: 'screen_${i}', routeIds: const <String>['today'],
      marketingFixtureKeys: const <String>['${c.fixtureKey}'], device: CaptureDevice.iphone17Pro)`).join("\n"));
  write("test/ui_captures/capture_runner_test.dart", "import 'package:catch_dating_app/leaf.dart';\n");
  write("test/ui_captures/flutter_test_config.dart", "");
  write("tool/marketing/frame_device_capture.dart", "");
  write("lib/leaf.dart", "const title = 'Today';\n");
  write("pubspec.yaml", "name: catch_dating_app\n");
  write("pubspec.lock", "pinned fixture\n");
  write("packages/sample/pubspec.yaml", "name: sample\n");
  write("tool/demo/demo_seed/scenarios/sample.json", "{}");
  write("tool/demo/demo_seed/personas/sample.json", "{}");
  write("test/goldens/baseline.png", png);
  write("website/src/generated/hostListings.json", "{}\n");
  write("website/src/generated/hostListings.demo.json", "{}\n");
  write("website/src/generated/other.ts", "export const authored = true;\n");
  write("docs/widget_catalog.md", "# Authored guidance\n<!-- BEGIN GENERATED WIDGET INVENTORY -->\nold rows\n<!-- END GENERATED WIDGET INVENTORY -->\nAuthored footer\n");
  write(".gitignore", "/artifacts/marketing/app-screenshots/raw/\n");
  const git = (...args) => {
    const result = spawnSync("git", args, {cwd: root, encoding: "utf8"});
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  git("init", "-q");
  git("add", ".");
  git("-c", "user.name=Capture Test", "-c", "user.email=capture@example.invalid", "commit", "-qm", "fixture");
  const bin = path.join(directory, "bin");
  fs.mkdirSync(bin);
  const calls = path.join(directory, "calls.jsonl");
  const executable = (name, script) => {
    const file = path.join(bin, name);
    fs.writeFileSync(file, `#!${process.execPath}\n${script}\n`);
    fs.chmodSync(file, 0o755);
  };
  executable("flutter", `const fs = require('node:fs'); const args = process.argv.slice(2);
    if (args.includes('--version')) process.stdout.write(JSON.stringify({frameworkVersion:'3.44.9'}));
    else fs.appendFileSync(${JSON.stringify(calls)}, JSON.stringify({command:'flutter', args})+'\\n');`);
  executable("dart", `const fs = require('node:fs'); const args = process.argv.slice(2);
    fs.writeFileSync(args[args.indexOf('--output')+1], Buffer.from(${JSON.stringify(png.toString("base64"))},'base64'));
    fs.appendFileSync(${JSON.stringify(calls)}, JSON.stringify({command:'dart', args})+'\\n');`);
  executable("sw_vers", "process.stdout.write('macOS test fixture');");
  const previousPath = process.env.PATH;
  process.env.PATH = `${bin}${path.delimiter}${previousPath}`;
  t.after(() => { process.env.PATH = previousPath; });
  const sfFont = path.join(directory, "native.ttf");
  fs.writeFileSync(sfFont, "test font, never exported");
  const options = {sourceDir: root, sourceSha: git("rev-parse", "HEAD"),
    workflowSha: "a".repeat(40), outputDir: path.join(directory, "bundle"),
    repository: "owner/repo", runId: "123", runAttempt: "2", platform: "darwin", sfFont};
  return {root, write, git, calls, options, executable, manifest};
}

test("real canonical wrappers export all 12 with exact provenance and complete byte inventory", t => {
  const f = fixture(t);
  const baseline = fs.readFileSync(path.join(f.root, "test/goldens/baseline.png"));
  const authored = fs.readFileSync(path.join(f.root, "tool/marketing/capture_manifest.json"));
  const event = labelEvent();
  event.pull_request.head.sha = f.options.sourceSha;
  event.pull_request.base.sha = f.options.workflowSha;
  const request = resolveCaptureRequest(requestOptions(event));
  const result = exportHostedCaptures({...f.options, request});
  assert.deepEqual(result.request, request);
  assert.equal(result.workflowSha, f.options.workflowSha);
  assert.equal(result.workflowDefinitionSha, "d".repeat(40));
  assert.equal(result.captures.length, 12);
  assert.equal(result.files.length, 27);
  assert.equal(result.sourceTree, f.git("rev-parse", "HEAD^{tree}"));
  for (const capture of result.captures) assert.equal(capture.provenance.sourceRevision, f.options.sourceSha);
  for (const file of result.files) {
    assert.deepEqual(fs.readFileSync(path.join(f.options.outputDir, file.path)), fs.readFileSync(path.join(f.root, file.path)));
    assert.equal(file.sha256.length, 64);
  }
  const calls = fs.readFileSync(f.calls, "utf8").trim().split("\n").map(JSON.parse);
  assert.equal(calls.filter(c => c.command === "flutter").length, 1);
  assert.equal(calls.filter(c => c.command === "dart").length, 12);
  const render = calls[0].args;
  assert.ok(render.includes("--dart-define=CAPTURE_PLATFORM=ios"));
  assert.equal(render.find(a => a.startsWith("--dart-define=CAPTURE_IDS=")).slice("--dart-define=CAPTURE_IDS=".length).split(",").length, 12);
  assert.ok(!calls.some(c => c.args.includes("--update-goldens")));
  assert.deepEqual(fs.readFileSync(path.join(f.root, "test/goldens/baseline.png")), baseline);
  assert.deepEqual(fs.readFileSync(path.join(f.root, "tool/marketing/capture_manifest.json")), authored);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.options.outputDir, "capture-receipt.json"))), result);
  assert.throws(() => exportHostedCaptures(f.options), /new absolute directory/);
});

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

test("the manifest sets the capture count; the inventory rejects duplicates and traversal paths", t => {
  const f = fixture(t);
  const sized = count => ({...f.manifest, captures: Array.from({length: count}, (_, index) => ({
    ...f.manifest.captures[0], id: `capture-${index}`, fixtureKey: `fixture.capture${index}`,
    sourcePath: `artifacts/marketing/app-screenshots/capture-${index}.png`,
    websitePath: `website/public/assets/app-screenshots/capture-${index}.png`}))});
  for (const count of [1, 11, 13, MAX_CAPTURES]) assert.equal(canonicalInventory(sized(count)).length, count);
  for (const count of [0, MAX_CAPTURES + 1]) assert.throws(() => canonicalInventory(sized(count)), /Expected 1 to 100/);
  assert.throws(() => canonicalInventory({...f.manifest, captures: undefined}), /Expected 1 to 100/);
  for (const change of [{id: f.manifest.captures[1].id}, {fixtureKey: f.manifest.captures[1].fixtureKey},
    {sourcePath: "../../outside.png"}, {websitePath: "/tmp/outside.png"}, {status: "paused"}]) {
    const manifest = structuredClone(f.manifest);
    Object.assign(manifest.captures[0], change);
    assert.throws(() => canonicalInventory(manifest), /Invalid, duplicate or unsafe/);
  }
});

test("tracked symlink cannot redirect final capture writes", t => {
  const f = fixture(t);
  const file = f.manifest.captures[0].sourcePath;
  fs.unlinkSync(path.join(f.root, file));
  fs.symlinkSync(f.options.sfFont, path.join(f.root, file));
  f.git("add", file);
  f.git("-c", "user.name=Capture Test", "-c", "user.email=capture@example.invalid", "commit", "-qm", "symlink");
  f.options.sourceSha = f.git("rev-parse", "HEAD");
  assert.throws(() => exportHostedCaptures(f.options), /Symlink refused/);
  assert.equal(fs.readFileSync(f.options.sfFont, "utf8"), "test font, never exported");
});

test("render failure cannot package stale captures", t => {
  const f = fixture(t);
  f.executable("flutter", `if (process.argv.includes('--version')) process.stdout.write(JSON.stringify({frameworkVersion:'3.44.9'})); else process.exit(1);`);
  assert.throws(() => exportHostedCaptures(f.options), /failed/);
  assert.ok(!fs.existsSync(f.options.outputDir));
  for (const c of f.manifest.captures) assert.ok(!fs.existsSync(path.join(f.root, c.sourcePath)));
});

test("golden mutation fails publication even when canonical capture checks pass", t => {
  const f = fixture(t);
  const dart = fs.readFileSync(path.join(path.dirname(f.calls), "bin/dart"), "utf8");
  f.executable("dart", dart.split("\n").slice(1).join("\n") + "\nrequire('node:fs').writeFileSync('test/goldens/baseline.png','mutated');");
  assert.throws(() => exportHostedCaptures(f.options), /changed source or goldens/);
  assert.ok(!fs.existsSync(f.options.outputDir));
});

test("hosted workflow keeps manual dispatch and limits PR events to explicit capture requests", () => {
  const source = fs.readFileSync(fromRepo(".github/workflows/marketing-captures.yml"), "utf8");
  const events = source.slice(source.indexOf("on:"), source.indexOf("permissions:"));
  assert.match(events, /^on:\n  workflow_dispatch:/u);
  assert.match(events, /  pull_request:\n    types: \[labeled\]\n/u);
  assert.doesNotMatch(events, /push:|schedule:|workflow_run|pull_request_target|synchronize|opened/u);
  assert.match(source, /^permissions:\n  contents: read\n\n/mu);
  assert.match(source, /runs-on: macos-26\n/u);
  assert.match(source, /timeout-minutes: 45\n/u);
  const steps = extractSteps(source);
  assert.equal(steps.filter(s => s.uses?.startsWith("actions/checkout@")).length, 2);
  assert.equal(source.match(/persist-credentials: false/gu)?.length, 2);
  assert.match(source, /ref: \$\{\{ env.CAPTURE_WORKFLOW_SHA \}\}/u);
  assert.match(source, /ref: \$\{\{ env.CAPTURE_SOURCE_SHA \}\}/u);
  assert.match(source, /path: capture-source\n[^]*?fetch-depth: 0\n/u);
  assert.ok(steps.findIndex(s => s.name === "Validate capture request and controller identity") <
    steps.findIndex(s => s.name === "Checkout exact capture source separately"));
  assert.match(source, /if-no-files-found: error/u);
  assert.match(source, /retention-days: 7/u);
  assert.ok(source.includes("--enforce-lockfile"));
  assert.ok(source.includes("artifact-digest"));
  assert.doesNotMatch(source, /secrets\.|id-token|pull_request_target|git push|update-goldens|firebase deploy/u);
  // Exercise the actual shell guard, including attempted shell substitutions.
  const guard = steps.find(s => s.name === "Validate immutable source selection").run;
  for (const [sha, accepted] of [["a".repeat(40), true], ["main", false],
    ["543a4512e862", false], ["$(touch /tmp/cat159-must-not-exist)", false]]) {
    const result = spawnSync("bash", ["-c", guard], {env: {...process.env, CAPTURE_SOURCE_SHA: sha,
      CAPTURE_WORKFLOW_SHA: "b".repeat(40), CAPTURE_WORKFLOW_DEFINITION_SHA: "c".repeat(40)}});
    assert.equal(result.status === 0, accepted);
  }
  for (const variable of ["CAPTURE_WORKFLOW_SHA", "CAPTURE_WORKFLOW_DEFINITION_SHA"]) {
    const result = spawnSync("bash", ["-c", guard], {env: {...process.env,
      CAPTURE_SOURCE_SHA: "a".repeat(40), CAPTURE_WORKFLOW_SHA: "b".repeat(40),
      CAPTURE_WORKFLOW_DEFINITION_SHA: "c".repeat(40), [variable]: "main"}});
    assert.notEqual(result.status, 0);
  }
});

test("label request binds exact PR head, base controller and distinct workflow/event provenance", () => {
  const event = labelEvent();
  event.inputs = {source_sha: "e".repeat(40)};
  assert.deepEqual(resolveCaptureRequest(requestOptions(event)), {
    eventName: "pull_request", sourceSha: "a".repeat(40), workflowSha: "b".repeat(40),
    workflowDefinitionSha: "d".repeat(40), eventSha: "c".repeat(40), runHeadSha: "a".repeat(40),
    prNumber: 543, label: "capture:requested",
  });
  const manual = {...requestOptions({repository: {full_name: repository},
    inputs: {source_sha: "e".repeat(40)}}), eventName: "workflow_dispatch"};
  const result = resolveCaptureRequest(manual);
  assert.equal(result.sourceSha, "e".repeat(40));
  assert.equal(result.workflowSha, manual.runSha);
  assert.equal(result.prNumber, undefined);
});

test("automatic CI captures bind the tested merge source instead of the PR head", () => {
  const event = labelEvent();
  event.action = "synchronize";
  delete event.label;
  const options = {...requestOptions(event), automaticSourceSha: "c".repeat(40),
    workflowRef: `${repository}/.github/workflows/ci.yml@refs/pull/543/merge`};
  const result = resolveCaptureRequest(options);
  assert.equal(result.sourceSha, options.runSha);
  assert.equal(result.workflowSha, options.runSha);
  assert.notEqual(result.sourceSha, event.pull_request.head.sha);
  assert.equal(result.mode, "automatic");
  assert.equal(result.workflowRef, options.workflowRef);
  assert.throws(() => resolveCaptureRequest({...options, automaticSourceSha: event.pull_request.head.sha}), /actual caller source SHA/);
  for (const workflowRef of [undefined, `${repository}/.github/workflows/unknown.yml@refs/heads/main`,
    `foreign/repo/.github/workflows/ci.yml@refs/heads/main`]) {
    assert.throws(() => resolveCaptureRequest({...options, workflowRef}), /consumer workflow/);
  }
  for (const mutate of [e => {e.pull_request.head.repo.full_name = "fork/repo";},
    e => {e.pull_request.state = "closed";}, e => {e.pull_request.base.ref = "develop";}]) {
    const invalid = structuredClone(event); mutate(invalid);
    assert.throws(() => resolveCaptureRequest({...options, event: invalid}), /same-repository/);
  }
});

test("automatic main, merge-group and manual validation bind the caller event source", () => {
  const base = {...requestOptions({repository: {full_name: repository}}),
    automaticSourceSha: "c".repeat(40), workflowRef: `${repository}/.github/workflows/ci.yml@refs/heads/main`};
  for (const eventName of ["schedule", "workflow_dispatch", "push", "merge_group"]) {
    const event = {...base.event, after: base.runSha, merge_group: {head_sha: base.runSha}};
    assert.equal(resolveCaptureRequest({...base, eventName, event}).sourceSha, base.runSha);
  }
  for (const eventName of ["push", "merge_group", "pull_request_target", "workflow_run"]) {
    assert.throws(() => resolveCaptureRequest({...base, eventName}));
  }
});

test("reusable producer exports one immutable binding and selects the caller SHA in its actual expressions", () => {
  const source = fs.readFileSync(fromRepo(".github/workflows/marketing-captures.yml"), "utf8");
  const event = labelEvent();
  event.inputs = {automatic_source_sha: "c".repeat(40)};
  const options = requestOptions(event);
  for (const variable of ["CAPTURE_SOURCE_SHA", "CAPTURE_WORKFLOW_SHA"]) {
    const expression = source.match(new RegExp(`^      ${variable}: \\$\\{\\{ (.*) \\}\\}$`, "m"))?.[1];
    assert.equal(evaluate(expression, options), options.runSha);
  }
  assert.match(source, /workflow_call:[\s\S]*automatic_source_sha:[\s\S]*required: true/u);
  assert.match(source, /value: \$\{\{ jobs\.export\.outputs\.capture_binding \}\}/u);
  assert.match(source, /capture_binding: \$\{\{ steps\.identity\.outputs\.capture_binding \}\}/u);
  const identity = extractSteps(source).find(step => step.name === "Record exact artifact identity");
  assert.match(identity.run, /artifactId: e\.ARTIFACT_ID, artifactDigest:/u);
  assert.match(identity.run, /runId: e\.GITHUB_RUN_ID, runAttempt: e\.GITHUB_RUN_ATTEMPT/u);
});

test("unrelated, forked, closed, malformed and mutable capture requests are refused", () => {
  for (const mutate of [
    e => {e.action = "synchronize";}, e => {e.action = "unlabeled";},
    e => {e.label.name = "ci:admitted";}, e => {e.label.name = "documentation";},
    e => {e.label.name = "CAPTURE:REQUESTED";}, e => {delete e.label;},
    e => {e.repository.full_name = "foreign/repo";},
    e => {e.pull_request.head.repo.full_name = "fork/repo";},
    e => {e.pull_request.base.repo.full_name = "foreign/repo";},
    e => {e.pull_request.head.repo = null;}, e => {e.pull_request.state = "closed";},
    e => {e.pull_request.base.ref = "develop";}, e => {e.number = 42;},
    e => {e.pull_request.number = Number.MAX_SAFE_INTEGER + 1;},
    e => {delete e.pull_request;},
    e => {e.pull_request.head.sha = "main";},
    e => {e.pull_request.base.sha = "$(touch /tmp/cat159-must-not-exist)";},
  ]) {
    const event = labelEvent();
    mutate(event);
    assert.throws(() => resolveCaptureRequest(requestOptions(event)));
  }
  for (const eventName of ["push", "pull_request_target", "workflow_run", "schedule"]) {
    assert.throws(() => resolveCaptureRequest({...requestOptions(labelEvent()), eventName}), /Unsupported/);
  }
  for (const variable of ["runSha", "workflowDefinitionSha"]) {
    assert.throws(() => resolveCaptureRequest({...requestOptions(labelEvent()), [variable]: "main"}), /immutable/);
  }
  for (const source_sha of ["main", "07d331e", "A".repeat(40), "a".repeat(40) + "\n"]) {
    assert.throws(() => resolveCaptureRequest({...requestOptions({repository: {full_name: repository},
      inputs: {source_sha}}), eventName: "workflow_dispatch"}), /immutable/);
  }
});

test("actual job guard and source-keyed concurrency exclude unrelated PR metadata and forks", () => {
  const source = fs.readFileSync(fromRepo(".github/workflows/marketing-captures.yml"), "utf8");
  const guard = source.match(/^    if: >-\n([\s\S]*?)^    concurrency:/mu)?.[1].trim();
  assert.ok(guard);
  const expression = key => source.match(new RegExp(`^      ${key}: \\$\\{\\{ (.*) \\}\\}$`, "m"))?.[1];
  const group = source.match(/^      group: marketing-captures-\$\{\{ (.*) \}\}$/mu)?.[1];
  assert.ok(group);
  assert.doesNotMatch(source, /^concurrency:/mu, "ineligible jobs must never enter capture concurrency");
  const good = requestOptions(labelEvent());
  assert.equal(evaluate(guard, good), true);
  assert.equal(evaluate(expression("CAPTURE_SOURCE_SHA"), good), good.event.pull_request.head.sha);
  assert.equal(evaluate(expression("CAPTURE_WORKFLOW_SHA"), good), good.event.pull_request.base.sha);
  assert.equal(evaluate(expression("CAPTURE_WORKFLOW_DEFINITION_SHA"), good), good.workflowDefinitionSha);
  const manual = {...good, eventName: "workflow_dispatch", event: {inputs: {source_sha: "a".repeat(40)}}};
  assert.equal(evaluate(guard, manual), true);
  assert.equal(evaluate(group, manual), evaluate(group, good));
  for (const mutate of [e => {e.action = "unlabeled";}, e => {e.action = "synchronize";},
    e => {e.label.name = "ci:admitted";}, e => {e.pull_request.state = "closed";},
    e => {e.pull_request.base.ref = "develop";}, e => {e.pull_request.head.repo.full_name = "fork/repo";},
    e => {e.pull_request.base.repo.full_name = "foreign/repo";}]) {
    const event = labelEvent(); mutate(event);
    assert.equal(evaluate(guard, requestOptions(event)), false);
  }
  const newer = labelEvent(); newer.pull_request.head.sha = "e".repeat(40);
  assert.notEqual(evaluate(group, requestOptions(newer)), evaluate(group, good));
  assert.match(source, /      cancel-in-progress: false\n/u);
});

test("capture label never starts CI or replaces the Required CI context", () => {
  const ci = fs.readFileSync(fromRepo(".github/workflows/ci.yml"), "utf8");
  const types = ci.match(/^  pull_request:\n    types: \[(.*)\]$/mu)?.[1].split(", ");
  assert.ok(types?.length, "CI must declare its pull_request activity types");
  for (const action of ["labeled", "unlabeled"]) {
    assert.ok(!types.includes(action), `${action} events must not start CI`);
  }
  assert.match(ci.slice(ci.indexOf("  required:\n")), /^    name: Required CI$/mu);
});

test("actual artifact name includes exact selected source SHA for both dispatch and PR labels", () => {
  const source = fs.readFileSync(fromRepo(".github/workflows/marketing-captures.yml"), "utf8");
  const selection = source.match(/^      CAPTURE_SOURCE_SHA: \$\{\{ (.*) \}\}$/mu)?.[1];
  const template = source.match(/^          name: (canonical-marketing-.*)$/mu)?.[1];
  assert.ok(selection && template);
  const labeled = requestOptions(labelEvent());
  const manual = {...labeled, eventName: "workflow_dispatch",
    event: {inputs: {source_sha: "e".repeat(40)}}};
  for (const context of [labeled, manual]) {
    const sourceSha = evaluate(selection, context);
    const name = template.replace(/\$\{\{\s*(.*?)\s*\}\}/gu,
      (_, expression) => evaluate(expression, {...context, sourceSha}));
    assert.equal(name, `canonical-marketing-${sourceSha}-123-2`);
  }
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

test("runner output path is initialized on the runner, never in job-level env", t => {
  const source = fs.readFileSync(fromRepo(".github/workflows/marketing-captures.yml"), "utf8");
  const jobEnv = source.match(/^    env:\n([\s\S]*?)^    steps:/mu)?.[1];
  assert.ok(jobEnv, "expected export job env block");
  // GitHub evaluates job env before assigning a runner. These are its allowed
  // contexts; runner belongs to step scope (GitHub context-availability table).
  const allowed = new Set(["github", "needs", "strategy", "matrix", "vars", "secrets", "inputs"]);
  const assertContexts = block => {
    for (const match of block.matchAll(/\$\{\{\s*([a-z_]+)\./gu)) {
      assert.ok(allowed.has(match[1]), `context ${match[1]} is unavailable in job-level env`);
    }
  };
  assertContexts(jobEnv);
  assert.throws(() => assertContexts(`${jobEnv}\n      CAPTURE_OUTPUT_DIR: \u0024{{ runner.temp }}/canonical-marketing-captures`), /runner is unavailable/);
  const steps = extractSteps(source);
  const initializeIndex = steps.findIndex(s => s.name === "Initialize runner output directory");
  const exportIndex = steps.findIndex(s => s.name === "Render, frame, validate and package canonical outputs");
  assert.ok(initializeIndex >= 0 && initializeIndex < exportIndex);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "capture-runner-env-"));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const envFile = path.join(directory, "env");
  const runnerTemp = path.join(directory, "runner temp with spaces");
  const result = spawnSync("bash", ["-c", steps[initializeIndex].run], {
    env: {...process.env, RUNNER_TEMP: runnerTemp, GITHUB_ENV: envFile}, encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(envFile, "utf8"), `CAPTURE_OUTPUT_DIR=${runnerTemp}/canonical-marketing-captures\n`);
  assert.match(source, /path: \$\{\{ env.CAPTURE_OUTPUT_DIR \}\}\//u);
});


function preserveAndAdvance(f, message) {
  f.git("add", ".");
  f.git("-c", "user.name=Capture Test", "-c", "user.email=capture@example.invalid", "commit", "-qm", message);
  f.options.sourceSha = f.git("rev-parse", "HEAD");
  f.options.outputDir += "-next";
}

test("hosted reuse preserves original render SHA and bytes under a new verified source", t => {
  const f = fixture(t);
  const original = exportHostedCaptures(f.options);
  f.write("unrelated-backend.txt", "does not affect rendering");
  preserveAndAdvance(f, "Preserve captures and unrelated change");
  const calls = fs.readFileSync(f.calls, "utf8");
  const reused = exportHostedCaptures(f.options);
  assert.equal(reused.version, 2);
  assert.equal(fs.readFileSync(f.calls, "utf8"), calls, "no renderer or framer needed");
  for (const [i, capture] of reused.captures.entries()) {
    assert.equal(capture.disposition, "reused");
    assert.equal(capture.verifiedSourceSha, f.options.sourceSha);
    assert.equal(capture.provenance.sourceRevision, original.sourceSha);
    assert.notEqual(capture.provenance.sourceRevision, capture.verifiedSourceSha);
    assert.deepEqual(capture.provenance, original.captures[i].provenance);
  }
});

test("one corrupted capture rerenders alone while the other eleven retain original provenance", t => {
  const f = fixture(t);
  exportHostedCaptures(f.options);
  f.write(f.manifest.captures[0].sourcePath, "corrupt PNG");
  preserveAndAdvance(f, "Corrupt one image");
  const before = fs.readFileSync(f.calls, "utf8").trim().split("\n").length;
  const result = exportHostedCaptures(f.options);
  assert.equal(result.captures.filter(c => c.disposition === "rendered").length, 1);
  assert.equal(result.captures.filter(c => c.disposition === "reused").length, 11);
  assert.equal(fs.readFileSync(f.calls, "utf8").trim().split("\n").length - before, 2);
});

test("valid image bytes from an unrelated render revision cannot be reused", t => {
  const f = fixture(t);
  exportHostedCaptures(f.options);
  preserveAndAdvance(f, "Preserve rendered captures");
  const unrelated = f.git("-c", "user.name=Capture Test", "-c", "user.email=capture@example.invalid",
    "commit-tree", f.git("rev-parse", "HEAD^{tree}"), "-m", "Unrelated history with identical files");
  f.git("reset", "--hard", unrelated);
  f.options.sourceSha = unrelated;
  const calls = fs.readFileSync(f.calls, "utf8");
  assert.throws(() => exportHostedCaptures(f.options), /merge-base --is-ancestor/);
  assert.equal(fs.readFileSync(f.calls, "utf8"), calls);
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

test("a successful no-op framer cannot package an invalidated capture", t => {
  const f = fixture(t);
  f.executable("dart", "process.exit(0);");
  assert.throws(() => exportHostedCaptures(f.options), /failed/);
  assert.ok(!fs.existsSync(f.options.outputDir));
});

test("actual exporter bundle verifies before import and survives unchanged into website dist", async t => {
  const f = fixture(t);
  const tree = f.git("rev-parse", "HEAD^{tree}");
  const commit = (...parents) => f.git("-c", "user.name=Capture Test", "-c", "user.email=capture@example.invalid",
    "commit-tree", tree, ...parents.flatMap(parent => ["-p", parent]), "-m", "synthetic tested merge fixture");
  const prHead = commit(f.options.sourceSha);
  const baseHead = f.git("-c", "user.name=Capture Test", "-c", "user.email=capture@example.invalid",
    "commit-tree", tree, "-p", f.options.sourceSha, "-m", "advanced base fixture");
  f.options.sourceSha = commit(baseHead, prHead);
  f.git("reset", "--hard", f.options.sourceSha);
  f.options.workflowSha = f.options.sourceSha;
  f.options.request = {eventName: "pull_request", mode: "automatic", sourceSha: f.options.sourceSha,
    workflowRef: `${f.options.repository}/.github/workflows/ci.yml@refs/pull/123/merge`,
    workflowSha: f.options.sourceSha, workflowDefinitionSha: f.options.sourceSha, eventSha: f.options.sourceSha, runHeadSha: prHead};
  const receipt = exportHostedCaptures(f.options);
  const consumer = await import(pathToFileURL(path.join(f.root, "tool/marketing/import_hosted_captures.mjs")));
  const packed = spawnSync("python3", ["-c", `import io, pathlib, sys, zipfile
root = pathlib.Path(sys.argv[1])
output = io.BytesIO()
with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
    for file in sorted(root.rglob('*')):
        if file.is_file(): archive.write(file, file.relative_to(root).as_posix())
sys.stdout.buffer.write(output.getvalue())`, f.options.outputDir], {maxBuffer: 64 * 1024 * 1024});
  assert.equal(packed.status, 0, packed.stderr?.toString());
  const binding = {repository: f.options.repository, sourceSha: receipt.sourceSha,
    workflowRef: f.options.request.workflowRef,
    workflowSha: receipt.workflowSha, workflowDefinitionSha: receipt.workflowDefinitionSha,
    eventSha: receipt.request.eventSha, runHeadSha: receipt.request.runHeadSha, runId: receipt.runId, runAttempt: receipt.runAttempt,
    artifactId: "100", artifactDigest: `sha256:${crypto.createHash("sha256").update(packed.stdout).digest("hex")}`};
  const files = new Map([...receipt.files.map(file => [file.path, fs.readFileSync(path.join(f.options.outputDir, file.path))]),
    ["capture-receipt.json", fs.readFileSync(path.join(f.options.outputDir, "capture-receipt.json"))]]);
  assert.equal(consumer.verifyCaptureFiles({files, binding}).receipt.captures.length, 12);
  assert.notEqual(binding.runHeadSha, binding.sourceSha, "GitHub's API head is distinct from the tested merge source");
  const catalog = fs.readFileSync(path.join(f.root, "docs/widget_catalog.md"), "utf8");
  f.write("docs/widget_catalog.md", catalog.replace("Authored guidance", "Changed policy"));
  assert.throws(() => consumer.verifyCaptureFiles({files, binding}), /Authored catalog guidance/);
  f.write("docs/widget_catalog.md", catalog.replace("old rows", "fresh generated rows"));
  assert.doesNotThrow(() => consumer.verifyCaptureFiles({files, binding}));
  f.write("docs/widget_catalog.md", catalog);
  f.git("update-index", "--assume-unchanged", "test/goldens/baseline.png");
  assert.throws(() => consumer.verifyCaptureFiles({files, binding}), /assume-unchanged/);
  f.git("update-index", "--no-assume-unchanged", "test/goldens/baseline.png");
  fs.appendFileSync(path.join(f.root, ".git/info/exclude"), "\nwebsite/src/ignored.tsx\n");
  f.write("website/src/ignored.tsx", "untracked website source");
  assert.throws(() => consumer.verifyCaptureFiles({files, binding}), /Untracked consumer source/);
  fs.unlinkSync(path.join(f.root, "website/src/ignored.tsx"));
  const generated = receipt.files.filter(file => file.path !== "tool/marketing/capture_manifest.json");
  f.git("restore", "--", ...generated.map(file => file.path));
  const original = generated.map(file => fs.readFileSync(path.join(f.root, file.path)));
  for (const mutate of [
    r => {r.sourceTree = "a".repeat(40);}, r => {r.workflowDefinitionSha = "b".repeat(40);},
    r => {r.runAttempt = "99";}, r => {r.exporterSha256 = "0".repeat(64);},
    r => {r.files.pop();}, r => {r.files[1] = r.files[0];},
    r => {r.captures[0].verifiedSourceSha = "a".repeat(40);},
    r => {r.captures[0].sourcePath = "../escape.png";},
    r => {r.captures[0].provenance.nativeFontSha256 = "0".repeat(64);},
    r => {r.toolchain.flutter.frameworkVersion = "wrong";},
  ]) {
    const changed = structuredClone(receipt); mutate(changed);
    const tampered = new Map(files); tampered.set("capture-receipt.json", Buffer.from(JSON.stringify(changed)));
    assert.throws(() => consumer.verifyCaptureFiles({files: tampered, binding}));
    assert.deepEqual(generated.map(file => fs.readFileSync(path.join(f.root, file.path))), original);
  }
  const invalid = Buffer.from(packed.stdout); invalid[100] ^= 1;
  assert.throws(() => consumer.importCaptureArchive({bytes: invalid, binding}), /digest differs/);
  assert.deepEqual(generated.map(file => fs.readFileSync(path.join(f.root, file.path))), original);
  f.write("build/ci/outside.zip", "do not modify");
  const cachePath = path.join(f.root, "build/ci/imported-marketing-captures.zip");
  fs.symlinkSync(path.join(f.root, "build/ci/outside.zip"), cachePath);
  assert.throws(() => consumer.importCaptureArchive({bytes: packed.stdout, binding}), /symlink/);
  assert.deepEqual(generated.map(file => fs.readFileSync(path.join(f.root, file.path))), original);
  assert.equal(fs.readFileSync(path.join(f.root, "build/ci/outside.zip"), "utf8"), "do not modify");
  fs.unlinkSync(cachePath);
  consumer.importCaptureArchive({bytes: packed.stdout, binding});
  for (const file of generated) assert.deepEqual(fs.readFileSync(path.join(f.root, file.path)), files.get(file.path));
  assert.equal(consumer.verifyImportedCaptureBytes({binding}).verifiedFiles, 26);
  const verifyCli = () => spawnSync(process.execPath, ["tool/marketing/import_hosted_captures.mjs", "--verify-imported"],
    {cwd: f.root, encoding: "utf8", env: {...process.env, CAPTURE_BINDING: JSON.stringify(binding),
      GITHUB_REPOSITORY: binding.repository, GITHUB_SHA: binding.sourceSha}});
  const cliVerified = verifyCli();
  assert.equal(cliVerified.status, 0, cliVerified.stderr);
  assert.equal(JSON.parse(cliVerified.stdout).verifiedFiles, 26);
  for (const file of generated) {
    f.write(file.path, "mutated after import");
    assert.throws(() => consumer.verifyImportedCaptureBytes({binding}), /Imported capture output differs/);
    f.write(file.path, files.get(file.path));
  }
  f.write("tool/widget_dedupe/.dart_tool/package_config.json", "generated analyzer dependencies");
  f.write("tool/widget_dedupe/pubspec.lock", "generated analyzer lock");
  assert.throws(() => consumer.importCaptureArchive({bytes: packed.stdout, binding}), /Untracked consumer source/);
  assert.equal(consumer.verifyImportedCaptureBytes({binding}).verifiedFiles, 26);
  fs.appendFileSync(path.join(f.root, ".git/info/exclude"), "\ntool/widget_dedupe/adjacent.dart\n");
  f.write("tool/widget_dedupe/adjacent.dart", "untracked authored source");
  assert.throws(() => consumer.verifyImportedCaptureBytes({binding}), /Untracked consumer source/);
  fs.unlinkSync(path.join(f.root, "tool/widget_dedupe/adjacent.dart"));
  fs.rmSync(path.join(f.root, "tool/widget_dedupe/.dart_tool"), {recursive: true});
  fs.symlinkSync(path.join(f.root, "website/src"), path.join(f.root, "tool/widget_dedupe/.dart_tool"));
  assert.throws(() => consumer.verifyImportedCaptureBytes({binding}), /symlink|Untracked consumer source/);
  fs.unlinkSync(path.join(f.root, "tool/widget_dedupe/.dart_tool"));
  fs.rmSync(path.join(f.root, "tool/widget_dedupe"), {recursive: true});
  // Tools also installs the pinned import-graph tool, with npm's .bin links.
  f.write("tool/impact/node_modules/acorn/bin/acorn", "#!/usr/bin/env node");
  fs.mkdirSync(path.join(f.root, "tool/impact/node_modules/.bin"));
  fs.symlinkSync("../acorn/bin/acorn", path.join(f.root, "tool/impact/node_modules/.bin/acorn"));
  assert.throws(() => consumer.importCaptureArchive({bytes: packed.stdout, binding}), /Untracked consumer source/);
  assert.equal(consumer.verifyImportedCaptureBytes({binding}).verifiedFiles, 26);
  fs.symlinkSync(path.join(f.root, "website/src"), path.join(f.root, "tool/impact/node_modules/.bin/escape"));
  assert.throws(() => consumer.verifyImportedCaptureBytes({binding}), /escapes its install/);
  fs.rmSync(path.join(f.root, "tool/impact"), {recursive: true});
  fs.mkdirSync(path.join(f.root, "tool/impact"));
  fs.symlinkSync(path.join(f.root, "website/src"), path.join(f.root, "tool/impact/node_modules"));
  assert.throws(() => consumer.verifyImportedCaptureBytes({binding}), /not a plain directory|Untracked consumer source/);
  fs.rmSync(path.join(f.root, "tool/impact"), {recursive: true});
  f.write("lib/leaf.dart", "changed after import");
  assert.throws(() => consumer.verifyImportedCaptureBytes({binding}), /authored source differs/);
  f.git("restore", "--", "lib/leaf.dart");
  fs.writeFileSync(cachePath, invalid);
  assert.throws(() => consumer.verifyImportedCaptureBytes({binding}), /digest differs/);
  const cliRefused = verifyCli();
  assert.equal(cliRefused.status, 1);
  assert.match(cliRefused.stderr, /digest differs/);
  fs.writeFileSync(cachePath, packed.stdout);
  for (const file of receipt.files.filter(file => file.path.startsWith("website/public/"))) {
    f.write(file.path.replace("website/public/", "website/dist/"), files.get(file.path));
  }
  assert.equal(consumer.verifyBuiltCaptureBytes({binding}).verifiedFiles, 13);
  for (const file of ["website/src/generated/hostListings.json", "website/src/generated/hostListings.demo.json"]) {
    f.write(file, '{"generated":"read-only live listing projection"}\n');
    assert.throws(() => consumer.importCaptureArchive({bytes: packed.stdout, binding}), /authored source differs/);
    assert.equal(consumer.verifyBuiltCaptureBytes({binding}).verifiedFiles, 13);
  }
  f.write("website/src/generated/other.ts", "export const changed = true;\n");
  assert.throws(() => consumer.verifyBuiltCaptureBytes({binding}), /authored source differs/);
  f.git("restore", "--", "website/src/generated/other.ts");
  f.write(receipt.captures[0].websitePath.replace("website/public/", "website/dist/"), "different build bytes");
  assert.throws(() => consumer.verifyBuiltCaptureBytes({binding}), /Built website capture differs/);
});
