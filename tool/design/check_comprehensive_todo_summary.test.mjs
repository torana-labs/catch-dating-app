import assert from "node:assert/strict";
import test from "node:test";
import {deriveSummary, validateAuthoredIndex} from "./check_comprehensive_todo_summary.mjs";
const screens = {screens: [{id: "screen.one", priority: "P1", openGaps: [
  {id: "gap.open", status: "in_progress"}, {id: "gap.blocked", status: "blocked"},
  {id: "gap.closed", status: "closed"},
]}]};
const authored = "| P1 | `screen.one` | Await design decision | Add permission scenario |";
test("counts and gaps derive from current source without copied Markdown", () => {
  assert.deepEqual(deriveSummary(screens).counts, {open: 1, blocked: 1, closed: 1});
  const changed = structuredClone(screens);
  changed.screens[0].openGaps[0].status = "closed";
  assert.deepEqual(deriveSummary(changed).counts, {open: 0, blocked: 1, closed: 2});
  assert.deepEqual(validateAuthoredIndex(authored, changed), []);
});
test("missing P1 decisions and duplicate rows still fail", () => {
  assert.match(validateAuthoredIndex("", screens).join(), /P1 screen is missing/u);
  assert.match(validateAuthoredIndex(`${authored}\n${authored}`, screens).join(), /duplicate/u);
});
test("malformed gap state cannot silently become an open count", () => {
  const malformed = structuredClone(screens);
  malformed.screens[0].openGaps[0].status = "typo";
  assert.throws(() => deriveSummary(malformed), /Invalid gap/u);
  assert.throws(() => deriveSummary({}), /inventory/u);
});
