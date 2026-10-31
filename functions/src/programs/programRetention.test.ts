import {seedWorkspaceFieldAssertions} from
  "../workspaces/workspaceFieldFixture";
import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {baseSeed, deps as fixtureDeps, request, now} from
  "../shared/testing/programFixtures";
import {FakeFirestore, type FakeData} from
  "../shared/testing/programFirestore";
import {
  archiveGraceMillis,
  archiveProgramHandler,
  anonymizeDuePrograms,
  anonymizeProgram,
  unarchiveProgramHandler,
  type RetentionDeps,
} from "./programRetention";
import {updateOrganizerProgramHandler} from "./programs";
import {listProgramGuestsHandler, upsertProgramGuestHandler} from
  "./programGuests";
import {getProgramAttendanceReportHandler} from "./attendanceReportView";
import {validateProgramGuestDocument} from
  "../shared/generated/validators/programGuestDocument";
import {contractValidator} from "../shared/contractTestValidators";

const validateProgramHouseholdDocument =
  contractValidator("ProgramHouseholdDocument");
const validateProgramStaffGrantDocument =
  contractValidator("ProgramStaffGrantDocument");
const validateProgramStaffInviteDocument =
  contractValidator("ProgramStaffInviteDocument");
const validateProgramFunctionGuestDocument =
  contractValidator("ProgramFunctionGuestDocument");
const validateProgramStayDocument = contractValidator("ProgramStayDocument");
const validateProgramDoorJournalDocument =
  contractValidator("ProgramDoorJournalDocument");
const validateProgramTravelLegDocument =
  contractValidator("ProgramTravelLegDocument");
const validateOrganizerProgramDocument =
  contractValidator("OrganizerProgramDocument");
const validateProgramRetentionRunDocument =
  contractValidator("ProgramRetentionRunDocument");
const validateProgramGuestGroupDocument =
  contractValidator("ProgramGuestGroupDocument");
const validateProgramTravelPartyDocument =
  contractValidator("ProgramTravelPartyDocument");
const validateProgramHotelDocument = contractValidator("ProgramHotelDocument");
const validateProgramRoomBlockDocument =
  contractValidator("ProgramRoomBlockDocument");
const validateProgramFunctionDocument =
  contractValidator("ProgramFunctionDocument");
const validateTransportTripDocument =
  contractValidator("TransportTripDocument");

const T0 = 1_800_000_000_000;
const T_GRACE = T0 + archiveGraceMillis;

function retentionDeps(
  db: FakeFirestore,
  overrides: Partial<RetentionDeps> = {},
): RetentionDeps {
  return {
    ...(fixtureDeps(db) as Record<string, unknown>),
    loadFlightApiKey: async () => "flight-key",
    deleteFlightSubscription: async () => undefined,
    ...overrides,
  } as RetentionDeps;
}

/** Program fixture exercising every scrubbed collection plus the CRM link
 *  that must survive. */
