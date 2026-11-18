import assert from "node:assert/strict";
import fs from "node:fs";
import {createRequire} from "node:module";
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

test("catch-booking-roster gives every booking one roster row and links it", async () => {
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
    "eventParticipations/e1_pointed": {eventId: "e1", organizerId: "o1", uid: "pointed",
      status: "signedUp", createdAt: created, updatedAt: created, signedUpAt: created,
      waitlistedAt: null, attendedAt: null, cancelledAt: null, deletedAt: null,
      genderAtSignup: null, paymentId: null},
    "eventAttendees/att_pointed": {eventId: "e1", organizerId: "o1",
      source: "catchBooking", linkedUid: "pointed", status: "registered"},
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
  assert.equal(newRow.booking, undefined);
  assert.equal(db.data["eventParticipations/e1_new"].attendeeId, newPath.split("/")[1]);
  assert.equal(db.data["eventAttendees/att_existing"].status, "checkedIn");
  assert.equal(db.data["eventAttendees/att_existing"].booking, undefined);
  assert.equal(db.data["eventParticipations/e1_linked"].attendeeId, "att_existing");
  assert.equal(db.data["eventParticipations/e1_pointed"].attendeeId, "att_pointed");
  assert.equal(db.data["eventAttendees/att_host"].linkedUid, null);
  assert.ok(db.data["eventParticipations/e1_new"]);
  assert.equal((await planMigration(db, migration)).totals.toCreate, 0);
});

test("guest-booking-facts writes one document per person with every organizer", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "guest-booking-facts");
  const membership = (organizerId, uid, state, revision, updatedAtMillis) => ({
    schemaVersion: 1, organizerId, uid, state, revision,
    lastDecisionId: `ocmd_${organizerId}_${revision}`, activatedAtMillis: 1,
    updatedAtMillis, source: {}});
  const db = fakeDb({
    "organizerCommunityMemberships/ocm_a": membership("o1", "guest", "active", 1, 10),
    "organizerCommunityMemberships/ocm_b": membership("o2", "guest", "revoked", 2, 20),
    "organizerCommunityMemberships/ocm_c": membership("o1", "other", "active", 1, 5),
  });
  const plan = await planMigration(db, migration);
  assert.deepEqual(plan.totals, {scanned: 3, toCreate: 2, alreadyCopied: 0, conflicts: 0, skipped: 1});
  await applyMigrationPlan(db, plan);
  assert.deepEqual(db.data["guestBookingFacts/guest"], {schemaVersion: 1, uid: "guest",
    updatedAtMillis: 20, communityMemberships: {
      o1: {state: "active", revision: 1, decisionId: "ocmd_o1_1", updatedAtMillis: 10},
      o2: {state: "revoked", revision: 2, decisionId: "ocmd_o2_2", updatedAtMillis: 20},
    }});
  assert.equal(db.data["guestBookingFacts/other"].communityMemberships.o1.state, "active");
  assert.equal(db.data["organizerCommunityMemberships/ocm_a"].state, "active");
  assert.equal((await planMigration(db, migration)).totals.toCreate, 0);
});

test("event-chat-directory creates each row once from its first source", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "event-chat-directory");
  const db = fakeDb({
    "eventChatMemberships/m1": {eventId: "e1", uid: "a"},
    "eventParticipations/e1_a": {eventId: "e1", uid: "a", status: "signedUp"},
    "eventParticipations/e2_a": {eventId: "e2", uid: "a", status: "signedUp"},
    "eventParticipations/e3_a": {eventId: "e3", uid: "a", status: "cancelled"},
    "eventAttendees/r1": {eventId: "e2", linkedUid: "a"},
    "eventAttendees/r2": {eventId: "e4", linkedUid: "b"},
    "eventAttendees/r3": {eventId: "e5", linkedUid: null},
  });
  const targets = [];
  for (const step of migration.steps) {
    for (const [key, data] of Object.entries(db.data)) {
      const [collection, id] = key.split("/");
      if (collection !== step.source) continue;
      const target = await step.targetId(id, data, db);
      if (target) targets.push(target);
    }
  }
  assert.deepEqual(targets.sort(), ["e1_a", "e2_a", "e4_b"]);
});

