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