function retentionSeed(): Record<string, FakeData> {
  const seed = baseSeed();
  const stamp = admin.firestore.Timestamp.fromMillis;
  seed["organizerContacts/contact-1"] = {
    organizerId: "org-1",
    displayName: "Nisha Rao",
    phoneE164: "+919800000001",
    createdAt: now,
    updatedAt: now,
    revision: 1,
  };
  seed["programGuests/guest-1"] = {
    ...seed["programGuests/guest-1"]!,
    householdId: "house-1",
    contactId: "contact-1",
    email: "rohan@example.com",
    externalReference: "row-17",
    groupIds: [],
    rsvpStatus: "attending",
  };
  seed["programGuests/guest-2"] = {
    ...seed["programGuests/guest-2"]!, householdId: "house-1", groupIds: [],
    rsvpStatus: "attending",
  };
  seed["programHouseholds/house-1"] = {
    programId: "program-1",
    organizerId: "org-1",
    label: "The Sharma family",
    primaryContactName: "Nisha Rao",
    primaryPhoneE164: "+919800000001",
    primaryEmail: "nisha@example.com",
    memberGuestIds: ["guest-1", "guest-2"],
    deliveryPreference: "whatsapp",
    createdAt: now,
    updatedAt: now,
    revision: 1,
  };
  seed["programFunctions/fn-1"] = {
    programId: "program-1",
    organizerId: "org-1",
    name: "Sangeet",
    startsAt: stamp(T0 + 60_000),
    endsAt: stamp(T0 + 3_600_000),
    venueName: "Grand Ballroom",
    venueNotes: "Ask for Meera at the service gate",
    dressCode: "Festive",
    instructions: null,
    invitationMode: "allGuests",
    checkInEnabled: true,
    expectedCount: 2,
    checkedInCount: 1,
    status: "scheduled",
    createdAt: now,
    updatedAt: now,
    revision: 1,
  };
  seed["programFunctionGuests/fg-1"] = {
    programId: "program-1",
    organizerId: "org-1",
    functionId: "fn-1",
    guestId: "guest-1",
    invited: true,
    rsvpStatus: "attending",
    attendanceStatus: "checkedIn",
    partySize: 2,
    respondedAt: now,
    responseNote: "Vegetarian, needs wheelchair access",
    responseSource: "staff",
    recordedByUid: "manager-1",
    createdAt: now,
    updatedAt: now,
    revision: 1,
  };
  seed["programStays/stay-1"] = {
    programId: "program-1",
    organizerId: "org-1",
    guestId: "guest-1",
    hotelId: "hotel-1",
    roomBlockId: "block-1",
    roomLabel: "1204",
    startsAt: stamp(T0),
    endsAt: stamp(T0 + 172_800_000),
    status: "checkedIn",
    roomReadyAt: stamp(T0 + 30_000),
    hotelArrivedAt: stamp(T0 + 45_000),
    notes: "Allergy: nuts. Late checkout approved by Vikram.",
    source: "planner",
    createdAt: now,
    updatedAt: now,
    revision: 1,
  };
  seed["programDoorJournal/dj-1"] = {
    programId: "program-1",
    organizerId: "org-1",
    functionId: "fn-1",
    guestId: "guest-1",
    actorUid: "greeter-1",
    action: "checkIn",
    occurredAtMillis: T0 + 120_000,
    deviceId: "gate-a",
    partySize: 2,
    note: "Arrived with cousin who is not on the list",
    createdAt: now,
    updatedAt: now,
    revision: 1,
  };
  for (const legId of ["leg-1", "leg-2"]) {
    seed[`programTravelLegs/${legId}`] = {
      ...seed[`programTravelLegs/${legId}`]!,
      arrivalTerminal: null,
      flightRefreshedAt: null,
      flightNextRefreshAt: null,
    };
  }
  seed["programTravelLegs/leg-1"] = {
    ...seed["programTravelLegs/leg-1"],
    manualCurbNote: "Guest asked for a quiet pickup",
    flightAlertSubscriptionId: "sub-abc",
    flightAlertFlightNumber: "AI847",
    flightAlertLease: {token: "lease-1", expiresAt: stamp(T0 + 300_000)},
    flightNextRefreshAt: stamp(T0 + 60_000),
  };
  seed["programTravelParties/party-1"] = {
    programId: "program-1",
    organizerId: "org-1",
    label: "Rao family car",
    dedicatedVehicle: false,
    legIds: ["leg-1"],
    createdAt: now,
    updatedAt: now,
    revision: 1,
  };
  seed["programGuestGroups/group-1"] = {
    programId: "program-1",
    organizerId: "org-1",
    dimension: "side",
    label: "Bride's family",
    sortOrder: 0,
    memberCount: 2,
    hotelId: null,
    createdAt: now,
    updatedAt: now,
    revision: 1,
  };
  seed["programHotels/hotel-1"] = {
    ...seed["programHotels/hotel-1"]!,
    receptionContact: "Suresh +91114455",
    notes: "VIP tower; comp breakfast for Rao suite",
  };
  seed["programRoomBlocks/block-1"] = {
    programId: "program-1",
    organizerId: "org-1",
    hotelId: "hotel-1",
    label: "Sharma family block",
    roomType: "deluxe",
    totalRooms: 4,
    assignedCount: 1,
    heldForGroupIds: ["group-1"],
    startsAt: stamp(T0),
    endsAt: stamp(T0 + 172_800_000),
    notes: "Nisha's block",
    createdAt: now,
    updatedAt: now,
    revision: 1,
  };
  seed["transportTrips/trip-1"] = {
    programId: "program-1",
    organizerId: "org-1",
    kind: "guestTransfer",
    pickupPointId: "pp-t3",
    destinationHotelId: "hotel-1",
    destinationLabel: null,
    vehicleClassId: "sedan",
    vendorId: "vendor-1",
    vendorNameSnapshot: "Sharma Cabs",
    plateNormalized: "DL1CA1234",
    plateDisplay: "DL 1C A 1234",
    partyIds: ["party-1"],
    legIds: ["leg-1"],
    passengerCount: 2,
    status: "arrived",
    departedAt: stamp(T0 + 10_000),
    departedByUid: "dispatcher-1",
    arrivedAt: stamp(T0 + 600_000),
    arrivedByUid: "greeter-1",
    voidedByUid: null,
    voidReason: null,
    rateSnapshot: null,
    clientOperationId: "op-dispatch-0001",
    notes: "Guest had extra luggage for Nisha",
    createdAt: now,
    updatedAt: now,
    revision: 1,
  };
  seed["programStaffInvites/inv-pending"] = {
    organizerId: "org-1",
    programId: "program-1",
    phoneE164: "+919811111111",
    displayName: "Pending Helper",
    duties: [{duty: "airportGreeter",
      pickupPointIds: ["pp-t3"], hotelIds: []}],
    status: "pending",
    createdBy: "manager-1",
    createdAt: now,
    expiresAt: stamp(T0 + 3_600_000),
    claimedByUid: null,
    claimedAt: null,
    revokedBy: null,
    revokedAt: null,
    updatedAt: now,
    revision: 1,
  };
  seed["programStaffInvites/inv-claimed"] = {
    organizerId: "org-1",
    programId: "program-1",
    phoneE164: "+919822222222",
    displayName: "Claimed Helper",
    duties: [{duty: "hotelDesk",
      pickupPointIds: [], hotelIds: ["hotel-1"]}],
    status: "claimed",
    createdBy: "manager-1",
    createdAt: now,
    expiresAt: stamp(T0 + 3_600_000),
    claimedByUid: "greeter-1",
    claimedAt: now,
    revokedBy: null,
    revokedAt: null,
    updatedAt: now,
    revision: 1,
  };
  return seedWorkspaceFieldAssertions(seed);
}

