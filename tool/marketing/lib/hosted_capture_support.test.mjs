// Shared fixtures for the export_hosted_captures_{a,b,c} tests. It holds no
// tests: the tests are split across three files so node --test runs them in
// parallel processes.
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
import {extractSteps} from "../../harness/lib/workflow_steps.mjs";
import {fromRepo} from "../../lib/repo_paths.mjs";
import {canonicalInventory, exportHostedCaptures, MAX_CAPTURES, resolveCaptureRequest} from "../export_hosted_captures.mjs";
import {planHostedCaptures} from "./capture_seeds.mjs";
import {brand} from "@catch/brand";


export const repository = "owner/repo";

export const flutterVersion = fs.readFileSync(fromRepo("tool/ci/toolchain.env"), "utf8")
  .match(/^FLUTTER_VERSION=(.+)$/mu)[1];

export function labelEvent() {
  return {repository: {full_name: repository}, action: "labeled", label: {name: "capture:requested"},
    number: 543, pull_request: {number: 543, state: "open", draft: true,
      head: {sha: "a".repeat(40), repo: {full_name: repository}},
      base: {sha: "b".repeat(40), ref: "main", repo: {full_name: repository}}}};
}

export const requestOptions = event => ({eventName: "pull_request", event, repository,
  runSha: "c".repeat(40), workflowDefinitionSha: "d".repeat(40)});

export function evaluate(expression, options) {
  return vm.runInNewContext(expression, {
    github: {event_name: options.eventName, event: options.event, repository: options.repository,
      sha: options.runSha, workflow_sha: options.workflowDefinitionSha, run_id: "123", run_attempt: "2"},
    env: {CAPTURE_SOURCE_SHA: options.sourceSha},
    inputs: {automatic_source_sha: "", ...options.event.inputs}, cancelled: () => false,
    needs: {native_probe: {result: options.probeResult ?? "skipped", outputs: {}}},
    contains: (values, value) => values.includes(value), fromJSON: JSON.parse,
  }, {timeout: 1000});
}


