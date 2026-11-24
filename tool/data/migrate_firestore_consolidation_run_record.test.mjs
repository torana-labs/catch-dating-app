import assert from "node:assert/strict";
import test from "node:test";
import {applyPlans} from "./migrate_firestore_consolidation.mjs";
import {runRecordDb} from "./lib/run_record_test_support.mjs";

const SHA = "b".repeat(40);

/** Run-record db plus the batch and doc calls applyMigrationPlan makes. */
function db() {
  const store = runRecordDb();
  return Object.assign(store, {
    doc: (path) => ({path}),
    batch() {
      const ops = [];
      return {
        create: (ref, value) => ops.push([ref.path, value]),
        update: (ref, value) => ops.push([ref.path, value]),
        async commit() {
          for (const [path, value] of ops) {
            if (store.data[path]) throw new Error(`ALREADY_EXISTS ${path}`);
            store.data[path] = value;
          }
        },
      };
    },
  });
}

const plan = (migration, targets) => ({migration,
  totals: {scanned: targets.length, toCreate: targets.length,
    alreadyCopied: 0, conflicts: 0, skipped: 0},
  steps: [{toCreate: targets.map((targetPath) => ({targetPath,
    data: {copied: true}}))}]});

test("an applied consolidation run leaves one run record with its counts",
  async () => {
    const fake = db();
    const {runId} = await applyPlans(fake, [
      plan("schedule-locks", ["scheduleLocks/a", "scheduleLocks/b"]),
      plan("profile-bio-prompts", []),
    ], {projectId: "catch-dev-test", commit: {sha: SHA, dirty: false}});
    assert.ok(fake.data["scheduleLocks/a"]);
    const record = fake.data[`dataToolRuns/${runId}`];
    assert.equal(record.tool, "tool/data/migrate_firestore_consolidation.mjs");
    assert.equal(record.scope, "schedule-locks,profile-bio-prompts");
    assert.equal(record.projectId, "catch-dev-test");
    assert.equal(record.commitSha, SHA);
    assert.equal(record.status, "succeeded");
    assert.deepEqual(record.counts, {"schedule-locks.created": 2,
      "profile-bio-prompts.created": 0});
  });

test("a conflicting plan records a failed run and writes nothing", async () => {
  const fake = db();
  const conflicted = {...plan("schedule-locks", ["scheduleLocks/a"]),
    totals: {scanned: 1, toCreate: 0, alreadyCopied: 0, conflicts: 1,
      skipped: 0}};
  await assert.rejects(applyPlans(fake, [conflicted],
    {projectId: "catch-dev-test", commit: {sha: SHA, dirty: false}}),
  /already exist with different data/u);
  const records = Object.entries(fake.data)
    .filter(([path]) => path.startsWith("dataToolRuns/"));
  assert.equal(records.length, 1);
  assert.equal(records[0][1].status, "failed");
  assert.equal(fake.data["scheduleLocks/a"], undefined);
});
