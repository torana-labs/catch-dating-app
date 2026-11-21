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
import {planHostedCaptures} from "./lib/capture_seeds.mjs";
import {brand} from "@catch/brand";
import {editProvenance, evaluate, fixture, flutterVersion, labelEvent, packBundle, preserveAndAdvance, producerWorkflowIds, repository, requestOptions, seedHarness, webStubs, writeCaptureCatalog} from "./lib/hosted_capture_support.test.mjs";


test("earlier renders of the same inputs package on Linux without Flutter or the native font", t => {
  const f = fixture(t);
  const rendered = exportHostedCaptures(f.options);
  const seeds = new Map(rendered.captures.map(c => [c.id, fs.readFileSync(path.join(f.options.outputDir, c.sourcePath))]));
  f.git("checkout", "--", ".");
  fs.rmSync(f.calls, {force: true});
  f.executable("flutter", "process.exit(9);");
  const outputDir = path.join(path.dirname(f.options.outputDir), "reused");
  const result = exportHostedCaptures({...f.options, outputDir, platform: "linux", sfFont: "/missing/font.ttf",
    mode: "reuse", seeds});
  assert.equal(result.mode, "reuse");
  assert.equal(result.toolchain.flutter, null);
  assert.ok(!fs.existsSync(f.calls), "reuse must not render or frame anything");
  assert.equal(result.captures.length, f.manifest.captures.length);
  for (const capture of result.captures) {
    assert.equal(capture.disposition, "reused");
    assert.deepEqual(capture.provenance, rendered.captures.find(c => c.id === capture.id).provenance);
  }
  assert.ok(!result.commands.some(args => args.includes("--ids")), "no render command");
  assert.equal(new Set(result.captures.map(c => c.provenance.nativeFontSha256)).size, 1);
});