function archived(db: FakeFirestore) {
  db.updateDoc("organizerPrograms/program-1", {
    status: "archived",
    archivedAt: now,
    archivedFromStatus: "active",
    anonymizeAt: admin.firestore.Timestamp.fromMillis(T_GRACE),
    anonymizedAt: null,
  });
}

test("archiveProgram sets the lifecycle markers and grace deadline",
  async () => {
    const db = new FakeFirestore(retentionSeed());
    const deps = retentionDeps(db);
    const result = await archiveProgramHandler(
      request({programId: "program-1", expectedRevision: 3}, "manager-1"),
      deps);
    assert.equal(result.alreadyApplied, false);
    assert.equal(result.anonymizeAtMillis, T_GRACE);
    const program = db.getDoc("organizerPrograms/program-1")!;
    assert.equal(program.status, "archived");
    assert.equal(program.archivedFromStatus, "active");
    assert.equal(
      (program.archivedAt as {toMillis(): number}).toMillis(), T0);
    assert.equal(
      (program.anonymizeAt as {toMillis(): number}).toMillis(), T_GRACE);
    assert.equal(program.anonymizedAt, null);
    assert.ok(validateOrganizerProgramDocument(program));
  });

test("archiveProgram requires the program creator",
  async () => {
    const db = new FakeFirestore(retentionSeed());
    const deps = retentionDeps(db);
    await assert.rejects(
      archiveProgramHandler(
        request({programId: "program-1", expectedRevision: 3}, "greeter-1"),
        deps),
      (error: unknown) =>
        (error as {code?: string}).code === "permission-denied");
  });

for (const actor of ["organizer-only", "program-admin"]) {
  test(`lifecycle ownership is not delegated to ${actor}`, async () => {
    const db = new FakeFirestore(retentionSeed());
    db.updateDoc("organizers/org-1", {ownerUserId: "organizer-only"});
    db.setDoc("programStaffGrants/program-1__program-admin", {
      ...db.getDoc("programStaffGrants/program-1__greeter-1"),
      uid: "program-admin", duties: [{duty: "programAdmin",
        pickupPointIds: [], hotelIds: [], expiresAtMillis: T0 + 60_000}],
    });
    for (const restore of [false, true]) {
      if (restore) archived(db);
      const before = db.getDoc("organizerPrograms/program-1");
      const handler = restore ? unarchiveProgramHandler : archiveProgramHandler;
      await assert.rejects(handler(request({programId: "program-1",
        expectedRevision: 3}, actor), retentionDeps(db)), (error: unknown) =>
        (error as {code?: string}).code === "permission-denied");
      assert.deepEqual(db.getDoc("organizerPrograms/program-1"), before);
    }
  });
}

test("creator can archive and restore after losing organizer membership",
  async () => {
    const db = new FakeFirestore(retentionSeed());
    db.updateDoc("organizers/org-1", {ownerUserId: "other", hostUserId: "other",
      hostUserIds: [], hostProfiles: []});
    const archived = await archiveProgramHandler(request({
      programId: "program-1", expectedRevision: 3,
    }, "manager-1"), retentionDeps(db));
    const restored = await unarchiveProgramHandler(request({
      programId: "program-1", expectedRevision: archived.revision,
    }, "manager-1"), retentionDeps(db));
    assert.equal(restored.restoredStatus, "active");
  });

