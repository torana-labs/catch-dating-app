import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {buildInputsHash, libDigest} from "./functions_build_hash.mjs";
import {rejectReason, selectBuild, verifyExtracted} from "./select_functions_build.mjs";

const repositoryId = 1170579691;
const hash = "a".repeat(64);
const artifact = (id, overrides = {}) => ({id, name: `functions-build-${hash}`, expired: false,
  created_at: `2026-11-17T03:0${id % 10}:00Z`, workflow_run: {id: 100 + id}, ...overrides});
const run = (id, overrides = {}) => ({id, status: "completed", conclusion: "success", path: ".github/workflows/ci.yml",
  event: "merge_group", head_branch: "gh-readonly-queue/main/pr-1913-1ad4a76d", head_sha: "d".repeat(40),
  repository: {id: repositoryId}, head_repository: {id: repositoryId}, ...overrides});
const pick = (artifacts, runs) => selectBuild({hash, artifacts, runs: new Map(runs.map((r) => [r.id, r])), repositoryId});

test("a build from main's merge queue or main is used, the newest first", () => {
  const queue = pick([artifact(1)], [run(101)]);
  assert.equal(queue.artifact.id, 1, "same hash from a merge-queue ref: use");
  const both = pick([artifact(1), artifact(2)], [run(101), run(102, {event: "push", head_branch: "main"})]);
  assert.equal(both.artifact.id, 2, "the newest trusted build wins");
  for (const event of ["schedule", "workflow_dispatch"]) {
    assert.equal(pick([artifact(1)], [run(101, {event, head_branch: "main"})]).artifact.id, 1, event);
  }
  assert.equal(pick([artifact(1)], [run(101, {path: ".github/workflows/functions-ci.yml", event: "workflow_dispatch",
    head_branch: "main"})]).artifact.id, 1, "a dispatched Functions CI on main");
});

test("anything not from a trusted CI run of this repository is refused, so the deploy compiles", () => {
  const cases = [
    [run(101, {event: "workflow_dispatch", head_branch: "claude/edit-ci"}), /workflow_dispatch run of claude\/edit-ci, not main or its merge queue/u],
    [run(101, {event: "pull_request", head_branch: "main"}), /pull_request run of main/u],
    [run(101, {event: "push", head_branch: "release"}), /push run of release/u],
    [run(101, {conclusion: "failure"}), /did not succeed/u],
    [run(101, {status: "in_progress", conclusion: null}), /did not succeed/u],
    [run(101, {path: ".github/workflows/other.yml"}), /not CI/u],
    [run(101, {head_repository: {id: 42}}), /not from this repository/u],
    [run(101, {repository: {id: 42}}), /not from this repository/u],
  ];
  for (const [candidate, reason] of cases) {
    const result = pick([artifact(1)], [candidate]);
    assert.equal(result.artifact, undefined, String(reason));
    assert.match(result.reasons.join(";"), reason);
  }
  // A trusted older build still beats a newer untrusted one.
  assert.equal(pick([artifact(1), artifact(2)], [run(101), run(102, {event: "workflow_dispatch", head_branch: "x"})]).artifact.id, 1);
  assert.match(rejectReason({hash, artifact: artifact(1, {expired: true}), run: run(101), repositoryId}), /expired/u);
  assert.match(rejectReason({hash, artifact: artifact(1, {name: "functions-build-bbb"}), run: run(101), repositoryId}), /another hash/u);
  assert.match(rejectReason({hash, artifact: artifact(1), run: undefined, repositoryId}), /could not be read/u);
  assert.deepEqual(pick([], []).reasons, [`no functions-build-${hash} artifact was published`]);
});

const extracted = (t, {files = {"index.js": "exports.a = 1;\n", "shared/b.js": "b\n"}, recordHash = hash, format = 1} = {}) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "catch-build-verify-"));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  for (const [file, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, "functions/lib", file)), {recursive: true});
    fs.writeFileSync(path.join(dir, "functions/lib", file), text);
  }
  fs.mkdirSync(path.join(dir, "build/functions-build"), {recursive: true});
  fs.writeFileSync(path.join(dir, "build/functions-build/build.json"), JSON.stringify({format, hash: recordHash}));
  fs.writeFileSync(path.join(dir, "build/functions-build/lib-digest.json"), JSON.stringify(libDigest(path.join(dir, "functions/lib"))));
  const entries = ["functions/lib/", ...Object.keys(files).map((f) => `functions/lib/${f}`),
    "build/functions-build/build.json", "build/functions-build/lib-digest.json"];
  return {dir, entries};
};

