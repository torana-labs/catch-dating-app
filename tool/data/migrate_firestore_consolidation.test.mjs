import assert from "node:assert/strict";
import fs from "node:fs";
import {createRequire} from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  MIGRATIONS, migrationsByName, preReceiptHostLeadId,
} from "./lib/firestore_consolidation_migrations.mjs";
import {createFunctionsRequire} from "../lib/repo_paths.mjs";
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
    "eventBookings/e1_new": {eventId: "e1", organizerId: "o1", uid: "new",
      status: "signedUp", createdAt: created, updatedAt: created, signedUpAt: created,
      waitlistedAt: null, attendedAt: null, cancelledAt: null, deletedAt: null,
      genderAtSignup: "woman", paymentId: "pay_1"},
    "eventBookings/e1_linked": {eventId: "e1", organizerId: "o1", uid: "linked",
      status: "attended", createdAt: created, updatedAt: created, signedUpAt: created,
      waitlistedAt: null, attendedAt: created, cancelledAt: null, deletedAt: null,
      genderAtSignup: null, paymentId: null, hostApprovalStatus: "approved"},
    "eventAttendees/att_existing": {eventId: "e1", organizerId: "o1",
      source: "catchBooking", linkedUid: "linked", status: "checkedIn"},
    "eventAttendees/att_host": {eventId: "e1", organizerId: "o1",
      source: "hostImport", linkedUid: null, status: "registered"},
    "eventBookings/e1_pointed": {eventId: "e1", organizerId: "o1", uid: "pointed",
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
  assert.equal(db.data["eventBookings/e1_new"].attendeeId, newPath.split("/")[1]);
  assert.equal(db.data["eventAttendees/att_existing"].status, "checkedIn");
  assert.equal(db.data["eventAttendees/att_existing"].booking, undefined);
  assert.equal(db.data["eventBookings/e1_linked"].attendeeId, "att_existing");
  assert.equal(db.data["eventBookings/e1_pointed"].attendeeId, "att_pointed");
  assert.equal(db.data["eventAttendees/att_host"].linkedUid, null);
  assert.ok(db.data["eventBookings/e1_new"]);
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
    "eventBookings/e1_a": {eventId: "e1", uid: "a", status: "signedUp"},
    "eventBookings/e2_a": {eventId: "e2", uid: "a", status: "signedUp"},
    "eventBookings/e3_a": {eventId: "e3", uid: "a", status: "cancelled"},
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

test("event-bookings copies every legacy booking once and replaces none", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "event-bookings");
  const db = fakeDb({
    "eventParticipations/e1_a": {eventId: "e1", uid: "a", status: "signedUp", attendeeId: "e1_a"},
    "eventParticipations/e1_b": {eventId: "e1", uid: "b", status: "cancelled"},
    "eventParticipations/e2_c": {eventId: "e2", uid: "c", status: "waitlisted"},
    "eventBookings/e1_b": {eventId: "e1", uid: "b", status: "cancelled"},
  });
  const plan = await planMigration(db, migration);
  assert.equal(plan.totals.toCreate, 2);
  assert.equal(plan.totals.alreadyCopied, 1);
  await applyMigrationPlan(db, plan);
  assert.deepEqual(db.data["eventBookings/e1_a"], db.data["eventParticipations/e1_a"]);
  assert.deepEqual(db.data["eventBookings/e2_c"], db.data["eventParticipations/e2_c"]);
  assert.ok(db.data["eventParticipations/e1_a"]);
  assert.equal((await planMigration(db, migration)).totals.toCreate, 0);
});

test("event-bookings refuses to overwrite a booking that moved on", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "event-bookings");
  const db = fakeDb({
    "eventParticipations/e1_a": {eventId: "e1", uid: "a", status: "signedUp"},
    "eventBookings/e1_a": {eventId: "e1", uid: "a", status: "cancelled"},
  });
  const plan = await planMigration(db, migration);
  assert.equal(plan.totals.conflicts, 1);
  await assert.rejects(applyMigrationPlan(db, plan), /already exist with different data/u);
  assert.equal(db.data["eventBookings/e1_a"].status, "cancelled");
});

test("guest-event-read-models creates each entry and row once from its first record", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "guest-event-read-models");
  const db = fakeDb({
    "events/e1": {publicationState: "published"},
    "events/e2": {publicationState: "private"},
    "eventBookings/e1_a": {eventId: "e1", uid: "a", status: "signedUp"},
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
    "eventBookings/e1_a": {eventId: "e1", uid: "a", status: "waitlisted"},
    "guestEventStatuses/e2_b": {eventId: "e2", uid: "b",
      participationStatus: "signedUp", eventCard: {eventId: "e2"}},
    "savedEvents/c_e3": {uid: "c", eventId: "e3", eventCard: {eventId: "e3"}},
    "savedEvents/c_e4": {uid: "c", eventId: "e4"},
  });
  const [create, statusFill, savedFill] = migration.steps;
  // A waitlisted booking now creates its row, from the booking itself.
  assert.equal(await create.targetId("e1_a",
    db.data["eventBookings/e1_a"], db), "e1_a");
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
  const publicOrganizer = {name: "Sandbar Run Club", description: "x", location: "mumbai",
    area: "Bandra", hostName: "Asha", tags: ["running"], rating: 4.6, status: "active",
    archived: false, appVisibility: "discoverable", followerCount: 99};
  const summary = {name: "Sandbar Run Club", location: "mumbai", area: "Bandra", hostName: "Asha",
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

test("host-membership-savings recomputes stored totals from benefit uses", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "host-membership-savings");
  const membershipId = (n) => `hm_${String(n).repeat(64)}`;
  const use = (membership, eventId, savingsInPaise, state = "booked") => ({
    schemaVersion: 1, membershipId: membership, organizerId: "organizer-1", uid: "member-1",
    eventId, planId: "hmp_AbCdEfGhIjKlMnOpQrSt", listPriceInPaise: 50000,
    paidPriceInPaise: 50000 - savingsInPaise, savingsInPaise,
    eventStartMillis: 1_800_000_000_000, state, createdAtMillis: 1_700_000_000_000,
  });
  const db = fakeDb({
    [`hostMemberships/${membershipId(1)}`]: {status: "active"},
    [`hostMemberships/${membershipId(2)}`]: {status: "active", savedInPaise: 1, memberPricedBookings: 9},
    [`hostMemberships/${membershipId(3)}`]: {status: "active", savedInPaise: 15000, memberPricedBookings: 1},
    [`hostMemberships/${membershipId(4)}`]: {status: "active"},
    "hostMembershipBenefitUses/e1_member-1": use(membershipId(1), "e1", 20000),
    "hostMembershipBenefitUses/e2_member-1": use(membershipId(1), "e2", 10000),
    "hostMembershipBenefitUses/e3_member-1": use(membershipId(1), "e3", 7000, "released"),
    "hostMembershipBenefitUses/e4_member-1": use(membershipId(2), "e4", 5000, "released"),
    "hostMembershipBenefitUses/e5_member-1": use(membershipId(3), "e5", 15000),
  });
  const before = JSON.stringify(db.data);

  const plan = await planMigration(db, migration);
  assert.deepEqual(plan.totals, {scanned: 4, toCreate: 2, alreadyCopied: 0, conflicts: 0, skipped: 0});
  assert.equal(JSON.stringify(db.data), before);

  await applyMigrationPlan(db, plan);
  assert.deepEqual(db.data[`hostMemberships/${membershipId(1)}`],
    {status: "active", savedInPaise: 30000, memberPricedBookings: 2});
  assert.deepEqual(db.data[`hostMemberships/${membershipId(2)}`],
    {status: "active", savedInPaise: 0, memberPricedBookings: 0});
  // Current totals and a membership with nothing to count are untouched.
  assert.deepEqual(db.data[`hostMemberships/${membershipId(3)}`],
    {status: "active", savedInPaise: 15000, memberPricedBookings: 1});
  assert.deepEqual(db.data[`hostMemberships/${membershipId(4)}`], {status: "active"});
  assert.equal(db.data["hostMembershipBenefitUses/e3_member-1"].state, "released");

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
    "eventBookings/e1_u1": {eventId: "e1", organizerId: "o1", uid: "u1",
      status: "waitlisted", waitlistedAt: Timestamp.fromMillis(100),
      createdAt: Timestamp.fromMillis(100)},
    "eventBookings/e3_u1": {eventId: "e3", organizerId: "o1", uid: "u1",
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
  assert.equal(store.docs["eventBookings/e1_u1"].status, "waitlisted");
  const again = await planMigration(db, migration);
  assert.deepEqual(again.totals, {scanned: 3, toCreate: 0, alreadyCopied: 1, conflicts: 0, skipped: 2});
});

