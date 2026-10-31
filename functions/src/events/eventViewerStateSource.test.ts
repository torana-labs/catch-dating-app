import {publicCapturedFixture, uid as paidUid, eventId as paidEventId,
  now as paidNow} from "./publicRegistration/testFixture";
import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {Store, type Row} from "../organizerFormAdmission/admissionTestFixture";
import {communityMembershipRows} from
  "../memberships/communityMembershipFixture";
import {readEventViewerStateSource as read} from "./eventViewerStateSource";
import {validateEventDocument} from
  "../shared/generated/validators/eventDocument";
import {catchNativeEventOrigin} from "../shared/testUtils";
import {eventParticipationId} from "../shared/relationshipDocuments";
import type {EventDocument} from
  "../shared/generated/firestoreAdminTypes";
import {eventPolicyFromEvent} from "./eventPolicy";
import {eventDiscoveryProjection} from "./eventDiscoveryProjection";
import {deriveEventSeatPolicy} from "./seatAuthority/firestoreAdapter";
import {seatIdentityAliasId, seatIdentityValueHash} from
  "./seatIdentityAuthority";

const uid = "person";
const eventId = "event1";
const organizerId = "org1";
const now = Date.now();
const stamp = Timestamp.fromMillis;

function fixture() {
  const store = new Store();
  const event: Row = {organizerId,
    eventOrigin: catchNativeEventOrigin(),
    startTime: stamp(now + 3600000), endTime: stamp(now + 7200000),
    eventFormat: {version: 1, activityKind: "socialRun",
      interactionModel: "pacePods"},
    meetingPoint: "Demo meeting point", meetingLocation: {name: "Demo venue",
      latitude: 19, longitude: 72}, startingPointLat: 19, startingPointLng: 72,
    locationDetails: null, distanceKm: 5, pace: "easy", capacityLimit: 20,
    description: "Synthetic event", priceInPaise: 0, status: "active",
    cancelledAt: null, cancellationReason: null, discoveryCityName: "mumbai",
    discoveryMarketId: "in-mh-mumbai", bookedCount: 0, checkedInCount: 0,
    waitlistedCount: 0, genderCounts: {}, cohortCounts: {},
    waitlistedCohortCounts: {},
    constraints: {minAge: 0, maxAge: 99, maxMen: null, maxWomen: null}};
  const user: Row = {name: "Demo person", firstName: "Demo",
    displayName: "Demo",
    dateOfBirth: stamp(Date.parse("1996-01-01T00:00:00Z")), gender: "man",
    phoneNumber: "+919000000001", countryCode: "+91", profileComplete: false,
    interestedInGenders: ["woman"], activityPreferences: {running: {version: 1,
      paceMinSecsPerKm: 300, paceMaxSecsPerKm: 420, preferredDistances: [],
      runningReasons: [], preferredRunTimes: []}}};
  Object.assign(event, eventDiscoveryProjection({
    event: event as unknown as EventDocument, organizerLocation: "mumbai",
    organizerLocationMarketId: "in-mh-mumbai", bookedCount: 0}));
  assert.ok(validateEventDocument(event),
    JSON.stringify(validateEventDocument.errors));
  store.put(`events/${eventId}`, event);
  store.put(`users/${uid}`, user);
  const readSource = () => read({db: store.db(), uid, eventId, nowMillis: now,
    loadCurrentAuthPhone: async () => "+919000000001"});
  const participation = (overrides: Row = {}) => store.put(
    `eventParticipations/${eventParticipationId(eventId, uid)}`, {
      eventId, organizerId, uid, status: "waitlisted",
      createdAt: stamp(now - 1000), updatedAt: stamp(now - 1000),
      signedUpAt: null, waitlistedAt: stamp(now - 1000), attendedAt: null,
      cancelledAt: null, deletedAt: null, genderAtSignup: "man",
      paymentId: null,
      ...overrides});
  const gated = () => {
    const policy = eventPolicyFromEvent(event as unknown as EventDocument);
    policy.admission.membershipRequired = true;
    Object.assign(event, {eventPolicy: policy});
  };
  const ready = () => {
    const policy = deriveEventSeatPolicy(event);
    store.put(`eventSeatMigrationFences/${eventId}`,
      {eventId, migrationRevision: 1, state: "ready"});
    store.put(`eventSeatLedgers/${eventId}`, {eventId, capacity: 20,
      occupied: 0, revision: 1, capacityRevision: 1,
      policyVersion: policy.policyVersion, policyHash: policy.policyHash,
      migrationRevision: 1, state: "ready"});
  };
  return {store, event, user, readSource, participation, gated, ready};
}

