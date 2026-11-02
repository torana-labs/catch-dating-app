import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  scanOptionGroupUsage,
  scanSourceForOptionGroupUsage,
} from "./check_option_group_usage.mjs";

test("flags direct CatchChoiceButton usage in production feature code", () => {
  const findings = scanSourceForOptionGroupUsage({
    relativePath: "lib/explore/presentation/widgets/example_filter_rail.dart",
    source:
      "Widget build(context) => CatchChoiceButton<String>(option: option, selected: true);",
  });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].level, "high");
});

test("allows the canonical CatchChoiceInput.segmented implementation", () => {
  const findings = scanSourceForOptionGroupUsage({
    relativePath: "packages/catch_ui/lib/src/components/catch_choice_input.dart",
    source:
      "Widget build(context) => CatchChoiceButton<String>(option: option, selected: true);",
  });

  assert.equal(findings.length, 0);
});

test("the deleted app implementation path no longer bypasses the check", () => {
  const findings = scanSourceForOptionGroupUsage({
    relativePath: "lib/core/widgets/catch_choice_input.dart",
    source:
      "Widget build(context) => CatchChoiceButton<String>(option: option, selected: true);",
  });

  assert.equal(findings.length, 1);
});

test("ignores direct item usage outside production lib sources", () => {
  const findings = scanSourceForOptionGroupUsage({
    relativePath: "test/core/catch_primitives_test.dart",
    source:
      "Widget build(context) => CatchChoiceButton<String>(option: option, selected: true);",
  });

  assert.equal(findings.length, 0);
});

test("scanOptionGroupUsage reports production files only", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-option-group-"));
  writeFile(
    root,
    "lib/explore/presentation/widgets/example_filter_rail.dart",
    "Widget build(context) => CatchChoiceButton<String>(option: option, selected: true);",
  );
  writeFile(
    root,
    "packages/catch_ui/lib/src/components/catch_choice_input.dart",
    "Widget build(context) => CatchChoiceButton<String>(option: option, selected: true);",
  );
  writeFile(
    root,
    "test/core/catch_primitives_test.dart",
    "Widget build(context) => CatchChoiceButton<String>(option: option, selected: true);",
  );

  const result = scanOptionGroupUsage({root});

  assert.equal(result.counts.high, 1);
  assert.equal(result.findings[0].path, "lib/explore/presentation/widgets/example_filter_rail.dart");
});

test("flags direct CatchChoiceButton usage in both app packages", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-option-group-apps-"));
  const source = "Widget build(context) => CatchChoiceButton<String>(option: option, selected: true);";
  writeFile(root, "lib/core/kept.dart", "class Kept {}");
  writeFile(root, "apps/host/lib/today/today_filter.dart", source);
  writeFile(root, "apps/consumer/lib/explore/explore_filter.dart", source);
  writeFile(root, "apps/host/test/today/today_filter_test.dart", source);

  const result = scanOptionGroupUsage({root});

  assert.equal(result.filesScanned, 3);
  assert.deepEqual(result.findings.map((finding) => finding.path), [
    "apps/consumer/lib/explore/explore_filter.dart",
    "apps/host/lib/today/today_filter.dart",
  ]);
});

function writeFile(root, relativePath, source) {
  const file = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, source);
}