test("host-contact-detail-views creates each shown contact's view once", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "host-contact-detail-views");
  const requireFunctions = createRequire(new URL("../../functions/package.json", import.meta.url));
  const {AudienceTestStore} = requireFunctions("./lib/organizers/organizerAudienceTestStore.js");
  const {Timestamp} = requireFunctions("firebase-admin/firestore");
  const contact = (extra = {}) => ({organizerId: "o1", linkedUid: null,
    identityState: "unlinked", deletedAt: null, hiddenAt: null, ...extra});
  const traits = {organizerId: "o1", expectedEventCount: 1, attendedEventCount: 1,
    cancelledEventCount: 0, noShowCount: 0, importedEventCount: 0, attendanceRate: 1,
    segmentIds: ["past_attendee"], whatsappStatus: "unknown", smsStatus: "unknown",
    sourceCoverage: "exact"};
  const store = new AudienceTestStore({
    "organizerContacts/c1": contact(),
    "organizerContacts/c2": contact({hiddenAt: Timestamp.fromMillis(5)}),
    "organizerContacts/c3": contact(),
    "organizerContactTraits/c1": traits,
    "organizerContactTraits/c2": traits,
    "organizerContactEventEdges/e1_c1": {organizerId: "o1", contactId: "c1",
      eventId: "e1", attendeeId: "a1", source: "catch", status: "checkedIn",
      expected: true, registered: true, cancelled: false, checkedIn: true,
      eventStartAt: Timestamp.fromMillis(100), eventEndAt: null, registeredAt: null,
      cancelledAt: null, checkedInAt: null},
    "events/e1": {organizerId: "o1", name: "Supper"},
  });
  const db = store.asFirestore();
  db.doc = (docPath) => store.collection(docPath.split("/")[0]).doc(docPath.split("/")[1]);
  const plan = await planMigration(db, migration);
  // c2 is hidden and c3 has no trait row.
  assert.deepEqual(plan.totals, {scanned: 3, toCreate: 1, alreadyCopied: 0, conflicts: 0, skipped: 2});
  await applyMigrationPlan(db, plan);
  const view = store.docs["hostContactDetailViews/c1"];
  assert.equal(view.organizerId, "o1");
  assert.equal(view.traits.attendedEventCount, 1);
  assert.deepEqual(view.events.map((row) => [row.eventId, row.displayName]), [["e1", "Supper"]]);
  // Sources are untouched and a second run is a no-op.
  assert.equal(store.docs["organizerContacts/c1"].identityState, "unlinked");
  const again = await planMigration(db, migration);
  assert.deepEqual(again.totals, {scanned: 3, toCreate: 0, alreadyCopied: 1, conflicts: 0, skipped: 2});
});

test("host-application-detail-views creates each application's view once", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "host-application-detail-views");
  const requireFunctions = createRequire(new URL("../../functions/package.json", import.meta.url));
  const {AudienceTestStore} = requireFunctions("./lib/organizers/organizerAudienceTestStore.js");
  const {Timestamp} = requireFunctions("firebase-admin/firestore");
  const now = Timestamp.fromMillis(1800000000000);
  const store = new AudienceTestStore({
    "organizerApplications/a1": {organizerId: "o1", formId: "f1", formVersionId: "v1",
      targetKind: "event", targetId: "e1", linkedUid: null, contactId: null,
      applicantDisplayName: "Ada", reviewStatus: "submitted", latestResponseId: "r1",
      source: {kind: "csvImport", providerId: null, externalFormId: null,
        externalResponseId: null, importReceiptId: "i1"},
      assignedReviewerUid: null, reviewNote: null, revision: 1, submittedAt: now,
      updatedAt: now, reviewedAt: null},
    "organizerApplications/orphan": {formId: "f1"},
  });
  const db = store.asFirestore();
  db.doc = (docPath) => store.collection(docPath.split("/")[0]).doc(docPath.split("/")[1]);
  const plan = await planMigration(db, migration);
  assert.deepEqual(plan.totals, {scanned: 2, toCreate: 1, alreadyCopied: 0, conflicts: 0, skipped: 1});
  await applyMigrationPlan(db, plan);
  const view = store.docs["hostApplicationDetailViews/a1"];
  // The imported snapshot is missing, so the view masks the applicant.
  assert.equal(view.detail.applicantDisplayName, "Withdrawn applicant");
  assert.deepEqual(view.detail.answers, []);
  assert.equal(view.detail.revision, 1);
  const again = await planMigration(db, migration);
  assert.deepEqual(again.totals, {scanned: 2, toCreate: 0, alreadyCopied: 1, conflicts: 0, skipped: 1});
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

test("program-work-views creates each summary and label once, without contacts", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "program-work-views");
  const at = (millis) => ({toMillis: () => millis, seconds: Math.floor(millis / 1000), nanoseconds: 0});
  const db = fakeDb({
    "organizerPrograms/p1": {organizerId: "o1", kind: "wedding", title: "Wedding",
      timezone: "Asia/Kolkata", status: "active", capabilities: [],
      whatsappSenderConnectionId: "conn", transportSettings: {vehicleClasses: []}},
    "programHotels/h1": {programId: "p1", organizerId: "o1", name: "The Grand",
      receptionContact: "+919900000000", notes: "side door", active: true},
    "programPickupPoints/pp1": {programId: "p1", organizerId: "o1", kind: "airport",
      label: "DEL T3", iataCode: "DEL", terminal: "T3", instructions: "gate 4", active: true},
    "programFunctions/f1": {programId: "p1", organizerId: "o1", name: "Sangeet",
      venueName: "Lawn", venueNotes: "ring Ravi", startsAt: at(1000), endsAt: at(5000),
      status: "scheduled"},
    "programHotels/orphan": {name: "No programme", active: true},
  });
  const plan = await planMigration(db, migration);
  assert.equal(plan.totals.toCreate, 4);
  await applyMigrationPlan(db, plan);
  assert.equal(db.data["programWorkSummaries/p1"].title, "Wedding");
  assert.equal(db.data["programWorkSummaries/p1"].whatsappSenderConnectionId, undefined);
  assert.equal(db.data["programResourceViews/p1__hotel__h1"].label, "The Grand");
  assert.equal(db.data["programResourceViews/p1__pickupPoint__pp1"].iataCode, "DEL");
  assert.equal(db.data["programResourceViews/p1__function__f1"].startsAtMillis, 1000);
  const copied = JSON.stringify(Object.fromEntries(Object.entries(db.data).filter(
    ([key]) => key.startsWith("programResourceViews/") || key.startsWith("programWorkSummaries/"))));
  for (const secret of ["9900000000", "side door", "gate 4", "ring Ravi", "conn"]) {
    assert.equal(copied.includes(secret), false, secret);
  }
  assert.equal(db.data["programHotels/h1"].receptionContact, "+919900000000");
  const again = await planMigration(db, migration);
  assert.equal(again.totals.toCreate, 0);
  assert.equal(again.totals.alreadyCopied, 4);
});

