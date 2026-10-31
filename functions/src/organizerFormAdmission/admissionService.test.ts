import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";

import {HttpsError} from "firebase-functions/v2/https";
import {eventParticipationId} from "../shared/relationshipDocuments";
import {eventAttendeeId} from "../events/eventAttendees";

import {SeatAuthorityError} from "../events/seatAuthority/seatAuthority";
import {FirestoreSeatIdentityAuthority} from "../events/seatIdentityAuthority";

import {formConversionReceiptId} from
  "../organizers/organizerFormAdmissionIdentity";

import {AdmissionPolicyError} from "./admissionPolicy";
import {previewOrganizerFormAdmission, formAdmissionOwnershipId,
  formAdmissionReceiptId} from "./admissionService";

import {fixture, Store, org, eventId, responseId, contactId, requestId,
  actorUid, offerId, ts, hash, approvedApplicationFixture, Row} from
  "./admissionTestFixture";

function denied(error: unknown) {
  return error instanceof SeatAuthorityError ||
    error instanceof HttpsError && error.code === "failed-precondition" ||
    error instanceof AdmissionPolicyError &&
      ["unavailable", "conflict", "stale", "denied"].includes(error.code);
}

test("reserves one seat and creates roster, marker and exact immutable receipt",
  async () => {
    const {store, commit} = fixture();
    const result = await commit();
    const commitTimeline = store.timeline.slice();
    assert.equal(result.replayed, false);
    assert.equal(result.resultingLedgerRevision, 4);
    assert.equal(store.get(`eventSeatLedgers/${eventId}`)?.occupied, 1);
    assert.equal(store.get(`events/${eventId}`)?.bookedCount, 1);
    const attendee = store.get(`eventAttendees/${result.attendeeId}`);
    assert.equal(attendee?.source, "hostManual");
    assert.equal(attendee?.externalReference, responseId);
    assert.equal(store.get(`organizerFormAdmissions/${
      formAdmissionOwnershipId(org, eventId, responseId)}`)?.attendeeId,
    result.attendeeId);
    const resolved = await store.runTransaction((tx) =>
      new FirestoreSeatIdentityAuthority().resolve({db: store.db(), tx,
        eventId, organizerId: org,
        subject: {kind: "importAttendee", attendeeId: result.attendeeId}}));
    assert.deepEqual(resolved, {key: result.canonicalSeatKey, revision: 1});
    assert.equal(store.get(`organizerFormAdmissionReceipts/${
      formAdmissionReceiptId(org, requestId)}`)?.requestHash,
    result.requestHash);
    assert.ok(commitTimeline.every((entry, index, rows) =>
      !entry.startsWith("read:") && !entry.startsWith("query:") ||
      !rows.slice(0, index).some((before) => before.startsWith("write:"))));
  });

test("legacy admission requires real event snapshot update metadata",
  async () => {
    const {store, commit} = fixture();
    store.updateTimes.delete(`events/${eventId}`);
    await assert.rejects(commit(), denied);
    assert.equal(store.writes.length, 0);
    store.updateTimes.set(`events/${eventId}`,
      new Timestamp(1_800_000_000, 123_456_000));
    store.get(`events/${eventId}`)!.setupRevision = 0;
    await assert.rejects(commit(), denied);
    assert.equal(store.writes.length, 0);
  });

test("historical replay has no writes and new request cannot duplicate source",
  async () => {
    const {store, commit} = fixture();
    const first = await commit();
    const writes = store.writes.length;
    store.get(`organizerFormResponses/${responseId}`)!.status = "withdrawn";
    store.get(`organizerEventOffers/${offerId}`)!.status = "expired";
    const replay = await commit();
    assert.deepEqual(replay, {...first, replayed: true});
    assert.equal(store.writes.length, writes);
    await assert.rejects(commit({requestId: "request2"}), denied);
    assert.equal(store.writes.length, writes);
  });