test("deleted accounts cannot archive or unarchive programs", async () => {
  const archiveDb = new FakeFirestore(retentionSeed());
  archiveDb.setDoc("deletedUsers/manager-1", {status: "processing"});
  const archiveBefore = new Map(archiveDb.docs);
  await assert.rejects(
    archiveProgramHandler(
      request({programId: "program-1", expectedRevision: 3}, "manager-1"),
      retentionDeps(archiveDb)
    ),
    (error: unknown) =>
      (error as {code?: string}).code === "permission-denied"
  );
  assert.deepEqual(archiveDb.docs, archiveBefore);

  const unarchiveDb = new FakeFirestore(retentionSeed());
  archived(unarchiveDb);
  unarchiveDb.setDoc("deletedUsers/manager-1", {status: "processing"});
  const unarchiveBefore = new Map(unarchiveDb.docs);
  await assert.rejects(
    unarchiveProgramHandler(
      request({programId: "program-1", expectedRevision: 3}, "manager-1"),
      retentionDeps(unarchiveDb)
    ),
    (error: unknown) =>
      (error as {code?: string}).code === "permission-denied"
  );
  assert.deepEqual(unarchiveDb.docs, unarchiveBefore);
});

test("archiveProgram fences on revision and replays idempotently",
  async () => {
    const db = new FakeFirestore(retentionSeed());
    const deps = retentionDeps(db);
    await assert.rejects(
      archiveProgramHandler(
        request({programId: "program-1", expectedRevision: 99}, "manager-1"),
        deps),
      (error: unknown) => (error as {code?: string}).code === "aborted");
    const first = await archiveProgramHandler(
      request({programId: "program-1", expectedRevision: 3}, "manager-1"),
      deps);
    const program = db.getDoc("organizerPrograms/program-1")!;
    const replay = await archiveProgramHandler(
      request({programId: "program-1", expectedRevision: program.revision},
        "manager-1"),
      deps);
    assert.equal(replay.alreadyApplied, true);
    assert.equal(replay.anonymizeAtMillis, first.anonymizeAtMillis);
  });

test("updateOrganizerProgram cannot enter or leave archived", async () => {
  const db = new FakeFirestore(retentionSeed());
  const deps = retentionDeps(db);
  await assert.rejects(
    updateOrganizerProgramHandler(
      request({programId: "program-1", expectedRevision: 3,
        status: "archived"}, "manager-1"),
      deps as never),
    (error: unknown) =>
      (error as {code?: string}).code === "failed-precondition");
  archived(db);
  const program = db.getDoc("organizerPrograms/program-1")!;
  await assert.rejects(
    updateOrganizerProgramHandler(
      request({programId: "program-1",
        expectedRevision: program.revision as number, title: "Renamed"},
      "manager-1"),
      deps as never),
    (error: unknown) =>
      (error as {code?: string}).code === "failed-precondition");
  assert.equal(db.getDoc("organizerPrograms/program-1")!.title,
    "Sharma–Rao Wedding");
});

test("unarchiveProgram restores the pre-archive status inside the window",
  async () => {
    const db = new FakeFirestore(retentionSeed());
    const deps = retentionDeps(db);
    await archiveProgramHandler(
      request({programId: "program-1", expectedRevision: 3}, "manager-1"),
      deps);
    const archivedProgram = db.getDoc("organizerPrograms/program-1")!;
    const result = await unarchiveProgramHandler(
      request({programId: "program-1",
        expectedRevision: archivedProgram.revision as number}, "manager-1"),
      deps);
    assert.equal(result.restoredStatus, "active");
    const program = db.getDoc("organizerPrograms/program-1")!;
    assert.equal(program.status, "active");
    assert.equal(program.archivedAt, null);
    assert.equal(program.anonymizeAt, null);
    assert.equal(program.archivedFromStatus, null);
  });

test("unarchiveProgram rejects non-archived, expired, and leased states",
  async () => {
    const db = new FakeFirestore(retentionSeed());
    const deps = retentionDeps(db);
    await assert.rejects(
      unarchiveProgramHandler(
        request({programId: "program-1", expectedRevision: 3}, "manager-1"),
        deps),
      (error: unknown) =>
        (error as {code?: string}).code === "failed-precondition");

    archived(db);
    const program = db.getDoc("organizerPrograms/program-1")!;
    // Past the grace deadline.
    const late = retentionDeps(db, {
      now: () => admin.firestore.Timestamp.fromMillis(T_GRACE + 1),
    });
    await assert.rejects(
      unarchiveProgramHandler(
        request({programId: "program-1",
          expectedRevision: program.revision as number}, "manager-1"),
        late),
      (error: unknown) =>
        (error as {code?: string}).code === "failed-precondition");
    // While a retention run holds the lease.
    db.setDoc("programRetentionRuns/program-1", {
      programId: "program-1",
      organizerId: "org-1",
      status: "running",
      phases: [],
      startedAt: now,
      updatedAt: now,
      completedAt: null,
      leaseUntil: admin.firestore.Timestamp.fromMillis(T0 + 600_000),
      leaseToken: "other-worker",
      error: null,
      revision: 1,
    });
    await assert.rejects(
      unarchiveProgramHandler(
        request({programId: "program-1",
          expectedRevision: program.revision as number}, "manager-1"),
        deps),
      (error: unknown) =>
        (error as {code?: string}).code === "failed-precondition");
  });