test("program-trip-views creates trip and hotel inbound views once, keeping notes and rates out", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "program-trip-views");
  const at = (millis) => ({toMillis: () => millis, seconds: Math.floor(millis / 1000), nanoseconds: 0});
  const trip = (overrides = {}) => ({programId: "p1", organizerId: "o1", kind: "guestTransfer",
    pickupPointId: "pp1", destinationHotelId: "h1", destinationLabel: "The Grand",
    vehicleClassId: "sedan", vendorId: "v1", vendorNameSnapshot: "City Cabs",
    plateDisplay: "DL 1 AB 1234", legIds: ["in1"], passengerCount: 2, status: "enRoute",
    departedAt: at(10_000), arrivedAt: null, voidReason: null, departedByUid: "disp-1",
    rateSnapshot: {amountMinor: 777}, notes: "driver Ravi 9800000000", revision: 2,
    dispatchSnapshot: {vehicleClass: {id: "sedan", label: "Sedan"}, manifest: [{legId: "in1",
      guestId: "g1", guestDisplayName: "Rohan", passengers: 2, luggageUnits: 1}]}, ...overrides});
  const leg = (overrides = {}) => ({programId: "p1", organizerId: "o1", guestId: "g1", partyId: null,
    kind: "inbound", flightNumber: "AI1", flightStatus: "scheduled", scheduledArrivalAt: at(5_000_000),
    readiness: "expected", pickupPointId: "pp1", destinationHotelId: "h1", passengers: 2,
    international: false, ...overrides});
  const db = fakeDb({
    "organizerPrograms/p1": {organizerId: "o1", transportSettings: {bandWindowMillis: 1,
      maxReadyWaitMillis: 1, domesticExitLagMillis: 1_800_000, internationalExitLagMillis: 3_600_000,
      vehicleClasses: []}},
    "programGuests/g1": {programId: "p1", organizerId: "o1", displayName: "Rohan"},
    "transportTrips/t1": trip(),
    "transportTrips/t2": trip({status: "arrived", destinationHotelId: null}),
    "programTravelLegs/in1": leg(),
    "programTravelLegs/in2": leg({readiness: "disrupted"}),
    "programTravelLegs/in3": leg({destinationHotelId: null}),
    "programTravelLegs/out1": leg({kind: "outbound"}),
  });
  const plan = await planMigration(db, migration);
  assert.equal(plan.totals.toCreate, 2 + 1);
  await applyMigrationPlan(db, plan);
  assert.equal(db.data["programTripViews/t1"].guestNames[0], "Rohan");
  assert.equal(db.data["programTripViews/t2"].hotelKey, "~");
  assert.equal(db.data["programHotelInboundViews/in1"].hotelId, "h1");
  assert.equal(db.data["programHotelInboundViews/in2"], undefined);
  const copied = JSON.stringify(Object.fromEntries(Object.entries(db.data).filter(
    ([key]) => /^program(Trip|HotelInbound)Views\//.test(key))));
  for (const secret of ["9800000000", "disp-1", "777", "AI1"]) {
    assert.equal(copied.includes(secret), false, secret);
  }
  assert.equal(db.data["transportTrips/t1"].notes, "driver Ravi 9800000000");
  const again = await planMigration(db, migration);
  assert.equal(again.totals.toCreate, 0);
  assert.equal(again.totals.conflicts, 0);
});

test("program-staff-views creates each staff row once, without the full phone number", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "program-staff-views");
  const at = (millis) => ({toMillis: () => millis, seconds: Math.floor(millis / 1000), nanoseconds: 0});
  const later = Math.floor((Date.now() + 86_400_000) / 1000) * 1000;
  const grant = (uid, overrides = {}) => ({organizerId: "o1", programId: "p1", uid,
    displayName: "Arjun", phoneLastFour: "0001", status: "active", createdBy: "owner-1",
    duties: [{duty: "hotelDesk", pickupPointIds: [], hotelIds: ["h1"], expiresAtMillis: later}],
    expiresAt: at(later), revokedBy: null, revokedAt: null, revision: 2, ...overrides});
  const db = fakeDb({
    "organizerPrograms/p1": {organizerId: "o1", createdBy: "owner-1", status: "active"},
    "programStaffGrants/p1__desk-1": grant("desk-1"),
    "programStaffGrants/p1__gone-1": grant("gone-1", {status: "revoked", revokedBy: "owner-1", revokedAt: at(5)}),
    "programStaffGrants/p9__orphan-1": {...grant("orphan-1"), programId: "p9"},
    "programStaffGrants/p1__mismatch": grant("desk-1"),
  });
  const plan = await planMigration(db, migration);
  assert.equal(plan.totals.toCreate, 2);
  await applyMigrationPlan(db, plan);
  assert.equal(db.data["programStaffViews/p1__desk-1"].activeUntilMillis, later);
  assert.equal(db.data["programStaffViews/p1__desk-1"].ownerApproved, true);
  assert.equal(db.data["programStaffViews/p1__gone-1"].revoked, true);
  assert.equal(db.data["programStaffViews/p9__orphan-1"], undefined);
  assert.equal(db.data["programStaffGrants/p1__desk-1"].revision, 2);
  const again = await planMigration(db, migration);
  assert.equal(again.totals.toCreate, 0);
  assert.equal(again.totals.conflicts, 0);
});

