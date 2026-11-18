import assert from "node:assert/strict";
import test from "node:test";
import {parseMigrationArgs, runMigration} from "./migrate_form_domains_to_custom_domains.mjs";

test("arguments need an explicit target and keep deletion behind --apply", () => {
  assert.throws(() => parseMigrationArgs([]), /explicit --env/);
  assert.throws(() => parseMigrationArgs(["--env", "dev", "--retire-legacy"]), /requires --apply/);
  assert.throws(() => parseMigrationArgs(["--env", "dev", "--unknown"]));
  const dryRun = parseMigrationArgs(["--env", "prod"]);
  assert.equal(dryRun.apply, false);
  assert.equal(dryRun.retireLegacy, false);
  const retire = parseMigrationArgs(["--env", "staging", "--apply", "--retire-legacy"]);
  assert.equal(retire.apply, true);
  assert.equal(retire.retireLegacy, true);
});

function fakeMigration(plan) {
  const calls = [];
  return {calls, migration: {
    planLegacyFormDomainMigration: async (_db, now) => {
      calls.push(["plan", now]); return plan;
    },
    applyLegacyFormDomainMigration: async (_db, now, options) => {
      calls.push(["apply", now, options]); return {created: ["a.example-club.example"], retired: [], skipped: []};
    },
  }};
}

test("an empty legacy collection never writes, even with --apply", async () => {
  const {calls, migration} = fakeMigration({legacyCount: 0, rows: [],
    summary: {create: 0, alreadyMigrated: 0, blocked: 0}});
  const logs = [];
  const result = await runMigration({apply: true, retireLegacy: true}, {db: {}, migration,
    now: () => 1, log: (line) => logs.push(line)});
  assert.equal(result.applied, null);
  assert.deepEqual(calls, [["plan", 1]]);
  assert.match(logs.join("\n"), /"legacyCount": 0/);
});

test("the dry run reports the plan and apply forwards the retire choice", async () => {
  const record = {status: "active", generation: 2, ownershipChallenge: "private"};
  const plan = {legacyCount: 2, rows: [
    {hostname: "a.example-club.example", action: "create", record},
    {hostname: "club.co.in", action: "blocked", reason: "policy"},
  ], summary: {create: 1, alreadyMigrated: 0, blocked: 1}};
  const dry = fakeMigration(plan);
  const logs = [];
  const result = await runMigration({apply: false}, {db: {}, migration: dry.migration,
    now: () => 1, log: (line) => logs.push(line)});
  assert.deepEqual(dry.calls, [["plan", 1]]);
  assert.deepEqual(result.summary.rows[0], {hostname: "a.example-club.example",
    action: "create", status: "active", generation: 2});
  // The challenge stays out of operator output.
  assert.doesNotMatch(logs.join("\n"), /private/);
  const applied = fakeMigration(plan);
  await runMigration({apply: true, retireLegacy: false}, {db: {}, migration: applied.migration,
    now: () => 2, log: () => {}});
  assert.deepEqual(applied.calls, [["plan", 2], ["apply", 2, {retireLegacy: false}]]);
});