test("archived programs reject mutations but stay readable", async () => {
  const db = new FakeFirestore(retentionSeed());
  archived(db);
  const deps = fixtureDeps(db);
  await assert.rejects(
    upsertProgramGuestHandler(
      request({programId: "program-1", guestId: "guest-1",
        displayName: "Rename", expectedRevision: 1}, "manager-1"),
      deps),
    (error: unknown) =>
      (error as {code?: string}).code === "failed-precondition");
  const list = await listProgramGuestsHandler(
    request({programId: "program-1"}, "manager-1"), deps);
  assert.equal(list.guests.length, 2);
});

function assertRetainedContracts(db: FakeFirestore) {
  const validators: [string, (doc: FakeData) => boolean][] = [
    ["programGuests/", validateProgramGuestDocument],
    ["programHouseholds/", validateProgramHouseholdDocument],
    ["programStaffGrants/", validateProgramStaffGrantDocument],
    ["programStaffInvites/", validateProgramStaffInviteDocument],
    ["programFunctionGuests/", validateProgramFunctionGuestDocument],
    ["programStays/", validateProgramStayDocument],
    ["programDoorJournal/", validateProgramDoorJournalDocument],
    ["programTravelLegs/", validateProgramTravelLegDocument],
    ["programGuestGroups/", validateProgramGuestGroupDocument],
    ["programTravelParties/", validateProgramTravelPartyDocument],
    ["programHotels/", validateProgramHotelDocument],
    ["programRoomBlocks/", validateProgramRoomBlockDocument],
    ["programFunctions/", validateProgramFunctionDocument],
    ["transportTrips/", validateTransportTripDocument],
    ["organizerPrograms/", validateOrganizerProgramDocument],
    ["programRetentionRuns/", validateProgramRetentionRunDocument],
  ];
  for (const [path, doc] of db.docs) {
    for (const [prefix, validate] of validators) {
      if (path.startsWith(prefix)) {
        assert.ok(validate(doc),
          `${path} violates its document contract after scrubbing`);
      }
    }
  }
}