test("withdrawn, foreign, stale, unpaid and full sources leave zero writes",
  async () => {
    const scenarios: Array<(store: Store) => void> = [
      (store) => {
store.get(`organizerFormResponses/${responseId}`)!
  .status = "withdrawn";
      },
      (store) => {
store.get(`events/${eventId}`)!.organizerId = "foreign";
      },
      (store) => {
store.get(`organizerEventOffers/${offerId}`)!
  .revision = 3;
      },
      (store) => {
store.get(`organizerEventOffers/${offerId}`)!
  .paymentSnapshot = {...store.get(`organizerEventOffers/${offerId}`)!
    .paymentSnapshot as Row, expectedAmountMinor: 100,
  collectionMode: "manualInstructions",
  paymentInstructions: "Pay before arrival"};
      },
      (store) => {
store.get(`eventSeatLedgers/${eventId}`)!.occupied = 2;
      },
      (store) => {
store.get(`organizerContacts/${contactId}`)!
  .mergedIntoContactId = "other";
      },
      (store) => {
store.get(`eventSeatMigrationFences/${eventId}`)!
  .state = "locked";
      },
    ];
    for (const mutate of scenarios) {
      const {store, commit} = fixture();
      mutate(store);
      await assert.rejects(commit(), denied);
      assert.deepEqual(store.writes, []);
    }
  });

test("changed manager or deleted account blocks a historical replay",
  async () => {
    const {store, commit} = fixture();
    await commit();
    const writes = store.writes.length;
    store.get(`organizers/${org}`)!.hostUserIds = [];
    store.get(`organizers/${org}`)!.hostUserId = null;
    store.get(`organizers/${org}`)!.ownerUserId = null;
    await assert.rejects(commit(), denied);
    store.get(`organizers/${org}`)!.ownerUserId = actorUid;
    store.put(`deletedUsers/${actorUid}`, {deletedAt: ts(2500)});
    await assert.rejects(commit(), denied);
    assert.equal(store.writes.length, writes);
  });

test("malformed deterministic marker cannot be bypassed by a new request",
  async () => {
    const {store, commit} = fixture();
    store.put(`organizerFormAdmissions/${formAdmissionOwnershipId(org,
      eventId, responseId)}`, {organizerId: org, eventId, responseId,
      receiptId: "wrong"});
    await assert.rejects(commit(), denied);
    assert.deepEqual(store.writes, []);
  });

test("verified imported guest keeps its source and existing seat", async () => {
  const {store, commit} = fixture();
  const phone = "+919999999999";
  const uid = "respondent1";
  const guestId = eventAttendeeId(eventId, `phone:${phone}`);
  const guestKey = "guest_key";
  store.get(`organizerFormResponses/${responseId}`)!.identityKind =
    "phoneVerified";
  store.get(`organizerFormResponses/${responseId}`)!.respondentUid = uid;
  store.get(`organizerFormResponses/${responseId}`)!.identity = {
    displayName: "Ada Guest", email: null, phoneE164: phone,
    searchName: "ada guest", origin: "respondentGranted"};
  store.get(`organizerContacts/${contactId}`)!.phoneE164 = phone;
  store.get(`eventSeatLedgers/${eventId}`)!.occupied = 1;
  store.get(`events/${eventId}`)!.bookedCount = 1;
  store.put(`eventAttendees/${guestId}`, {eventId, organizerId: org, source: "hostImport", status: "registered",
    linkedUid: null, phoneE164: phone, externalReference: null,
    displayName: "Imported Ada"});
  store.alias("attendee", guestId, guestKey);
  store.alias("phone", phone, guestKey);
  store.put(`eventSeatReservations/${hash(eventId, guestKey)}`,
    {eventId, canonicalKey: guestKey, identityRevision: 1,
      active: true, revision: 1, reservedAtMillis: 1000,
      releasedAtMillis: null});
  const result = await commit();
  assert.equal(result.seatAlreadyOccupied, true);
  assert.equal(result.attendeeId, guestId);
  assert.equal(result.resultingLedgerRevision, 4);
  assert.equal(store.get(`eventSeatLedgers/${eventId}`)?.occupied, 1);
  assert.equal(store.get(`eventAttendees/${guestId}`)?.source, "hostImport");
  assert.equal(store.get(`eventAttendees/${guestId}`)?.linkedUid, uid);
  assert.equal(store.writes.filter((path) =>
    path.startsWith("eventSeatReservations/")).length, 0);
});

