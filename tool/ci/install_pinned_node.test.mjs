import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import test from "node:test";
import {fileURLToPath} from "node:url";

const scriptPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "install_pinned_node.sh");
const pinnedMajor = fs.readFileSync(path.join(path.dirname(scriptPath), "toolchain.env"), "utf8")
  .match(/^NODE_VERSION=(\d+)$/mu)[1];
const release = `node-v${pinnedMajor}.9.1-linux-x64`;

function writeExecutable(file, source) {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, source, {mode: 0o755});
}

function fakeNode(file, version) {
  writeExecutable(file, `#!/usr/bin/env bash\n[[ $1 == --version ]] && echo v${version}\n`);
}

// A fake nodejs.org: one tarball and its SHASUMS256.txt, served over file://.
function fixture(context, {currentVersion, corruptChecksum = false}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-pinned-node-"));
  context.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const dist = path.join(root, "dist", `latest-v${pinnedMajor}.x`);
  const staging = path.join(root, "staging");
  fakeNode(path.join(staging, release, "bin", "node"), `${pinnedMajor}.9.1`);
  for (const tool of ["npm", "npx"]) {
    writeExecutable(path.join(staging, release, "bin", tool), "#!/usr/bin/env bash\n");
  }
  fs.mkdirSync(dist, {recursive: true});
  const archive = `${release}.tar.xz`;
  const tar = spawnSync("tar", ["-cJf", path.join(dist, archive), "-C", staging, release]);
  assert.equal(tar.status, 0, String(tar.stderr));
  const digest = corruptChecksum ? "0".repeat(64) :
    createHash("sha256").update(fs.readFileSync(path.join(dist, archive))).digest("hex");
  fs.writeFileSync(path.join(dist, "SHASUMS256.txt"), [
    `${"1".repeat(64)}  node-v${pinnedMajor}.9.1-darwin-arm64.tar.gz`,
    `${digest}  ${archive}`,
    `${"2".repeat(64)}  node-v${pinnedMajor}.9.1-linux-x64.tar.gz`,
  ].join("\n") + "\n");
  const imageBin = path.join(root, "image-bin");
  fakeNode(path.join(imageBin, "node"), currentVersion);
  writeExecutable(path.join(imageBin, "uname"),
    "#!/usr/bin/env bash\n[[ $1 == -s ]] && echo Linux || echo x86_64\n");
  const binDir = path.join(root, "home-bin");
  const run = () => spawnSync("bash", [scriptPath], {
    encoding: "utf8",
    env: {
      ...process.env,
      CATCH_NODE_BIN_DIR: binDir,
      CATCH_NODE_DIST_URL: `file://${path.join(root, "dist")}`,
      CATCH_NODE_HOME: path.join(root, "install"),
      PATH: `${binDir}:${imageBin}:${process.env.PATH}`,
    },
  });
  return {binDir, root, run};
}

test("a different Node major is replaced by the verified pinned release", (context) => {
  const {binDir, root, run} = fixture(context, {currentVersion: "22.22.0"});
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, new RegExp(`Node v${pinnedMajor}\\.9\\.1 is active at ${binDir}/node`, "u"));
  for (const tool of ["node", "npm", "npx"]) {
    assert.equal(fs.readlinkSync(path.join(binDir, tool)),
      path.join(root, "install", release, "bin", tool));
  }
  assert.equal(fs.existsSync(path.join(binDir, "corepack")), false);
  const again = run();
  assert.equal(again.status, 0, again.stderr);
  assert.match(again.stdout, /already matches/u);
});

test("the pinned major already on PATH installs nothing", (context) => {
  const {binDir, run} = fixture(context, {currentVersion: `${pinnedMajor}.0.0`});
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, new RegExp(`already matches NODE_VERSION=${pinnedMajor}`, "u"));
  assert.equal(fs.existsSync(binDir), false);
});

test("a checksum mismatch fails before anything is installed or linked", (context) => {
  const {binDir, root, run} = fixture(context, {currentVersion: "22.22.0", corruptChecksum: true});
  const result = run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Checksum mismatch/u);
  assert.equal(fs.existsSync(path.join(root, "install", release)), false);
  assert.equal(fs.existsSync(binDir), false);
});

test("unknown arguments are rejected", () => {
  const result = spawnSync("bash", [scriptPath, "--force"], {encoding: "utf8"});
  assert.equal(result.status, 64);
  assert.match(result.stderr, /^Usage:/u);
});
