import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
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
function pathWithout(hidden) {
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), "tool-ci-requirements-"));
  for (const dir of (process.env.PATH ?? "").split(path.delimiter)) {
    if (!dir || !fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (hidden.includes(name) || fs.existsSync(path.join(bin, name))) continue;
      try {
        fs.symlinkSync(path.join(dir, name), path.join(bin, name));
      } catch {
        // An unreadable entry is not one the checks below run.
      }
    }
  }
  return bin;
}

// A wrong declaration means CI runs the tool without that toolchain. The tool
// must then fail, never pass by skipping: run real declared tools with the
// toolchain missing and require the runner to report each as failed.
test("a tool whose toolchain is missing fails loudly instead of skipping", {timeout: 300_000}, () => {
  const bin = pathWithout(["dart", "flutter", "rg", "npm", "npx"]);
  try {
    for (const [toolId, requirement] of [
      ["copy:mobile-ownership", "flutter"],
      ["audit:widget-cleanup", "ripgrep"],
      ["marketing:website-storybook", "root-npm"],
    ]) {
      const tool = loadToolsManifest().tools.find((entry) => entry.id === toolId);
      assert.ok(tool?.ciRequirements?.setup.includes(requirement), `${toolId} declares ${requirement}`);
      const result = spawnSync(process.execPath, ["tool/run.mjs", "check", toolId], {
        cwd: repoRoot,
        encoding: "utf8",
        env: {...process.env, PATH: bin},
      });
      const output = `${result.stdout}\n${result.stderr}`;
      assert.notEqual(result.status, 0, `${toolId} without ${requirement} must fail:\n${output}`);
      assert.match(output, new RegExp(`^- ${toolId} \\(`, "mu"), `${toolId} is listed as failed`);
      assert.doesNotMatch(output, /Tool checks passed/u);
    }
  } finally {
    fs.rmSync(bin, {recursive: true, force: true});
  }
});