test("screen-read view migrations create each board, work-list row and moment row once, without contacts", async () => {
  const at = (millis) => ({toMillis: () => millis, seconds: Math.floor(millis / 1000), nanoseconds: 0});
  const later = Math.floor((Date.now() + 86_400_000) / 1000) * 1000;
  const db = fakeDb({
    "organizers/o1": {name: "Sharma Weddings", phone: "+919800000000"},
    "organizerPrograms/p1": {organizerId: "o1", createdBy: "owner-1", status: "active",
      title: "Sharma-Rao Wedding", timezone: "Asia/Kolkata"},
    "programHotels/h1": {programId: "p1", organizerId: "o1", name: "Haveli",
      contactPhoneE164: "+919811111111"},
    "programHotels/h9": {programId: "p9", organizerId: "o1", name: "Elsewhere"},
    "programRoomBlocks/b1": {programId: "p1", organizerId: "o1", hotelId: "h1", label: "General",
      roomType: null, totalRooms: 2, assignedCount: 0, heldForGroupIds: [],
      startsAt: at(1_800_600_000_000), endsAt: at(1_800_900_000_000), notes: "rate 777"},
    "programStays/s1": {programId: "p1", organizerId: "o1", guestId: "g1", hotelId: "h1",
      roomBlockId: "b1", roomLabel: "301", startsAt: null, endsAt: null, status: "confirmed",
      roomReadyAt: null, hotelArrivedAt: null, notes: "call mum", revision: 3},
    "programTravelLegs/l2": {programId: "p1", organizerId: "o1", guestId: "g2", kind: "inbound",
      destinationHotelId: "h1", readiness: "expected"},
    "programGuests/g1": {programId: "p1", organizerId: "o1", displayName: "Rohan",
      phoneE164: "+919822222222", groupIds: []},
    "programGuests/g2": {programId: "p1", organizerId: "o1", displayName: "Meera", groupIds: []},
    "programStaffGrants/p1__desk-1": {organizerId: "o1", programId: "p1", uid: "desk-1",
      displayName: "Arjun", phoneLastFour: "0001", status: "active", createdBy: "owner-1",
      duties: [{duty: "hotelDesk", pickupPointIds: [], hotelIds: ["h1"], expiresAtMillis: later}],
      expiresAt: at(later), revokedBy: null, revokedAt: null, revision: 2},
    "events/e1": {organizerId: "o1", name: "Winter Mixer"},
    "eventStaffGrants/e1__door-1": {organizerId: "o1", eventId: "e1", uid: "door-1",
      role: "checkInOperator", status: "active", expiresAt: at(later)},
    "organizerTeamMemberships/o1_manager-1": {organizerId: "o1", uid: "manager-1",
      role: "owner", status: "active"},
    "organizerTeamMemberships/o1_left-1": {organizerId: "o1", uid: "left-1",
      role: "manager", status: "removed"},
    "organizerMoments/m1": {momentId: "m1", scope: {kind: "program", programId: "p1"},
      scopeKind: "program", scopeId: "p1", name: "Get ready",
      initiation: {kind: "scheduled", atMillis: 5_000}, sense: "audience",
      audience: {kind: "households", rsvpPendingOnly: false},
      action: {kind: "push", notificationType: "programUpdate", preferenceKey: "programUpdates"},
      status: "armed", approval: {approvedByUid: "owner-1", approvedAtMillis: 1},
      origin: "organizer", revision: 1},
    "organizerMoments/auto1": {momentId: "auto1", scopeKind: "organizer", scopeId: "o1"},
    "organizerMomentRuns/r1": {momentId: "m1", status: "dispatched", sent: 4},
    "organizerMomentRuns/r2": {momentId: "m1", status: "planned", dueAtMillis: 9_000},
  });
  for (const name of ["program-hotel-room-views", "host-assignment-views", "organizer-moment-views"]) {
    const migration = MIGRATIONS.find((entry) => entry.name === name);
    const plan = await planMigration(db, migration);
    await applyMigrationPlan(db, plan);
    const again = await planMigration(db, migration);
    assert.equal(again.totals.toCreate, 0, name);
    assert.equal(again.totals.conflicts, 0, name);
  }
  const board = db.data["programHotelRoomViews/p1__h1"];
  assert.equal(board.stays[0].revision, 3);
  assert.equal(board.stays[0].guestDisplayName, "Rohan");
  assert.deepEqual(board.unplacedGuests.map((guest) => guest.guestId), ["g2"]);
  assert.equal(db.data["programHotelRoomViews/p9__h9"], undefined);
  assert.equal(db.data["hostAssignmentViews/desk-1__program_p1"].title, "Sharma-Rao Wedding");
  assert.equal(db.data["hostAssignmentViews/door-1__event_e1"].duties[0].duty, "functionCheckIn");
  assert.equal(db.data["hostAssignmentViews/manager-1__team_o1"].organizerName, "Sharma Weddings");
  assert.equal(db.data["hostAssignmentViews/left-1__team_o1"], undefined);
  assert.equal(db.data["organizerMomentViews/m1"].plan.sentCount, 4);
  assert.equal(db.data["organizerMomentViews/m1"].plan.nextRunAtMillis, 9_000);
  assert.equal(db.data["organizerMomentViews/auto1"], undefined);
  const copied = JSON.stringify(Object.fromEntries(Object.entries(db.data).filter(
    ([key]) => /^(programHotelRoomViews|hostAssignmentViews|organizerMomentViews)\//.test(key))));
  for (const secret of ["9800000000", "9811111111", "9822222222", "777", "mum", "0001"]) {
    assert.equal(copied.includes(secret), false, secret);
  }
  assert.equal(db.data["programStays/s1"].notes, "call mum");
});

test("program-whatsapp-thread-views creates each thread's view once, without phone data", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "program-whatsapp-thread-views");
  const thread = (overrides = {}) => ({threadId: "p1_h1", programId: "p1", organizerId: "o1",
    householdId: "h1", guestId: null, connectionId: "conn-1", endpointHash: "a".repeat(64),
    unknownSender: false, handledBy: "assistant", state: "needsYou", language: null,
    escalationReason: null, lastMessagePreview: "Is there a bus?", lastMessageDirection: "inbound",
    lastMessageAuthor: "guest", lastMessageAtMillis: 10, lastInboundAtMillis: 10,
    lastInboundMessageId: "m1", serviceWindowExpiresAtMillis: 86_400_010, unreadCount: 1,
    messageCount: 1, takenOverByUid: "planner-secret", revision: 2, ...overrides});
  const db = fakeDb({
    "organizerPrograms/p1": {organizerId: "o1", householdSideLabels: {partnerA: "Aditi"}},
    "programHouseholds/h1": {programId: "p1", organizerId: "o1", label: "The Mehra family",
      primaryContactName: "Neha", memberGuestIds: ["g1", "g2"], side: "partnerA"},
    "programWhatsappThreads/p1_h1": thread(),
    "programWhatsappThreads/p1_u-abc": thread({threadId: "p1_u-abc", householdId: null,
      unknownSender: true, handledBy: "planner"}),
    "programWhatsappThreads/p9_h1": thread({threadId: "p9_h1", programId: "p9"}),
    "programWhatsappThreadViews/p1_u-abc": {existing: true},
  });
  const plan = await planMigration(db, migration);
  assert.equal(plan.totals.toCreate, 1);
  await applyMigrationPlan(db, plan);
  const view = db.data["programWhatsappThreadViews/p1_h1"];
  assert.equal(view.displayName, "The Mehra family");
  assert.equal(view.sideLabel, "Aditi");
  assert.equal(view.guestCount, 2);
  assert.equal(db.data["programWhatsappThreadViews/p9_h1"], undefined);
  assert.deepEqual(db.data["programWhatsappThreadViews/p1_u-abc"], {existing: true});
  const copied = JSON.stringify(view);
  for (const secret of ["conn-1", "a".repeat(64), "planner-secret"]) {
    assert.equal(copied.includes(secret), false, secret);
  }
  const again = await planMigration(db, migration);
  assert.equal(again.totals.toCreate, 0);
  assert.equal(again.totals.conflicts, 0);
});

test("program-whatsapp-author-labels fills a planner reply's author name once", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "program-whatsapp-author-labels");
  const message = (overrides = {}) => ({programId: "p1", threadId: "p1_h1", direction: "outbound",
    author: "planner", authorUid: "staff-1", text: "On our way", ...overrides});
  const db = fakeDb({
    "programStaffGrants/p1__staff-1": {programId: "p1", uid: "staff-1", displayName: " Arjun "},
    "programStaffGrants/p1__nameless": {programId: "p1", uid: "nameless", displayName: null},
    "programWhatsappMessages/m1": message(),
    "programWhatsappMessages/m2": message({authorUid: "owner-1"}),
    "programWhatsappMessages/m3": message({authorUid: "nameless"}),
    "programWhatsappMessages/m4": message({author: "assistant", authorUid: null}),
    "programWhatsappMessages/m5": message({direction: "inbound", author: "guest", authorUid: null}),
    "programWhatsappMessages/m6": message({authorLabel: "Existing"}),
    "programWhatsappMessages/m7": message({programId: "p9"}),
  });
  const plan = await planMigration(db, migration);
  assert.equal(plan.totals.conflicts, 0);
  await applyMigrationPlan(db, plan);
  assert.equal(db.data["programWhatsappMessages/m1"].authorLabel, "Arjun");
  for (const id of ["m2", "m3", "m4", "m5", "m7"]) {
    assert.equal(db.data[`programWhatsappMessages/${id}`].authorLabel, undefined, id);
  }
  assert.equal(db.data["programWhatsappMessages/m6"].authorLabel, "Existing");
  assert.equal(db.data["programWhatsappMessages/m1"].text, "On our way");
  const again = await planMigration(db, migration);
  assert.equal(again.steps[0].toFill.length, 0);
  assert.equal(again.totals.conflicts, 0);
});