test("native ready reads validate enrollment without writing aliases or seats",
  async () => {
    const h = fixture();
    h.ready();
    const result = await h.readSource();
    assert.equal(result?.futureBooking.allowed, true);
    assert.equal(result?.route, "catchFreeBooking");
    assert.equal(result?.basis.inventoryRevision, 1);
    assert.deepEqual(h.store.writes, []);
    assert.equal([...h.store.rows.keys()].some((path) =>
      /eventSeat(IdentityAliases|Reservations|VerifiedPhones)/u.test(path)),
    false);
    assert.equal(h.store.timeline.some((step) =>
      step.startsWith("write:")), false);
  });

test("follows and approval do not replace membership", async () => {
  const h = fixture();
  h.gated();
  h.participation({hostApprovalStatus: "approved"});
  h.store.put("organizerFollows/org1_person", {status: "active"});
  const result = await h.readSource();
  assert.equal(result?.review, "approved");
  assert.deepEqual(result?.futureBooking,
    {allowed: false, reason: "membershipRequired"});
  assert.equal(result?.route, null);
  for (const [path, row] of Object.entries(communityMembershipRows(
    organizerId, uid))) h.store.put(path, row);
  assert.equal((await h.readSource())?.futureBooking.allowed, true);
});

test("revocation blocks future eligibility and retains confirmed history",
  async () => {
    const h = fixture();
    h.gated();
    for (const [path, row] of Object.entries(communityMembershipRows(
      organizerId, uid, "revoked"))) h.store.put(path, row);
    h.participation({status: "signedUp", signedUpAt: stamp(now - 1000),
      paymentId: "payment1"});
    const before = h.store.get(`eventParticipations/${
      eventParticipationId(eventId, uid)}`);
    const result = await h.readSource();
    assert.equal(result?.membership.state, "revoked");
    assert.equal(result?.admission, "nativeParticipation");
    assert.equal(result?.attendance, "notRecorded");
    assert.equal(result?.payment, "notRead");
    assert.equal(result?.futureBooking.reason, "membershipRequired");
    assert.deepEqual(h.store.get(`eventParticipations/${
      eventParticipationId(eventId, uid)}`), before);
    assert.deepEqual(h.store.writes, []);
  });

test("an approved request still needs a profile and present capacity",
  async () => {
    const h = fixture();
    h.participation({hostApprovalStatus: "approved"});
    h.store.rows.delete(`users/${uid}`);
    assert.equal((await h.readSource())?.futureBooking.reason,
      "bookingDetailsRequired");
    h.store.put(`users/${uid}`, h.user);
    h.event.bookedCount = 20;
    assert.equal((await h.readSource())?.futureBooking.reason, "full");
  });

test("incomplete inventory cannot open booking", async () => {
  for (const state of ["locked", "policyChanged", "guestAlias"]) {
    const h = fixture();
    h.ready();
    if (state === "locked") {
      h.store.get(`eventSeatMigrationFences/${eventId}`)!.state = "locked";
    }
    if (state === "policyChanged") h.event.capacityLimit = 21;
    if (state === "guestAlias") {
      h.store.put(`eventSeatIdentityAliases/${
        seatIdentityAliasId(eventId, "phone", "+919000000001")}`, {
        eventId, organizerId, kind: "phone", canonicalKey: "guest_existing",
        valueHash: seatIdentityValueHash("phone", "+919000000001"),
        identityRevision: 1, migrationRevision: 1, state: "ready"});
    }
    assert.equal((await h.readSource())?.futureBooking.allowed, false, state);
    assert.deepEqual(h.store.writes, [], state);
  }
});

test("holds consume capacity until their owner releases them", async () => {
  const h = fixture();
  h.ready();
  Object.assign(h.store.get(`eventSeatLedgers/${eventId}`)!,
    {occupied: 19, checkoutHeld: 1});
  assert.equal((await h.readSource())?.futureBooking.reason, "full");
  assert.deepEqual(h.store.writes, []);
});

test("blocking and schedule facts restrict booking", async () => {
  const h = fixture();
  h.store.put("eventParticipations/peer", {eventId, uid: "peer",
    status: "signedUp"});
  h.store.put("blocks/peer__person", {});
  assert.equal((await h.readSource())?.futureBooking.reason,
    "eventUnavailable");
  h.store.rows.delete("blocks/peer__person");
  h.store.put("eventParticipations/other", {eventId: "other", uid,
    status: "signedUp"});
  h.store.put("events/other", {...h.event});
  assert.equal((await h.readSource())?.futureBooking.reason,
    "scheduleConflict");
});

test("anonymous, deleted or foreign scope cannot obtain private viewer state",
  async () => {
    const h = fixture();
    assert.equal(await read({db: h.store.db(), uid: "", eventId}), null);
    h.event.publicationState = "private";
    assert.equal(await h.readSource(), null);
    delete h.event.publicationState;
    h.store.put(`deletedUsers/${uid}`, {status: "processing"});
    assert.equal(await h.readSource(), null);
    h.store.rows.delete(`deletedUsers/${uid}`);
    h.participation({uid: "other"});
    assert.equal(await h.readSource(), null);
  });

