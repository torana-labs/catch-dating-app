import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {MIGRATIONS, migrationsByName} from "./lib/firestore_consolidation_migrations.mjs";
import {applyMigrationPlan, planMigration, writePlanBackup} from "./lib/copy_forward.mjs";

const scheduleLocks = MIGRATIONS.find((migration) => migration.name === "schedule-locks");

test("schedule-locks copies both lock collections with prefixed ids", async () => {
  const db = fakeDb({
    "organizerScheduleLocks/club-1_100": {ownerType: "club", ownerId: "club-1", slot: 100,
      eventId: "e1", organizerId: "club-1", startTimeMillis: 1, endTimeMillis: 2},
    "userEventScheduleLocks/runner-1_100": {ownerType: "user", ownerId: "runner-1", slot: 100,
      eventId: "e1", organizerId: "club-1", uid: "runner-1", startTimeMillis: 1, endTimeMillis: 2},
  });
  const plan = await planMigration(db, scheduleLocks);
  assert.deepEqual(plan.totals, {scanned: 2, toCreate: 2, alreadyCopied: 0, conflicts: 0, skipped: 0});
  await applyMigrationPlan(db, plan);
  assert.equal(db.data["scheduleLocks/organizer_club-1_100"].ownerType, "organizer");
  assert.equal(db.data["scheduleLocks/user_runner-1_100"].uid, "runner-1");
  // Sources are untouched.
  assert.equal(db.data["organizerScheduleLocks/club-1_100"].ownerType, "club");
  assert.ok(db.data["userEventScheduleLocks/runner-1_100"]);
});

test("a second run is a no-op and never overwrites", async () => {
  const db = fakeDb({
    "userEventScheduleLocks/runner-1_100": {ownerType: "user", ownerId: "runner-1", slot: 100,
      eventId: "e1", organizerId: "club-1", uid: "runner-1", startTimeMillis: 1, endTimeMillis: 2},
  });
  await applyMigrationPlan(db, await planMigration(db, scheduleLocks));
  const again = await planMigration(db, scheduleLocks);
  assert.deepEqual(again.totals, {scanned: 1, toCreate: 0, alreadyCopied: 1, conflicts: 0, skipped: 0});
  assert.deepEqual(await applyMigrationPlan(db, again), {migration: "schedule-locks", created: 0});
});

test("a differing existing target is a conflict and blocks apply", async () => {
  const db = fakeDb({
    "userEventScheduleLocks/runner-1_100": {ownerType: "user", eventId: "e1", uid: "runner-1"},
    "scheduleLocks/user_runner-1_100": {ownerType: "user", eventId: "e2", uid: "runner-1"},
  });
  const plan = await planMigration(db, scheduleLocks);
  assert.equal(plan.totals.conflicts, 1);
  await assert.rejects(applyMigrationPlan(db, plan), /already exist with different data/);
  assert.equal(db.data["scheduleLocks/user_runner-1_100"].eventId, "e2");
});

test("the backup file records every planned write before apply", async () => {
  const db = fakeDb({
    "organizerScheduleLocks/club-1_100": {ownerType: "club", eventId: "e1"},
  });
  const plan = await planMigration(db, scheduleLocks);
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "copy-forward-")), "plan.json");
  writePlanBackup(file, [plan]);
  const saved = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.equal(saved.plans[0].steps[0].toCreate[0].targetPath, "scheduleLocks/organizer_club-1_100");
});

test("profile-bio-prompts fills prompts from bio once and keeps bio", async () => {
  const bioPrompts = MIGRATIONS.find((migration) => migration.name === "profile-bio-prompts");
  const db = fakeDb({
    "users/a": {bio: "  Sunrise runs\n\n\n\nthen coffee  ", profilePrompts: []},
    "users/b": {bio: "ignored", profilePrompts: [{promptId: "p", prompt: "P", answer: "kept"}]},
    "users/c": {profilePrompts: []},
  });
  const plan = await planMigration(db, bioPrompts);
  assert.equal(plan.totals.toCreate, 1);
  await applyMigrationPlan(db, plan);
  assert.equal(db.data["users/a"].profilePrompts[0].answer, "Sunrise runs\n\nthen coffee");
  assert.equal(db.data["users/a"].bio, "  Sunrise runs\n\n\n\nthen coffee  ");
  assert.equal(db.data["users/b"].profilePrompts[0].answer, "kept");
  assert.equal((await planMigration(db, bioPrompts)).totals.toCreate, 0);
});