test("organizer-program-views creates each programme's setup view once", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "organizer-program-views");
  const at = (millis) => ({toMillis: () => millis, seconds: Math.floor(millis / 1000), nanoseconds: 0});
  const db = fakeDb({
    "organizerPrograms/p1": {organizerId: "o1", createdBy: "u1", kind: "wedding", title: "Wedding",
      timezone: "Asia/Kolkata", status: "active", startsAt: at(1_000), endsAt: at(2_000),
      capabilities: [], transportSettings: {bandWindowMillis: 1, maxReadyWaitMillis: 1,
        domesticExitLagMillis: 1, internationalExitLagMillis: 1, vehicleClasses: []},
      whatsappSenderConnectionId: "conn-secret", revision: 3},
    "organizerPrograms/p2": {organizerId: "o1", createdBy: "u1", kind: "wedding", title: "Done",
      timezone: "Asia/Kolkata", status: "active", startsAt: at(1_000), endsAt: at(2_000),
      capabilities: [], transportSettings: {}, revision: 1},
    "organizerProgramViews/p2": {existing: true},
    "programFunctions/f1": {programId: "p1", organizerId: "o1", name: "Sangeet",
      startsAt: at(1_500), endsAt: at(1_600), venueName: "Lawns", status: "scheduled",
      expectedCount: 99, checkedInCount: 7, revision: 2},
    "programHotels/h1": {programId: "p1", organizerId: "o1", name: "The Grand", address: "Road 1",
      receptionContact: "+910000000", active: true, revision: 1},
  });
  const plan = await planMigration(db, migration);
  assert.equal(plan.totals.toCreate, 1);
  await applyMigrationPlan(db, plan);
  const view = db.data["organizerProgramViews/p1"];
  assert.equal(view.functionCount, 1);
  assert.equal(view.functions[0].invitationMode, "allGuests");
  assert.equal(view.hotels[0].name, "The Grand");
  assert.equal(JSON.stringify(view).includes("conn-secret"), false);
  assert.equal("expectedCount" in view.functions[0], false);
  assert.deepEqual(db.data["organizerProgramViews/p2"], {existing: true});
  assert.equal(db.data["organizerPrograms/p1"].whatsappSenderConnectionId, "conn-secret");
  const again = await planMigration(db, migration);
  assert.equal(again.totals.toCreate, 0);
  assert.equal(again.totals.conflicts, 0);
});

test("program-arrival-views creates arrivals, departures and vendor views once, without phone numbers", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "program-arrival-views");
  const at = (millis) => ({toMillis: () => millis, seconds: Math.floor(millis / 1000), nanoseconds: 0});
  const leg = (overrides = {}) => ({programId: "p1", organizerId: "o1", guestId: "g1", partyId: null,
    kind: "inbound", flightNumber: "AI1", originIata: "BOM", flightStatus: "scheduled",
    scheduledArrivalAt: at(5_000_000), readiness: "expected", pickupPointId: "pp1",
    destinationHotelId: "h1", destinationLabel: null, passengers: 2, luggageUnits: 1,
    requiredCapabilities: [], dedicatedVehicle: false, revision: 1, international: false,
    claimedByUid: null, ...overrides});
  const db = fakeDb({
    "organizerPrograms/p1": {organizerId: "o1", transportSettings: {bandWindowMillis: 1,
      maxReadyWaitMillis: 1, domesticExitLagMillis: 1_800_000, internationalExitLagMillis: 3_600_000,
      vehicleClasses: []}},
    "programGuests/g1": {programId: "p1", organizerId: "o1", displayName: "Rohan", phoneE164: "+919900000000"},
    "programHotels/h1": {programId: "p1", organizerId: "o1", name: "The Grand", receptionContact: "+919911111111"},
    "programTravelLegs/in1": leg(),
    "programTravelLegs/in2": leg({readiness: "dispatched"}),
    "programTravelLegs/out1": leg({kind: "outbound", pickupPointId: "pp1"}),
    "programStays/s1": {programId: "p1", organizerId: "o1", guestId: "g1", hotelId: "h1",
      roomLabel: "412", status: "checkedIn", endsAt: at(9_000_000)},
    "transportVendors/v1": {organizerId: "o1", name: "City Cabs", phoneE164: "+919922222222",
      programIds: ["p1", "p2"], active: true},
  });
  const plan = await planMigration(db, migration);
  // One arrivals row (the dispatched journey is off the roster), one
  // departures row and two vendor views.
  assert.equal(plan.totals.toCreate, 1 + 1 + 2);
  await applyMigrationPlan(db, plan);
  assert.equal(db.data["programArrivalViews/in1"].guestDisplayName, "Rohan");
  assert.equal(db.data["programArrivalViews/in1"].destinationLabel, "The Grand");
  assert.equal(db.data["programArrivalViews/in2"], undefined);
  assert.equal(db.data["programDepartureViews/out1"].roomLabel, "412");
  assert.equal(db.data["programVendorViews/p1__v1"].name, "City Cabs");
  assert.equal(db.data["programVendorViews/p2__v1"].programId, "p2");
  const copied = JSON.stringify(Object.fromEntries(Object.entries(db.data).filter(
    ([key]) => /^program(Arrival|Departure|Vendor)Views\//.test(key))));
  for (const secret of ["9900000000", "9911111111", "9922222222"]) {
    assert.equal(copied.includes(secret), false, secret);
  }
  assert.equal(db.data["transportVendors/v1"].phoneE164, "+919922222222");
  const again = await planMigration(db, migration);
  assert.equal(again.totals.toCreate, 0);
  assert.equal(again.totals.conflicts, 0);
});

test("program-access-views creates each owner and staff view once", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "program-access-views");
  const at = (millis) => ({toMillis: () => millis, seconds: Math.floor(millis / 1000), nanoseconds: 0});
  const later = Math.floor((Date.now() + 86_400_000) / 1000) * 1000;
  const grant = (uid, overrides = {}) => ({organizerId: "o1", programId: "p1", uid,
    displayName: "Arjun", phoneLastFour: "0001", status: "active", createdBy: "owner-1",
    duties: [{duty: "hotelDesk", pickupPointIds: [], hotelIds: ["h1"], expiresAtMillis: later}],
    expiresAt: at(later), revokedBy: null, revokedAt: null, revision: 2, ...overrides});
  const db = fakeDb({
    "organizerPrograms/p1": {organizerId: "o1", createdBy: "owner-1", status: "active"},
    "organizerPrograms/p2": {organizerId: "o1", status: "active"},
    "programStaffGrants/p1__desk-1": grant("desk-1"),
    "programStaffGrants/p1__revoked-1": grant("revoked-1", {status: "revoked",
      revokedBy: "owner-1", revokedAt: at(5)}),
    "programStaffGrants/p9__orphan-1": {...grant("orphan-1"), programId: "p9"},
    "programStaffGrants/p1__mismatch": grant("desk-1"),
  });
  const plan = await planMigration(db, migration);
  assert.equal(plan.totals.toCreate, 3);
  await applyMigrationPlan(db, plan);
  assert.equal(db.data["programAccessViews/p1__owner-1"].role, "manager");
  const desk = db.data["programAccessViews/p1__desk-1"];
  assert.equal(desk.status, "active");
  assert.deepEqual(desk.hotelScoped, {"hotelDesk__h1": later});
  assert.deepEqual(desk.workHotel, {h1: later});
  assert.equal(db.data["programAccessViews/p1__revoked-1"].status, "inactive");
  // No identity fields travel, and nothing is created for an orphan grant.
  assert.equal(JSON.stringify(desk).includes("Arjun"), false);
  assert.equal(db.data["programAccessViews/p9__orphan-1"], undefined);
  assert.equal(db.data["programStaffGrants/p1__desk-1"].revision, 2);
  const again = await planMigration(db, migration);
  assert.equal(again.totals.toCreate, 0);
  assert.equal(again.totals.conflicts, 0);
});

