import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import test from "node:test";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const inputs = [
  "tool/ci/check_toolchain_consistency.sh",
  "tool/ci/toolchain.env",
  "tool/app_targets.json",
  "functions/package.json",
  "infra/firebase/versions.tf",
  "pubspec.yaml",
  ".github/workflows/app-build-matrix.yml",
  ".github/workflows/mobile-beta.yml",
  ".github/workflows/mobile-production.yml",
  ".github/workflows/visual-integration-ci.yml",
];

function check(root) {
  return spawnSync("bash", [path.join(root, inputs[0])], {
    cwd: root, encoding: "utf8",
  });
}

function fixture(t, {xcode, firebase}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-toolchain-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  for (const input of inputs) {
    const destination = path.join(root, input);
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.copyFileSync(path.join(repoRoot, input), destination);
  }
  const pins = path.join(root, "tool/ci/toolchain.env");
  fs.writeFileSync(pins, fs.readFileSync(pins, "utf8")
    .replace(/^XCODE_MIN_VERSION=.*$/m, `XCODE_MIN_VERSION=${xcode}`));
  const targets = path.join(root, "tool/app_targets.json");
  const manifest = JSON.parse(fs.readFileSync(targets, "utf8"));
  manifest.appleNativeDependencies.firebaseAppleSdkVersion = firebase;
  fs.writeFileSync(targets, JSON.stringify(manifest));
  return root;
}

test("checked-in dependency and Xcode pins are compatible", () => {
  const result = check(repoRoot);
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

for (const firebase of ["12.12.0", "12.18.0"]) {
  test(`Firebase ${firebase} rejects the former Xcode 26.1.1 floor`, (t) => {
    const result = check(fixture(t, {firebase, xcode: "26.1.1"}));
    assert.notEqual(result.status, 0);
    assert.match(result.stdout + result.stderr, /Firebase Apple SDK .* requires Xcode 26\.2\.0/);
  });
}

for (const xcode of ["26.2.0", "26.10.0"]) {
  test(`Firebase 12.18.0 accepts compatible Xcode ${xcode}`, (t) => {
    const result = check(fixture(t, {firebase: "12.18.0", xcode}));
    assert.equal(result.status, 0, result.stdout + result.stderr);
  });
}

test("older Firebase retains the existing connectivity dependency floor", (t) => {
  const result = check(fixture(t, {firebase: "12.11.0", xcode: "26.1.1"}));
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

for (const firebase of [undefined, "not-a-version"]) {
  test(`missing or malformed Firebase pin fails before reporting consistency (${firebase})`, (t) => {
    const result = check(fixture(t, {firebase, xcode: "26.2.0"}));
    assert.notEqual(result.status, 0);
    assert.match(result.stdout + result.stderr, /valid Firebase Apple SDK version/);
  });
}

test("the Terraform pin must match infra/firebase/versions.tf", (t) => {
  const root = fixture(t, {firebase: "12.18.0", xcode: "26.2.0"});
  const pins = path.join(root, "tool/ci/toolchain.env");
  fs.writeFileSync(pins, fs.readFileSync(pins, "utf8")
    .replace(/^TERRAFORM_VERSION=.*$/m, "TERRAFORM_VERSION=0.0.1"));
  const result = check(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /required_version is .*TERRAFORM_VERSION is 0\.0\.1/);
});
