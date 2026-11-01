import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {
  scanScreenGutters,
  scanSourceForEdgeInsets,
} from "./check_screen_gutters.mjs";

const testDir = path.dirname(fileURLToPath(import.meta.url));

test("scanSourceForEdgeInsets flags the known-bad horizontal screen gutter fixture", () => {
  const fixture = fs.readFileSync(
    path.join(testDir, "fixtures/screen_gutters/bad_presentation_widget.dart"),
    "utf8",
  );

  const findings = scanSourceForEdgeInsets({
    relativePath: "lib/dashboard/presentation/widgets/activity_section.dart",
    source: fixture,
    isContractedScreenSurface: false,
  });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].level, "high");
  assert.match(findings[0].expression, /EdgeInsets\.symmetric/u);
});

test("scanScreenGutters covers presentation widgets, not only screen files", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-screen-gutters-"));
  writeJson(root, "design/screens/catch.screens.json", {screens: []});
  writeFile(
    root,
    "lib/dashboard/presentation/widgets/activity_section.dart",
    fs.readFileSync(
      path.join(testDir, "fixtures/screen_gutters/bad_presentation_widget.dart"),
      "utf8",
    ),
  );

  const result = scanScreenGutters({root});

  assert.equal(result.filesScanned, 1);
  assert.equal(result.counts.high, 1);
  assert.equal(result.findings[0].path, "lib/dashboard/presentation/widgets/activity_section.dart");
});

test("scanSourceForEdgeInsets ignores comments and strings", () => {
  const findings = scanSourceForEdgeInsets({
    relativePath: "lib/example/presentation/example_screen.dart",
    source: [
      "// const bad = EdgeInsets.symmetric(horizontal: CatchSpacing.s5);",
      "final prose = 'EdgeInsets.symmetric(horizontal: CatchSpacing.s5)';",
      "final ok = EdgeInsets.zero;",
    ].join("\n"),
  });

  assert.deepEqual(findings, []);
});

function writeFile(root, relativePath, source) {
  const file = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, source);
}

function writeJson(root, relativePath, value) {
  writeFile(root, relativePath, `${JSON.stringify(value, null, 2)}\n`);
}