test("program-access-views-refresh repairs a stale view once and then writes nothing", async () => {
  const create = MIGRATIONS.find((entry) => entry.name === "program-access-views");
  const refresh = MIGRATIONS.find((entry) => entry.name === "program-access-views-refresh");
  const at = (millis) => ({toMillis: () => millis, seconds: Math.floor(millis / 1000), nanoseconds: 0});
  const later = Math.floor((Date.now() + 86_400_000) / 1000) * 1000;
  const db = fakeDb({
    "organizerPrograms/p1": {organizerId: "o1", createdBy: "owner-1", status: "active"},
    "programStaffGrants/p1__desk-1": {organizerId: "o1", programId: "p1", uid: "desk-1",
      displayName: "Arjun", phoneLastFour: "0001", status: "active", createdBy: "owner-1",
      duties: [{duty: "hotelDesk", pickupPointIds: [], hotelIds: ["h1"], expiresAtMillis: later}],
      expiresAt: at(later), revokedBy: null, revokedAt: null, revision: 2},
  });
  await applyMigrationPlan(db, await planMigration(db, create));
  // A view an earlier trigger wrote without assignments and the grant expiry.
  const current = {...db.data["programAccessViews/p1__desk-1"]};
  const stale = {...current};
  delete stale.assignments;
  delete stale.grantExpiresAtMillis;
  db.data["programAccessViews/p1__desk-1"] = stale;
  // Creating never conflicts with an existing view, stale or not.
  const plan = await planMigration(db, create);
  assert.equal(plan.totals.conflicts, 0);
  assert.equal(plan.totals.toCreate, 0);

  const dry = await planMigration(db, refresh);
  assert.equal(dry.totals.toCreate, 1, "one stale view to rewrite");
  await applyMigrationPlan(db, dry);
  assert.deepEqual(db.data["programAccessViews/p1__desk-1"], current);
  assert.equal(db.data["programStaffGrants/p1__desk-1"].revision, 2);
  const again = await planMigration(db, refresh);
  assert.equal(again.totals.toCreate, 0, "a rerun writes nothing");
  assert.equal(again.totals.conflicts, 0);
});

test("program-access-views-organizer-managers adds manager views and the flag once", async () => {
  const create = MIGRATIONS.find((entry) => entry.name === "program-access-views");
  const managers = MIGRATIONS.find((entry) =>
    entry.name === "program-access-views-organizer-managers");
  const at = (millis) => ({toMillis: () => millis, seconds: Math.floor(millis / 1000), nanoseconds: 0});
  const later = Math.floor((Date.now() + 86_400_000) / 1000) * 1000;
  const db = fakeDb({
    "organizers/o1": {hostUserId: "owner-1", ownerUserId: "owner-1",
      hostUserIds: ["owner-1", "host-2", "desk-1"], hostProfiles: []},
    "organizers/o2": {hostUserId: "other-1", hostUserIds: ["other-1"], hostProfiles: []},
    "organizerPrograms/p1": {organizerId: "o1", createdBy: "owner-1", status: "active"},
    "organizerPrograms/p2": {organizerId: "o1", createdBy: "host-2", status: "active"},
    "organizerPrograms/p3": {organizerId: "o2", createdBy: "other-1", status: "active"},
    "programStaffGrants/p1__desk-1": {organizerId: "o1", programId: "p1", uid: "desk-1",
      displayName: "Arjun", phoneLastFour: "0001", status: "active", createdBy: "owner-1",
      duties: [{duty: "hotelDesk", pickupPointIds: [], hotelIds: ["h1"], expiresAtMillis: later}],
      expiresAt: at(later), revokedBy: null, revokedAt: null, revision: 2},
  });
  // Views the triggers wrote before the flag existed.
  await applyMigrationPlan(db, await planMigration(db, create));
  for (const id of ["p1__owner-1", "p1__desk-1", "p2__host-2", "p3__other-1"]) {
    delete db.data[`programAccessViews/${id}`].organizerManager;
  }
  const plan = await planMigration(db, managers);
  // p1: host-2 (desk-1 already has a staff view); p2: owner-1 and desk-1.
  assert.equal(plan.steps[0].toCreate.length, 3);
  // Every existing view gains the flag.
  assert.equal(plan.steps[1].toFill.length, 4);
  await applyMigrationPlan(db, plan);
  const setupOnly = db.data["programAccessViews/p1__host-2"];
  assert.equal(setupOnly.organizerManager, true);
  assert.equal(setupOnly.status, "inactive");
  assert.deepEqual(setupOnly.duties, {});
  assert.equal(db.data["programAccessViews/p2__owner-1"].organizerManager, true);
  const desk = db.data["programAccessViews/p1__desk-1"];
  assert.equal(desk.organizerManager, true);
  assert.equal(desk.status, "active");
  assert.deepEqual(desk.hotelScoped, {"hotelDesk__h1": later});
  assert.equal(db.data["programAccessViews/p1__owner-1"].role, "manager");
  assert.equal(db.data["programAccessViews/p1__owner-1"].organizerManager, true);
  // Another organizer's managers get nothing on this organizer's programmes.
  assert.equal(db.data["programAccessViews/p1__other-1"], undefined);
  assert.equal(db.data["programAccessViews/p3__other-1"].organizerManager, true);
  assert.equal(db.data["organizers/o1"].hostUserIds.length, 3);
  const again = await planMigration(db, managers);
  assert.equal(again.totals.toCreate, 0, "a rerun writes nothing");
  assert.equal(again.totals.conflicts, 0);
});

test("program-door-views creates headers, roster rows and journal views once, without contacts", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "program-door-views");
  const at = (millis) => ({toMillis: () => millis, seconds: Math.floor(millis / 1000), nanoseconds: 0});
  const fn = (overrides = {}) => ({programId: "p1", organizerId: "o1", name: "Sangeet",
    venueName: "Lawn", venueNotes: "ring Ravi", startsAt: at(1000), endsAt: at(5000),
    status: "scheduled", ...overrides});
  const guest = (name, overrides = {}) => ({programId: "p1", organizerId: "o1",
    displayName: name, householdId: null, phoneE164: "+919900000000", email: "private-email-marker",
    ...overrides});
  const db = fakeDb({
    "programFunctions/f1": fn(),
    "programFunctions/f2": fn({name: "Wedding", invitationMode: "selectedGuests"}),
    "programHouseholds/hh1": {programId: "p1", label: "Sharma"},
    "programGuests/g1": guest("Rohan", {householdId: "hh1"}),
    "programGuests/g2": guest("Meera"),
    "programFunctionGuests/f2_g1": {programId: "p1", functionId: "f2", guestId: "g1",
      invited: true, rsvpStatus: "attending", attendanceStatus: "expected", partySize: 2},
    "programDoorJournal/j1": {programId: "p1", organizerId: "o1", functionId: "f1",
      guestId: "g1", actorUid: "staff-1", action: "checkIn", occurredAtMillis: 9, partySize: 1},
    "programStaffGrants/p1__staff-1": {displayName: "Arjun"},
  });
  const plan = await planMigration(db, migration);
  // 2 headers, f1 lists both guests, f2 lists only its join row, 1 journal view.
  assert.equal(plan.totals.toCreate, 2 + 3 + 1);
  await applyMigrationPlan(db, plan);
  assert.equal(db.data["programDoorFunctions/f1"].venueNotes, "ring Ravi");
  assert.equal(db.data["programDoorRows/f1__g1"].householdLabel, "Sharma");
  assert.equal(db.data["programDoorRows/f2__g1"].partySize, 2);
  assert.equal(db.data["programDoorRows/f2__g2"], undefined);
  assert.equal(db.data["programDoorJournalViews/j1"].actorLabel, "Arjun");
  const copied = JSON.stringify(Object.fromEntries(Object.entries(db.data).filter(
    ([key]) => key.startsWith("programDoor") && !key.startsWith("programDoorJournal/"))));
  for (const secret of ["9900000000", "private-email-marker", "staff-1"]) {
    assert.equal(copied.includes(secret), false, secret);
  }
  assert.equal(db.data["programGuests/g1"].phoneE164, "+919900000000");
  const again = await planMigration(db, migration);
  assert.equal(again.totals.toCreate, 0);
  assert.equal(again.totals.conflicts, 0);
});