test("retained Catch participation materializes missing display-only roster",
  async () => {
    const {store, commit} = fixture();
    const phone = "+919999999999";
    const uid = "respondent1";
    const catchKey = "uid_key";
    store.get(`organizerFormResponses/${responseId}`)!.identityKind =
      "phoneVerified";
    store.get(`organizerFormResponses/${responseId}`)!.respondentUid = uid;
    store.get(`organizerFormResponses/${responseId}`)!.identity = {
      displayName: "Ada Guest", email: null, phoneE164: phone,
      searchName: "ada guest", origin: "respondentGranted"};
    store.get(`organizerContacts/${contactId}`)!.phoneE164 = phone;
    store.get(`organizerContacts/${contactId}`)!.linkedUid = uid;
    store.get(`organizerContacts/${contactId}`)!.identityState = "verified";
    store.get(`eventSeatLedgers/${eventId}`)!.occupied = 1;
    store.get(`events/${eventId}`)!.bookedCount = 1;
    store.alias("uid", uid, catchKey);
    store.alias("phone", phone, catchKey);
    store.put(`eventSeatVerifiedPhones/${hash(eventId, "verifiedUid", uid)}`,
      {eventId, organizerId: org, uid, phoneE164: phone,
        migrationRevision: 1, state: "current"});
    store.put(`eventSeatReservations/${hash(eventId, catchKey)}`,
      {eventId, canonicalKey: catchKey, identityRevision: 1,
        active: true, revision: 1, reservedAtMillis: 1000,
        releasedAtMillis: null});
    store.put(`eventParticipations/${eventId}_${uid}`, {
      eventId, organizerId: org, uid,
      status: "signedUp", createdAt: ts(1000),
      signedUpAt: ts(1000)});
    store.put(`publicProfiles/${uid}`, {name: "Public Ada"});
    const result = await commit();
    const attendee = store.get(`eventAttendees/${result.attendeeId}`);
    assert.equal(result.seatAlreadyOccupied, true);
    assert.equal(result.resultingLedgerRevision, 3);
    assert.equal(result.attendeeId, eventAttendeeId(eventId,
      `phone:${phone}`));
    assert.equal(attendee?.source, "catchBooking");
    assert.equal(attendee?.displayName, "Public Ada");
    assert.equal(attendee?.phoneE164, null);
    assert.equal(attendee?.email, null);
    assert.equal(store.get(`eventSeatLedgers/${eventId}`)?.occupied, 1);
    const resolved = await store.runTransaction((tx) =>
      new FirestoreSeatIdentityAuthority().resolve({db: store.db(), tx,
        eventId, organizerId: org,
        subject: {kind: "importAttendee", attendeeId: result.attendeeId}}));
    assert.deepEqual(resolved, {key: result.canonicalSeatKey, revision: 1});
    assert.equal(store.writes.filter((path) =>
      path.startsWith("eventSeatReservations/")).length, 0);
  });

test("legacy proposal and malformed source cannot become a second admission",
  async () => {
    const legacy = fixture();
    legacy.store.put(`organizerFormConversionReceipts/${
      formConversionReceiptId(responseId, "eventAttendeeProposal", eventId)}`,
    {organizerId: org, eventId, responseId, status: "completed"});
    await assert.rejects(legacy.commit(), denied);
    assert.deepEqual(legacy.store.writes, []);
    const malformed = fixture();
    malformed.store.get(`organizerFormResponses/${responseId}`)!
      .identity = null;
    await assert.rejects(malformed.commit(), denied);
    assert.deepEqual(malformed.store.writes, []);
  });

