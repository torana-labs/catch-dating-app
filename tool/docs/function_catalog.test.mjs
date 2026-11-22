import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fragmentDir, fragmentProblems, header, readFragments, rollUp} from "./function_catalog.mjs";

const head = `${header.join("\n")}\n`;
const row = "| `a` | Callable | Admin | None | Notes with `a | b` in code. |";

test("a valid area file has the header, rows of five cells and one trailing newline", () => {
  assert.deepEqual(fragmentProblems("chats.md", `${head}${row}\n`), []);
  assert.deepEqual(fragmentProblems("chats.md", `${head}| a \\| b | c | d | e | f |\n`), []);
});

test("malformed area files are named with the rule they break", () => {
  const cases = [
    ["Chats.md", `${head}${row}\n`, /name the file after its functions\/src area/u],
    ["chats.md", `${head}${row}`, /exactly one newline/u],
    ["chats.md", `${head}${row}\n\n`, /exactly one newline/u],
    ["chats.md", `| Function | Notes |\n|---|---|\n${row}\n`, /start with the table header/u],
    ["chats.md", head, /has no rows/u],
    ["chats.md", `${head}| a | b | c | d |\n`, /exactly 5 cells/u],
    ["chats.md", `${head}a | b | c | d | e\n`, /starts with "\| "/u],
  ];
  for (const [name, source, expected] of cases) {
    assert.match(fragmentProblems(name, source).join("\n"), expected, `${name}: ${JSON.stringify(source)}`);
  }
});

test("the roll-up joins areas in name order under one header", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catch-function-catalog-"));
  try {
    fs.mkdirSync(path.join(root, fragmentDir), {recursive: true});
    fs.writeFileSync(path.join(root, fragmentDir, "money.md"), `${head}| m1 | b | c | d | e |\n`);
    fs.writeFileSync(path.join(root, fragmentDir, "chats.md"), `${head}| c1 | b | c | d | e |\n| c2 | b | c | d | e |\n`);
    fs.writeFileSync(path.join(root, fragmentDir, "notes.txt"), "ignored");
    assert.equal(rollUp(readFragments(root)),
      `${head}| c1 | b | c | d | e |\n| c2 | b | c | d | e |\n| m1 | b | c | d | e |\n`);
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test("every committed area file is valid", () => {
  const fragments = readFragments();
  assert.ok(fragments.length > 0);
  assert.deepEqual(fragments.flatMap(({name, source}) => fragmentProblems(name, source)), []);
});
