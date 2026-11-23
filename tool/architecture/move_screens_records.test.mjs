// Parallel screen moves: each group's record is its own file, and the map and
// the carried list keep one entry per line with blank lines between, so two
// move pull requests based on the same main merge without conflicts.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {execFileSync} from "node:child_process";
import {checkLegacyLayout} from "./check_context_map.mjs";
import {pruneLegacyEntries} from "./lib/dart_moves.mjs";
import {formatCarried} from "./lib/screen_move_outputs.mjs";
import {isMentionText} from "./lib/screen_move_rewrite.mjs";
import {parseRecord, readRecords, recordPath, verifyScreenMove} from "./lib/screen_move_verify.mjs";

const map = [
  "{",
  "  \"legacy\": [",
  "    {\"path\": \"lib/chats/\", \"context\": \"messaging\"},",
  "",
  "    {\"path\": \"lib/locations/\", \"context\": \"events\"},",
  "",
  "    {\"path\": \"lib/matches/\", \"context\": \"connections\"},",
  "",
  "    {\"path\": \"lib/routing/\", \"layer\": \"app\"}",
  "  ]",
  "}",
  "",
].join("\n");

// A move as the codemod makes it: its own entries go in with a blank line
// before each, the move runs, and pruning takes them out again along with
// every entry whose folder emptied.
function move(source, {group, anchor, entries, remaining}) {
  const lines = source.split("\n");
  const at = lines.findIndex((line) => line.includes(anchor));
  const line = (entry) => `    {${Object.entries({...entry, group}).map(([key, value]) => `"${key}": "${value}"`).join(", ")}},`;
  const added = entries.flatMap((entry) => ["", line(entry)]);
  lines.splice(at + 1, 0, ...added);
  return pruneLegacyEntries(lines.join("\n"), remaining).source;
}

function merge3(base, ours, theirs) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "screen-move-merge-"));
  const [b, o, t] = ["base", "ours", "theirs"].map((name) => path.join(dir, name));
  fs.writeFileSync(b, base);
  fs.writeFileSync(o, ours);
  fs.writeFileSync(t, theirs);
  // git merge-file exits with the number of conflicts.
  try {
    execFileSync("git", ["merge-file", "-p", o, b, t], {encoding: "utf8"});
    return {conflicts: 0, text: execFileSync("git", ["merge-file", "-p", o, b, t], {encoding: "utf8"})};
  } catch (error) {
    return {conflicts: error.status, text: error.stdout};
  }
}

test("two moves that each empty a neighbouring folder merge their map edits cleanly", () => {
  assert.deepEqual(checkLegacyLayout(map), []);
  const files = ["lib/chats/a.dart", "lib/locations/b.dart", "lib/matches/c.dart", "lib/routing/r.dart"];
  // One move empties lib/locations, the other lib/matches: adjacent entries.
  const ours = move(map, {
    group: "page-event", anchor: "lib/locations/",
    entries: [{path: "lib/locations/shared/", context: "events", moveTo: "lib/pages/event/location/"}],
    remaining: files.filter((file) => !file.startsWith("lib/locations/")),
  });
  const theirs = move(map, {
    group: "page-chat-inbox", anchor: "lib/matches/",
    entries: [{path: "lib/matches/shared/", context: "connections", moveTo: "lib/pages/inbox/"}],
    remaining: files.filter((file) => !file.startsWith("lib/matches/")),
  });
  // Each move's own entries leave no trace; only the emptied entry's line goes.
  assert.equal(ours, map.replace("    {\"path\": \"lib/locations/\", \"context\": \"events\"},\n", ""));
  assert.equal(theirs, map.replace("    {\"path\": \"lib/matches/\", \"context\": \"connections\"},\n", ""));
  const merged = merge3(map, ours, theirs);
  assert.equal(merged.conflicts, 0, merged.text);
  JSON.parse(merged.text);
  assert.deepEqual(checkLegacyLayout(merged.text), []);
  assert.deepEqual(JSON.parse(merged.text).legacy.map((entry) => entry.path), ["lib/chats/", "lib/routing/"]);
});

test("the layout check refuses adjacent legacy entries", () => {
  const findings = checkLegacyLayout(map.replace("\"messaging\"},\n\n", "\"messaging\"},\n"));
  assert.equal(findings.length, 1);
  assert.match(findings[0].reason, /blank line after each legacy entry/u);
});

test("two moves that carry different files merge the carried list cleanly", () => {
  const entry = (file) => ({path: file, from: file.replace("lib/pages/", "lib/old/")});
  const base = {description: "d", carried: ["a", "m", "t", "z"].map((name) => entry(`lib/pages/${name}/${name}.dart`))};
  // One move carries c; the other drops a stale t and carries p.
  const ours = formatCarried({...base, carried: [...base.carried, entry("lib/pages/c/c.dart")]});
  const theirs = formatCarried({...base, carried: [...base.carried.filter((e) => e.path !== "lib/pages/t/t.dart"), entry("lib/pages/p/p.dart")]});
  const merged = merge3(formatCarried(base), ours, theirs);
  assert.equal(merged.conflicts, 0, merged.text);
  assert.deepEqual(JSON.parse(merged.text).carried.map((e) => e.path),
    ["lib/pages/a/a.dart", "lib/pages/c/c.dart", "lib/pages/m/m.dart", "lib/pages/p/p.dart", "lib/pages/z/z.dart"]);
});

test("records replay by sequence, and a move commit may only add its own", () => {
  const record = (group, sequence) => [recordPath(group),
    `${JSON.stringify({version: 1, group, sequence, entries: [], moves: {[`lib/${group}.dart`]: `lib/pages/${group}.dart`}, folders: {}})}\n`];
  const files = new Map([record("later", 20), record("first", 10), record("also-first", 10)]);
  const records = readRecords({files: [...files.keys(), "tool/architecture/other.json"], read: (file) => files.get(file)});
  assert.deepEqual(records.map((entry) => entry.group), ["also-first", "first", "later"]);
  assert.throws(() => parseRecord(files.get(recordPath("first")), recordPath("later")), /records group first/u);
  const read = (side, file) => (side === "new" ? Buffer.from(files.get(file) ?? "") : null);
  const problems = verifyScreenMove({
    changes: [
      {status: "A", file: recordPath("later")},
      {status: "M", file: recordPath("first")},
      {status: "A", file: "lib/pages/later.dart"},
      {status: "D", file: "lib/later.dart"},
    ],
    read: (side, file) => (file.endsWith(".dart") ? Buffer.from("class X {}\n") : read(side, file)),
    regenerated: new Set(),
    packages: [],
  });
  assert.deepEqual(problems, [`a move commit only adds its own record; it changed or removed ${recordPath("first")}`]);
});

test("the Catch lint rule tests keep their synthetic legacy paths when a move runs", () => {
  assert.equal(isMentionText("test/tool/catch_architecture_rules_test.dart"), false);
  assert.equal(isMentionText("test/tool/catch_provider_free_rule_test.dart"), false);
  assert.equal(isMentionText("test/tool/provider_graph_test.dart"), true);
  assert.equal(isMentionText("test/chats/chat_screen_test.dart"), true);
});