test("stored manual payment attestation is copied exactly into receipt",
  async () => {
    const {store, commit} = fixture();
    const offer = store.get(`organizerEventOffers/${offerId}`)!;
    const snapshot = offer.paymentSnapshot as Row;
    offer.paymentSnapshot = {...snapshot, expectedAmountMinor: 500,
      collectionMode: "manualInstructions",
      paymentInstructions: "Pay at the counter"};
    offer.manualPayment = {status: "hostAttestedReceived",
      evidenceReference: "bank-123", evidenceRecordedAtMillis: 1600,
      reviewedByUid: actorUid, reviewedAtMillis: 1800,
      reviewNote: "Checked bank statement", bankReceiptChecked: true,
      attestedAmountMinor: 500, attestedCurrency: "INR",
      attestedEventPaymentRevision: 1,
      attestedEventPaymentHash: "a".repeat(64)};
    const result = await commit();
    const receipt = store.get(`organizerFormAdmissionReceipts/${
      result.receiptId}`);
    assert.deepEqual(receipt?.paymentSnapshot, offer.paymentSnapshot);
    assert.deepEqual(receipt?.manualPayment, offer.manualPayment);
    assert.equal(store.get(`eventSeatLedgers/${eventId}`)?.occupied, 1);
    const attendee = store.get(`eventAttendees/${result.attendeeId}`);
    assert.equal(attendee?.revenueAmountMinor, 500);
    assert.equal(attendee?.revenueCurrency, "INR");
    assert.equal(attendee?.revenueSource, "hostAttested");
    assert.equal(attendee?.revenueAllocation, "perAttendee");
  });

test("attested manual payment lands on a linked imported attendee",
  async () => {
    const {store, commit} = fixture();
    const phone = "+919999999999";
    const uid = "respondent1";
    const guestId = eventAttendeeId(eventId, `phone:${phone}`);
    const guestKey = "guest_key";
    store.get(`organizerFormResponses/${responseId}`)!.identityKind =
      "phoneVerified";
    store.get(`organizerFormResponses/${responseId}`)!.respondentUid = uid;
    store.get(`organizerFormResponses/${responseId}`)!.identity = {
      displayName: "Ada Guest", email: null, phoneE164: phone,
      searchName: "ada guest", origin: "respondentGranted"};
    store.get(`organizerContacts/${contactId}`)!.phoneE164 = phone;
    store.get(`eventSeatLedgers/${eventId}`)!.occupied = 1;
    store.get(`events/${eventId}`)!.bookedCount = 1;
    store.put(`eventAttendees/${guestId}`, {eventId, organizerId: org, source: "hostImport", status: "registered",
      linkedUid: null, phoneE164: phone, externalReference: null,
      displayName: "Imported Ada"});
    store.alias("attendee", guestId, guestKey);
    store.alias("phone", phone, guestKey);
    store.put(`eventSeatReservations/${hash(eventId, guestKey)}`,
      {eventId, canonicalKey: guestKey, identityRevision: 1,
        active: true, revision: 1, reservedAtMillis: 1000,
        releasedAtMillis: null});
    const offer = store.get(`organizerEventOffers/${offerId}`)!;
    const snapshot = offer.paymentSnapshot as Row;
    offer.paymentSnapshot = {...snapshot, expectedAmountMinor: 500,
      collectionMode: "manualInstructions",
      paymentInstructions: "Pay at the counter"};
    offer.manualPayment = {status: "hostAttestedReceived",
      evidenceReference: "bank-123", evidenceRecordedAtMillis: 1600,
      reviewedByUid: actorUid, reviewedAtMillis: 1800,
      reviewNote: "Checked bank statement", bankReceiptChecked: true,
      attestedAmountMinor: 500, attestedCurrency: "INR",
      attestedEventPaymentRevision: 1,
      attestedEventPaymentHash: "a".repeat(64)};
    const result = await commit();
    assert.equal(result.attendeeId, guestId);
    const guest = store.get(`eventAttendees/${guestId}`);
    assert.equal(guest?.source, "hostImport");
    assert.equal(guest?.revenueAmountMinor, 500);
    assert.equal(guest?.revenueCurrency, "INR");
    assert.equal(guest?.revenueSource, "hostAttested");
    assert.equal(guest?.revenueAllocation, "perAttendee");
  });

test("admission without an attested payment writes no revenue fact",
  async () => {
    const {store, commit} = fixture();
    const result = await commit();
    const attendee = store.get(`eventAttendees/${result.attendeeId}`);
    assert.equal(attendee?.revenueSource ?? null, null);
    assert.equal(attendee?.revenueAmountMinor ?? null, null);
  });

