import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {deps as baseDeps, request, now} from
  "../shared/testing/programFixtures";
import {FakeFirestore, type FakeData} from
  "../shared/testing/programFirestore";
import {
  getProgramHouseholdRsvpViewHandler,
  issueProgramHouseholdRsvpLinkHandler,
  programHouseholdItineraryIcsHandler,
  submitProgramHouseholdRsvpHandler,
} from "./householdRsvp";
import {mintHouseholdToken} from "./rsvpLinkTokens";

const SECRET = "test-household-secret";
const FUTURE = now.toMillis() + 86_400_000;

const deps = (db: FakeFirestore) => baseDeps(db,
  {householdTokenSecret: () => SECRET});

const fn = (id: string, patch: FakeData = {}): FakeData => ({
  programId: "program-1",
  organizerId: "org-1",
  name: id,
  startsAt: admin.firestore.Timestamp.fromMillis(1_800_600_000_000),
  endsAt: admin.firestore.Timestamp.fromMillis(1_800_603_000_000),
  venueName: "Venue",
  venueNotes: null,
  venueLocation: null,
  dressCode: null,
  instructions: null,
  invitationMode: "allGuests",
  checkInEnabled: true,
  expectedCount: 0,
  checkedInCount: 0,
  status: "scheduled",
  createdAt: now,
  updatedAt: now,
  revision: 1,
  ...patch,
});

const guest = (id: string, householdId: string | null,
  patch: FakeData = {}): FakeData => ({
  programId: "program-1",
  organizerId: "org-1",
  displayName: id,
  householdId,
  contactId: null,
  phoneE164: null,
  email: null,
  externalReference: null,
  invitationStatus: "invited",
  rsvpStatus: "pending",
  source: "manual",
  createdAt: now,
  updatedAt: now,
  revision: 1,
  ...patch,
});

const seed = (): Record<string, FakeData> => ({
  "organizers/org-1": {
    hostUserId: "manager-1", ownerUserId: "manager-1",
    hostUserIds: ["manager-1"], hostProfiles: [],
  },
  "organizerPrograms/program-1": {
    organizerId: "org-1", kind: "wedding", title: "Wedding",
    timezone: "Asia/Kolkata", status: "active", capabilities: [],
    transportSettings: {vehicleClasses: []},
    startsAt: admin.firestore.Timestamp.fromMillis(1_800_600_000_000),
    endsAt: admin.firestore.Timestamp.fromMillis(1_800_900_000_000),
    createdBy: "manager-1", createdAt: now, updatedAt: now, revision: 1,
  },
  "programFunctions/fn-sangeet": fn("fn-sangeet"),
  "programFunctions/fn-mehndi": fn("fn-mehndi",
    {invitationMode: "selectedGuests",
      startsAt: admin.firestore.Timestamp.fromMillis(
        1_800_700_000_000),
      endsAt: admin.firestore.Timestamp.fromMillis(
        1_800_703_000_000)}),
  "programFunctions/fn-cancelled": fn("fn-cancelled",
    {status: "cancelled"}),
  "programGuests/g-1": guest("g-1", "hh-1"),
  "programGuests/g-2": guest("g-2", "hh-1"),
  "programGuests/g-3": guest("g-3", "hh-2"),
  "programHouseholds/hh-1": {
    programId: "program-1", organizerId: "org-1", label: "Sharma family",
    primaryContactName: "Ashok", primaryPhoneE164: "+919900000001",
    primaryEmail: null, memberGuestIds: ["g-1", "g-2"],
    deliveryPreference: "none", messagingConsent: null,
    createdAt: now, updatedAt: now, revision: 1,
  },
  "programHouseholds/hh-2": {
    programId: "program-1", organizerId: "org-1", label: "Rao family",
    primaryContactName: "Meena", primaryPhoneE164: "+919900000002",
    primaryEmail: null, memberGuestIds: ["g-3"],
    deliveryPreference: "none", messagingConsent: null,
    createdAt: now, updatedAt: now, revision: 1,
  },
  "programFunctionGuests/fn-mehndi_g-2": {
    programId: "program-1", organizerId: "org-1",
    functionId: "fn-mehndi", guestId: "g-2",
    invited: true, rsvpStatus: "pending", attendanceStatus: "expected",
    partySize: null, responseNote: null, respondedAt: null,
    responseSource: null, recordedByUid: null,
    createdAt: now, updatedAt: now, revision: 1,
  },
  "programStaffGrants/program-1__staff-1": {
    organizerId: "org-1", programId: "program-1", uid: "staff-1",
    displayName: "Staff", phoneLastFour: "0000",
    duties: [{duty: "guestRelations", pickupPointIds: [], hotelIds: [],
      expiresAtMillis: FUTURE}],
    status: "active", createdBy: "manager-1", createdAt: now,
    expiresAt: admin.firestore.Timestamp.fromMillis(FUTURE),
    revokedBy: null, revokedAt: null, updatedAt: now, revision: 1,
  },
  "programHotels/hotel-1": {
    programId: "program-1", organizerId: "org-1", name: "Grand",
    address: null, location: null, notes: null,
    createdAt: now, updatedAt: now, revision: 1,
  },
  "programHotels/hotel-foreign": {
    programId: "program-9", organizerId: "org-9", name: "Elsewhere",
    address: null, location: null, notes: null,
    createdAt: now, updatedAt: now, revision: 1,
  },
  "programPickupPoints/pickup-1": {
    programId: "program-1", organizerId: "org-1", name: "T3 arrivals",
    kind: "airport", terminal: "T3", location: null, notes: null,
    createdAt: now, updatedAt: now, revision: 1,
  },
});

