import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
/**
 * Website Release's jobs check out the repository and run these scripts
 * without npm ci, so their whole import graph may use only node: built-ins
 * and relative files. #1271's `@catch/brand` import broke every train at
 * "Decide whether main's head should be released" (run 41134465583).
 */
const noInstall = ["releaseTrain.mjs", "previewRelease.mjs", "promoteRelease.mjs", "hostingState.mjs",
  "channelState.mjs", "liveOriginCheck.mjs"];
const here = path.dirname(fileURLToPath(import.meta.url));
const specifiers = source => [...source.matchAll(/^\s*(?:import|export)\b[^"']*?\bfrom\s*["']([^"']+)["']|^\s*import\s*["']([^"']+)["']/gmu)]
  .map(match => match[1] ?? match[2]);

test("scripts the release jobs run without npm ci import no packages", () => {
  const seen = new Set(), bare = [];
  const visit = file => {
    if (seen.has(file)) return; seen.add(file);
    for (const specifier of specifiers(fs.readFileSync(file, "utf8"))) {
      if (specifier.startsWith("node:")) continue;
      if (!specifier.startsWith(".")) {bare.push(`${path.relative(here, file)} imports ${specifier}`); continue;}
      visit(path.resolve(path.dirname(file), specifier));
    }
  };
  for (const script of noInstall) visit(path.join(here, script));
  assert.deepEqual(bare, []);
  assert.ok(seen.has(path.resolve(here, "../../../packages/brand/index.mjs")), "the brand record is read by relative path");
});
