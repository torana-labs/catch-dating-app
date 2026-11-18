import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import test from "node:test";
import {main, runCleanup} from "./cleanup_retired_collections.mjs";
import {
  FORBIDDEN_COLLECTIONS,
  RETIRED_COLLECTIONS,
  assertAllowlistIsSafe,
  deserializeValue,
  selectCollections,
  serializeValue,
} from "./lib/retired_collections_cleanup.mjs";

// Run with: firebase emulators:exec --project demo-catch-cleanup --only firestore \
//   "node --test tool/data/cleanup_retired_collections.test.mjs"
// The emulator tests are skipped when no Firestore emulator is running.
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
const projectId = "demo-catch-cleanup";
const requireFromFunctions = createRequire(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "../../functions/package.json")
);

test("the allowlist never names a live or protected collection", () => {
  assertAllowlistIsSafe();
  for (const name of Object.keys(RETIRED_COLLECTIONS)) {
    assert.ok(!FORBIDDEN_COLLECTIONS.includes(name), name);
  }
  for (const live of ["organizers", "publicOrganizers", "deletedUsers", "adminAuditLogs", "events"]) {
    assert.throws(() => selectCollections([live]), /not on the cleanup allowlist/u);
  }
});

test("apply refuses to run without confirmation, a backup directory or --allow-prod", async () => {
  await assert.rejects(
    main(["--env", "dev", "--apply"]), /--confirm-cleanup and --backup-dir/u
  );
  await assert.rejects(
    main(["--env", "dev", "--apply", "--confirm-cleanup"]), /--backup-dir/u
  );
  await assert.rejects(
    main(["--env", "prod", "--apply", "--confirm-cleanup", "--backup-dir", "x"]),
    /without --allow-prod/u
  );
  await assert.rejects(main(["--env", "dev", "--collections", "organizers"]), /allowlist/u);
});

test("values round-trip through the backup serialisation", {skip: !emulatorHost}, async () => {
  const {admin, db} = emulator();
  const original = {
    when: admin.firestore.Timestamp.fromMillis(1_700_000_000_123),
    spot: new admin.firestore.GeoPoint(12.5, 77.25),
    ref: db.doc("organizers/o1"),
    bytes: Buffer.from("abc"),
    nested: {list: [1, "two", {three: null}]},
  };
  const restored = deserializeValue(
    JSON.parse(JSON.stringify(serializeValue(original))), {admin, db}
  );
  assert.deepEqual(restored.when.toMillis(), original.when.toMillis());
  assert.equal(restored.spot.latitude, 12.5);
  assert.equal(restored.ref.path, "organizers/o1");
  assert.equal(restored.bytes.toString(), "abc");
  assert.deepEqual(restored.nested, original.nested);
});

test("dry run deletes nothing and keeps Bhag-linked, unreplaced and parent documents",
  {skip: !emulatorHost}, async () => {
    const {db} = emulator();
    await seedWorld(db);

    const report = await runCleanup(db, {collections: null, apply: false, backupDir: null});

    assert.equal((await db.collection("clubMemberships").get()).size, 4);
    const byName = Object.fromEntries(report.plans.map((plan) => [plan.collection, plan]));
    assert.equal(byName.clubMemberships.toDelete, 1);
    assert.deepEqual(byName.clubMemberships.excludedReplacementMissing, ["orphan_user"]);
    assert.deepEqual(byName.clubMemberships.excludedBhag.sort(), [
      "bhag_page_user", "plain_user_with_bhag_text",
    ]);
    assert.deepEqual(byName.clubScheduleLocks.excludedBhag, ["event-by-bhag_100"]);
    assert.deepEqual(byName.eventAttendeeIndex.excludedBhag, ["bhag-slug-attendee"]);
    assert.deepEqual(byName.eventAttendeeIndex.excludedHasSubcollections, ["with_child"]);
    assert.equal(byName.eventAttendeeIndex.toDelete, 1);
    assert.ok(report.bhagTerms.includes("bhag"));
    assert.ok(report.bhagTerms.includes("bhagclub"));
    assert.ok(report.bhagTerms.includes("bhag-delhi-org"));
    assert.ok(report.bhagTerms.includes("event-by-bhag"));
  });