test("anonymizeProgram scrubs identity and preserves operational truth",
  async () => {
    const db = new FakeFirestore(retentionSeed());
    archived(db);
    const deletes: string[] = [];
    const pastGrace = admin.firestore.Timestamp.fromMillis(T_GRACE + 10_000);
    const deps = retentionDeps(db, {
      now: () => pastGrace,
      deleteFlightSubscription: async ({subscriptionId}) => {
        deletes.push(subscriptionId);
      },
    });
    const outcome = await anonymizeProgram(
      db as never, "program-1", deps, T_GRACE + 10_000 + 60_000);
    assert.equal(outcome, "completed");

    const program = db.getDoc("organizerPrograms/program-1")!;
    assert.equal(program.status, "archived");
    assert.ok(program.anonymizedAt);
    assert.equal(program.title, "Sharma–Rao Wedding");

    const guest = db.getDoc("programGuests/guest-1")!;
    assert.equal(guest.displayName, "Guest guest1");
    assert.equal(guest.phoneE164, null);
    assert.equal(guest.email, null);
    assert.equal(guest.externalReference, null);
    assert.equal(guest.contactId, "contact-1"); // CRM link survives
    assert.equal(guest.rsvpStatus, "attending");
    assert.ok(guest.anonymizedAt);

    // CRM contact itself is untouched.
    const contact = db.getDoc("organizerContacts/contact-1")!;
    assert.equal(contact.displayName, "Nisha Rao");

    const household = db.getDoc("programHouseholds/house-1")!;
    assert.equal(household.label, "Household house1");
    assert.equal(household.primaryContactName, null);
    assert.equal(household.primaryPhoneE164, null);
    assert.deepEqual(household.memberGuestIds, ["guest-1", "guest-2"]);

    // Counts/attendance truth survives.
    const row = db.getDoc("programFunctionGuests/fg-1")!;
    assert.equal(row.responseNote, null);
    assert.equal(row.rsvpStatus, "attending");
    assert.equal(row.attendanceStatus, "checkedIn");
    assert.equal(row.partySize, 2);

    const stay = db.getDoc("programStays/stay-1")!;
    assert.equal(stay.notes, null);
    assert.equal(stay.roomLabel, null);
    assert.equal(stay.status, "checkedIn");

    const journal = db.getDoc("programDoorJournal/dj-1")!;
    assert.equal(journal.note, null);
    assert.equal(journal.action, "checkIn");
    assert.equal(journal.partySize, 2);

    const leg = db.getDoc("programTravelLegs/leg-1")!;
    assert.equal(leg.manualCurbNote, null);
    assert.equal(leg.flightAlertSubscriptionId, null);
    assert.equal(leg.flightAlertFlightNumber, null);
    assert.equal(leg.flightAlertLease, null);
    assert.equal(leg.flightNextRefreshAt, null);
    assert.equal(leg.flightNumber, "AI847"); // Itinerary fact survives.
    assert.deepEqual(deletes, ["sub-abc"]);

    assert.equal(db.getDoc("programTravelParties/party-1")!.label,
      "Party party1");
    assert.equal(db.getDoc("programGuestGroups/group-1")!.label,
      "Group group1");
    assert.equal(db.getDoc("programHotels/hotel-1")!.receptionContact, null);
    assert.equal(db.getDoc("programHotels/hotel-1")!.notes, null);
    assert.equal(db.getDoc("programRoomBlocks/block-1")!.notes, null);
    assert.equal(db.getDoc("programRoomBlocks/block-1")!.label,
      "Block block1");
    assert.equal(db.getDoc("programFunctions/fn-1")!.venueNotes, null);
    assert.equal(db.getDoc("programFunctions/fn-1")!.name, "Sangeet");
    assert.equal(db.getDoc("transportTrips/trip-1")!.notes, null);
    assert.equal(db.getDoc("transportTrips/trip-1")!.status, "arrived");

    // Pending invite deleted outright; claimed invite scrubbed in place.
    assert.equal(db.getDoc("programStaffInvites/inv-pending"), undefined);
    const claimed = db.getDoc("programStaffInvites/inv-claimed")!;
    assert.equal(claimed.displayName, null);
    assert.equal(claimed.phoneE164, null);
    assert.equal(claimed.status, "claimed");

    const grant = db.getDoc("programStaffGrants/program-1__greeter-1")!;
    assert.equal(grant.displayName, null);
    assert.equal(grant.phoneLastFour, null);
    assert.equal(grant.uid, "greeter-1");

    const run = db.getDoc("programRetentionRuns/program-1")!;
    assert.equal(run.status, "completed");
    assertRetainedContracts(db);
  });

test("anonymizeProgram is idempotent and skipped once marked", async () => {
  const db = new FakeFirestore(retentionSeed());
  archived(db);
  const pastGrace = admin.firestore.Timestamp.fromMillis(T_GRACE + 10_000);
  const deps = retentionDeps(db, {now: () => pastGrace});
  assert.equal(await anonymizeProgram(
    db as never, "program-1", deps, T_GRACE + 10_000 + 60_000), "completed");
  const tombstone = db.getDoc("programGuests/guest-1")!.displayName;
  const again = await anonymizeProgram(
    db as never, "program-1", deps, T_GRACE + 10_000 + 60_000);
  assert.equal(again, "skipped");
  assert.equal(db.getDoc("programGuests/guest-1")!.displayName, tombstone);
});

test("a failed subscription cancel leaves the leg marked for retry",
  async () => {
    const db = new FakeFirestore(retentionSeed());
    archived(db);
    let fail = true;
    const pastGrace = admin.firestore.Timestamp.fromMillis(T_GRACE + 10_000);
    const deps = retentionDeps(db, {
      now: () => pastGrace,
      deleteFlightSubscription: async () => {
        if (fail) throw new Error("provider unavailable");
      },
    });
    const outcome = await anonymizeProgram(
      db as never, "program-1", deps, T_GRACE + 10_000 + 60_000);
    assert.equal(outcome, "failed");
    // The leg keeps its subscription id so the next pass retries the delete.
    assert.equal(
      db.getDoc("programTravelLegs/leg-1")!.flightAlertSubscriptionId,
      "sub-abc");
    assert.equal(
      db.getDoc("programTravelLegs/leg-1")!.anonymizedAt, undefined);
    const run = db.getDoc("programRetentionRuns/program-1")!;
    assert.equal(run.status, "failed");
    // Collections processed before the failed phase stay scrubbed.
    assert.equal(db.getDoc("programGuests/guest-1")!.displayName,
      "Guest guest1");

    fail = false;
    const resumed = await anonymizeProgram(
      db as never, "program-1", deps, T_GRACE + 10_000 + 60_000);
    assert.equal(resumed, "completed");
    assert.equal(
      db.getDoc("programTravelLegs/leg-1")!.flightAlertSubscriptionId, null);
    assertRetainedContracts(db);
  });

