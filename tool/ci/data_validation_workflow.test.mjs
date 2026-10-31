import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {extractSteps} from "../harness/lib/workflow_steps.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = fs.readFileSync(
  path.join(root, ".github/workflows/data-validation.yml"), "utf8",
);
const steps = extractSteps(source);
const validation = steps.find((step) => step.name === "Validate Firestore data");
const artifact = "firestore-data-validation.json";

function runWithSyntheticValidator(exitCode, {output = '{"summary":{"errors":0,"warnings":0}}',
  failOnWarning = "false", blockArtifact = false} = {}) {
  assert.ok(validation?.run, "missing validator run step");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "data-validation-workflow-"));
  const bin = path.join(directory, "bin");
  const argsFile = path.join(directory, "validator-args.txt");
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, "node"), `#!/bin/sh
printf '%s\\n' "$@" > "$VALIDATOR_ARGS_FILE"
for arg in "$@"; do
  if [ "$previous" = "--output" ]; then
    printf '%s\\n' "$VALIDATOR_JSON" > "$arg" || exit 1
  fi
  previous="$arg"
done
printf '%s\\n' "$VALIDATOR_JSON"
exit "$VALIDATOR_EXIT"
`, {mode: 0o755});
  if (blockArtifact) fs.mkdirSync(path.join(directory, artifact));
  try {
    // GitHub's explicit bash shell adds pipefail. The weaker -e invocation
    // proves the authored run block carries its own failure propagation.
    const result = spawnSync("bash", ["--noprofile", "--norc", "-e", "-c", validation.run], {
      cwd: directory,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${bin}${path.delimiter}${process.env.PATH}`,
        TARGET_ENV: "staging",
        MAX_DOCS: "10",
        FAIL_ON_WARNING: failOnWarning,
        VALIDATOR_EXIT: String(exitCode),
        VALIDATOR_JSON: output,
        VALIDATOR_ARGS_FILE: argsFile,
      },
    });
    return {
      result,
      args: fs.readFileSync(argsFile, "utf8").trim().split("\n"),
      output: blockArtifact ? null : fs.readFileSync(path.join(directory, artifact), "utf8"),
    };
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
}

test("data validation uses bash and always uploads its report after failure", () => {
  assert.ok(validation?.run);
  assert.match(source, /- name: Validate Firestore data\n        shell: bash\n/);
  assert.match(validation.run, /^set -euo pipefail\n/);
  assert.match(validation.run, /node tool\/data\/validate_firestore_data\.mjs "\$\{args\[@\]\}"/);
  assert.match(source, /environment: \$\{\{ github\.event\.inputs\.environment \|\| 'prod' \}\}/);
  assert.match(source, /uses: actions\/upload-artifact@[0-9a-f]{40} # v6[.0-9]*\n        if: always\(\)\n        with:\n          name: firestore-data-validation-[^\n]+\n          path: firestore-data-validation\.json/);
});

test("successful validator remains successful and explicit output saves its JSON", () => {
  const report = '{"summary":{"errors":0,"warnings":0}}';
  const {result, args, output} = runWithSyntheticValidator(0, {output: report});
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, `${report}\n`);
  assert.equal(output, `${report}\n`);
  assert.deepEqual(args, [
    "tool/data/validate_firestore_data.mjs", "--env", "staging", "--json", "--max-docs", "10", "--output", artifact,
  ]);
});

test("failing validator fails the step while explicit output retains its JSON", () => {
  const report = '{"summary":{"errors":177,"warnings":209}}';
  const {result, output} = runWithSyntheticValidator(1, {output: report});
  assert.equal(result.status, 1, result.stderr);
  assert.equal(result.stdout, `${report}\n`);
  assert.equal(output, `${report}\n`);
});

test("warning mode still passes its flag and preserves a nonzero exit", () => {
  const {result, args} = runWithSyntheticValidator(2, {failOnWarning: "true"});
  assert.equal(result.status, 2, result.stderr);
  assert.equal(args.at(-1), "--fail-on-warning");
});

test("explicit output failure also fails the step", () => {
  const {result} = runWithSyntheticValidator(0, {blockArtifact: true});
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /firestore-data-validation\.json/);
});

test("offline report regression runs before cloud authentication", () => {
  const offline = steps.findIndex((step) => step.name === "Test report capture offline");
  const auth = steps.findIndex((step) => step.name === "Authenticate to Google Cloud");
  assert.ok(offline >= 0 && offline < auth);
  assert.match(steps[offline].run, /node --test tool\/data\/validate_firestore_data\.test\.mjs/);
  assert.match(validation.run, /--output firestore-data-validation\.json/);
  assert.doesNotMatch(validation.run, /\| tee/);
});