test("apply backs up first, verifies the backup, deletes in batches and leaves the rest",
  {skip: !emulatorHost}, async () => {
    const {admin, db} = emulator();
    await seedWorld(db);
    const bulk = db.bulkWriter();
    for (let index = 0; index < 905; index += 1) {
      bulk.set(db.doc(`demoOpsRuns/run_${index}`), {
        at: admin.firestore.Timestamp.fromMillis(1_700_000_000_000 + index),
        index,
      });
    }
    await bulk.close();
    const backupDir = fs.mkdtempSync(path.join(os.tmpdir(), "cleanup-test-"));

    const report = await runCleanup(db, {collections: null, apply: true, backupDir});

    const deleted = Object.fromEntries(report.deleted.map((r) => [r.collection, r.deleted]));
    assert.equal(deleted.demoOpsRuns, 905);
    assert.equal(deleted.clubMemberships, 1);
    assert.equal((await db.collection("demoOpsRuns").get()).size, 0);
    const backup = JSON.parse(fs.readFileSync(path.join(backupDir, "demoOpsRuns.json"), "utf8"));
    assert.equal(backup.length, 905);
    assert.equal(backup[0].data.at.__type, "timestamp");
    // Kept documents are untouched, and live collections are never read or deleted.
    assert.equal((await db.collection("clubMemberships").get()).size, 3);
    assert.ok((await db.doc("organizers/bhag-delhi-org").get()).exists);
    assert.ok((await db.doc("organizers/other-org").get()).exists);
    assert.ok((await db.doc("eventAttendeeIndex/with_child/child/x").get()).exists);
    const again = await runCleanup(db, {collections: null, apply: false, backupDir: null});
    assert.equal(again.plans.reduce((sum, plan) => sum + plan.toDelete, 0), 0);
  });

test("a document changed after the scan is kept", {skip: !emulatorHost}, async () => {
  const {db} = emulator();
  await clearEmulator();
  await db.doc("seedRuns/a").set({n: 1});
  await db.doc("seedRuns/b").set({n: 1});
  const {planCleanup, applyCleanup} = await import("./lib/retired_collections_cleanup.mjs");
  const plans = await planCleanup(db, {collections: ["seedRuns"], terms: ["bhag"]});
  await db.doc("seedRuns/b").set({n: 2});

  const [result] = await applyCleanup(db, plans);

  assert.deepEqual(result, {collection: "seedRuns", deleted: 1, changedSinceScan: 1});
  assert.ok((await db.doc("seedRuns/b").get()).exists);
  assert.ok(!(await db.doc("seedRuns/a").get()).exists);
});

let cached = null;
function emulator() {
  if (cached) return cached;
  const admin = requireFromFunctions("firebase-admin");
  admin.initializeApp({projectId});
  cached = {admin, db: admin.firestore()};
  return cached;
}

async function clearEmulator() {
  const response = await fetch(
    `http://${emulatorHost}/emulator/v1/projects/${projectId}/databases/(default)/documents`,
    {method: "DELETE"}
  );
  assert.ok(response.ok, "could not clear the Firestore emulator");
}

async function seedWorld(db) {
  await clearEmulator();
  const set = (docPath, data) => db.doc(docPath).set(data);
  // Bhag's organizer, public organizer and event, found by the seed word.
  await set("organizers/bhag-delhi-org", {name: "Bhag Club", instagramHandle: "bhagclub", slug: "bhag-delhi"});
  await set("publicOrganizers/bhag-delhi-org", {name: "Bhag Club"});
  await set("organizers/other-org", {name: "Saket Run Club"});
  await set("events/event-by-bhag", {organizerId: "bhag-delhi-org", title: "Sunday run"});
  await set("events/other-event", {organizerId: "other-org"});
  // Replacements.
  await set("organizerFollows/plain_user", {});
  await set("organizerFollows/plain_user_with_bhag_text", {});
  await set("organizerFollows/bhag_page_user", {});
  await set("organizerFollows/second_user", {});
  await set("scheduleLocks/organizer_event-by-bhag_100", {});
  // clubMemberships: one plain, one orphan, one whose data mentions Bhag, one
  // whose id carries Bhag's page id.
  await set("clubMemberships/plain_user", {role: "member"});
  await set("clubMemberships/orphan_user", {role: "member"});
  await set("clubMemberships/plain_user_with_bhag_text", {note: "joined BHAG run"});
  await set("clubMemberships/bhag_page_user", {role: "member"});
  // A lock keyed by Bhag's event id (found through the organizer's events).
  await set("clubScheduleLocks/event-by-bhag_100", {eventId: "event-by-bhag"});
  // Index rows: one tied to Bhag's slug, one with a child, one plain.
  await set("eventAttendeeIndex/bhag-slug-attendee", {pointer: "bhag-delhi"});
  await set("eventAttendeeIndex/with_child", {});
  await set("eventAttendeeIndex/with_child/child/x", {});
  await set("eventAttendeeIndex/plain", {});
}