test("event-policy stores the first-terms policy and cohort counts once", async () => {
  const eventPolicy = MIGRATIONS.find((migration) => migration.name === "event-policy");
  const db = fakeDb({
    "events/capped": {capacityLimit: 12, priceInPaise: 50000,
      constraints: {minAge: 18, maxAge: 40, maxMen: 6, maxWomen: 6},
      genderCounts: {man: 2, woman: 1}, cohortCounts: {}},
    "events/stored": {capacityLimit: 10, priceInPaise: 0, eventPolicy: {version: 1},
      genderCounts: {}, cohortCounts: {}},
    "events/draft": {publicationState: "private", genderCounts: {}, cohortCounts: {}},
  });
  const plan = await planMigration(db, eventPolicy);
  assert.equal(plan.totals.toCreate, 1);
  await applyMigrationPlan(db, plan);
  const capped = db.data["events/capped"];
  assert.equal(capped.eventPolicy.admission.format, "fixedCohortCaps");
  assert.deepEqual(capped.eventPolicy.admission.cohortCapacityLimits,
    {menInterestedInWomen: 6, womenInterestedInMen: 6});
  assert.deepEqual(capped.cohortCounts, {menInterestedInWomen: 2, womenInterestedInMen: 1});
  assert.deepEqual(db.data["events/stored"].eventPolicy, {version: 1});
  assert.equal(db.data["events/draft"].eventPolicy, undefined);
  assert.equal((await planMigration(db, eventPolicy)).totals.toCreate, 0);
});

test("unknown migration names are rejected", () => {
  assert.throws(() => migrationsByName(["nope"]), /Unknown migration "nope"/);
  assert.equal(migrationsByName(["all"]).length, MIGRATIONS.length);
});

function fakeDb(seed) {
  const data = structuredClone(seed);
  const db = {
    data,
    collection: (name) => collection(name),
    doc: (docPath) => docRef(docPath),
    batch() {
      const ops = [];
      return {
        create: (ref, value) => ops.push(["create", ref.path, value]),
        update: (ref, value) => ops.push(["update", ref.path, value]),
        async commit() {
          for (const [kind, docPath] of ops) {
            if (kind === "create" && data[docPath] !== undefined) {
              throw new Error(`ALREADY_EXISTS ${docPath}`);
            }
            if (kind === "update" && data[docPath] === undefined) throw new Error(`NOT_FOUND ${docPath}`);
          }
          for (const [kind, docPath, value] of ops) {
            data[docPath] = kind === "create" ? structuredClone(value) :
              {...data[docPath], ...structuredClone(value)};
          }
        },
      };
    },
  };
  function docRef(docPath) {
    return {
      path: docPath,
      id: docPath.split("/").at(-1),
      async get() {
        const value = data[docPath];
        return {exists: value !== undefined, data: () => structuredClone(value)};
      },
    };
  }
  function collection(name) {
    const query = (after, limit) => ({
      orderBy: () => query(after, limit),
      limit: (value) => query(after, value),
      startAfter: (doc) => query(doc.id, limit),
      async get() {
        const docs = Object.keys(data)
          .filter((key) => key.startsWith(`${name}/`) && key.split("/").length === 2)
          .sort()
          .map((key) => ({id: key.split("/")[1], ref: docRef(key), data: () => structuredClone(data[key])}))
          .filter((doc) => after === undefined || doc.id > after)
          .slice(0, limit ?? Infinity);
        return {docs};
      },
    });
    return {...query(undefined, undefined), doc: (id) => docRef(`${name}/${id}`)};
  }
  return db;
}
