import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import YAML from "yaml";
import {decideReleaseBlock, releaseBlockLabel} from "./release_block.mjs";
import {RELEASE_BLOCK_LABEL} from "./golden_policy.mjs";

const issue = (number, labels = [RELEASE_BLOCK_LABEL]) => ({number, title: "Golden or capture failure",
  html_url: `https://example.test/issues/${number}`, labels: labels.map((name) => ({name}))});

test("an open release-block issue blocks the release and is named; none clears it", () => {
  assert.equal(releaseBlockLabel("mobile"), RELEASE_BLOCK_LABEL);
  const blocked = decideReleaseBlock({scope: "mobile", issues: [issue(12)]});
  assert.equal(blocked.ok, false);
  assert.match(blocked.message, /#12 Golden or capture failure: https:\/\/example\.test\/issues\/12/u);
  assert.deepEqual(decideReleaseBlock({scope: "mobile", issues: []}).ok, true);
  // Pull requests and issues without the label never block.
  assert.equal(decideReleaseBlock({scope: "mobile", issues: [{...issue(3), pull_request: {}}, issue(4, ["bug"])]}).ok, true);
  assert.equal(decideReleaseBlock({scope: "mobile", issues: [{...issue(5), labels: [RELEASE_BLOCK_LABEL]}]}).ok, false,
    "labels given as plain names");
});

test("an issue list it could not read fails closed", () => {
  const decision = decideReleaseBlock({scope: "mobile", issues: null});
  assert.equal(decision.ok, false);
  assert.match(decision.message, /Could not read/u);
  assert.throws(() => decideReleaseBlock({scope: "web", issues: []}), /Unknown release-block scope/u);
});

for (const [name, script, status, pattern] of [
  ["a blocking issue", `console.log(JSON.stringify([[${JSON.stringify(issue(12))}]]))`, 1, /#12/u],
  ["no issue", "console.log('[[]]')", 0, /No open issue/u],
  ["an API error", "process.exit(1)", 1, /Could not read/u],
  ["an unreadable answer", "console.log('not json')", 1, /Could not read/u],
]) {
  test(`the check exits ${status} on ${name}`, (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "release-block-"));
    t.after(() => fs.rmSync(root, {recursive: true, force: true}));
    fs.writeFileSync(path.join(root, "gh"), `#!/usr/bin/env node
const args = process.argv.slice(2);
if (!args.includes("repos/owner/repo/issues?state=open&labels=release-block%3Amobile&per_page=100")) process.exit(3);
${script}
`, {mode: 0o755});
    const result = spawnSync(process.execPath, [new URL("./release_block.mjs", import.meta.url).pathname, "--check", "mobile"],
      {encoding: "utf8", env: {...process.env, PATH: `${root}${path.delimiter}${process.env.PATH}`, GITHUB_REPOSITORY: "owner/repo"}});
    assert.equal(result.status, status, result.stderr);
    assert.match(result.stdout, pattern);
  });
}

test("Release Readiness checks the mobile block first, reading issues only", () => {
  const source = fs.readFileSync(new URL("../../.github/workflows/release-readiness.yml", import.meta.url), "utf8");
  const parsed = YAML.parse(source);
  assert.deepEqual(parsed.permissions, {contents: "read", issues: "read"});
  const steps = parsed.jobs.checklist.steps;
  const check = steps.findIndex((step) => step.name === "Require no open mobile release block");
  assert.ok(check > 0, "the release-block step");
  assert.equal(steps[check].run, "node tool/ci/release_block.mjs --check mobile");
  assert.equal(steps[check].env.GH_TOKEN, "${{ github.token }}");
  assert.equal(steps[check].if, undefined);
  assert.equal(steps[check]["continue-on-error"], undefined);
  // Before the slow setup and every release check.
  const flutter = steps.findIndex((step) => step.uses === "./.github/actions/setup-flutter");
  assert.ok(check < flutter, "fails fast, before Flutter setup");
});