test("foreign roster and mismatched payment proof leave zero writes",
  async () => {
    const foreign = fixture();
    const attendeeId = eventAttendeeId(eventId,
      `external:form-admission:${responseId}`);
    foreign.store.put(`eventAttendees/${attendeeId}`, {eventId,
      organizerId: "foreign", source: "hostImport", status: "registered"});
    await assert.rejects(foreign.commit(), denied);
    assert.deepEqual(foreign.store.writes, []);
    const payment = fixture();
    const offer = payment.store.get(`organizerEventOffers/${offerId}`)!;
    offer.paymentSnapshot = {...offer.paymentSnapshot as Row,
      expectedAmountMinor: 500,
      collectionMode: "manualInstructions",
      paymentInstructions: "Pay at the counter"};
    offer.manualPayment = {status: "hostAttestedReceived",
      evidenceReference: "bank-123", evidenceRecordedAtMillis: 1600,
      reviewedByUid: actorUid, reviewedAtMillis: 1800,
      reviewNote: "Checked bank statement", bankReceiptChecked: true,
      attestedAmountMinor: 500, attestedCurrency: "INR",
      attestedEventPaymentRevision: 1,
      attestedEventPaymentHash: "b".repeat(64)};
    await assert.rejects(payment.commit());
    assert.deepEqual(payment.store.writes, []);
  });

test("preview uses current revisions without staging any writes",
  async () => {
    const {store, payload, commit} = fixture();
    const scope = {organizerId: org, eventId, responseId, contactId, offerId};
    const result = await previewOrganizerFormAdmission({db: store.db(),
      actorUid, payload: scope, nowMillis: () => 2000});
    assert.equal(result.canCommit, true);
    assert.equal(result.expectedLedgerRevision, 3);
    assert.equal(result.expectedOfferRevision, 2);
    assert.equal(result.expectedOfferGeneration, 1);
    assert.equal(result.paymentAuthority, "explicitFree");
    assert.deepEqual(store.writes, []);
    assert.ok(store.timeline.every((item) => !item.startsWith("write:")));
    store.get(`organizerEventOffers/${offerId}`)!.revision = 3;
    await assert.rejects(commit(), denied);
    assert.deepEqual(store.writes, []);
    const updated = await previewOrganizerFormAdmission({db: store.db(),
      actorUid, payload: scope, nowMillis: () => 2000});
    assert.equal(updated.expectedOfferRevision, 3);
    const receipt = await commit({...payload, expectedOfferRevision: 3});
    assert.equal(receipt.resultingLedgerRevision, 4);
  });

test("preview rejects full, locked, unpaid and revoked sources without writes",
  async () => {
    for (const change of [
      (store: Store) => {
        store.get(`eventSeatLedgers/${eventId}`)!.occupied = 2;
      },
      (store: Store) => {
        store.get(`eventSeatMigrationFences/${eventId}`)!.state = "locked";
      },
      (store: Store) => {
        const offer = store.get(`organizerEventOffers/${offerId}`)!;
        (offer.paymentSnapshot as Row).expectedAmountMinor = 100;
      },
      (store: Store) => {
        store.put(`deletedUsers/${actorUid}`, {deletedAt: ts(1900)});
      },
    ]) {
      const {store} = fixture();
      change(store);
      await assert.rejects(previewOrganizerFormAdmission({db: store.db(),
        actorUid, payload: {organizerId: org, eventId, responseId,
          contactId, offerId}, nowMillis: () => 2000}), denied);
      assert.deepEqual(store.writes, []);
    }
  });

test("form admission cannot bypass cohort and Cross Paths inventory",
  async () => {
    for (const patch of [
      {crossPathsPairHeldCount: 1}, {crossPathsPairConfirmedCount: 1},
      {constraints: {maxMen: 5}},
      {eventPolicy: {version: 2, admission: {capacityLimit: 2,
        crossPathsPairInventory: {enabled: true, reservedPairCapacity: 1}}}},
      {eventPolicy: {version: 2, admission: {capacityLimit: 2,
        cohortCapacityLimits: {menInterestedInWomen: 1}}}},
    ]) {
      const {store, commit} = fixture();
      Object.assign(store.get(`events/${eventId}`)!, patch);
      await assert.rejects(commit(), denied);
      assert.deepEqual(store.writes, []);
    }
  });

