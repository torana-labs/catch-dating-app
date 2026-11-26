import assert from "node:assert/strict";
import test from "node:test";
import {fakeIssueApi, headAlertState, movedDuplicates, newerHeadRun, oldestOpen, openIssueOnce, settleDuplicates,
  settleToHead} from "./github_issues.mjs";

const TITLE = "Main CI is red";

test("two runs racing to open the same issue end with exactly one open issue", () => {
  // Run B lists and opens while run A is between its own list and open.
  let raced = false;
  const fake = fakeIssueApi({between: (name) => {
    if (name === "create" && !raced) {
      raced = true;
      openIssueOnce(fake.api, {title: TITLE, body: "run B failed"});
    }
  }});
  const a = openIssueOnce(fake.api, {title: TITLE, body: "run A failed"});
  const open = fake.state.issues.filter((issue) => issue.state === "open");
  assert.deepEqual(open.map((issue) => issue.number), [1], "the lowest-numbered issue stays");
  assert.deepEqual(a, {number: 1, created: false, closed: [2]});
  // Run A's content moved into the kept issue; its own issue says where.
  const [kept, closed] = fake.state.issues;
  assert.equal(kept.body, "run B failed");
  assert.match(kept.comments[0], /^#2 was opened by a parallel run and closed as a duplicate of this issue\. Its content:\n\nrun A failed\n/u);
  assert.deepEqual([closed.state, closed.stateReason], ["closed", "not_planned"]);
  assert.match(closed.comments.at(-1), /^Duplicate of #1/u);
});

test("an issue already open gets a comment, and labels, instead of a second issue", () => {
  const fake = fakeIssueApi({issues: [{number: 4, title: TITLE, body: "first"}, {number: 9, title: "Other", body: ""}]});
  assert.deepEqual(openIssueOnce(fake.api, {title: TITLE, body: "again", labels: ["release-block:mobile"]}),
    {number: 4, created: false, closed: []});
  assert.deepEqual(fake.state.issues[0].comments, ["again"]);
  assert.deepEqual(fake.state.issues[0].labels, ["release-block:mobile"]);
  assert.equal(fake.state.issues.length, 2);
  // onExisting replaces the comment.
  openIssueOnce(fake.api, {title: TITLE, body: "new body", onExisting: (number) => fake.api.update(number, "new body")});
  assert.equal(fake.state.issues[0].body, "new body");
  assert.deepEqual(fake.state.issues[0].comments, ["again"]);
});

test("duplicates settle once: a second settle neither moves nor closes anything again", () => {
  const fake = fakeIssueApi({issues: [{number: 3, title: TITLE, body: "kept"}, {number: 5, title: TITLE, body: "dup",
    comments: ["dup comment"]}, {number: 6, title: TITLE, body: "dup 2"}]});
  assert.deepEqual(settleDuplicates(fake.api, TITLE).closed, [5, 6]);
  assert.deepEqual(settleDuplicates(fake.api, TITLE).closed, []);
  const kept = fake.state.issues[0];
  assert.equal(kept.comments.length, 2);
  assert.match(kept.comments[0], /dup\n\n---\n\ndup comment\n<!-- moved-duplicate 5 -->$/u);
  assert.deepEqual([...movedDuplicates(kept.comments)], [5, 6]);
  // A duplicate another run already moved (its marker on the kept issue) is closed without a second copy.
  const again = fakeIssueApi({issues: [{number: 3, title: TITLE, body: "kept", comments: ["<!-- moved-duplicate 5 -->"]},
    {number: 5, title: TITLE, body: "dup"}]});
  settleDuplicates(again.api, TITLE);
  assert.equal(again.state.issues[0].comments.length, 1);
  assert.equal(again.state.issues[1].state, "closed");
});

test("the issue acted on is the lowest-numbered open one with the title, never a pull request", () => {
  const issues = [{number: 8, title: TITLE}, {number: 2, title: TITLE, pull_request: {}}, {number: 5, title: TITLE},
    {number: 1, title: TITLE, state: "closed"}];
  assert.equal(oldestOpen(issues, TITLE).number, 5);
  assert.equal(oldestOpen(issues, "Other"), null);
});

const ciRun = (id, created, extra = {}) => ({id, created_at: created, status: "completed", head_branch: "main", event: "push", ...extra});
const counts = (run) => run.event === "push";

test("the head run is the newest completed push of main that started after this run", () => {
  const mine = ciRun(10, "2026-11-26T10:00:00Z");
  const runs = [mine, ciRun(11, "2026-11-26T10:05:00Z"), ciRun(12, "2026-11-26T10:09:00Z", {status: "in_progress"}),
    ciRun(13, "2026-11-26T10:10:00Z", {event: "pull_request"}), ciRun(14, "2026-11-26T10:11:00Z", {head_branch: "feature"}),
    ciRun(9, "2026-11-26T09:00:00Z")];
  assert.equal(newerHeadRun({run: mine, runs, counts}).id, 11);
  assert.equal(newerHeadRun({run: runs[1], runs, counts}), null);
});

test("an older run settles only once the head run's own alert finished; a queued one reads after it", () => {
  const title = (id) => `Main CI alert for run ${id}`;
  assert.equal(headAlertState([{display_title: title(11), status: "queued"}], title(11)), "pending");
  assert.equal(headAlertState([], title(11)), "pending");
  assert.equal(headAlertState([{display_title: title(11), status: "completed"}, {display_title: title(11), status: "in_progress"}],
    title(11)), "wait");
  assert.equal(headAlertState([{display_title: title(11), status: "completed"}], title(11)), "settle");
  const runs = [ciRun(10, "2026-11-26T10:00:00Z"), ciRun(11, "2026-11-26T10:05:00Z")];
  const settle = (alertStates, attempts = 3) => {
    const settled = [];
    let sleeps = 0;
    const result = settleToHead({run: runs[0], counts, alertTitle: title, attempts, listRuns: () => runs,
      listAlertRuns: () => [{display_title: title(11), status: alertStates[Math.min(sleeps, alertStates.length - 1)]}],
      sleep: () => { sleeps += 1; }, settle: (head) => settled.push(head.id)});
    return {result, settled, sleeps};
  };
  assert.deepEqual(settle(["in_progress", "in_progress", "completed"]),
    {result: {status: "settled", head: 11}, settled: [11], sleeps: 2});
  assert.deepEqual(settle(["queued"]), {result: {status: "pending", head: 11}, settled: [], sleeps: 0});
  assert.deepEqual(settle(["in_progress"], 2), {result: {status: "timed_out", head: 11}, settled: [], sleeps: 2});
  assert.deepEqual(settleToHead({run: runs[1], counts, alertTitle: title, listRuns: () => runs, listAlertRuns: () => [],
    sleep: () => {}, settle: () => assert.fail("the head run settles nothing")}), {status: "latest"});
});