const token = (householdId = "hh-1") => mintHouseholdToken({
  programId: "program-1", householdId, expiresAtMillis: FUTURE,
}, SECRET);

test("issue link returns a token scoped to the household", async () => {
  const db = new FakeFirestore(seed());
  const out = await issueProgramHouseholdRsvpLinkHandler(request({
    programId: "program-1", householdId: "hh-1",
  }, "staff-1"), deps(db));
  assert.equal(out.entityId, "hh-1");
  // Program end is the default expiry.
  assert.equal(out.expiresAtMillis, 1_800_900_000_000);
  // The minted token opens the view.
  const view = await getProgramHouseholdRsvpViewHandler(
    request({token: out.token}, "anonymous"), deps(db));
  assert.equal(view.householdId, "hh-1");
});

test("view exposes only the household members and invited functions",
  async () => {
    const db = new FakeFirestore(seed());
    const view = await getProgramHouseholdRsvpViewHandler(
      request({token: token()}, "anonymous"), deps(db));
    assert.equal(view.programTitle, "Wedding");
    assert.equal(view.householdLabel, "Sharma family");
    assert.equal(view.messagingConsentGranted, false);
    assert.equal(view.members.length, 2);
    const [g1, g2] = view.members;
    // g-1: allGuests function only — fn-mehndi is selectedGuests and
    // g-1 has no invited row; cancelled never appears.
    assert.deepEqual(g1.functions.map((f) => f.functionId),
      ["fn-sangeet"]);
    assert.equal(g1.functions[0].rsvpStatus, "pending");
    // g-2 has an invited row on the selectedGuests function.
    assert.deepEqual(g2.functions.map((f) => f.functionId),
      ["fn-sangeet", "fn-mehndi"]);
    assert.equal(view.collectsGuestIds, false);
    assert.equal("branding" in view, false);
  });

test("view says when the programme collects IDs and how it is branded",
  async () => {
    const db = new FakeFirestore(seed());
    await db.doc("organizerPrograms/program-1").update({
      capabilities: ["accommodation"],
      branding: {color: "rose", coverImagePath: null, creditLine: null}});
    const view = await getProgramHouseholdRsvpViewHandler(
      request({token: token()}, "anonymous"), deps(db));
    assert.equal(view.collectsGuestIds, true);
    assert.deepEqual(view.branding,
      {color: "rose", coverImagePath: null, creditLine: null});
  });