test("active waitlist offers protect the last seat until expiry", async () => {
  const {store, commit} = fixture();
  store.get(`eventSeatLedgers/${eventId}`)!.occupied = 1;
  store.get(`events/${eventId}`)!.bookedCount = 1;
  store.put("eventWaitlistOffers/waitlist1", {eventId, uid: "waiting1",
    status: "active", cohortAtOffer: "queerOrOpen", expiresAt: ts(3000)});
  store.put(`eventParticipations/${eventParticipationId(eventId, "waiting1")}`,
    {eventId, uid: "waiting1", status: "waitlisted"});
  await assert.rejects(commit(), denied);
  assert.deepEqual(store.writes, []);
  store.get("eventWaitlistOffers/waitlist1")!.expiresAt = ts(1000);
  await commit();
  assert.equal(store.get(`eventSeatLedgers/${eventId}`)!.occupied, 2);
});

test("approved application admits without inventing a CRM conversion receipt",
  async () => {
    const {store, commit, applicationId} = approvedApplicationFixture();
    const preview = await previewOrganizerFormAdmission({
      db: store.db(), actorUid,
      payload: {organizerId: org, eventId, responseId, contactId, offerId},
      nowMillis: () => 2000});
    assert.equal(preview.canCommit, true);
    assert.equal(store.writes.length, 0);
    const result = await commit();
    assert.deepEqual(store.get(`organizerFormAdmissionReceipts/${
      result.receiptId}`)?.applicationApproval,
    {applicationId, revision: 2, contactId, reviewedAtMillis: 1500});
    assert.equal(store.get(`eventSeatLedgers/${eventId}`)?.occupied, 1);
    assert.ok(!store.writes.some((path) =>
      path.startsWith("organizerFormConversionReceipts/")));
    store.get(`organizerApplications/${applicationId}`)!.reviewStatus =
      "declined";
    const writes = store.writes.length;
    assert.equal((await commit()).replayed, true);
    assert.equal(store.writes.length, writes);
  });

test("approval changes and crossed application identities prevent all writes",
  async () => {
    for (const mutate of [
      (app: Row) => {
        app.reviewStatus = "declined";
      },
      (app: Row) => {
        app.reviewStatus = "submitted";
      },
      (app: Row) => {
        app.latestResponseId = "anotherResponse";
      },
      (app: Row) => {
        app.organizerId = "foreign";
      },
      (app: Row) => {
        app.formVersionId = "anotherVersion";
      },
      (app: Row) => {
        app.contactId = "anotherContact";
      },
      (app: Row) => {
        app.targetId = "anotherEvent";
      },
      (app: Row) => {
        app.linkedUid = "anotherUid";
      },
      (app: Row) => {
        app.reviewedAt = ts(3000);
      },
      (app: Row) => {
        app.revision = 0;
      },
    ]) {
      const {store, commit, applicationId} = approvedApplicationFixture();
      mutate(store.get(`organizerApplications/${applicationId}`)!);
      await assert.rejects(commit(), denied);
      assert.equal(store.writes.length, 0);
    }
    for (const collection of ["organizerApplicationResponses",
      "organizerFormResponses"]) {
      const {store, commit} = approvedApplicationFixture();
      store.rows.delete(`${collection}/${responseId}`);
      await assert.rejects(commit(), denied);
      assert.equal(store.writes.length, 0);
    }
  });

test("approved source follows a merged contact origin without a second seat",
  async () => {
    const {store, commit, originId, applicationId} =
      approvedApplicationFixture();
    store.get(`organizerApplications/${applicationId}`)!.contactId = "original";
    store.get(`organizerContactOrigins/${originId}`)!.originContactId =
      "original";
    const receipt = await commit();
    assert.equal(receipt.contactId, contactId);
    assert.equal(store.get(`eventSeatLedgers/${eventId}`)?.occupied, 1);
  });

test("checkout holds and waitlist offers share remaining admission capacity",
  async () => {
    const {store, commit} = fixture();
    store.get(`eventSeatLedgers/${eventId}`)!.checkoutHeld = 1;
    store.put("eventWaitlistOffers/waitlist1", {eventId, uid: "waiting1",
      status: "active", cohortAtOffer: "queerOrOpen", expiresAt: ts(3000)});
    const participationId = eventParticipationId(eventId, "waiting1");
    store.put(`eventParticipations/${participationId}`,
      {eventId, uid: "waiting1", status: "waitlisted"});
    await assert.rejects(commit(), denied);
    assert.deepEqual(store.writes, []);
    store.get("eventWaitlistOffers/waitlist1")!.expiresAt = ts(1000);
    await commit();
    assert.equal(store.get(`eventSeatLedgers/${eventId}`)!.occupied, 1);
    assert.equal(store.get(`eventSeatLedgers/${eventId}`)!.checkoutHeld, 1);
  });

