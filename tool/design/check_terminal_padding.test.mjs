import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {checkTerminalPadding} from "./check_terminal_padding.mjs";

test("flags hand-rolled safe-area bottom padding in product code", () => {
  const root = fixtureRoot();
  write(
    root,
    "lib/payments/bad.dart",
    "final bottom = MediaQuery.paddingOf(context).bottom;",
  );

  const result = checkTerminalPadding({root});

  assert.deepEqual(result.findings, [
    {
      code: "raw-padding-bottom",
      path: "lib/payments/bad.dart",
      line: 1,
      message:
        "Use CatchScrollTerminalGap or CatchScrollTerminalGap.sliver instead of hand-rolled device-bottom clearance.",
    },
  ]);
});

test("flags viewPadding bottom but allows keyboard insets and core ownership", () => {
  const root = fixtureRoot();
  write(
    root,
    "lib/hosts/bad.dart",
    "final bottom = mediaQuery.viewPadding.bottom;",
  );
  write(
    root,
    "lib/hosts/keyboard.dart",
    "final keyboard = MediaQuery.viewInsetsOf(context).bottom;",
  );
  write(
    root,
    "lib/core/presentation/shell.dart",
    "final bottom = MediaQuery.paddingOf(context).bottom;",
  );

  const result = checkTerminalPadding({root});

  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].code, "raw-view-padding-bottom");
  assert.equal(result.findings[0].path, "lib/hosts/bad.dart");
});

function fixtureRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "catch-terminal-padding-"));
}

function write(root, relativePath, contents) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), {recursive: true});
  fs.writeFileSync(absolutePath, contents);
}