test("booking-payments copies in-app payments into the ledger once", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "booking-payments");
  const db = fakeDb({
    "payments/pay_1": {userId: "u1", eventId: "e1", orderId: "order_1",
      paymentId: "pay_1", amount: 25000, currency: "INR", status: "completed",
      signUpFailed: false},
    "guestPayments/pp_web": {purpose: "publicEvent", eventId: "e1"},
  });
  const plan = await planMigration(db, migration);
  assert.equal(plan.totals.toCreate, 1);
  await applyMigrationPlan(db, plan);
  assert.equal(db.data["guestPayments/pay_1"].purpose, "booking");
  assert.equal(db.data["guestPayments/pay_1"].amount, 25000);
  assert.ok(db.data["payments/pay_1"]);
  assert.equal(db.data["guestPayments/pp_web"].purpose, "publicEvent");
  assert.equal((await planMigration(db, migration)).totals.toCreate, 0);
});

test("guest-event-read-models creates each entry and row once from its first record", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "guest-event-read-models");
  const db = fakeDb({
    "events/e1": {publicationState: "published"},
    "events/e2": {publicationState: "private"},
    "eventParticipations/e1_a": {eventId: "e1", uid: "a", status: "signedUp"},
    "eventAttendees/r1": {eventId: "e1", linkedUid: "a"},
    "eventAttendees/r2": {eventId: "e1", linkedUid: "b"},
    "eventAttendees/r3": {eventId: "e1", linkedUid: "b"},
    "eventAttendees/r4": {eventId: "e1", linkedUid: null},
    "guestPayments/p1": {purpose: "publicEvent", eventId: "e2", recipientUid: "c"},
    "guestPayments/p2": {purpose: "booking", eventId: "e2", userId: "d"},
    "organizerApplications/a1": {targetKind: "event", targetId: "e2", linkedUid: "c"},
    "organizerApplications/a2": {targetKind: "organizer", targetId: null, linkedUid: "e"},
    "organizerEventOfferRecipients/g1": {eventId: "e3", recipientUid: "f"},
  });
  const targets = [];
  for (const step of migration.steps) {
    for (const [key, data] of Object.entries(db.data)) {
      const [collection, id] = key.split("/");
      if (collection !== step.source) continue;
      const target = await step.targetId(id, data, db);
      if (target) targets.push(`${step.target}/${target}`);
    }
  }
  assert.deepEqual(targets.sort(), [
    "eventGuestEntries/e1",
    "guestEventStatuses/e1_a",
    "guestEventStatuses/e1_b",
    "guestEventStatuses/e2_c",
    "guestEventStatuses/e3_f",
  ]);
});

test("guest-event-cards only fills what is missing and never replaces", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "guest-event-cards");
  const db = fakeDb({
    "eventParticipations/e1_a": {eventId: "e1", uid: "a", status: "waitlisted"},
    "guestEventStatuses/e2_b": {eventId: "e2", uid: "b",
      participationStatus: "signedUp", eventCard: {eventId: "e2"}},
    "savedEvents/c_e3": {uid: "c", eventId: "e3", eventCard: {eventId: "e3"}},
    "savedEvents/c_e4": {uid: "c", eventId: "e4"},
  });
  const [create, statusFill, savedFill] = migration.steps;
  // A waitlisted booking now creates its row, from the booking itself.
  assert.equal(await create.targetId("e1_a",
    db.data["eventParticipations/e1_a"], db), "e1_a");
  // Complete rows and edges, and edges whose event is gone, are left alone
  // without reading anything else.
  assert.equal(await statusFill.fill(db.data["guestEventStatuses/e2_b"],
    "e2_b", db), null);
  assert.equal(await savedFill.fill(db.data["savedEvents/c_e3"], "c_e3", db),
    null);
  assert.equal(await savedFill.fill(db.data["savedEvents/c_e4"], "c_e4", db),
    null);
});