test("program-setting-views creates each programme's sender and settings views once, nothing secret", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "program-setting-views");
  const at = (millis) => ({toMillis: () => millis, seconds: Math.floor(millis / 1000), nanoseconds: 0});
  const later = Math.floor((Date.now() + 86_400_000) / 1000) * 1000;
  const db = fakeDb({
    "organizerPrograms/p1": {organizerId: "o1", createdBy: "owner-1", status: "active",
      whatsappSenderConnectionId: "conn-1"},
    "organizerPrograms/p2": {organizerId: "o1", createdBy: "owner-1", status: "active"},
    "organizerSenderConnections/conn-1": {organizerId: "o1", channel: "whatsapp",
      provider: "metaCloudApi", status: "active", wabaId: "1111", phoneNumberId: "2222",
      secretVersionResource: "projects/p/secrets/s/versions/1",
      displayPhoneNumber: "+91 98765 00000", verifiedName: "Aditi & Kabir"},
    "programAssistantSettings/p1": {programId: "p1", organizerId: "o1", enabled: true,
      languages: ["hi"], replyWithin: "hour", escalationStaffUids: [], neverDoes: [],
      tone: "warm", dailyTokenBudget: 1000, answerTopics: [], attachmentReads: [],
      updatedByUid: "owner-1", updatedAtMillis: 5, revision: 3,
      lastRequestId: "req-1", lastRequestHash: "hash-marker"},
    "programStaffGrants/p1__desk-1": {programId: "p1", organizerId: "o1", uid: "desk-1",
      displayName: "Arjun", phoneLastFour: "0001", status: "active",
      expiresAt: at(later), revokedAt: null},
  });
  const plan = await planMigration(db, migration);
  assert.equal(plan.totals.toCreate, 4);
  await applyMigrationPlan(db, plan);
  assert.equal(db.data["programSenderViews/p1"].sender.boundToProgramme, true);
  assert.equal(db.data["programSenderViews/p2"].sender.boundToProgramme, false);
  assert.equal(db.data["programSenderViews/p2"].organizerActiveConnectionId, "conn-1");
  assert.equal(db.data["programAssistantSettingViews/p1"].revision, 3);
  assert.deepEqual(db.data["programAssistantSettingViews/p1"].staff,
    [{uid: "desk-1", displayName: "Arjun", expiresAtMillis: later}]);
  assert.equal(db.data["programAssistantSettingViews/p2"].usesDefaults, true);
  const copied = JSON.stringify(Object.fromEntries(Object.entries(db.data).filter(
    ([key]) => key.startsWith("programSenderViews/") ||
      key.startsWith("programAssistantSettingViews/"))));
  for (const secret of ["1111", "2222", "projects/p/secrets", "hash-marker", "req-1", "0001"]) {
    assert.equal(copied.includes(secret), false, secret);
  }
  const again = await planMigration(db, migration);
  assert.equal(again.totals.toCreate, 0);
  assert.equal(again.totals.conflicts, 0);
});

test("program-live-board-views creates each alert and count once, one per run and duty", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "program-live-board-views");
  const at = (millis) => ({toMillis: () => millis, seconds: Math.floor(millis / 1000), nanoseconds: 0});
  const now = Date.now();
  const send = (overrides = {}) => ({runId: "run-1", momentId: "m1", scopeKind: "program",
    scopeId: "p1", organizerId: "o1", actionKind: "staffAttention", duty: "functionLead",
    severity: "warning", title: "Late", createdAtMillis: now - 1000, ...overrides});
  const leg = (overrides = {}) => ({kind: "inbound", programId: "p1", organizerId: "o1",
    flightNumber: "AI1", flightStatus: "scheduled", readiness: "expected",
    updatedAt: at(now), ...overrides});
  const db = fakeDb({
    "organizerPrograms/p1": {organizerId: "o1"},
    "organizerMomentSends/s1": send(),
    "organizerMomentSends/s2": send({createdAtMillis: now - 500}),
    "organizerMomentSends/s3": send({actionKind: "other"}),
    "organizerMomentSends/old": send({runId: "run-0", createdAtMillis: now - 90_000_000}),
    "programTravelLegs/l1": leg({flightStatus: "cancelled"}),
    "programTravelLegs/l2": leg({readiness: "disrupted"}),
    "programTravelLegs/l3": leg(),
    "programAlerts/p1_run-1_functionLead": {programId: "p1", alertId: "run-1_functionLead",
      state: "done", assigneeUid: "u1", assigneeName: "Dev", revision: 2},
  });
  const plan = await planMigration(db, migration);
  assert.equal(plan.totals.toCreate, 1 + 2 + 1);
  await applyMigrationPlan(db, plan);
  const alert = db.data["programAlertViews/p1_run-1_functionLead"];
  assert.equal(alert.createdAtMillis, now - 1000);
  assert.equal(alert.state, "done");
  assert.equal(alert.assigneeName, "Dev");
  assert.equal(db.data["programAlertViews/p1_flight_l1"].duty, null);
  assert.equal(db.data["programAlertViews/p1_readiness_l2"].source, "readiness");
  assert.deepEqual(db.data["programTravelCountViews/p1"],
    {programId: "p1", organizerId: "o1", expected: 2, atCurb: 0, disrupted: 1, version: 1});
  assert.equal(db.data["organizerMomentSends/s1"].title, "Late");
  const again = await planMigration(db, migration);
  assert.equal(again.totals.toCreate, 0);
  assert.equal(again.totals.conflicts, 0);
});

test("host-whatsapp-thread-views creates each retained thread's view once", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "host-whatsapp-thread-views");
  const at = (millis) => ({toMillis: () => millis});
  const later = Date.now() + 86_400_000;
  const {organizerWhatsappThreadId} = createFunctionsRequire()(
    "./lib/organizers/organizerWhatsappThreads.js");
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