test("submit lands member responses, rollups and explicit consent",
  async () => {
    const db = new FakeFirestore(seed());
    const out = await submitProgramHouseholdRsvpHandler(request({
      token: token(),
      responses: [
        {guestId: "g-1", functionId: "fn-sangeet",
          rsvpStatus: "attending", partySize: 2},
        {guestId: "g-2", functionId: "fn-mehndi",
          rsvpStatus: "declined"},
      ],
      messagingConsent: true,
    }, "anonymous"), deps(db));
    assert.equal(out.appliedCount, 2);
    assert.equal(out.messagingConsentGranted, true);
    const sangeet = db.getDoc("programFunctionGuests/fn-sangeet_g-1")!;
    assert.equal(sangeet.rsvpStatus, "attending");
    assert.equal(sangeet.responseSource, "householdLink");
    assert.equal(sangeet.recordedByUid, null);
    assert.equal(
      db.getDoc("programFunctionGuests/fn-mehndi_g-2")!.rsvpStatus,
      "declined");
    // Function counters and guest rollups derived.
    assert.equal(db.getDoc("programFunctions/fn-sangeet")!.expectedCount,
      2);
    assert.equal(db.getDoc("programGuests/g-1")!.rsvpStatus, "attending");
    assert.equal(db.getDoc("programGuests/g-2")!.rsvpStatus, "declined");
    const hh = db.getDoc("programHouseholds/hh-1")!;
    const consent = hh.messagingConsent as
      {granted: boolean; source: string};
    assert.equal(consent.granted, true);
    assert.equal(consent.source, "householdRsvpLink");
  });

test("submit rejects cross-household and uninvited responses",
  async () => {
    const db = new FakeFirestore(seed());
    const foreign = submitProgramHouseholdRsvpHandler(request({
      token: token(),
      responses: [{guestId: "g-3", functionId: "fn-sangeet",
        rsvpStatus: "attending"}],
      messagingConsent: false,
    }, "anonymous"), deps(db));
    await assert.rejects(foreign, (err) =>
      (err as {code?: string}).code === "permission-denied");
    // g-1 is not invited to the selectedGuests function.
    const uninvited = submitProgramHouseholdRsvpHandler(request({
      token: token(),
      responses: [{guestId: "g-1", functionId: "fn-mehndi",
        rsvpStatus: "attending"}],
      messagingConsent: false,
    }, "anonymous"), deps(db));
    await assert.rejects(uninvited, (err) =>
      (err as {code?: string}).code === "permission-denied");
    // Nothing landed.
    assert.equal(db.getDoc("programFunctionGuests/fn-mehndi_g-1"),
      undefined);
    assert.equal(
      db.getDoc("programHouseholds/hh-1")!.messagingConsent, null);
  });

const leg = (id: string, patch: FakeData = {}): FakeData => ({
  programId: "program-1",
  organizerId: "org-1",
  guestId: "g-1",
  partyId: null,
  kind: "inbound",
  flightNumber: "UA100",
  carrierCode: "UA",
  originIata: "SFO",
  destinationIata: "DEL",
  scheduledArrivalAt:
    admin.firestore.Timestamp.fromMillis(1_800_500_000_000),
  estimatedArrivalAt: null,
  actualArrivalAt: null,
  flightStatus: "scheduled",
  flightInstanceId: null,
  international: null,
  pickupPointId: null,
  destinationHotelId: "hotel-1",
  destinationLabel: null,
  readiness: "expected",
  readyAt: null,
  claimedByUid: null,
  claimedAt: null,
  manualCurbAt: null,
  manualCurbNote: null,
  passengers: 1,
  luggageUnits: 0,
  requiredCapabilities: [],
  dedicatedVehicle: false,
  source: "formResponse",
  createdAt: now,
  updatedAt: now,
  revision: 1,
  arrivalTerminal: null,
  flightRefreshedAt: null,
  flightNextRefreshAt: null,
  flightAlertSubscriptionId: null,
  flightProviderUpdatedAt: null,
  flightAlertFlightNumber: null,
  flightAlertLease: null,
  ...patch,
});