export function fixture(t, {web = false, catalog = null} = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "hosted-captures-"));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const root = path.join(directory, "source");
  const write = (file, bytes) => {
    const destination = path.join(root, file);
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.writeFileSync(destination, bytes);
    return destination;
  };
  for (const file of ["tool/lib/repo_paths.mjs", "tool/lib/dart_call_blocks.mjs", "tool/ui_capture/run_captures.mjs",
    "tool/ui_capture/lib/capture_catalog_sources.mjs",
    "tool/marketing/export_app_screenshots.mjs", "tool/marketing/export_hosted_captures.mjs",
    "tool/marketing/import_hosted_captures.mjs",
    "tool/design/generate_widget_catalog.mjs", "tool/design/generate_widget_classification.mjs",
    "tool/design/component_concepts.mjs", "tool/design/lib/component_naming.mjs",
    "tool/design/lib/new_widget_inventory_declarations.mjs", "tool/design/lib/production_widget_roots.mjs",
    "design/components/catch.components.schema.json",
    "tool/marketing/lib/capture_provenance.mjs", "tool/marketing/lib/capture_seeds.mjs",
    "tool/marketing/lib/web_capture_inputs.mjs", "tool/marketing/lib/web_capture_render.mjs",
    "tool/marketing/lib/web_capture_screen.mjs", "tool/marketing/lib/capture_devices.mjs",
    "tool/ci/wait_main_marketing_validation.mjs", "tool/ci/required_ci_floor.mjs",
    "tool/marketing/sync_website_media.mjs", "tool/ci/toolchain.env"]) {
    write(file, fs.readFileSync(fromRepo(file)));
  }
  const manifest = JSON.parse(fs.readFileSync(fromRepo("tool/marketing/capture_manifest.json"), "utf8"));
  // The fixture renders app captures through stubs that write one phone PNG,
  // so it keeps twelve generic-phone app captures, whatever the real manifest
  // grows to; web captures join only where a test asks for them, with a small
  // website of their own.
  manifest.captures = manifest.captures
    .filter(capture => capture.kind !== "web-capture" && capture.device === "generic-phone").slice(0, 12);
  const png = fs.readFileSync(fromRepo(manifest.captures[0].sourcePath));
  if (web) {
    manifest.captures.push({...manifest.captures[0], id: "guest-join-phone", kind: "web-capture", audience: "guest",
      fixtureKey: undefined, routeId: "event_runtime", address: brand.web.domain,
      story: {file: "website/src/stories/WebCaptures.stories.tsx", id: "marketing-website-web-captures--join-phone-check-in"},
      sourcePath: "artifacts/marketing/app-screenshots/guest-join-phone.png",
      websitePath: "website/public/assets/app-screenshots/guest-join-phone.png"});
    write("package.json", JSON.stringify({workspaces: ["website"]}));
    write("package-lock.json", JSON.stringify({packages: {"node_modules/playwright": {version: "1.64.0"},
      "node_modules/playwright-core": {version: "1.64.0"}}}));
    write("design/website/routes.json", JSON.stringify({routes: [{id: "event_runtime"}]}));
    write("website/.storybook/preview.ts", 'import "../src/styles.css";\n');
    write("website/vite.config.ts", "export default {};\n");
    write("website/src/styles.css", "h1 { letter-spacing: -.065em; }\n");
    write("website/src/stories/WebCaptures.stories.tsx", "export const JoinPhoneCheckIn = {};\n");
  }
  write("tool/marketing/capture_manifest.json", JSON.stringify(manifest));
  write("tool/marketing/app_screenshots_design_context.json", "{}");
  write("website/public/assets/app-screenshots/manifest.json", "{}");
  for (const capture of manifest.captures) {
    write(capture.sourcePath, png);
    write(capture.websitePath, png);
  }
  writeCaptureCatalog(write, manifest.captures.filter(c => c.kind !== "web-capture")
    .map((c, i) => ({id: `screen_${i}`, fixtureKey: c.fixtureKey})));
  write("test/ui_captures/capture_runner_test.dart", "import 'package:catch_dating_app/leaf.dart';\n");
  write("test/ui_captures/flutter_test_config.dart", "");
  write("tool/marketing/frame_device_capture.dart", "");
  write("lib/leaf.dart", "const title = 'Today';\n");
  write("pubspec.yaml", "name: catch_dating_app\n");
  write("pubspec.lock", 'packages:\n  image:\n    version: "4.5.4"\n');
  write("packages/sample/pubspec.yaml", "name: sample\n");
  write("tool/demo/demo_seed/scenarios/sample.json", "{}");
  write("tool/demo/demo_seed/personas/sample.json", "{}");
  write("test/goldens/baseline.png", png);
  write("website/src/generated/hostListings.json", "{}\n");
  write("website/src/generated/hostListings.demo.json", "{}\n");
  write("website/src/generated/other.ts", "export const authored = true;\n");
  write("docs/widget_catalog.md", "# Authored guidance\n<!-- BEGIN GENERATED WIDGET INVENTORY -->\nold rows\n<!-- END GENERATED WIDGET INVENTORY -->\nAuthored footer\n");
  write(".gitignore", "/artifacts/marketing/app-screenshots/raw/\n");
  if (catalog) write("tool/harness/component_graph.json", JSON.stringify(catalog));
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
    if (args.includes('--version')) process.stdout.write(JSON.stringify({frameworkVersion:${JSON.stringify(flutterVersion)}}));
    else {
      // A coverage render reports the files that capture executed.
      const coverage = args.find(a => a.startsWith('--coverage-path='));
      if (coverage) { fs.mkdirSync(require('node:path').dirname(coverage.slice(16)), {recursive: true});
        fs.writeFileSync(coverage.slice(16), 'SF:lib/leaf.dart\\nDA:1,1\\nend_of_record\\n'); }
      // Each capture's raw screen, as the runner writes it; unframed screens are copied from here.
      const out = (args.find(a => a.startsWith('--dart-define=CAPTURE_OUTPUT_DIR=')) ?? '').split('=').slice(2).join('=');
      for (const id of (process.env.CAPTURE_IDS ?? '').split(',').filter(Boolean)) if (out) {
        fs.mkdirSync(out + '/' + id, {recursive: true});
        fs.writeFileSync(out + '/' + id + '/light.png', Buffer.from(${JSON.stringify(png.toString("base64"))},'base64'));
      }
      fs.appendFileSync(${JSON.stringify(calls)}, JSON.stringify({command:'flutter', args, ids: process.env.CAPTURE_IDS})+'\\n');
    }`);
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



export function preserveAndAdvance(f, message) {
  f.git("add", ".");
  f.git("-c", "user.name=Capture Test", "-c", "user.email=capture@example.invalid", "commit", "-qm", message);
  f.options.sourceSha = f.git("rev-parse", "HEAD");
  f.options.outputDir += "-next";
}


export function packBundle(directory) {
  const packed = spawnSync("python3", ["-c", `import io, pathlib, sys, zipfile