test("golden mutation fails publication even when canonical capture checks pass", t => {
  const f = fixture(t);
  const dart = fs.readFileSync(path.join(path.dirname(f.calls), "bin/dart"), "utf8");
  f.executable("dart", dart.split("\n").slice(1).join("\n") + "\nrequire('node:fs').writeFileSync('test/goldens/baseline.png','mutated');");
  assert.throws(() => exportHostedCaptures(f.options), /changed source or goldens/);
  assert.ok(!fs.existsSync(f.options.outputDir));
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


test("valid image bytes from an unrelated render revision are reused by fingerprint", t => {
  const f = fixture(t);
  const rendered = exportHostedCaptures(f.options);
  preserveAndAdvance(f, "Preserve rendered captures");
  const unrelated = f.git("-c", "user.name=Capture Test", "-c", "user.email=capture@example.invalid",
    "commit-tree", f.git("rev-parse", "HEAD^{tree}"), "-m", "Unrelated history with identical files");
  f.git("reset", "--hard", unrelated);
  f.options.sourceSha = unrelated;
  const calls = fs.readFileSync(f.calls, "utf8");
  const result = exportHostedCaptures(f.options);
  assert.ok(result.captures.every(c => c.disposition === "reused"));
  // Reused PNGs keep the revision that rendered them; they are never restamped.
  assert.ok(result.captures.every(c => c.provenance.sourceRevision === rendered.sourceSha));
  assert.equal(fs.readFileSync(f.calls, "utf8"), calls, "reuse renders nothing");
});


for (const [label, runOverrides, artifactOverrides] of [
  ["a fork pull request run", {event: "pull_request", head_branch: "feature", head_repository: {id: 2}}, {}],
  ["another repository's run", {repository: {id: 2}}, {}],
  ["another workflow", {path: ".github/workflows/other.yml"}, {}],
  ["a bundle whose bytes differ from its digest", {}, {digest: `sha256:${"0".repeat(64)}`}],
  ["an expired bundle", {}, {expired: true}],
  ["a bundle from another attempt", {}, {name: `canonical-marketing-${"c".repeat(40)}-70-2`}],
]) {
  test(`${label} never seeds a capture`, async t => {
    const h = seedHarness(t, runOverrides, artifactOverrides);
    const plan = await h.plan();
    assert.equal(plan.render, true);
    assert.deepEqual(plan.seedIds, []);
    assert.equal(h.git("status", "--porcelain"), "", "rejected candidates leave the source untouched");
  });
}


test("a run whose workflow id does not match its path never seeds a capture", async t => {
  const h = seedHarness(t, {workflow_id: 8});
  assert.deepEqual((await h.plan()).seedIds, []);
});


test("an app-only Linux render plan prepares web tools for a native-font change on macOS", async t => {
  const f = fixture(t, {web: true});
  const directory = path.dirname(f.options.outputDir);
  const webTools = webStubs(directory);
  exportHostedCaptures({...f.options, ...webTools});
  f.git("add", ".");
  f.git("-c", "user.name=Capture Test", "-c", "user.email=capture@example.invalid", "commit", "-qm", "preserve rendered captures");
  const request = async endpoint => endpoint === "repos/owner/repo" ? {id: 1} :
    endpoint.endsWith("/workflows/ci.yml") ? {id: 7} : {workflow_runs: []};
  const plan = () => planHostedCaptures({sourceDir: f.root, sourceSha: f.git("rev-parse", "HEAD"),
    repository: "owner/repo", eventName: "pull_request", request});
  const fresh = await plan();
  assert.deepEqual([fresh.render, fresh.webRender], [false, false], "reuse needs no web tooling");
  f.write("lib/leaf.dart", "const title = 'Updated app';\n");
  f.git("add", "lib/leaf.dart");
  f.git("-c", "user.name=Capture Test", "-c", "user.email=capture@example.invalid", "commit", "-qm", "change only app capture inputs");
  const appOnly = await plan();
  assert.ok(appOnly.renderIds.length > 0);
  assert.ok(!appOnly.renderIds.includes("guest-join-phone"));
  assert.equal(appOnly.webRender, true, "macOS can invalidate the otherwise-current web capture's font");
  fs.writeFileSync(f.options.sfFont, "updated macOS native font");
  const rendered = exportHostedCaptures({...f.options, ...webTools,
    sourceSha: f.git("rev-parse", "HEAD"), outputDir: path.join(directory, "font-updated")});
  assert.equal(rendered.captures.find(c => c.id === "guest-join-phone").disposition, "rendered");
  assert.equal(new Set(rendered.captures.map(c => c.provenance.nativeFontSha256)).size, 1);
});


for (const [label, edit] of [
  ["claims a fingerprint its recorded list does not produce", record => ({...record,
    inputFiles: deflateRawSync(Buffer.from(inflateRawSync(Buffer.from(record.inputFiles, "base64")).toString("utf8")
      .split("\n").filter(file => file !== "lib/leaf.dart").join("\n"))).toString("base64")})],
  ["claims a fingerprint the current files do not produce", record => ({...record, inputSha256: "0".repeat(64)})],
]) {
  test(`a bundle PNG that ${label} is recomputed by the consumer and never seeds`, async t => {
    const forged = "host-today";
    const h = seedHarness(t, {}, {}, {tamper: {[forged]: edit}});
    const plan = await h.plan();
    assert.deepEqual(plan.renderIds, [forged]);
    assert.ok(!plan.seedIds.includes(forged));
    assert.equal(plan.seedIds.length, h.manifest.captures.length - 1);
  });
}


test("a committed PNG stamped with another machine's font goes to the renderer, never into a mixed bundle", async t => {
  const h = seedHarness(t);
  const id = "host-today";
  const capture = h.manifest.captures.find(c => c.id === id);
  // The bundle's own render of these inputs, committed by hand as if made on a laptop with another font.
  const committed = path.join(h.root, capture.sourcePath);
  fs.copyFileSync(path.join(h.options.outputDir, capture.sourcePath), committed);
  editProvenance(committed, record => ({...record, nativeFontSha256: "f".repeat(64)}));
  fs.copyFileSync(committed, path.join(h.root, capture.websitePath));
  preserveAndAdvance(h, "commit a local render");
  const plan = await h.plan();
  assert.ok(plan.renderIds.includes(id), "the laptop's font must not be reused beside the runner's seeds");
  assert.ok(!plan.seedIds.includes(id));
  assert.equal(plan.render, true);
});
