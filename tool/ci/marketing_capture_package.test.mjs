import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = fs.readFileSync(path.join(repoRoot, ".github/workflows/react-surface-validation.yml"), "utf8");
const block = source.split("      - name: Verify validation-only marketing Hosting package\n")[1].split("\n      - name: ")[0];
const script = block.split("        run: |\n")[1].split("\n")
  .map(line => line.startsWith("          ") ? line.slice(10) : line).join("\n");
const condition = block.match(/if: \$\{\{ (.*) \}\}/u)[1];
const sha = "a".repeat(40);

function fixture(t, {mutate = () => {}, scriptOverride = script, tamper = false, extraCapture = false} = {}) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "capture-package-step-")));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const write = (file, bytes) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
    fs.writeFileSync(path.join(root, file), bytes);
  };
  for (const file of [
    "tool/ci/package_web_hosting.mjs", "tool/ci/delivery_core.mjs",
    "tool/marketing/export_hosted_captures.mjs", "tool/marketing/capture_manifest.json",
    "firebase.json", ".firebaserc",
  ]) write(file, fs.readFileSync(path.join(repoRoot, file)));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "tool/marketing/capture_manifest.json")));
  if (extraCapture) {
    const id = "additional-web-capture";
    manifest.captures.push({...manifest.captures[0], id, fixtureKey: id,
      sourcePath: `artifacts/marketing/app-screenshots/${id}.png`,
      websitePath: `website/public/assets/app-screenshots/${id}.png`});
    write("tool/marketing/capture_manifest.json", JSON.stringify(manifest));
  }
  const capturePaths = ["website/public/assets/app-screenshots/manifest.json", ...manifest.captures.map(c => c.websitePath)];
  capturePaths.forEach((file, index) => write(file.replace("website/public/", "website/dist/"),
    Buffer.from(`already-verified-built-bytes-${index}\n`)));
  write("website/dist/index.html", "<h1>Package fixture</h1>");
  const current = {
    id: 101, run_attempt: 2, run_number: 73, head_sha: sha, event: "workflow_dispatch",
    path: ".github/workflows/marketing-website.yml", workflow_id: 77,
    repository: {full_name: "owner/repo"}, head_repository: {full_name: "owner/repo"},
  };
  mutate(current);
  write("api.json", JSON.stringify(current));
  write("bin/gh", `#!/bin/sh
[ "$1" = api ] && [ "$2" = repos/owner/repo/actions/runs/101/attempts/2 ] && [ "$#" = 2 ] || exit 91
printf '%s\\n' "$*" >> "$REVIEW_ROOT/gh.trace"
cat "$REVIEW_ROOT/api.json"
`);
  fs.chmodSync(path.join(root, "bin/gh"), 0o755);
  // macOS lacks GNU tar. Only adapt GNU metadata flags; create a real archive.
  // Ubuntu CI executes the original GNU command without this adapter.
  if (process.platform === "darwin") {
    write("bin/tar", `#!/usr/bin/env python3
import os,sys
args=[x for x in sys.argv[1:] if not x.startswith(('--sort=','--mtime=','--owner=','--group=')) and x!='--numeric-owner']
os.execv('/usr/bin/tar',['tar',*args])
`);
    fs.chmodSync(path.join(root, "bin/tar"), 0o755);
  }
  let actualScript = scriptOverride;
  if (tamper) actualScript = actualScript.replace("node --input-type=module <<'NODE'",
    `printf 'changed-after-prepare' > build/ci/marketing-hosting-validation/package/site/assets/app-screenshots/${manifest.captures[0].id}.png\nnode --input-type=module <<'NODE'`);
  const result = spawnSync("/bin/bash", ["-euo", "pipefail", "-c", actualScript], {
    cwd: root, encoding: "utf8",
    env: {...process.env, PATH: `${root}/bin:${process.env.PATH}`, REVIEW_ROOT: root,
      GITHUB_REPOSITORY: "owner/repo", GITHUB_SHA: sha, GITHUB_RUN_ID: "101",
      GITHUB_RUN_ATTEMPT: "2", GITHUB_RUN_NUMBER: "73",
      CAPTURE_BINDING: JSON.stringify({sourceSha: sha, artifactId: "123"})},
  });
  return {root, result, capturePaths};
}