async function rejectPreviewAndCommit(
  mutate: (current: ReturnType<typeof fixture>) => void
) {
  for (const preview of [true, false]) {
    const current = fixture();
    mutate(current);
    const before = structuredClone([...current.store.rows]);
    const action = preview ? previewOrganizerFormAdmission({
      db: current.store.db(), actorUid,
      payload: {organizerId: org, eventId, responseId, contactId, offerId},
      nowMillis: () => 2000}) : current.commit();
    await assert.rejects(action, denied);
    assert.deepEqual(current.store.writes, []);
    assert.ok(current.store.timeline.every((item) =>
      !item.startsWith("write:")));
    assert.deepEqual(structuredClone([...current.store.rows]), before);
  }
}

test("current withdrawal, closure and manager authority fence both paths",
  async () => {
    for (const [collection, id, patch] of [
      ["organizerFormResponses", responseId, {withdrawnAt: ts(1900)}],
      ["organizerFormResponses", responseId, {status: "withdrawn"}],
      ["events", eventId, {status: "cancelled"}],
      ["events", eventId, {startTime: ts(1900)}],
      ["organizers", org, {ownerUserId: null, hostUserId: null,
        hostUserIds: [], hostProfiles: []}],
      ["organizerEventOffers", offerId, {status: "withdrawn"}],
      ["organizerEventOffers", offerId, {status: "expired"}],
    ] as Array<[string, string, Row]>) {
      await rejectPreviewAndCommit(({store}) => {
        Object.assign(store.get(`${collection}/${id}`)!, patch);
      });
    }
    await rejectPreviewAndCommit(({store}) => {
      const offer = store.get(`organizerEventOffers/${offerId}`)!;
      offer.expiresAtMillis = 1900;
      (offer.paymentSnapshot as Row).expiresAtMillis = 1900;
    });
  });

test("exact form receipt and origin provenance fence preview and commit",
  async () => {
    const receiptPath = `organizerFormConversionReceipts/${
      formConversionReceiptId(responseId, "crmContact")}`;
    for (const patch of [
      {organizerId: "foreign"}, {formId: "otherForm"},
      {responseId: "otherResponse"}, {kind: "eventAttendeeProposal"},
      {status: "pending"}, {resultId: "otherContact"},
    ]) {
      await rejectPreviewAndCommit(({store}) => {
        Object.assign(store.get(receiptPath)!, patch);
      });
    }
    for (const patch of [
      {organizerId: "foreign"}, {sourceKind: "import"},
      {sourceEntityKind: "other"}, {sourceEntityId: "otherResponse"},
      {formId: "otherForm"}, {responseId: "otherResponse"},
      {originContactId: "otherContact"}, {currentContactId: "otherContact"},
    ]) {
      await rejectPreviewAndCommit(({store, originId}) => {
        Object.assign(store.get(`organizerContactOrigins/${originId}`)!,
          patch);
      });
    }
    for (const patch of [
      {deletedAt: ts(1900)}, {hiddenAt: ts(1900)},
      {mergedIntoContactId: "survivor"},
      {identityState: "ambiguous"},
      {ambiguousCandidateContactIds: ["candidate"]},
    ]) {
      await rejectPreviewAndCommit(({store}) => {
        Object.assign(store.get(`organizerContacts/${contactId}`)!, patch);
      });
    }
    for (const patch of [
      {organizerId: "foreign"}, {formId: "otherForm"},
    ]) {
      await rejectPreviewAndCommit(({store}) => {
        Object.assign(store.get("organizerFormVersions/version1")!, patch);
      });
    }
    await rejectPreviewAndCommit(({store}) => {
      (store.get("organizerFormVersions/version1")!.definition as Row)
        .defaultTargetId = "otherEvent";
    });
  });