root = pathlib.Path(sys.argv[1])
output = io.BytesIO()
with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
    for file in sorted(root.rglob('*')):
        if file.is_file(): archive.write(file, file.relative_to(root).as_posix())
sys.stdout.buffer.write(output.getvalue())`, directory], {maxBuffer: 64 * 1024 * 1024});
  assert.equal(packed.status, 0, packed.stderr?.toString());
  return packed.stdout;
}


export const producerWorkflowIds = {"ci.yml": 7, "marketing-website.yml": 8, "marketing-captures.yml": 9};


// A fake GitHub holding one producer run whose bundle rendered this source.
// `newerRuns` puts that many bundle-less runs ahead of the bundle's run, newest
// first and spread across the producer workflows; a listing returns at most
// its `per_page`.
export function seedHarness(t, runOverrides = {}, artifactOverrides = {}, {omit = [], tamper = {}, newerRuns = 0} = {}) {
  const f = fixture(t);
  exportHostedCaptures(f.options);
  for (const id of omit) {
    fs.rmSync(path.join(f.options.outputDir, f.manifest.captures.find(c => c.id === id).sourcePath));
  }
  for (const [id, edit] of Object.entries(tamper)) {
    editProvenance(path.join(f.options.outputDir, f.manifest.captures.find(c => c.id === id).sourcePath), edit);
  }
  const zip = packBundle(f.options.outputDir);
  f.git("checkout", "--", ".");
  const run = {id: 70, run_attempt: 1, workflow_id: 7, path: ".github/workflows/ci.yml", event: "merge_group",
    head_branch: `gh-readonly-queue/main/pr-9-${"b".repeat(40)}`, head_sha: "c".repeat(40),
    repository: {id: 1}, head_repository: {id: 1}, created_at: "2026-10-24T09:00:00Z", ...runOverrides};
  const artifact = {id: 80, name: `canonical-marketing-${run.head_sha}-${run.id}-${run.run_attempt}`, expired: false,
    workflow_run: {id: run.id}, digest: `sha256:${crypto.createHash("sha256").update(zip).digest("hex")}`, ...artifactOverrides};
  const producers = Object.entries(producerWorkflowIds);
  const newer = Array.from({length: newerRuns}, (_, index) => {
    const [file, workflowId] = producers[index % producers.length];
    return {...run, id: 1000 + index, workflow_id: workflowId, path: `.github/workflows/${file}`, head_sha: "d".repeat(40),
      created_at: new Date(Date.parse(run.created_at) + (newerRuns - index) * 60_000).toISOString()};
  });
  const newerIds = new Set(newer.map(entry => entry.id));
  const endpoints = [];
  const request = async (endpoint, options = {}) => {
    endpoints.push(endpoint);
    if (endpoint === "repos/owner/repo") return {id: 1};
    for (const [file, id] of Object.entries(producerWorkflowIds)) {
      if (endpoint.endsWith(`/workflows/${file}`)) return {id};
      if (endpoint.includes(`/workflows/${id}/runs?`)) {
        const perPage = Number(new URLSearchParams(endpoint.split("?")[1]).get("per_page"));
        return {workflow_runs: [...newer, run].filter(entry => entry.workflow_id === id).slice(0, perPage)};
      }
    }
    if (endpoint.endsWith(`/runs/${run.id}/artifacts?per_page=100`)) return {artifacts: [artifact]};
    const newerRun = endpoint.match(/\/runs\/(\d+)\/artifacts\?per_page=100$/u);
    if (newerRun && newerIds.has(Number(newerRun[1]))) return {artifacts: []};
    if (endpoint.endsWith(`/artifacts/${artifact.id}/zip`)) { assert.equal(options.binary, true); return zip; }
    throw new Error(`Unexpected endpoint ${endpoint}`);
  };
  // `nightly` left undefined keeps the planner's default (a scheduled run is the nightly).
  const plan = (eventName = "pull_request", nativeProbe = null, nightly = undefined) => planHostedCaptures({sourceDir: f.root,
    sourceSha: f.options.sourceSha, repository: "owner/repo", eventName, request, nativeProbe, nightly});
  return {...f, plan, endpoints};
}


// A built Storybook index and a Playwright stand-in that records how pages
// are opened; the fixture's dart stub frames whatever the renderer hands it.
export function webStubs(directory) {
  const storybookDir = path.join(directory, "storybook");
  fs.mkdirSync(storybookDir, {recursive: true});
  fs.writeFileSync(path.join(storybookDir, "iframe.html"), "<!doctype html>");
  fs.writeFileSync(path.join(storybookDir, "index.json"), JSON.stringify({entries: {
    "marketing-website-web-captures--join-phone-check-in": {type: "story", importPath: "./src/stories/WebCaptures.stories.tsx"}}}));
  const playwrightDir = path.join(directory, "playwright");
  const module = path.join(playwrightDir, "node_modules", "playwright");
  fs.mkdirSync(module, {recursive: true});
  fs.writeFileSync(path.join(module, "package.json"), JSON.stringify({name: "playwright", version: "1.64.0"}));
  const contexts = path.join(directory, "contexts.jsonl");
  fs.writeFileSync(path.join(module, "index.mjs"), `import fs from "node:fs";