test("a downloaded build is used only if every file matches its digest and record", (t) => {
  const good = extracted(t);
  assert.equal(verifyExtracted({hash, ...good}), null);
  const tampered = extracted(t);
  fs.writeFileSync(path.join(tampered.dir, "functions/lib/index.js"), "exports.a = 2;\n");
  assert.match(verifyExtracted({hash, ...tampered}), /1 built file\(s\) do not match the digest \(index\.js\)/u);
  const extra = extracted(t);
  fs.writeFileSync(path.join(extra.dir, "functions/lib/extra.js"), "x\n");
  assert.match(verifyExtracted({hash, ...extra}), /differ from the digest's list/u);
  assert.match(verifyExtracted({hash, ...extracted(t, {recordHash: "b".repeat(64)})}), /another hash/u);
  assert.match(verifyExtracted({hash, ...extracted(t, {format: 2})}), /format 2/u);
  assert.match(verifyExtracted({hash, ...good, entries: [...good.entries, "run.sh"]}), /unexpected files \(run\.sh\)/u);
  assert.match(verifyExtracted({hash, ...good, entries: [...good.entries, "functions/lib/../../x.js"]}), /outside its folder/u);
  fs.rmSync(path.join(good.dir, "build/functions-build/lib-digest.json"));
  assert.match(verifyExtracted({hash, ...good}), /missing or unreadable/u);
});

test("the CLI installs a trusted, verified build, and otherwise exits for a rebuild with a warning", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-build-cli-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
    fs.writeFileSync(path.join(root, file), text);
  };
  write("functions/package.json", "{}\n");
  write("functions/package-lock.json", "{}\n");
  write("functions/tsconfig.json", "{}\n");
  write("functions/src/index.ts", "export const a = 1;\n");
  write("functions/node_modules/typescript/package.json", "{\"version\":\"6.0.3\"}\n");
  write("functions/lib/stale.js", "old\n");
  const real = buildInputsHash({functionsDir: path.join(root, "functions"), nodeVersion: "24", typescriptVersion: "6.0.3"});
  // The CI build: its lib, record and digest, zipped as upload-artifact does.
  const ci = path.join(root, "ci");
  fs.mkdirSync(path.join(ci, "functions/lib"), {recursive: true});
  fs.writeFileSync(path.join(ci, "functions/lib/index.js"), "exports.a = 1;\n");
  fs.mkdirSync(path.join(ci, "build/functions-build"), {recursive: true});
  fs.writeFileSync(path.join(ci, "build/functions-build/build.json"), JSON.stringify({format: 1, hash: real}));
  fs.writeFileSync(path.join(ci, "build/functions-build/lib-digest.json"), JSON.stringify(libDigest(path.join(ci, "functions/lib"))));
  const zip = path.join(root, "build.zip");
  const zipped = spawnSync("python3", ["-c", `import os,sys,zipfile
z=zipfile.ZipFile(sys.argv[1],"w")
for d,_,fs in os.walk(sys.argv[2]):
  for f in fs:
    p=os.path.join(d,f); z.write(p, os.path.relpath(p, sys.argv[2]))
z.close()`, zip, ci], {encoding: "utf8"});
  assert.equal(zipped.status, 0, zipped.stderr);
  // A fake gh answering the four API calls the CLI makes.
  const bin = path.join(root, "bin");
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, "gh"), `#!/usr/bin/env bash
case "$2" in
  repos/o/r) echo '{"id":${repositoryId}}' ;;
  repos/o/r/actions/artifacts\\?*) echo "$ARTIFACTS" ;;
  repos/o/r/actions/runs/*) echo "$RUN" ;;
  repos/o/r/actions/artifacts/*/zip) cat "${zip}" ;;
  *) exit 9 ;;
esac
`, {mode: 0o755});
  const run = (runFields) => {
    const summary = path.join(root, "summary.md");
    fs.writeFileSync(summary, "");
    const result = spawnSync(process.execPath, [fileURLToPath(new URL("./select_functions_build.mjs", import.meta.url)),
      "--functions-dir", path.join(root, "functions"), "--node-version", "24", "--repository", "o/r", "--summary", summary],
    {encoding: "utf8", env: {...process.env, PATH: `${bin}:${process.env.PATH}`,
      ARTIFACTS: JSON.stringify({artifacts: [{id: 7, name: `functions-build-${real}`, expired: false,
        created_at: "2026-11-17T03:08:57Z", workflow_run: {id: 44007225405}}]}),
      RUN: JSON.stringify({id: 44007225405, status: "completed", conclusion: "success", path: ".github/workflows/ci.yml",
        event: "merge_group", head_branch: "gh-readonly-queue/main/pr-1913-1ad4a76d", head_sha: "d5e988b6".padEnd(40, "0"),
        html_url: "https://example.test/run", repository: {id: repositoryId}, head_repository: {id: repositoryId}, ...runFields})}});
    return {status: result.status, stdout: result.stdout, summary: fs.readFileSync(summary, "utf8")};
  };
  const used = run({});
  assert.equal(used.status, 0, used.stdout);
  assert.match(used.summary, new RegExp(`using CI's tested build ${real.slice(0, 12)} from run 44007225405 \\(merge_group, gh-readonly-queue/main/pr-1913-1ad4a76d, d5e988b6; 1 files verified\\)`, "u"));
  assert.deepEqual(fs.readdirSync(path.join(root, "functions/lib")), ["index.js"], "the stale lib is replaced");
  // Same hash, but from a branch dispatch: compile instead.
  const branch = run({event: "workflow_dispatch", head_branch: "claude/edit-ci"});
  assert.equal(branch.status, 3);
  assert.match(branch.stdout, /::warning::Compiling Functions here instead of using CI's tested build: artifact 7: run 44007225405 is a workflow_dispatch run of claude\/edit-ci/u);
  assert.match(branch.summary, /- Functions build: compiled here/u);
});

test("Deploy backend installs Functions, then ships CI's verified build or compiles", () => {
  const workflow = fs.readFileSync(new URL("../../.github/workflows/_backend-deploy.yml", import.meta.url), "utf8");
  assert.match(workflow, /^permissions:\n {2}actions: read\n/mu);
  const start = workflow.indexOf("- name: Install and build Functions");
  const step = workflow.slice(start, workflow.indexOf("\n      - ", start + 10));
  assert.match(step, /GH_TOKEN: \$\{\{ github\.token \}\}/u);
  const order = ["npm --prefix functions ci", "npm --prefix functions run prebuild",
    "node tool/firebase/select_functions_build.mjs", "npm --prefix functions run build"].map((text) => step.indexOf(text));
  assert.ok(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1])), `step order: ${order}`);
  assert.match(step, /if ! node tool\/firebase\/select_functions_build\.mjs --functions-dir functions/u);
  assert.ok(workflow.indexOf("uses: ./.github/actions/generate-contracts") < start, "contracts are generated before the hash");
});
