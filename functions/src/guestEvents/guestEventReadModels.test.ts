import {setup as offerFixture} from
  "../payments/offerPayments/offerPaymentTestFixture";
import {approvedApplicationFixture, responseId} from
  "../organizerFormAdmission/admissionTestFixture";
import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {eventParticipationId} from "../shared/relationshipDocuments";
import {contractValidator} from "../shared/contractTestValidators";
import type {EventDocument, EventGuestEntryDocument,
  GuestEventStatusDocument} from "../shared/generated/firestoreAdminTypes";
import {initialPolicyFromTerms} from "../events/eventPolicy";
import {publicFixture, publicCapturedFixture, uid, now, eventId} from
  "../events/publicRegistration/testFixture";
import {eventGuestEntry, refreshEventGuestEntry} from "./eventGuestEntry";
import {guestEventStatus, guestEventStatusId, refreshGuestEventStatus} from
  "./guestEventStatus";
import {eventTermsChanged, guestEventStatusPairs} from "./triggers";

const validateEventGuestEntryDocument =
  contractValidator<EventGuestEntryDocument>("EventGuestEntryDocument");
const validateGuestEventStatusDocument =
  contractValidator<GuestEventStatusDocument>("GuestEventStatusDocument");

type Store = Awaited<ReturnType<typeof publicFixture>>["store"];

async function readEntry(store: Store, at = now) {
  const db = store.db();
  const entry = await db.runTransaction((tx) =>
    eventGuestEntry(db, tx, eventId, at));
  if (entry) {
    assert.ok(validateEventGuestEntryDocument(entry),
      JSON.stringify(validateEventGuestEntryDocument.errors));
  }
  return entry;
}

async function readStatus(store: Store, auth: Parameters<
  typeof guestEventStatus>[0]["loadCurrentAuthUser"], who = uid, at = now) {
  const db = store.db();
  const row = await db.runTransaction((tx) => guestEventStatus({db, tx,
    eventId, uid: who, nowMillis: at, loadCurrentAuthUser: auth}));
  if (row) {
    assert.ok(validateGuestEventStatusDocument(row),
      JSON.stringify(validateGuestEventStatusDocument.errors));
  }
  return row;
}

test("a published paid event gives anyone a paid booking step", async () => {
  const h = await publicFixture();
  const entry = await readEntry(h.store);
  assert.deepEqual(entry?.registration, {guest: "bookPaid",
    member: "bookPaid"});
  assert.equal(entry?.open, true);
  assert.equal(entry?.publicFormId, null);
  assert.equal(entry?.startAtMillis,
    (h.event.startTime as Timestamp).toMillis());
});

test("the entry judges policy as if before the start and keeps the start",
  async () => {
    const h = await publicFixture();
    const start = (h.event.startTime as Timestamp).toMillis();
    const late = await readEntry(h.store, start + 1);
    assert.equal(late?.registration.guest, "bookPaid");
    assert.equal(late?.startAtMillis, start);
  });

test("free registration, membership-only events and closed events",
  async () => {
    const h = await publicFixture();
    h.event.publicRegistrationMode = "free";
    h.event.priceInPaise = 0;
    h.event.eventPolicy = initialPolicyFromTerms(
      {...h.event, eventPolicy: undefined} as unknown as EventDocument);
    assert.equal((await readEntry(h.store))?.registration.guest,
      "registerFree");
    const policy = h.event.eventPolicy as
      {admission: {membershipRequired?: boolean}};
    policy.admission.membershipRequired = true;
    assert.deepEqual((await readEntry(h.store))?.registration,
      {guest: "unsupported", member: "registerFree"});
    h.event.status = "cancelled";
    assert.equal((await readEntry(h.store))?.open, false);
    h.event.publicRegistrationEnabled = false;
    assert.equal((await readEntry(h.store))?.registration.member,
      "unsupported");
  });

test("an unchanged entry is not rewritten; an unpublished event has none",
  async () => {
    const h = await publicFixture();
    const db = h.store.db();
    assert.equal(await refreshEventGuestEntry(db, eventId, now), "written");
    assert.equal(await refreshEventGuestEntry(db, eventId, now + 5),
      "unchanged");
    h.event.publicationState = "private";
    assert.equal(await readEntry(h.store), null);
  });

test("a guest with no record of their own has no row", async () => {
  const h = await publicFixture();
  assert.equal(await readStatus(h.store, h.auth), null);
  assert.equal(await refreshGuestEventStatus(h.store.db(), eventId, uid,
    now), "removed");
});

