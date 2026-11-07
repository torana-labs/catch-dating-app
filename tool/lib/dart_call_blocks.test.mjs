import assert from "node:assert/strict";
import test from "node:test";
import {extractCallBlocks, findBalancedEnd} from "./dart_call_blocks.mjs";

test("a comment with an apostrophe before and inside a call block is skipped", () => {
  const source = [
    "// The sidebar's footer shows who is signed in.",
    "Entry(",
    "  id: 'a', // it's here",
    "  other: Inner(x: 1),",
    ");",
    "Entry(id: 'b');",
  ].join("\n");
  const blocks = extractCallBlocks(source, "Entry");
  assert.equal(blocks.length, 2);
  assert.match(blocks[0], /Inner\(x: 1\)\s*,\s*\)$/u);
  assert.equal(blocks[1], "Entry(id: 'b')");
});

test("a block comment containing a closing parenthesis does not end the block", () => {
  const source = "Entry(id: 1, /* ) don't ) */ tail: 2); after()";
  assert.deepEqual(extractCallBlocks(source, "Entry"), [
    "Entry(id: 1, /* ) don't ) */ tail: 2)",
  ]);
});

test("a string containing // stays string content", () => {
  const source = "Entry(url: 'https://example.com/a)', next: 1) // done";
  assert.deepEqual(extractCallBlocks(source, "Entry"), [
    "Entry(url: 'https://example.com/a)', next: 1)",
  ]);
});

test("a raw string with a backslash does not escape its closing quote", () => {
  const source = String.raw`Entry(path: r'C:\dir\', other: r"a\", n: 1) tail(`;
  assert.deepEqual(extractCallBlocks(source, "Entry"), [
    String.raw`Entry(path: r'C:\dir\', other: r"a\", n: 1)`,
  ]);
});

test("a triple-quoted string spanning lines with quotes and parentheses inside", () => {
  const source = [
    "Entry(text: '''line one's",
    "  say \"hi\" ) and ''quoted''",
    "''', n: 1)",
    "Entry(text: \"\"\"a ' ) \" b\"\"\")",
  ].join("\n");
  const blocks = extractCallBlocks(source, "Entry");
  assert.equal(blocks.length, 2);
  assert.ok(blocks[0].endsWith("''', n: 1)"));
  assert.equal(blocks[1], 'Entry(text: """a \' ) " b""")');
});

test("nested calls and escaped quotes balance", () => {
  const source = "Outer(a: Inner(b: Deep(c: 'it\\'s )')), d: [1, (2)])";
  assert.deepEqual(extractCallBlocks(source, "Outer"), [source]);
  const open = source.indexOf("(");
  assert.equal(findBalancedEnd(source, open, "(", ")"), source.length - 1);
  assert.equal(findBalancedEnd("a[1, [2]] z", 1, "[", "]"), 8);
});

test("an unbalanced block throws the call-block error", () => {
  assert.throws(
    () => extractCallBlocks("Entry(id: 1, nested(", "Entry"),
    /Could not parse balanced call block starting at 5\./u,
  );
  assert.throws(
    () => findBalancedEnd("x(// )", 1, "(", ")"),
    /Could not parse balanced call block starting at 1\./u,
  );
});