test("event-organizer-summary fills missing and stale summaries and nothing else", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "event-organizer-summary");
  const publicOrganizer = {name: "Bandra Run Club", description: "x", location: "mumbai",
    area: "Bandra", hostName: "Asha", tags: ["running"], rating: 4.6, status: "active",
    archived: false, appVisibility: "discoverable", followerCount: 99};
  const summary = {name: "Bandra Run Club", location: "mumbai", area: "Bandra", hostName: "Asha",
    tags: ["running"], rating: 4.6, synthetic: false, appVisibility: "discoverable",
    status: "active", archived: false};
  const hidden = {name: "", location: "", area: "", hostName: null, tags: [], rating: 0,
    synthetic: false, appVisibility: "hidden", status: "archived", archived: true};
  const db = fakeDb({
    "publicOrganizers/o1": publicOrganizer,
    "events/missing": {organizerId: "o1", name: "Run", bookedCount: 3},
    "events/stale": {organizerId: "o1", name: "Run", organizerSummary: {...summary, rating: 3}},
    "events/current": {organizerId: "o1", name: "Run", organizerSummary: summary},
    "events/ghost": {organizerId: "gone", name: "Run"},
    "events/broken": {name: "no organizer"},
  });
  const before = JSON.stringify(db.data);

  const plan = await planMigration(db, migration);
  assert.deepEqual(plan.totals, {scanned: 5, toCreate: 3, alreadyCopied: 0, conflicts: 0, skipped: 0});
  // A dry run reads and writes nothing.
  assert.equal(JSON.stringify(db.data), before);

  await applyMigrationPlan(db, plan);
  assert.deepEqual(db.data["events/missing"], {organizerId: "o1", name: "Run", bookedCount: 3,
    organizerSummary: summary});
  assert.deepEqual(db.data["events/stale"].organizerSummary, summary);
  assert.deepEqual(db.data["events/ghost"].organizerSummary, hidden);
  assert.equal(db.data["events/broken"].organizerSummary, undefined);
  assert.deepEqual(Object.keys(db.data["events/current"]).sort(), ["name", "organizerId", "organizerSummary"]);
  assert.equal(Object.keys(db.data).length, 6);

  // A rerun finds nothing to write.
  assert.equal((await planMigration(db, migration)).totals.toCreate, 0);
});

test("host-form-version-filters creates each missing view once", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "host-form-version-filters");
  const definition = {sections: [{sectionId: "one", questions: [
    {questionId: "pace", kind: "singleChoice", label: "Pace", required: false,
      privacyClass: "ordinary", hostPresentation: "filterable",
      options: [{value: "easy", label: "Easy"}]},
    {questionId: "health", kind: "singleChoice", label: "Health", required: false,
      privacyClass: "sensitive", hostPresentation: "filterable",
      options: [{value: "yes", label: "Yes"}]},
  ]}]};
  const version = (formVersion) => ({organizerId: "o1", formId: "f1",
    version: formVersion, sourceDraftRevision: 1, createdByUid: "host", definition});
  const db = fakeDb({
    "organizerFormVersions/f1_v1": version(1),
    "organizerFormVersions/f1_v2": version(2),
    "organizerFormVersions/broken": {organizerId: "o1", version: 1, definition},
    "hostFormVersionFilters/f1_v2": {organizerId: "o1", formId: "f1",
      versionId: "f1_v2", formVersion: 2, version: 1, answerFilterOptions: [
        {questionId: "pace", label: "Pace", options: [{value: "easy", label: "Easy"}]}]},
  });
  const plan = await planMigration(db, migration);
  assert.deepEqual(plan.totals, {scanned: 3, toCreate: 1, alreadyCopied: 1, conflicts: 0, skipped: 1});
  await applyMigrationPlan(db, plan);
  assert.deepEqual(db.data["hostFormVersionFilters/f1_v1"], {organizerId: "o1",
    formId: "f1", versionId: "f1_v1", formVersion: 1, version: 1,
    answerFilterOptions: [{questionId: "pace", label: "Pace",
      options: [{value: "easy", label: "Easy"}]}]});
  // Versions are untouched and a second run is a no-op.
  assert.deepEqual(db.data["organizerFormVersions/f1_v1"], version(1));
  assert.equal((await planMigration(db, migration)).totals.toCreate, 0);
});