test("actual package step allows only the intended manual marketing build", () => {
  const run = (inputs = {}, github = {}) => Function("inputs", "github", `return (${condition});`)(
    {surface: "marketing", skip_deployable_build: false, ...inputs},
    {event_name: "workflow_dispatch", workflow: "Marketing Website", ...github});
  assert.equal(run(), true);
  for (const [inputs, github] of [
    [{surface: "admin"}, {}], [{skip_deployable_build: true}, {}],
    [{}, {event_name: "push"}], [{}, {event_name: "pull_request"}],
    [{}, {workflow: "CI"}], [{}, {workflow: "Other workflow"}],
  ]) assert.equal(run(inputs, github), false);
});

for (const extraCapture of [false, true]) test(`actual shell packages the complete capture inventory (extra capture: ${extraCapture})`, t => {
  const {root, result, capturePaths} = fixture(t, {extraCapture});
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const directory = path.join(root, "build/ci/marketing-hosting-validation");
  const proof = JSON.parse(fs.readFileSync(path.join(directory, "upload/capture-package-proof.json")));
  assert.deepEqual(proof.files.map(file => file.path), capturePaths);
  assert.equal(proof.validationOnly, true);
  for (const file of capturePaths) {
    assert.deepEqual(fs.readFileSync(path.join(root, file.replace("website/public/", "website/dist/"))),
      fs.readFileSync(path.join(directory, "package/site", file.replace("website/public/", ""))));
  }
  const inventory = JSON.parse(fs.readFileSync(path.join(directory, "package/web-delivery-inventory.json")));
  assert.equal(inventory.entries.filter(entry => entry.path.startsWith("site/assets/app-screenshots/")).length, capturePaths.length);
  assert.equal(fs.readFileSync(path.join(root, "gh.trace"), "utf8").trim(),
    "api repos/owner/repo/actions/runs/101/attempts/2");
});

for (const [field, value] of [
  ["id", 102], ["run_attempt", 1], ["run_number", 74], ["head_sha", "b".repeat(40)],
  ["event", "push"], ["path", ".github/workflows/ci.yml"],
  ["repository", {full_name: "foreign/repo"}], ["head_repository", {full_name: "foreign/repo"}],
  ["workflow_id", 0], ["workflow_id", 1.5],
]) test(`actual package shell rejects ${field} mismatch before stage creation`, t => {
  const {root, result} = fixture(t, {mutate: current => { current[field] = value; }});
  assert.notEqual(result.status, 0);
  assert.equal(fs.existsSync(path.join(root, "build/ci/marketing-hosting-validation")), false,
    result.stdout + result.stderr);
});

test("actual package comparison rejects a post-prepare altered capture", t => {
  const {result} = fixture(t, {tamper: true});
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Packaged capture differs/u);
});

test("real adapter rejects the former wrong internal archive basename", t => {
  const {result} = fixture(t, {scriptOverride: script.replaceAll("/web-hosting-marketing.tar.gz", "/marketing-validation.tar.gz")});
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Provenance artifact basename does not match/u);
});

test("actual caller excludes recovery before reusable package validation can execute", () => {
  const caller = fs.readFileSync(path.join(repoRoot, ".github/workflows/marketing-website.yml"), "utf8");
  const section = caller.split("\n  validate:\n")[1].split("\n  package:\n")[0];
  const expression = section.split("    if: >-\n")[1].split("\n    uses:")[0].trim()
    .replace(/^\$\{\{|\}\}$/gu, "").replace(/needs\.([\w]+-[\w-]+)/gu, 'needs["$1"]');
  const evaluate = Function("inputs", "github", "needs", "cancelled", `return (${expression});`);
  const needs = {"ci-validation": {result: "skipped", outputs: {capture_binding: "", validated: ""}}, captures: {result: "success"}};
  assert.equal(evaluate({recovery_artifact_id: ""}, {event_name: "workflow_dispatch"}, needs, () => false), true);
  assert.equal(evaluate({recovery_artifact_id: "123"}, {event_name: "workflow_dispatch"}, needs, () => false), false);
  assert.equal(evaluate({recovery_artifact_id: ""}, {event_name: "workflow_dispatch"}, needs, () => true), false);
});

test("real inventory verifier rejects capture corruption after comparison", t => {
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, "tool/marketing/capture_manifest.json")));
  const corruption = `printf 'late-corruption' > build/ci/marketing-hosting-validation/package/site/assets/app-screenshots/${manifest.captures[0].id}.png\nnode tool/ci/package_web_hosting.mjs verify`;
  const {result} = fixture(t, {scriptOverride: script.replace("node tool/ci/package_web_hosting.mjs verify", corruption)});
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /contents do not match the delivery inventory/u);
});
