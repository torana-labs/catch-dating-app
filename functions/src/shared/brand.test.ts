import {strict as assert} from "node:assert";
import {spawnSync} from "node:child_process";
import * as path from "node:path";
import {test} from "node:test";

// Functions CI runs whenever this generated copy changes; it re-runs the
// repository-wide guard so a hard-coded brand value in Functions fails here.
const repoRoot = path.resolve(__dirname, "../../..");

for (const script of ["generate.mjs", "check_brand_literals.mjs"]) {
  test(`packages/brand/${script} passes`, () => {
    const args = [path.join(repoRoot, "packages/brand", script)];
    if (script === "generate.mjs") args.push("--check");
    const result = spawnSync(process.execPath, args,
      {cwd: repoRoot, encoding: "utf8"});
    assert.equal(result.status, 0, result.stderr || result.stdout);
  });
}