const travelBlock = (patch: FakeData = {}): FakeData => ({
  guestId: "g-1",
  kind: "inbound",
  flightNumber: "UA123",
  originIata: "SFO",
  destinationIata: "DEL",
  scheduledArrivalAtMillis: 1_800_500_000_000,
  destinationHotelId: "hotel-1",
  ...patch,
});

const submit = (data: FakeData, db: FakeFirestore) =>
  submitProgramHouseholdRsvpHandler(request({
    token: token(),
    responses: [],
    messagingConsent: false,
    ...data,
  }, "anonymous"), deps(db));

test("travel blocks land deterministic formResponse legs", async () => {
  const db = new FakeFirestore(seed());
  const out = await submit({
    travel: [
      travelBlock(),
      travelBlock({guestId: "g-2", kind: "outbound",
        flightNumber: "UA900", pickupPointId: "pickup-1",
        passengers: 4}),
    ],
  }, db);
  assert.equal(out.travelLegAppliedCount, 2);
  const inbound = db.getDoc("programTravelLegs/rsvp_hh-1_g-1_inbound")!;
  assert.equal(inbound.programId, "program-1");
  assert.equal(inbound.organizerId, "org-1");
  assert.equal(inbound.guestId, "g-1");
  assert.equal(inbound.kind, "inbound");
  assert.equal(inbound.source, "formResponse");
  assert.equal(inbound.flightNumber, "UA123");
  assert.equal(inbound.flightStatus, "scheduled");
  assert.equal(inbound.destinationHotelId, "hotel-1");
  assert.equal(inbound.passengers, 1);
  const outbound =
    db.getDoc("programTravelLegs/rsvp_hh-1_g-2_outbound")!;
  assert.equal(outbound.flightNumber, "UA900");
  assert.equal(outbound.pickupPointId, "pickup-1");
  assert.equal(outbound.passengers, 4);
});

test("travel resubmits update the same leg and keep provenance",
  async () => {
    const db = new FakeFirestore({...seed(),
      "programTravelLegs/rsvp_hh-1_g-1_inbound": leg(
        "rsvp_hh-1_g-1_inbound", {
          partyId: "party-1",
          claimedByUid: "driver-1",
          createdAt: admin.firestore.Timestamp.fromMillis(1_000),
          revision: 3,
        })});
    const out = await submit({
      travel: [travelBlock({flightNumber: "UA456", passengers: 3})],
    }, db);
    assert.equal(out.travelLegAppliedCount, 1);
    const doc = db.getDoc("programTravelLegs/rsvp_hh-1_g-1_inbound")!;
    assert.equal(doc.flightNumber, "UA456");
    assert.equal(doc.passengers, 3);
    // Party membership and provenance are planner-owned.
    assert.equal(doc.partyId, "party-1");
    assert.equal(doc.source, "formResponse");
    assert.equal(
      (doc.createdAt as FirebaseFirestore.Timestamp).toMillis(),
      1_000);
    // Rebooking invalidates claimed curb state and refreshes identity.
    assert.equal(doc.claimedByUid, null);
    // nextRevision is lamport-style: max(prior + 1, now millis).
    assert.equal(doc.revision, now.toMillis());
  });

test("travel blocks cannot reach foreign members or places",
  async () => {
    const db = new FakeFirestore(seed());
    await assert.rejects(submit({
      travel: [travelBlock({guestId: "g-3"})],
    }, db), (err) =>
      (err as {code?: string}).code === "permission-denied");
    await assert.rejects(submit({
      travel: [travelBlock({destinationHotelId: "hotel-foreign"})],
    }, db), (err) =>
      (err as {code?: string}).code === "invalid-argument");
    assert.equal(
      db.getDoc("programTravelLegs/rsvp_hh-1_g-3_inbound"), undefined);
    assert.equal(
      db.getDoc("programTravelLegs/rsvp_hh-1_g-1_inbound"), undefined);
  });