test("host-event-request-views creates each coming event's view once", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "host-event-request-views");
  const requireFunctions = createRequire(new URL("../../functions/package.json", import.meta.url));
  const {AudienceTestStore} = requireFunctions("./lib/organizers/organizerAudienceTestStore.js");
  const {Timestamp} = requireFunctions("firebase-admin/firestore");
  const start = Date.now() + 86_400_000;
  const event = (extra = {}) => ({organizerId: "o1", status: "active", name: "Supper",
    startTime: Timestamp.fromMillis(start), endTime: Timestamp.fromMillis(start + 3_600_000),
    capacityLimit: 10, priceInPaise: 0, bookedCount: 10,
    eventPolicy: {admission: {manualApprovalRequired: false}}, ...extra});
  const store = new AudienceTestStore({
    "events/e1": event(),
    "events/e2": event(),
    "events/e3": event({status: "cancelled"}),
    "eventParticipations/e1_u1": {eventId: "e1", organizerId: "o1", uid: "u1",
      status: "waitlisted", waitlistedAt: Timestamp.fromMillis(100),
      createdAt: Timestamp.fromMillis(100)},
    "eventParticipations/e3_u1": {eventId: "e3", organizerId: "o1", uid: "u1",
      status: "waitlisted", waitlistedAt: Timestamp.fromMillis(100),
      createdAt: Timestamp.fromMillis(100)},
    "publicProfiles/u1": {name: "Zoya"},
  });
  const db = store.asFirestore();
  db.doc = (docPath) => store.collection(docPath.split("/")[0]).doc(docPath.split("/")[1]);
  const plan = await planMigration(db, migration);
  // e2 has nobody waiting and e3 is cancelled.
  assert.deepEqual(plan.totals, {scanned: 3, toCreate: 1, alreadyCopied: 0, conflicts: 0, skipped: 2});
  await applyMigrationPlan(db, plan);
  const view = store.docs["hostEventRequestViews/e1"];
  assert.deepEqual(view.rows.map((row) => [row.uid, row.kind, row.waitlistPosition, row.name]),
    [["u1", "waitlist", 1, "Zoya"]]);
  // Sources are untouched and a second run is a no-op.
  assert.equal(store.docs["eventParticipations/e1_u1"].status, "waitlisted");
  const again = await planMigration(db, migration);
  assert.deepEqual(again.totals, {scanned: 3, toCreate: 0, alreadyCopied: 1, conflicts: 0, skipped: 2});
});

test("guest-messaging-permissions creates each missing row once", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "guest-messaging-permissions");
  const unknown = {status: "unknown", evidenceStatus: "none", currentReceiptId: null,
    termsVersion: null, source: null, sourceEventId: null, updatedAt: null};
  const db = fakeDb({
    "catchCommunicationPreferences/u1": {uid: "u1", whatsapp: unknown},
    "catchCommunicationPreferences/mismatch": {uid: "u2", whatsapp: unknown},
    "catchCommunicationPreferences/u3": {uid: "u3", whatsapp: unknown},
    "guestMessagingPermissions/catchpref_u3": {uid: "u3", scope: "catch",
      organizerId: null, preference: {status: "unknown", receiptId: null, purposes: {}},
      version: 1},
  });
  const plan = await planMigration(db, migration);
  assert.deepEqual(plan.steps[0].scanned, 3);
  assert.equal(plan.steps[0].toCreate.length, 1);
  assert.equal(plan.steps[0].alreadyCopied, 1);
  assert.equal(plan.steps[0].skipped.length, 1);
  await applyMigrationPlan(db, plan);
  assert.deepEqual(db.data["guestMessagingPermissions/catchpref_u1"], {uid: "u1",
    scope: "catch", organizerId: null,
    preference: {status: "unknown", receiptId: null, purposes: {}}, version: 1});
  assert.deepEqual(db.data["catchCommunicationPreferences/u1"], {uid: "u1", whatsapp: unknown});
  assert.equal((await planMigration(db, migration)).totals.toCreate, 0);
});

