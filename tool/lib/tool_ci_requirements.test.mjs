import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {invokedSetupRequirements, missingSetupRequirements} from "./tool_ci_requirements.mjs";
import {loadToolsManifest} from "./tools_manifest.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixture = (checks, setup = ["node"]) => ({id: "fixture:tool", checks, ciRequirements: {repositoryView: "full", setup}});

test("every declared tool declares the toolchains its check commands run", () => {
  const gaps = loadToolsManifest().tools.flatMap((tool) =>
    missingSetupRequirements(tool).map(({requirement, command}) => `${tool.id} runs \`${command}\` without declaring ${requirement}`));
  assert.deepEqual(gaps, []);
});

test("a declaration that leaves out a toolchain its commands run is reported", () => {
  const tool = fixture([
    "node --check tool/x.mjs",
    "dart analyze tool/x.dart",
    "CI=1 flutter test test/x_test.dart",
    "rg -n pattern lib && npm --workspace catch-admin run build",
    "npm --prefix functions ci",
  ]);
  assert.deepEqual(invokedSetupRequirements(tool).map(({requirement}) => requirement), ["flutter", "ripgrep", "root-npm"]);
  assert.deepEqual(missingSetupRequirements(tool).map(({requirement}) => requirement), ["flutter", "ripgrep", "root-npm"]);
  assert.deepEqual(missingSetupRequirements(fixture(tool.checks, ["node", "flutter", "ripgrep", "root-npm"])), []);
  assert.deepEqual(invokedSetupRequirements(fixture(["npm --prefix functions run build", "node tool/rg.mjs"])), []);
  assert.deepEqual(missingSetupRequirements({id: "fixture:undeclared", checks: ["dart x.dart"]}), []);
});

/** A PATH holding everything on this one except the named executables. */
function pathWithout(hidden, dir) {
  const bin = path.join(dir, "bin");
  fs.mkdirSync(bin);
  for (const entry of (process.env.PATH ?? "").split(path.delimiter)) {
    if (!entry || !fs.existsSync(entry)) continue;
    for (const name of fs.readdirSync(entry)) {
      if (hidden.includes(name) || fs.existsSync(path.join(bin, name))) continue;
      try {
        fs.symlinkSync(path.join(entry, name), path.join(bin, name));
      } catch {
        // An unreadable entry is not one the checks below run.
      }
    }
  }
  return bin;
}

// Every Tools job has Node and npm, the Functions dependencies and the
// generated contracts. Without the root-npm setup the repository's own
// node_modules is absent: this hook makes every module that resolves there
// fail as not found, in the runner and every Node process it starts.
const hideRootModulesHook = `import {registerHooks} from "node:module";
const hidden = process.env.TOOL_CI_HIDDEN_MODULES;
registerHooks({
  resolve(specifier, context, nextResolve) {
    const result = nextResolve(specifier, context);
    if (hidden && result.url.startsWith(hidden)) {
      const error = new Error(\`Cannot find package '\${specifier}': root node_modules is not installed\`);
      error.code = "ERR_MODULE_NOT_FOUND";
      throw error;
    }
    return result;
  },
});
`;

/** Runs tools as a Tools job with only the node setup would: no Flutter, Dart, ripgrep or root node_modules. */
function runInNodeOnlySetup(toolId, dir) {
  // Under node --test, an inherited NODE_TEST_CONTEXT makes every nested
  // `node --test` skip its files and pass; a CI job has no such variable.
  const {NODE_TEST_CONTEXT: _testContext, ...inherited} = process.env;
  const result = spawnSync(process.execPath, ["tool/run.mjs", "check", toolId], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...inherited,
      PATH: path.join(dir, "bin"),
      NODE_OPTIONS: `--import ${pathToFileURL(path.join(dir, "hide_root_modules.mjs")).href}`,
      TOOL_CI_HIDDEN_MODULES: pathToFileURL(path.join(repoRoot, "node_modules")).href + "/",
    },
  });
  return {status: result.status, output: `${result.stdout}\n${result.stderr}`};
}

// A wrong declaration means CI runs the tool without that setup. The tool must
// then fail, never pass by skipping: run real tools that declare each setup in
// a node-only environment and require the runner to report each as failed.
test("a tool whose declared setup is missing fails loudly instead of skipping", {timeout: 300_000}, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tool-ci-requirements-"));
  try {
    pathWithout(["dart", "flutter", "rg"], dir);
    fs.writeFileSync(path.join(dir, "hide_root_modules.mjs"), hideRootModulesHook);
    const tools = loadToolsManifest().tools;
    for (const [toolId, requirement] of [
      ["copy:mobile-ownership", "flutter"],
      ["audit:widget-cleanup", "ripgrep"],
      ["ci:golden-policy", "root-npm"],
    ]) {
      const tool = tools.find((entry) => entry.id === toolId);
      assert.ok(tool?.ciRequirements?.setup.includes(requirement), `${toolId} declares ${requirement}`);
      const {status, output} = runInNodeOnlySetup(toolId, dir);
      assert.notEqual(status, 0, `${toolId} without ${requirement} must fail:\n${output}`);
      assert.match(output, new RegExp(`^- ${toolId} \\(`, "mu"), `${toolId} is listed as failed`);
      assert.doesNotMatch(output, /Tool checks passed/u);
    }
    // The environment itself is sound: a node-only tool still passes in it.
    const control = tools.find((entry) => entry.id === "remote-ops:manifest");
    assert.deepEqual(control?.ciRequirements?.setup, ["node"]);
    const {status, output} = runInNodeOnlySetup(control.id, dir);
    assert.equal(status, 0, output);
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});