test("travel blocks need a destination and an arrival", async () => {
  const db = new FakeFirestore(seed());
  await assert.rejects(submit({
    travel: [travelBlock({destinationHotelId: null,
      destinationLabel: null})],
  }, db), (err) =>
    (err as {code?: string}).code === "invalid-argument");
  await assert.rejects(submit({
    travel: [travelBlock({scheduledArrivalAtMillis: null})],
  }, db), (err) =>
    (err as {code?: string}).code === "invalid-argument");
  // A free-text destination covers guests not staying at a program
  // hotel.
  const out = await submit({
    travel: [travelBlock({destinationHotelId: null,
      destinationLabel: "Family home, Jaipur"})],
  }, db);
  assert.equal(out.travelLegAppliedCount, 1);
  assert.equal(
    db.getDoc("programTravelLegs/rsvp_hh-1_g-1_inbound")!
      .destinationLabel, "Family home, Jaipur");
});

test("dispatched journeys reject household edits", async () => {
  const db = new FakeFirestore({...seed(),
    "programTravelLegs/rsvp_hh-1_g-1_inbound": leg(
      "rsvp_hh-1_g-1_inbound", {readiness: "dispatched"})});
  await assert.rejects(submit({travel: [travelBlock()]}, db),
    (err) => (err as {code?: string}).code === "failed-precondition");
  assert.equal(
    db.getDoc("programTravelLegs/rsvp_hh-1_g-1_inbound")!
      .flightNumber, "UA100");
});

test("submits without travel write no legs", async () => {
  const db = new FakeFirestore(seed());
  const out = await submit({}, db);
  assert.equal(out.travelLegAppliedCount, 0);
  assert.equal(
    db.getDoc("programTravelLegs/rsvp_hh-1_g-1_inbound"), undefined);
});

test("view echoes submitted travel and the program hotels", async () => {
  const db = new FakeFirestore({...seed(),
    "programTravelLegs/rsvp_hh-1_g-1_inbound": leg(
      "rsvp_hh-1_g-1_inbound", {
        flightNumber: "UA123", passengers: 3, luggageUnits: 2,
        pickupPointId: "pickup-1", partyId: "party-1",
      }),
    // A planner-owned leg for the same member must not echo.
    "programTravelLegs/leg-planner": leg("leg-planner", {
      source: "planner", flightNumber: "AI400"}),
    // hh-2's captured leg must not leak into hh-1's view.
    "programTravelLegs/rsvp_hh-2_g-3_inbound": leg(
      "rsvp_hh-2_g-3_inbound", {guestId: "g-3",
        flightNumber: "AI900"})});
  const view = await getProgramHouseholdRsvpViewHandler(
    request({token: token()}, "anonymous"), deps(db));
  // hotel-foreign belongs to program-9 and must not appear.
  assert.deepEqual(view.hotels, [{hotelId: "hotel-1", name: "Grand"}]);
  const g1 = view.members.find((member) => member.guestId === "g-1")!;
  assert.equal(g1.travel.length, 1);
  const block = g1.travel[0];
  assert.equal(block.kind, "inbound");
  assert.equal(block.flightNumber, "UA123");
  assert.equal(block.passengers, 3);
  assert.equal(block.luggageUnits, 2);
  assert.equal(block.destinationHotelId, "hotel-1");
  assert.equal(block.scheduledArrivalAtMillis, 1_800_500_000_000);
  const g2 = view.members.find((member) => member.guestId === "g-2")!;
  assert.equal(g2.travel.length, 0);
});