const page = {goto: async () => {}, waitForSelector: async () => {}, addStyleTag: async () => {}, evaluate: async () => {},
  waitForTimeout: async () => {}, setContent: async () => {}, screenshot: async () => Buffer.from("png"),
  locator: () => ({waitFor: async () => {}, isVisible: async () => false, textContent: async () => ""})};
export const devices = {"iPhone 17 Pro": {viewport: {width: 402, height: 681}, deviceScaleFactor: 3, isMobile: true, hasTouch: true}};
export const webkit = {launch: async () => ({close: async () => {}, newContext: async options => {
  fs.appendFileSync(${JSON.stringify(contexts)}, JSON.stringify(options) + "\\n");
  return {newPage: async () => page, close: async () => {}};
}})};
`);
  return {storybookDir, playwrightDir, contexts};
}


// The catalog as the exporter reads it: an index that resolves each marketing
// id lazily, plus one entry file per marketing capture.
export function writeCaptureCatalog(write, entries) {
  const variable = id => `${id.replace(/_([a-z0-9])/gu, (_, c) => c.toUpperCase())}Capture`;
  for (const entry of entries) {
    write(`test/ui_captures/catalog/entries/${entry.id}.dart`, `final ${variable(entry.id)} = ScreenCaptureEntry(id: '${entry.id}', routeIds: const <String>['today'],
      marketingFixtureKeys: const <String>['${entry.fixtureKey}'], device: CaptureDevice.iphone17Pro);\n`);
  }
  write("test/ui_captures/catalog/screen_capture_catalog.dart", `${entries.map(entry => `import 'entries/${entry.id}.dart';\n`).join("")}
final marketingScreenCaptures = <String, ScreenCaptureEntry Function()>{
${entries.map(entry => `  '${entry.id}': () => ${variable(entry.id)},\n`).join("")}};\n`);
  write("test/ui_captures/catalog/screen_capture_entry.dart", "class ScreenCaptureEntry {}\n");
}


// Rewrites a PNG's caPt provenance record, keeping the PNG structurally valid.
export function editProvenance(file, edit) {
  const bytes = fs.readFileSync(file);
  const out = [bytes.subarray(0, 8)];
  for (let offset = 8; offset < bytes.length;) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    const end = offset + length + 12;
    if (type === "caPt") {
      const data = Buffer.from(JSON.stringify(edit(JSON.parse(bytes.toString("utf8", offset + 8, end - 4)))));
      const payload = Buffer.concat([Buffer.from(type), data]);
      let crc = 0xffffffff;
      for (const byte of payload) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
      const head = Buffer.alloc(4); head.writeUInt32BE(data.length);
      const tail = Buffer.alloc(4); tail.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
      out.push(head, payload, tail);
    } else out.push(bytes.subarray(offset, end));
    offset = end;
  }
  fs.writeFileSync(file, Buffer.concat(out));
}