test("chunked processing resumes from the journaled cursor", async () => {
  const seed = retentionSeed();
  for (const extra of ["guest-3", "guest-4"]) {
    seed[`programGuests/${extra}`] = {
      ...seed["programGuests/guest-1"]!,
      householdId: null,
      contactId: null,
      groupIds: [],
    };
  }
  const db = new FakeFirestore(seed);
  archived(db);
  const base = T_GRACE + 10_000;
  let clockCalls = 0;
  const deps = retentionDeps(db, {
    pageLimit: 2,
    now: () => {
      clockCalls += 1;
      return admin.firestore.Timestamp.fromMillis(
        clockCalls < 5 ? base : base + 999);
    },
  });
  const deadline = base + 500;
  const first = await anonymizeProgram(db as never, "program-1", deps,
    deadline);
  assert.equal(first, "running");
  const run = db.getDoc("programRetentionRuns/program-1")!;
  const guestPhase = (run.phases as {
    collection: string; cursor: string | null; processed: number}[])
    .find((phase) => phase.collection === "programGuests")!;
  assert.equal(guestPhase.cursor, "guest-2");
  assert.equal(guestPhase.processed, 2);
  assert.equal(db.getDoc("programGuests/guest-1")!.anonymizedAt !== undefined,
    true);
  assert.equal(db.getDoc("programGuests/guest-3")!.anonymizedAt, undefined);

  const resumed = await anonymizeProgram(
    db as never, "program-1", deps, base + 999 + 60_000);
  assert.equal(resumed, "completed");
  assert.ok(db.getDoc("programGuests/guest-3")!.anonymizedAt);
  assertRetainedContracts(db);
});

test("the sweep anonymizes due programs and skips everything else",
  async () => {
    const seed = retentionSeed();
    seed["organizerPrograms/program-completed"] = {
      ...seed["organizerPrograms/program-1"]!, status: "completed",
    };
    seed["organizerPrograms/program-grace"] = {
      ...seed["organizerPrograms/program-1"]!, status: "archived",
      archivedAt: now,
      anonymizeAt: admin.firestore.Timestamp.fromMillis(T_GRACE + 99_000_000),
    };
    const db = new FakeFirestore(seed);
    archived(db); // program-1 due (anonymizeAt = T_GRACE)
    const pastNow = admin.firestore.Timestamp.fromMillis(T_GRACE + 10_000);
    const deps = retentionDeps(db, {now: () => pastNow});
    const summary = await anonymizeDuePrograms(
      db as never, deps, {now: pastNow});
    assert.equal(summary.scanned, 1);
    assert.equal(summary.completed, 1);
    assert.equal(
      db.getDoc("organizerPrograms/program-1")!.anonymizedAt !== undefined,
      true);
    assert.equal(
      db.getDoc("organizerPrograms/program-completed")!.anonymizedAt,
      undefined);
    assert.equal(
      db.getDoc("organizerPrograms/program-grace")!.anonymizedAt, undefined);
    assert.equal(
      db.getDoc("organizerPrograms/program-completed")!.status, "completed");
  });

test("attendance and counts reconcile identically after anonymization",
  async () => {
    const db = new FakeFirestore(retentionSeed());
    const deps = fixtureDeps(db);
    const before = await getProgramAttendanceReportHandler(
      request({programId: "program-1"}, "manager-1"), deps);
    archived(db);
    const pastGrace = admin.firestore.Timestamp.fromMillis(T_GRACE + 10_000);
    await anonymizeProgram(db as never, "program-1",
      retentionDeps(db, {now: () => pastGrace}), T_GRACE + 10_000 + 60_000);
    const after = await getProgramAttendanceReportHandler(
      request({programId: "program-1"}, "manager-1"), deps);
    assert.deepEqual(after, before);
  });

