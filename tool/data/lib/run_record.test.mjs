import assert from "node:assert/strict";
import test from "node:test";
import {
  DATA_TOOL_RUNS,
  RUN_RECORD_TTL_DAYS,
  checkedCounts,
  gitCommit,
  startRunRecord,
  toolPath,
  withRunRecord,
} from "./run_record.mjs";
import {runRecordDb} from "./run_record_test_support.mjs";

const SHA = "a".repeat(40);
const T0 = Date.parse("2026-11-24T10:00:00Z");

function clock(...times) {
  let index = 0;
  return () => times[Math.min(index++, times.length - 1)];
}

test("an applied run records tool, commit, project, counts and times",
  async () => {
    const db = runRecordDb();
    const {runId, counts} = await withRunRecord(db, {
      tool: "tool/data/example_backfill.mjs", projectId: "catch-dev-test",
      scope: "schedule-locks", now: clock(T0, T0 + 5000),
      commit: {sha: SHA, dirty: false},
    }, async () => ({"schedule-locks.created": 3}));
    assert.match(runId, /^example_backfill_\d+_[0-9a-f]{8}$/u);
    assert.deepEqual(counts, {"schedule-locks.created": 3});
    const record = db.data[`${DATA_TOOL_RUNS}/${runId}`];
    assert.deepEqual({...record, startedAt: undefined, finishedAt: undefined,
      expiresAt: undefined}, {
      schemaVersion: 1, runId, tool: "tool/data/example_backfill.mjs",
      scope: "schedule-locks", projectId: "catch-dev-test", commitSha: SHA,
      commitDirty: false, status: "succeeded",
      counts: {"schedule-locks.created": 3}, failure: null,
      startedAt: undefined, finishedAt: undefined, expiresAt: undefined});
    assert.equal(record.startedAt.getTime(), T0);
    assert.equal(record.finishedAt.getTime(), T0 + 5000);
    assert.equal(record.expiresAt.getTime() - T0,
      RUN_RECORD_TTL_DAYS * 24 * 60 * 60 * 1000);
  });

test("a run that throws is recorded as failed with its partial counts",
  async () => {
    const db = runRecordDb();
    await assert.rejects(withRunRecord(db, {
      tool: "tool/data/example_backfill.mjs", projectId: "catch-dev-test",
      now: clock(T0, T0 + 10), commit: {sha: SHA, dirty: true},
    }, async ({counts}) => {
      counts["first.created"] = 2;
      throw new Error("ALREADY_EXISTS a/b\nstack detail");
    }), /ALREADY_EXISTS/u);
    const [record] = Object.values(db.data);
    assert.equal(record.status, "failed");
    assert.equal(record.commitDirty, true);
    assert.deepEqual(record.counts, {"first.created": 2});
    assert.equal(record.failure, "Error: ALREADY_EXISTS a/b");
  });

test("a run that dies before it closes stays running", async () => {
  const db = runRecordDb();
  await startRunRecord(db, {tool: "tool/data/example_backfill.mjs",
    projectId: "catch-dev-test", now: () => T0,
    commit: {sha: null, dirty: null}});
  const [record] = Object.values(db.data);
  assert.equal(record.status, "running");
  assert.equal(record.finishedAt, null);
  assert.equal(record.commitSha, null);
});

test("counts are non-negative integers under short keys; a project is needed",
  async () => {
    assert.throws(() => checkedCounts({"bad key": 1}), /not allowed/u);
    assert.throws(() => checkedCounts({ok: -1}), /non-negative/u);
    assert.throws(() => checkedCounts({ok: 1.5}), /non-negative/u);
    await assert.rejects(startRunRecord(runRecordDb(),
      {tool: "tool/data/x.mjs", projectId: ""}), /project id/u);
  });

test("the tool path is repository-relative from a file URL", () => {
  assert.equal(toolPath(new URL("../migrate_firestore_consolidation.mjs",
    import.meta.url).href), "tool/data/migrate_firestore_consolidation.mjs");
});

test("commit facts come from Git, and a missing Git gives nulls", () => {
  const calls = [];
  const exec = (command, args) => {
    calls.push(args[0]);
    return args[0] === "rev-parse" ? `${SHA}\n` : " M tool/x.mjs\n";
  };
  assert.deepEqual(gitCommit({exec}), {sha: SHA, dirty: true});
  assert.deepEqual(calls, ["rev-parse", "status"]);
  assert.deepEqual(gitCommit({exec: () => {
    throw new Error("git: not found");
  }}), {sha: null, dirty: null});
});