test("external events never expose native booking or private URL", async () => {
  const h = fixture();
  h.event.eventOrigin = {...catchNativeEventOrigin(), mode: "externalCompanion",
    bookingAuthority: "external", provider: "luma",
    externalEventId: "external1", externalEventUrl: "https://example.com/private"};
  const result = await h.readSource();
  assert.equal(result?.futureBooking.reason, "unsupportedRoute");
  assert.equal(result?.route, null);
  assert.equal(JSON.stringify(result).includes("example.com"), false);
});

test("a bounded incomplete participant or offer set is unavailable",
  async () => {
    for (const kind of ["peers", "offers", "schedule"]) {
      const h = fixture();
      for (let i = 0; i < 101; i++) {
        h.store.put(
          kind === "offers" ? `eventWaitlistOffers/offer${i}` :
            `eventParticipations/row${i}`, {eventId: kind === "schedule" ?
            `other${i}` : eventId, uid: kind === "schedule" ? uid : `peer${i}`,
          status: kind === "offers" ? "active" : "signedUp"});
      }
      const result = await h.readSource();
      assert.equal(result?.futureBooking.reason, "eventUnavailable", kind);
      assert.deepEqual(h.store.writes, [], kind);
    }
  });

test("actual attendance differs from booking and backend errors propagate",
  async () => {
    const h = fixture();
    h.participation({status: "attended", attendedAt: stamp(now - 1000),
      signedUpAt: stamp(now - 2000)});
    assert.equal((await h.readSource())?.attendance, "attended");
    const failure = new RangeError("source offline");
    const db = {collection: h.store.collection.bind(h.store),
      runTransaction: async () => {
        throw failure;
      }} as unknown as
      FirebaseFirestore.Firestore;
    await assert.rejects(read({db, uid, eventId}),
      (error) => error === failure);
  });

test("owned public paid admission needs no Consumer participation or profile",
  async () => {
    const h = await publicCapturedFixture();
    assert.equal(await h.finalize(), "admitted");
    const current = h.store.get(`events/${paidEventId}`)!;
    Object.assign(current, {...fixture().event, ...current,
      eventFormat: {...current.eventFormat as Row,
        interactionModel: "openFormat"}});
    Object.assign(current, {cohortCounts: {}, waitlistedCohortCounts: {},
      eventPolicy: eventPolicyFromEvent(current as unknown as EventDocument)});
    Object.assign(current, eventDiscoveryProjection({
      event: current as unknown as EventDocument, organizerLocation: "mumbai",
      organizerLocationMarketId: "in-mh-mumbai", bookedCount: 1}));
    assert.ok(validateEventDocument(current),
      JSON.stringify(validateEventDocument.errors));
    h.store.rows.delete(`users/${paidUid}`);
    assert.equal([...h.store.rows.keys()].some((path) =>
      path.startsWith("eventParticipations/")), false);
    const before = h.store.writes.length;
    const result = await read({db: h.store.db(), uid: paidUid,
      eventId: paidEventId, publicPaymentId: h.paymentId,
      nowMillis: paidNow + 100});
    assert.equal(result?.admission, "publicPaidRoster");
    assert.equal(result?.payment, "admitted");
    assert.equal(result?.attendance, "notRecorded");
    assert.equal(result?.futureBooking.reason, "bookingDetailsRequired");
    assert.equal(h.store.writes.length, before);
    assert.equal(JSON.stringify(result).includes("order_one"), false);
    assert.equal(JSON.stringify(result).includes("pay_one"), false);
    assert.equal(await read({db: h.store.db(), uid: "foreign",
      eventId: paidEventId, publicPaymentId: h.paymentId,
      nowMillis: paidNow + 100}), null);
  });


test("live offer acceptance still needs current membership",
  async () => {
    const h = fixture();
    h.gated();
    h.participation({waitlistOfferStatus: "active"});
    h.store.put("eventWaitlistOffers/event1_person", {
      eventId, uid, organizerId,
      cohortAtOffer: "menInterestedInWomen", status: "active", source: "host",
      offeredBy: "host", offeredAt: stamp(now - 1000),
      expiresAt: stamp(now + 1000), decidedAt: null,
      createdAt: stamp(now - 1000), updatedAt: stamp(now - 1000)});
    assert.equal((await h.readSource())?.futureBooking.reason,
      "membershipRequired");
    for (const [path, row] of Object.entries(communityMembershipRows(
      organizerId, uid))) h.store.put(path, row);
    const allowed = await h.readSource();
    assert.equal(allowed?.futureBooking.allowed, true);
    assert.equal(allowed?.route, "catchWaitlistOffer");
    assert.equal(allowed?.admission, "none");
    assert.deepEqual(h.store.writes, []);
    h.store.get("eventWaitlistOffers/event1_person")!.uid = "foreign";
    assert.equal(await h.readSource(), null);
  });