test("form conversion follows a valid merged origin through the real service",
  async () => {
    const {store, originId, commit} = fixture();
    store.get(`organizerFormConversionReceipts/${
      formConversionReceiptId(responseId, "crmContact")}`)!.resultId =
      "original";
    store.get(`organizerContactOrigins/${originId}`)!.originContactId =
      "original";
    const preview = await previewOrganizerFormAdmission({db: store.db(),
      actorUid, payload: {organizerId: org, eventId, responseId, contactId,
        offerId}, nowMillis: () => 2000});
    assert.equal(preview.canCommit, true);
    assert.deepEqual(store.writes, []);
    assert.ok(store.timeline.every((item) => !item.startsWith("write:")));
    const receipt = await commit();
    assert.equal(receipt.contactId, contactId);
    assert.equal(store.get(`eventSeatLedgers/${eventId}`)!.occupied, 1);
  });

test("exact receipt and ownership agreement fences historical replay",
  async () => {
    for (const mutate of [
      (receipt: Row) => {
        receipt.requestHash = "b".repeat(64);
      },
      (receipt: Row) => {
        receipt.responseId = "otherResponse";
      },
      (receipt: Row) => {
        receipt.receiptId = "otherReceipt";
      },
      (_receipt: Row, ownership: Row) => {
        ownership.attendeeId = "otherAttendee";
      },
      (_receipt: Row, ownership: Row) => {
        ownership.canonicalSeatKey = "otherSeat";
      },
      (_receipt: Row, ownership: Row) => {
        ownership.offerRevision = 999;
      },
    ]) {
      const {store, commit} = fixture();
      const first = await commit();
      mutate(store.get(`organizerFormAdmissionReceipts/${first.receiptId}`)!,
        store.get(`organizerFormAdmissions/${
          formAdmissionOwnershipId(org, eventId, responseId)}`)!);
      const before = structuredClone([...store.rows]);
      const writes = store.writes.length;
      store.timeline.length = 0;
      await assert.rejects(commit(), denied);
      assert.equal(store.writes.length, writes);
      assert.ok(store.timeline.every((item) => !item.startsWith("write:")));
      assert.deepEqual(structuredClone([...store.rows]), before);
    }
    const {store, commit} = fixture();
    const first = await commit();
    const writes = store.writes.length;
    await assert.rejects(commit({contactId: "otherContact"}), denied);
    store.get(`events/${eventId}`)!.status = "cancelled";
    assert.deepEqual(await commit(), {...first, replayed: true});
    assert.equal(store.writes.length, writes);
  });

test("legacy phone receipt requires reconciliation without changing its guest",
  async () => {
    await rejectPreviewAndCommit(({store}) => {
      const phone = "+919999999999";
      const attendeeId = eventAttendeeId(eventId, `phone:${phone}`);
      store.put(`eventAttendees/${attendeeId}`, {organizerId: org, eventId,
        externalReference: responseId, sourceRowId: responseId,
        phoneE164: phone, email: null, status: "registered",
        source: "hostManual"});
      store.put(`organizerContactEventEdges/${attendeeId}`, {
        organizerId: org, eventId, contactId});
      store.put(`organizerFormConversionReceipts/${formConversionReceiptId(
        responseId, "eventAttendeeProposal", eventId)}`, {
        organizerId: org, formId: "form1", responseId,
        kind: "eventAttendeeProposal", status: "completed",
        resultId: attendeeId,
        fields: [{destinationField: "eventId", value: eventId}]});
    });
  });

test("canonical capacity overrides a stale booked-count projection",
  async () => {
    await rejectPreviewAndCommit(({store}) => {
      store.get(`eventSeatLedgers/${eventId}`)!.occupied = 2;
      store.get(`events/${eventId}`)!.bookedCount = 0;
    });
    const {store, commit} = fixture();
    store.get(`events/${eventId}`)!.bookedCount = 2;
    const preview = await previewOrganizerFormAdmission({db: store.db(),
      actorUid, payload: {organizerId: org, eventId, responseId, contactId,
        offerId}, nowMillis: () => 2000});
    assert.equal(preview.canCommit, true);
    assert.deepEqual(store.writes, []);
    const result = await commit();
    assert.equal(result.seatAlreadyOccupied, false);
    assert.equal(store.get(`eventSeatLedgers/${eventId}`)!.occupied, 1);
    assert.equal(store.get(`events/${eventId}`)!.bookedCount, 1);
  });