test("retention isolates program field assertions and decisions",
  async () => {
    const synthetic = retentionSeed();
    synthetic["organizerPrograms/program-2"] = {
      ...synthetic["organizerPrograms/program-1"]};
    synthetic["programGuests/other-wedding"] = {
      ...synthetic["programGuests/guest-1"], programId: "program-2",
      householdId: null, fieldSelections: {}, fieldConflicts: {}};
    const db = new FakeFirestore(seedWorkspaceFieldAssertions(synthetic));
    const otherFacts = [...db.docs].filter(([path, doc]) =>
      path.startsWith("workspaceFieldAssertions/") &&
        doc.programId === "program-2");
    const selected = (db.getDoc("programGuests/guest-1")!.fieldSelections as
      {phoneE164: string}).phoneE164;
    db.setDoc("workspaceFieldDecisions/synthetic-review", {
      schemaVersion: 1, programId: "program-1", organizerId: "org-1",
      workspaceRef: {kind: "program", id: "program-1"},
      relationshipRef: {kind: "programGuest", id: "guest-1"},
      fieldKey: "phoneE164", selectedAssertionId: selected,
      previousAssertionId: null, relationshipRevision: 1,
      actorUid: "synthetic-reviewer", observedAtMillis: T0});
    archived(db);
    const pastGrace = admin.firestore.Timestamp.fromMillis(T_GRACE + 10_000);
    const retention = retentionDeps(db, {now: () => pastGrace, pageLimit: 1});
    const result = await anonymizeProgram(db as never, "program-1", retention,
      pastGrace.toMillis() + 60_000);
    assert.equal(result, "completed");
    assert.equal([...db.docs].some(([path, doc]) =>
      /workspaceField(Assertions|Decisions)\//u.test(path) &&
        doc.programId === "program-1"), false);
    for (const [path, doc] of otherFacts) {
      assert.deepEqual(db.getDoc(path),
        doc);
    }
    assert.deepEqual(db.getDoc("programGuests/guest-1")!.fieldSelections, {});
    assert.equal((db.getDoc("programRetentionRuns/program-1")!.phases as
      Array<{collection: string}>).length, 23);
  });

test("mismatched evidence scope blocks retention completion",
  async () => {
    const db = new FakeFirestore(retentionSeed());
    db.setDoc("workspaceFieldAssertions/corrupt-fixture",
      {programId: "program-1",
        organizerId: "org-1", workspaceRef: {kind: "program", id: "program-2"},
        value: "synthetic-conflicting-scope"});
    archived(db);
    const pastGrace = admin.firestore.Timestamp.fromMillis(T_GRACE + 10_000);
    const result = await anonymizeProgram(db as never, "program-1",
      retentionDeps(db, {now: () => pastGrace}), pastGrace.toMillis() + 60_000);
    assert.equal(result, "failed");
    assert.equal(db.getDoc("organizerPrograms/program-1")!.anonymizedAt,
      null);
    assert.ok(db.getDoc("workspaceFieldAssertions/corrupt-fixture"));
    assert.equal(db.getDoc("programRetentionRuns/program-1")!.status, "failed");
  });


test("retention deletes private lodging only in the archived program",
  async () => {
    const db = new FakeFirestore(retentionSeed());
    const collections = ["programLodgingProposals", "programLodgingWorkflows",
      "programLodgingReceipts", "programLodgingSourceVersions",
      "programLodgingConfigs",
      "workspaceMembershipAssertions",
      "workspaceMembershipDecisions"];
    for (const collection of collections) {
      for (const programId of ["program-1", "program-2"]) {
        db.setDoc(collection + "/" + programId, {programId,
          organizerId: "org-1", workspaceRef: {kind: "program", id: programId},
          proposal: {scope: {programId, organizerId: "org-1"}}});
      }
    }
    archived(db);
    const pastGrace = admin.firestore.Timestamp.fromMillis(T_GRACE + 10_000);
    const result = await anonymizeProgram(db as never, "program-1",
      retentionDeps(db, {now: () => pastGrace, pageLimit: 1}),
      pastGrace.toMillis() + 60_000);
    assert.equal(result, "completed");
    for (const collection of collections) {
      assert.equal(db.getDoc(collection + "/program-1"), undefined);
      assert.ok(db.getDoc(collection + "/program-2"));
    }
    assert.equal(validateProgramRetentionRunDocument(
      db.getDoc("programRetentionRuns/program-1")), true);
  });

test("conflicting lodging scope prevents retention completion", async () => {
  const db = new FakeFirestore(retentionSeed());
  db.setDoc("programLodgingProposals/conflict", {programId: "program-1",
    organizerId: "org-1", proposal: {scope: {
      programId: "program-2", organizerId: "org-1"}}});
  archived(db);
  const pastGrace = admin.firestore.Timestamp.fromMillis(T_GRACE + 10_000);
  const result = await anonymizeProgram(db as never, "program-1",
    retentionDeps(db, {now: () => pastGrace}), pastGrace.toMillis() + 60_000);
  assert.equal(result, "failed");
  assert.ok(db.getDoc("programLodgingProposals/conflict"));
  assert.equal(db.getDoc("organizerPrograms/program-1")!.anonymizedAt, null);
});