test("host-organizer-bill-views creates the owner's view of each sent bill once", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "host-organizer-bill-views");
  const bill = (billId, status) => ({schemaVersion: 1, billId, organizerId: "o1",
    organizerName: "Lantern Lane", month: "2026-10", periodStartMillis: 1,
    periodEndMillis: 2, revision: 1, status,
    sales: {paymentCount: 1, eventCount: 1, grossMinor: 100, refundedMinor: 0,
      baseMinor: 100, providerFeeMinor: 2, providerTaxMinor: 0, unsnapshottedCount: 0},
    commission: {rateBasisPoints: 500, uncappedMinor: 5, capMinor: null, capped: false,
      trialWaivedMinor: 0, amountMinor: 5},
    gst: {registered: false, rateBasisPoints: 0, amountMinor: 0}, totalMinor: 5,
    invoiceNumber: null, dueAtMillis: null,
    paymentLink: {linkId: "plink_1", url: "https://pay.example.test/1"},
    reminders: [{atMillis: 3, byUid: "staff"}], paidAtMillis: null, paidMinor: null,
    history: []});
  const db = fakeDb({
    "organizerBills/o1_2026-10": bill("o1_2026-10", "sent"),
    "organizerBills/o1_2026-11": bill("o1_2026-11", "toSend"),
  });
  const plan = await planMigration(db, migration);
  assert.deepEqual(plan.totals, {scanned: 2, toCreate: 1, alreadyCopied: 0, conflicts: 0,
    skipped: 1});
  await applyMigrationPlan(db, plan);
  const view = db.data["hostOrganizerBillViews/o1_2026-10"];
  assert.equal(view.organizerId, "o1");
  assert.equal(view.bill.paymentUrl, "https://pay.example.test/1");
  assert.ok(!JSON.stringify(view).includes("staff"));
  assert.equal(db.data["hostOrganizerBillViews/o1_2026-11"], undefined);
  assert.equal((await planMigration(db, migration)).totals.toCreate, 0);
});

test("host-organizer-journey-views creates each reader's own journey once", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "host-organizer-journey-views");
  const at = (millis) => ({toMillis: () => millis});
  const db = fakeDb({
    "organizers/o1": {name: "Moonmoth", createdAt: at(100), ownerUserId: "owner",
      hostUserIds: ["owner"]},
    "organizers/o2": {name: "Unclaimed", createdAt: at(100)},
    "organizers/o3": {name: "Nobody", createdAt: at(100)},
    "organizerClaimRequests/c1": {organizerId: "o2", requesterUid: "claimant",
      requesterName: "Hidden name", status: "pending", createdAt: at(200)},
    "supplyIntakeRequests/i1": {request: {kind: "organizer_nomination",
      submittedAt: at(50), submittedBy: {uid: "nominator"},
      seed: {urls: ["https://example.test/moonmoth"]}},
    approval: {organizerId: "o1", approvedAt: at(60), approvedByUid: "staff"}},
  });
  const plan = await planMigration(db, migration);
  assert.deepEqual(plan.totals, {scanned: 3, toCreate: 2, alreadyCopied: 0, conflicts: 0,
    skipped: 1});
  await applyMigrationPlan(db, plan);
  const owner = db.data["hostOrganizerJourneyViews/o1_owner"];
  assert.equal(owner.uid, "owner");
  assert.deepEqual(owner.journey.steps.map((step) => step.kind), ["nominated", "listed"]);
  const claimant = db.data["hostOrganizerJourneyViews/o2_claimant"];
  assert.equal(claimant.waitingClaim, true);
  assert.ok(!JSON.stringify(db.data["hostOrganizerJourneyViews/o2_claimant"])
    .includes("Hidden name"));
  assert.equal((await planMigration(db, migration)).totals.toCreate, 0);
});

test("host-form-automation-views creates rule and run views once, without secrets or leases", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "host-form-automation-views");
  const at = (millis) => ({toMillis: () => millis});
  const db = fakeDb({
    "organizerFormAutomationRules/r1": {organizerId: "o1", formId: "f1",
      name: "Welcome note", enabled: true, revision: 2, trigger: "responseSubmitted",
      triggerEventId: null, delayMinutes: 0, condition: null, updatedAt: at(4),
      actions: [{actionId: "a1", kind: "signedWebhook", tagId: null, eventId: null,
        webhookUrl: "https://hooks.example.com/x", webhookSecret: "whsec-private",
        channel: null}]},
    "organizerFormAutomationRules/orphan": {name: "No owner"},
    "organizerFormAutomationRuns/run1": {organizerId: "o1", formId: "f1",
      ruleId: "r1", ruleRevision: 2, responseId: "resp1", eventKind: "submitted",
      status: "running", attemptCount: 1, actionResults: [], errorCode: null,
      errorMessage: null, createdAt: at(2), updatedAt: at(3), completedAt: null,
      dueAt: null, leaseOwner: "worker-9", leaseExpiresAt: at(9)},
  });
  const plan = await planMigration(db, migration);
  assert.deepEqual(plan.totals, {scanned: 3, toCreate: 2, alreadyCopied: 0, conflicts: 0, skipped: 1});
  await applyMigrationPlan(db, plan);
  const rule = db.data["hostFormAutomationRuleViews/r1"];
  assert.equal(rule.row.actions[0].webhookSecretConfigured, true);
  assert.equal(JSON.stringify(rule).includes("whsec"), false);
  const run = db.data["hostFormAutomationRunViews/run1"];
  assert.equal(run.ruleName, "Welcome note");
  assert.equal(run.createdAtMillis, 2);
  assert.equal(JSON.stringify(run).includes("worker-9"), false);
  // Sources are untouched and a second run is a no-op.
  assert.equal(db.data["organizerFormAutomationRules/r1"].actions[0].webhookSecret, "whsec-private");
  assert.equal((await planMigration(db, migration)).totals.toCreate, 0);
});

test("host-form-payment-views creates each form fee's view once, without the guest", async () => {
  const migration = MIGRATIONS.find((entry) => entry.name === "host-form-payment-views");
  const at = (millis) => ({toMillis: () => millis});
  const id = `fp_${"c".repeat(32)}`;
  const db = fakeDb({
    [`guestPayments/${id}`]: {purpose: "form", organizerId: "o1", formId: "f1",
      respondentUid: "guest-1", identity: {name: "Asha Rao", email: "asha@example.com"},
      accountId: "acc_private", mode: "test", amountPaise: 20_000, currency: "INR",
      refundedAmountPaise: 0, status: "checkoutReady", receipt: "rcpt_9",
      providerOrderId: "order_9", providerPaymentId: null, providerRefundId: null,
      responseId: null, createdAt: at(5), updatedAt: at(6), capturedAt: null,
      submittedAt: null},
    "guestPayments/pay_booking": {purpose: "booking", userId: "guest-1"},
  });
  const plan = await planMigration(db, migration);
  assert.deepEqual(plan.totals, {scanned: 2, toCreate: 1, alreadyCopied: 0, conflicts: 0, skipped: 1});
  await applyMigrationPlan(db, plan);
  const view = db.data[`hostFormPaymentViews/${id}`];
  assert.deepEqual({organizerId: view.organizerId, formId: view.formId,
    status: view.status, createdAtMillis: view.createdAtMillis, version: view.version},
  {organizerId: "o1", formId: "f1", status: "checkoutReady", createdAtMillis: 5, version: 1});
  assert.equal(view.row.receipt, "rcpt_9");
  for (const secret of ["Asha", "asha@", "acc_private", "guest-1"]) {
    assert.equal(JSON.stringify(view).includes(secret), false, secret);
  }
  assert.equal(db.data["hostFormPaymentViews/pay_booking"], undefined);
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
          .filter((doc) => filters.every(([field, value]) => field.split(".")
            .reduce((item, key) => item?.[key], doc.data()) === value))
          .slice(0, limit ?? Infinity);
        return {docs, empty: docs.length === 0};
      },
    });
    return {...query(undefined, undefined), doc: (id) => docRef(`${name}/${id}`)};
  }
  return db;
}
