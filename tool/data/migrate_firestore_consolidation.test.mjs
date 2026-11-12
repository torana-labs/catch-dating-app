import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  MIGRATIONS, migrationsByName, preReceiptHostLeadId,
} from "./lib/firestore_consolidation_migrations.mjs";
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

test("published-reveal-index fills only revealed plans missing the index", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "published-reveal-index");
  const db = fakeDb({
    "eventSuccessPlans/old": {revealStatus: "revealed", activeRevealRoundIndex: 2},
    "eventSuccessPlans/stamped": {revealStatus: "revealed", activeRevealRoundIndex: 3,
      publishedRevealRoundIndex: 1},
    "eventSuccessPlans/idle": {revealStatus: "idle", activeRevealRoundIndex: 0},
  });
  const plan = await planMigration(db, migration);
  assert.equal(plan.totals.toCreate, 1);
  await applyMigrationPlan(db, plan);
  assert.equal(db.data["eventSuccessPlans/old"].publishedRevealRoundIndex, 2);
  assert.equal(db.data["eventSuccessPlans/stamped"].publishedRevealRoundIndex, 1);
  assert.equal(db.data["eventSuccessPlans/idle"].publishedRevealRoundIndex, undefined);
  assert.equal((await planMigration(db, migration)).totals.toCreate, 0);
});

test("waitlist-host-leads marks only pre-receipt Sales enquiries as not new", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "waitlist-host-leads");
  const db = fakeDb({
    "launchWaitlist/enquiry": {role: "member"},
    "launchWaitlist/receipted": {role: "host", hostLead: {eventId: "e", isNew: true}},
    "launchWaitlist/member": {role: "member"},
    "salesInboundIntents/i1": {waitlistId: "enquiry"},
    "salesInboundIntents/i2": {waitlistId: "receipted"},
  });
  const plan = await planMigration(db, migration);
  assert.equal(plan.totals.toCreate, 1);
  await applyMigrationPlan(db, plan);
  const lead = db.data["launchWaitlist/enquiry"].hostLead;
  assert.equal(lead.isNew, false);
  assert.match(lead.eventId,
    /^host_lead_[0-9]{13}_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
  assert.equal(lead.eventId, preReceiptHostLeadId("enquiry", {role: "member"}));
  assert.deepEqual(db.data["launchWaitlist/receipted"].hostLead, {eventId: "e", isNew: true});
  assert.equal(db.data["launchWaitlist/member"].hostLead, undefined);
  assert.equal((await planMigration(db, migration)).totals.toCreate, 0);
});

test("catch-booking-roster gives every booking one row and one pointer", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "catch-booking-roster");
  const created = {_seconds: 1786625400, _nanoseconds: 0};
  const db = fakeDb({
    "eventParticipations/e1_new": {eventId: "e1", organizerId: "o1", uid: "new",
      status: "signedUp", createdAt: created, updatedAt: created, signedUpAt: created,
      waitlistedAt: null, attendedAt: null, cancelledAt: null, deletedAt: null,
      genderAtSignup: "woman", paymentId: "pay_1"},
    "eventParticipations/e1_linked": {eventId: "e1", organizerId: "o1", uid: "linked",
      status: "attended", createdAt: created, updatedAt: created, signedUpAt: created,
      waitlistedAt: null, attendedAt: created, cancelledAt: null, deletedAt: null,
      genderAtSignup: null, paymentId: null, hostApprovalStatus: "approved"},
    "eventAttendees/att_existing": {eventId: "e1", organizerId: "o1",
      source: "catchBooking", linkedUid: "linked", status: "checkedIn"},
    "eventAttendees/att_host": {eventId: "e1", organizerId: "o1",
      source: "hostImport", linkedUid: null, status: "registered"},
    "publicProfiles/new": {name: "  Asha "},
  });
  const plan = await planMigration(db, migration);
  assert.equal(plan.totals.toCreate, 4);
  await applyMigrationPlan(db, plan);
  const newRows = Object.entries(db.data).filter(([key, row]) =>
    key.startsWith("eventAttendees/") && row.linkedUid === "new");
  assert.equal(newRows.length, 1);
  const [newPath, newRow] = newRows[0];
  assert.equal(newRow.displayName, "Asha");
  assert.equal(newRow.status, "registered");
  assert.equal(newRow.booking.paymentId, "pay_1");
  assert.equal(db.data["eventAttendeeIndex/e1_new"].attendeeId, newPath.split("/")[1]);
  assert.equal(db.data["eventAttendees/att_existing"].status, "checkedIn");
  assert.equal(db.data["eventAttendees/att_existing"].booking.hostApprovalStatus, "approved");
  assert.equal(db.data["eventAttendeeIndex/e1_linked"].attendeeId, "att_existing");
  assert.equal(db.data["eventAttendees/att_host"].booking, undefined);
  assert.ok(db.data["eventParticipations/e1_new"]);
  assert.equal((await planMigration(db, migration)).totals.toCreate, 0);
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
    const query = (after, limit, filters = []) => ({
      orderBy: () => query(after, limit, filters),
      limit: (value) => query(after, value, filters),
      startAfter: (doc) => query(doc.id, limit, filters),
      where: (field, op, value) => {
        assert.equal(op, "==");
        return query(after, limit, [...filters, [field, value]]);
      },
      async get() {
        const docs = Object.keys(data)
          .filter((key) => key.startsWith(`${name}/`) && key.split("/").length === 2)
          .sort()
          .map((key) => ({id: key.split("/")[1], ref: docRef(key), data: () => structuredClone(data[key])}))
          .filter((doc) => after === undefined || doc.id > after)
          .filter((doc) => filters.every(([field, value]) => doc.data()[field] === value))
          .slice(0, limit ?? Infinity);
        return {docs, empty: docs.length === 0};
      },
    });
    return {...query(undefined, undefined), doc: (id) => docRef(`${name}/${id}`)};
  }
  return db;
}
