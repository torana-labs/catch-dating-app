import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import test from "node:test";
import {fileURLToPath} from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(testDirectory, "bootstrap_worktree.sh");

test("worktree bootstrap installs isolated dependencies in the required order", (context) => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "catch-bootstrap-worktree-"));
  context.after(() => fs.rmSync(fixtureRoot, {recursive: true, force: true}));
  fs.mkdirSync(path.join(fixtureRoot, "functions"));
  for (const relativePath of [
    "package.json",
    "package-lock.json",
    "functions/package.json",
    "functions/package-lock.json",
    "pubspec.yaml",
    "pubspec.lock",
  ]) {
    fs.writeFileSync(path.join(fixtureRoot, relativePath), "fixture\n");
  }

  const binDirectory = path.join(fixtureRoot, "bin");
  const logPath = path.join(fixtureRoot, "commands.log");
  fs.mkdirSync(binDirectory);
  writeExecutable(path.join(binDirectory, "git"), `#!/usr/bin/env bash
printf '%s\\n' "$CATCH_BOOTSTRAP_TEST_ROOT"
`);
  writeExecutable(path.join(binDirectory, "npm"), `#!/usr/bin/env bash
printf '%s|npm|%s\\n' "$PWD" "$*" >> "$CATCH_BOOTSTRAP_TEST_LOG"
`);
  writeExecutable(path.join(binDirectory, "flutter"), `#!/usr/bin/env bash
printf '%s|flutter|%s\\n' "$PWD" "$*" >> "$CATCH_BOOTSTRAP_TEST_LOG"
`);

  const result = spawnSync("bash", [scriptPath, "--target", "all"], {
    cwd: fixtureRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${binDirectory}:${process.env.PATH}`,
      CATCH_BOOTSTRAP_TEST_ROOT: fixtureRoot,
      CATCH_BOOTSTRAP_TEST_LOG: logPath,
    },
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Worktree bootstrap complete/u);
  assert.deepEqual(fs.readFileSync(logPath, "utf8").trim().split("\n"), [
    `${fixtureRoot}|npm|ci`,
    `${fixtureRoot}|npm|--workspace catch-admin run generate`,
    `${path.join(fixtureRoot, "functions")}|npm|ci`,
    `${path.join(fixtureRoot, "functions")}|npm|run generate`,
    `${fixtureRoot}|flutter|pub get`,
  ]);
});

test("targeted bootstrap installs only its selected locked dependency family", (context) => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "catch-bootstrap-target-"));
  context.after(() => fs.rmSync(fixtureRoot, {recursive: true, force: true}));
  const binDirectory = path.join(fixtureRoot, "bin");
  const logPath = path.join(fixtureRoot, "commands.log");
  fs.mkdirSync(binDirectory);
  fs.mkdirSync(path.join(fixtureRoot, "functions"));
  writeExecutable(path.join(binDirectory, "git"), "#!/usr/bin/env bash\nprintf '%s\\n' \"$CATCH_BOOTSTRAP_TEST_ROOT\"\n");
  writeExecutable(path.join(binDirectory, "npm"), "#!/usr/bin/env bash\nprintf '%s|npm|%s\\n' \"$PWD\" \"$*\" >> \"$CATCH_BOOTSTRAP_TEST_LOG\"\n");
  writeExecutable(path.join(binDirectory, "flutter"), "#!/usr/bin/env bash\nprintf '%s|flutter|%s\\n' \"$PWD\" \"$*\" >> \"$CATCH_BOOTSTRAP_TEST_LOG\"\n");
  const env = {...process.env, PATH: `${binDirectory}:${process.env.PATH}`,
    CATCH_BOOTSTRAP_TEST_ROOT: fixtureRoot, CATCH_BOOTSTRAP_TEST_LOG: logPath};
  const families = [
    {target: "root", locks: ["package.json", "package-lock.json"],
      commands: [`${fixtureRoot}|npm|ci`, `${fixtureRoot}|npm|--workspace catch-admin run generate`]},
    {target: "functions", locks: ["functions/package.json", "functions/package-lock.json"],
      commands: [`${path.join(fixtureRoot, "functions")}|npm|ci`, `${path.join(fixtureRoot, "functions")}|npm|run generate`]},
    {target: "flutter", locks: ["pubspec.yaml", "pubspec.lock"], commands: [`${fixtureRoot}|flutter|pub get`]},
  ];

  for (const {target, locks, commands} of families) {
    for (const lock of locks) fs.writeFileSync(path.join(fixtureRoot, lock), "fixture\n");
    const result = spawnSync("bash", [scriptPath, "--target", target],
      {cwd: fixtureRoot, encoding: "utf8", env});
    assert.equal(result.status, 0, `${target}: ${result.stderr}`);
    assert.deepEqual(fs.readFileSync(logPath, "utf8").trim().split("\n"), commands);
    fs.rmSync(logPath);
    for (const lock of locks) fs.rmSync(path.join(fixtureRoot, lock));
  }

  const missing = spawnSync("bash", [scriptPath, "--target", "flutter"],
    {cwd: fixtureRoot, encoding: "utf8", env});
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /requires pubspec.yaml/u);
  assert.equal(fs.existsSync(logPath), false);
  fs.writeFileSync(path.join(fixtureRoot, "pubspec.yaml"), "fixture\n");
  const missingLock = spawnSync("bash", [scriptPath, "--target", "flutter"],
    {cwd: fixtureRoot, encoding: "utf8", env});
  assert.equal(missingLock.status, 1);
  assert.match(missingLock.stderr, /requires pubspec.lock/u);
  assert.equal(fs.existsSync(logPath), false);
  const invalid = spawnSync("bash", [scriptPath, "--target", "unknown"],
    {cwd: fixtureRoot, encoding: "utf8", env});
  assert.equal(invalid.status, 64);
  assert.equal(fs.existsSync(logPath), false);
});

test("worktree bootstrap help is dependency-free", () => {
  const result = spawnSync("bash", [scriptPath, "--help"], {encoding: "utf8"});
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /root npm workspace dependencies/u);
  assert.match(result.stdout, /Firebase Functions npm dependencies/u);
  assert.match(result.stdout, /Flutter\/Dart packages/u);
});

test("bootstrap refuses implicit full-stack installation before running any tools", () => {
  const result = spawnSync("bash", [scriptPath], {encoding: "utf8", env: {...process.env, PATH: "/usr/bin:/bin"}});
  assert.equal(result.status, 64);
  assert.match(result.stderr, /--target/u);
  assert.doesNotMatch(result.stdout, /Installing|Resolving|complete/u);
});

function writeExecutable(filePath, source) {
  fs.writeFileSync(filePath, source, {mode: 0o755});
}