test("a Catch booking registers the guest and shows the runtime",
  async () => {
    const h = await publicFixture();
    h.event.runtimeAccess = {enabled: true, publicRuntimeId: "runtime1",
      walkInPolicy: "deny", termsVersion: "v1"};
    h.store.put(`eventParticipations/${eventParticipationId(eventId, uid)}`, {
      eventId, organizerId: h.event.organizerId, uid, status: "signedUp",
      createdAt: Timestamp.fromMillis(now - 2000),
      updatedAt: Timestamp.fromMillis(now - 1000),
      signedUpAt: Timestamp.fromMillis(now - 2000), waitlistedAt: null,
      attendedAt: null, cancelledAt: null, deletedAt: null,
      genderAtSignup: "man", paymentId: null, attendeeId: "row_native"});
    const row = await readStatus(h.store, h.auth);
    assert.equal(row?.booking, "registered");
    assert.equal(row?.runtimeId, "runtime1");
    assert.equal(row?.paymentRecoverable, false);
  });

test("a captured website payment admits; another account sees nothing",
  async () => {
    const h = await publicCapturedFixture();
    await h.finalize();
    const row = await readStatus(h.store, h.auth, uid, now + 30);
    assert.equal(row?.booking, "registered");
    assert.equal(row?.publicPaymentId, h.paymentId);
    const other = await readStatus(h.store, async () => ({uid: "other",
      phoneNumber: "+919000000099"}), "other", now + 30);
    assert.equal(other, null);
  });

test("an open website payment is recoverable until it is closed",
  async () => {
    const h = await publicFixture();
    const result = await h.reserve();
    assert.ok("payment" in result);
    const row = await readStatus(h.store, h.auth);
    assert.equal(row?.publicPaymentId, result.paymentId);
    assert.equal(row?.paymentRecoverable, true);
    assert.equal(row?.booking, "none");
  });

test("application review states reach the guest's row", async () => {
  const h = await publicFixture();
  const application = approvedApplicationFixture();
  for (const [path, value] of application.store.rows) {
    if (/^organizer(?:Application|Form)/u.test(path)) h.store.put(path, value);
  }
  const app =
    h.store.get(`organizerApplications/${application.applicationId}`)!;
  app.linkedUid = uid;
  h.store.get(`organizerFormResponses/${responseId}`)!.respondentUid = uid;
  for (const status of ["submitted", "inReview", "waitlisted", "approved",
    "declined"]) {
    app.reviewStatus = status;
    assert.equal((await readStatus(h.store, h.auth))?.applicationStatus,
      status);
  }
  h.store.get(`organizerFormResponses/${responseId}`)!.status = "withdrawn";
  assert.equal((await readStatus(h.store, h.auth))?.applicationStatus,
    "withdrawn");
});

test("repeated invitation links for one offer keep the latest grant",
  async () => {
    const h = await publicFixture();
    const offered = await offerFixture();
    for (const [path, value] of offered.store.rows) {
      if (/^organizer(Form|Contact|EventOffer)/u.test(path)) {
        h.store.put(path, value);
      }
    }
    const original = h.store.get("organizerEventOfferRecipients/" +
      offered.invitation.grantId)!;
    h.store.put("organizerEventOfferRecipients/" + "f".repeat(64),
      {...original, issuedAtMillis: now - 1});
    const row = await readStatus(h.store, h.auth, uid, now + 20);
    assert.equal(row?.offerGrantId, offered.invitation.grantId);
    assert.equal(row?.offerExpiresAtMillis, original.expiresAtMillis);
    assert.equal(row?.offerAmbiguous, false);
  });

test("rows refresh only for the guests a write can change", () => {
  assert.deepEqual(guestEventStatusPairs({eventId: "e", uid: "u",
    status: "signedUp"}, {eventId: "e", uid: "u", status: "signedUp",
    note: "x"}, "eventId", "uid", ["status"]), []);
  assert.deepEqual(guestEventStatusPairs(undefined, {eventId: "e",
    linkedUid: "u"}, "eventId", "linkedUid", ["status"]), [["e", "u"]]);
  assert.deepEqual(guestEventStatusPairs({targetId: "e", linkedUid: "a"},
    {targetId: "e", linkedUid: "b"}, "targetId", "linkedUid", null),
  [["e", "a"], ["e", "b"]]);
  assert.equal(eventTermsChanged({bookedCount: 1, name: "a"},
    {bookedCount: 2, name: "a"}), false);
  assert.equal(eventTermsChanged({bookedCount: 1, name: "a"},
    {bookedCount: 1, name: "b"}), true);
  assert.equal(guestEventStatusId("e", "u"), "e_u");
});