test("participant-form-profile-views creates only available rows, once", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "participant-form-profile-views");
  const db = fakeDb({
    // Withdrawn: the projection reads it as unavailable, so no row.
    "participantFormProfileProposals/r1": {uid: "u1", organizerId: "o1", formId: "f1",
      versionId: "v1", responseId: "r1", fields: []},
    "organizerFormResponses/r1": {respondentUid: "u1", status: "withdrawn"},
    "participantFormProfileProposals/r2": {organizerId: "o1", responseId: "r2"},
    "participantIntakeProfiles/u1": {fields: [{canonicalFieldId: "linkedinUrl",
      value: {valueKind: "text", textValue: "https://www.linkedin.com/in/u1"}}],
    revision: 2},
    "participantIntakeProfiles/u2": {fields: [], revision: 1},
    "participantIntakeProfiles/u3": {fields: [], revision: 4},
    "deletedUsers/u3": {status: "processing"},
    "participantIntakeProfileViews/u2": {uid: "u2", intakeRevision: 1, linkedinUrl: null,
      version: 1},
  });
  const plan = await planMigration(db, migration);
  assert.equal(plan.steps[0].scanned, 2);
  assert.equal(plan.steps[0].toCreate.length, 0);
  assert.equal(plan.steps[0].skipped.length, 2);
  assert.equal(plan.steps[1].toCreate.length, 1);
  assert.equal(plan.steps[1].alreadyCopied, 1);
  assert.equal(plan.steps[1].skipped.length, 1);
  await applyMigrationPlan(db, plan);
  assert.deepEqual(db.data["participantIntakeProfileViews/u1"], {uid: "u1",
    intakeRevision: 2, linkedinUrl: "https://www.linkedin.com/in/u1", version: 1});
  assert.equal(db.data["participantIntakeProfileViews/u3"], undefined);
  assert.equal(db.data["participantFormProfileViews/r1"], undefined);
  assert.equal(db.data["participantIntakeProfiles/u1"].revision, 2);
  assert.equal((await planMigration(db, migration)).totals.toCreate, 0);
});

test("host-whatsapp-thread-views creates each retained thread's view once", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "host-whatsapp-thread-views");
  const at = (millis) => ({toMillis: () => millis});
  const later = Date.now() + 86_400_000;
  const {organizerWhatsappThreadId} = await import(
    "../../functions/lib/organizers/organizerWhatsappThreads.js");
  const live = organizerWhatsappThreadId("o1", "c1");
  const expired = organizerWhatsappThreadId("o1", "c2");
  const thread = (contactId, expiresAt) => ({organizerId: "o1", contactId,
    connectionId: "conn", endpointHash: "a".repeat(64), eventIds: [],
    lastMessageBody: "Running late", lastMessageDirection: "inbound",
    lastMessageAt: at(5), lastInboundAt: at(5), serviceWindowExpiresAt: at(9),
    messageCount: 1, expiresAt: at(expiresAt)});
  const db = fakeDb({
    [`organizerWhatsappThreads/${live}`]: thread("c1", later),
    [`organizerWhatsappThreads/${expired}`]: thread("c2", 10),
    "organizerWhatsappThreads/owt_mismatch": thread("c1", later),
    "organizerContacts/c1": {organizerId: "o1", displayName: "Riya",
      displayNameOverride: null, linkedUid: null, identityState: "proposed"},
  });
  const plan = await planMigration(db, migration);
  assert.deepEqual(plan.totals, {scanned: 3, toCreate: 1, alreadyCopied: 0, conflicts: 0, skipped: 2});
  await applyMigrationPlan(db, plan);
  assert.deepEqual(db.data[`hostWhatsappThreadViews/${live}`], {organizerId: "o1",
    threadId: live, contactId: "c1", linkedUid: null, displayName: "Riya",
    eventIds: [], lastMessageBody: "Running late", lastMessageDirection: "inbound",
    lastMessageAtMillis: 5, lastInboundAtMillis: 5, serviceWindowExpiresAtMillis: 9,
    expiresAtMillis: later, version: 1});
  // Threads are untouched and a second run is a no-op.
  assert.equal(db.data[`organizerWhatsappThreads/${live}`].messageCount, 1);
  const again = await planMigration(db, migration);
  assert.deepEqual(again.totals, {scanned: 3, toCreate: 0, alreadyCopied: 1, conflicts: 0, skipped: 2});
});