test("bad, expired and foreign tokens never open a view", async () => {
  const db = new FakeFirestore(seed());
  const bad = getProgramHouseholdRsvpViewHandler(
    request({token: `${token()}x`}, "anonymous"), deps(db));
  await assert.rejects(bad, (err) =>
    (err as {code?: string}).code === "unauthenticated");
  const expired = mintHouseholdToken({
    programId: "program-1", householdId: "hh-1",
    expiresAtMillis: now.toMillis() - 1,
  }, SECRET);
  await assert.rejects(
    getProgramHouseholdRsvpViewHandler(
      request({token: expired}, "anonymous"), deps(db)),
    (err) => (err as {code?: string}).code === "unauthenticated");
  // hh-2's token must not reach hh-1's members.
  const view = await getProgramHouseholdRsvpViewHandler(
    request({token: token("hh-2")}, "anonymous"), deps(db));
  assert.equal(view.members.length, 1);
  assert.equal(view.members[0].guestId, "g-3");
});

const icsRequest = (query: Record<string, unknown>, ip: string,
  method = "GET") => ({
  method,
  query,
  ip,
  get: (name: string) => name === "x-forwarded-for" ? ip : undefined,
});

const icsResponse = () => {
  const state = {status: 0, headers: {} as Record<string, string>, body: ""};
  const res = {
    status: (code: number) => {
      state.status = code;
      return res;
    },
    set: (headers: Record<string, string>) => {
      Object.assign(state.headers, headers);
      return res;
    },
    send: (body: string) => {
      state.body = body;
      return state;
    },
  };
  return {res, state};
};

test("ics feed serves only the household's invited live functions",
  async () => {
    const db = new FakeFirestore(seed());
    const {res, state} = icsResponse();
    await programHouseholdItineraryIcsHandler(
      icsRequest({token: token()}, "10.0.0.1"),
      res, deps(db));
    assert.equal(state.status, 200);
    assert.equal(
      state.headers["Content-Type"], "text/calendar; charset=utf-8");
    assert.equal(state.headers["Cache-Control"], "private, no-store");
    const feed = state.body;
    assert.match(feed, /BEGIN:VCALENDAR/);
    assert.match(feed, /X-WR-CALNAME:Wedding/);
    // g-2's selectedGuests invite makes mehndi part of the household feed.
    assert.match(feed, /SUMMARY:fn-sangeet/);
    assert.match(feed, /SUMMARY:fn-mehndi/);
    // Cancelled functions never enter the itinerary.
    assert.doesNotMatch(feed, /fn-cancelled/);
    // A foreign household's feed excludes the selectedGuests function.
    const other = icsResponse();
    await programHouseholdItineraryIcsHandler(
      icsRequest({token: token("hh-2")}, "10.0.0.2"),
      other.res, deps(db));
    assert.equal(other.state.status, 200);
    assert.match(other.state.body, /SUMMARY:fn-sangeet/);
    assert.doesNotMatch(other.state.body, /fn-mehndi/);
  });

test("ics endpoint rejects missing, bad and expired tokens", async () => {
  const db = new FakeFirestore(seed());
  const missing = icsResponse();
  await programHouseholdItineraryIcsHandler(
    icsRequest({}, "10.0.0.3"), missing.res, deps(db));
  assert.equal(missing.state.status, 400);
  const bad = icsResponse();
  await programHouseholdItineraryIcsHandler(
    icsRequest({token: `${token()}x`}, "10.0.0.4"), bad.res, deps(db));
  assert.equal(bad.state.status, 401);
  const expired = mintHouseholdToken({
    programId: "program-1", householdId: "hh-1",
    expiresAtMillis: now.toMillis() - 1,
  }, SECRET);
  const expiredRes = icsResponse();
  await programHouseholdItineraryIcsHandler(
    icsRequest({token: expired}, "10.0.0.5"), expiredRes.res, deps(db));
  assert.equal(expiredRes.state.status, 401);
  const wrongMethod = icsResponse();
  await programHouseholdItineraryIcsHandler(
    icsRequest({token: token()}, "10.0.0.6", "POST"),
    wrongMethod.res, deps(db));
  assert.equal(wrongMethod.state.status, 405);
});