test("host-send-summaries creates one row per Send once, including posts", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "host-send-summaries");
  const at = (millis) => ({toMillis: () => millis});
  const counts = {total: 1};
  const db = fakeDb({
    "organizerCampaigns/c1": {organizerId: "o1", name: "Regulars", status: "draft",
      savedAudienceId: null, segmentIds: [], templateId: "t1", audienceCounts: counts,
      deliveryCounts: counts, scheduledAt: null, dispatchedAt: null, createdAt: at(3)},
    "organizerCampaigns/leg": {organizerId: "o1", name: "Leg", status: "sending",
      recipientSource: {kind: "organizerFollowers"}, segmentIds: [], templateId: "t1",
      audienceCounts: counts, deliveryCounts: counts, createdAt: at(2)},
    "organizerMessageTemplates/t1": {organizerId: "o1", name: "Invite"},
    "organizerBroadcastSummaries/b1": {organizerId: "o1", broadcastId: "b1",
      eventId: "e1", eventName: "Friday run", audience: "booked", recipientCount: 2,
      recipientContactIds: ["c1"], sentAt: at(2), partialFailure: false},
    "organizers/o1/posts/p1": {authorUid: "host", text: "Hello", eventId: null,
      audience: "followers", createdAt: at(1), status: "active"},
    "events/e1/posts/other": {text: "Not an organizer post"},
  });
  const plan = await planMigration(db, migration);
  assert.equal(plan.steps[0].toCreate.length, 1);
  assert.equal(plan.steps[0].skipped.length, 1);
  assert.equal(plan.steps[1].toCreate.length, 1);
  assert.equal(plan.steps[2].scanned, 2);
  assert.equal(plan.steps[2].toCreate.length, 1);
  assert.equal(plan.steps[2].skipped.length, 1);
  await applyMigrationPlan(db, plan);
  assert.equal(db.data["hostSendSummaries/campaign_c1"].row.templateName, "Invite");
  assert.equal(db.data["hostSendSummaries/announcement_b1"].row.recipientCount, 2);
  assert.deepEqual(db.data["hostSendSummaries/followerUpdate_p1"], {organizerId: "o1",
    sendId: "followerUpdate_p1", kind: "followerUpdate", activityAtMillis: 1, version: 1,
    row: {kind: "followerUpdate", postId: "p1", eventId: null, audience: "followers",
      status: "active", deliveryStatus: "unknown", recipientCount: 0, excludedCount: 0,
      activityAvailableCount: 0, pushAttemptedCount: 0, pushAcceptedCount: 0,
      pushFailedCount: 0, pushUnknownCount: 0, createdAtMillis: 1, activityAtMillis: 1}});
  assert.equal(db.data["hostSendSummaries/campaign_leg"], undefined);
  // Sources are untouched and a second run is a no-op.
  assert.equal(db.data["organizers/o1/posts/p1"].text, "Hello");
  assert.equal((await planMigration(db, migration)).totals.toCreate, 0);
});

test("unknown migration names are rejected", () => {
  assert.throws(() => migrationsByName(["nope"]), /Unknown migration "nope"/);
  assert.equal(migrationsByName(["all"]).length, MIGRATIONS.length);
});

// structuredClone, keeping timestamp-like values (anything with toMillis).
function clone(value) {
  if (value === null || typeof value !== "object") return value;
  if (typeof value.toMillis === "function") return value;
  if (Array.isArray(value)) return value.map(clone);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
}

function fakeDb(seed) {
  const data = clone(seed);
  const db = {
    data,
    collection: (name) => collection(name),
    collectionGroup: (name) => collectionGroup(name),
    doc: (docPath) => docRef(docPath),
    // Read-only transactions, as migration transforms use them.
    runTransaction: (body) => body({get: (ref) => ref.get()}),
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
            data[docPath] = kind === "create" ? clone(value) :
              {...data[docPath], ...clone(value)};
          }
        },
      };
    },
  };
  function docRef(docPath) {
    const segments = docPath.split("/");
    const collectionOf = (end) => end < 1 ? null : {
      id: segments[end - 1],
      parent: end < 2 ? null : {id: segments[end - 2], parent: collectionOf(end - 2)},
    };
    return {
      path: docPath,
      id: segments.at(-1),
      parent: collectionOf(segments.length - 1),
      async get() {
        const value = data[docPath];
        return {exists: value !== undefined, data: () => clone(value)};
      },
    };
  }
  function collectionGroup(name) {
    const query = (after) => ({
      orderBy: () => query(after),
      limit: () => query(after),
      startAfter: (doc) => query(doc.ref.path),
      async get() {
        const docs = Object.keys(data)
          .filter((key) => key.split("/").length % 2 === 0 && key.split("/").at(-2) === name)
          .sort()
          .filter((key) => after === undefined || key > after)
          .map((key) => ({id: key.split("/").at(-1), ref: docRef(key), data: () => clone(data[key])}));
        return {docs, empty: docs.length === 0};
      },
    });
    return query(undefined);
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
          .map((key) => ({id: key.split("/")[1], ref: docRef(key), data: () => clone(data[key])}))
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
