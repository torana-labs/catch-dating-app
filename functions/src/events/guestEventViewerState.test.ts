import {setup as offerFixture} from
  "../payments/offerPayments/offerPaymentTestFixture";
import {approvedApplicationFixture, responseId} from
  "../organizerFormAdmission/admissionTestFixture";
import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {eventParticipationId} from "../shared/relationshipDocuments";
import {validateEventDocument} from
  "../shared/generated/validators/eventDocument";
import {validateEventParticipationDocument} from
  "../shared/generated/validators/eventParticipationDocument";
import {readEventViewerStateSource as readNative} from
  "./eventViewerStateSource";
import type {EventDocument} from
  "../shared/generated/firestoreAdminTypes";
import {eventPolicyFromEvent} from "./eventPolicy";
import {eventDiscoveryProjection} from "./eventDiscoveryProjection";
import {publicFixture, publicCapturedFixture, uid, phone, now, eventId} from
  "./publicRegistration/testFixture";
import {readGuestEventViewerState as read} from "./guestEventViewerState";
import {validateGetEventViewerStateCallableResponse as validate} from
  "../shared/generated/validators/getEventViewerStateOutput";

async function fixture() {
  const h = await publicFixture();
  h.store.writes.length = 0;
  return {...h, read: () => read({db: h.store.db(), uid, phoneE164: phone,
    eventId, nowMillis: now, loadCurrentAuthUser: h.auth})};
}

for (const {status, attendedAt, attendance} of [
  {status: "attended", attendedAt: null, attendance: "notRecorded"},
  {status: "attended", attendedAt: now + 1, attendance: "notRecorded"},
  {status: "attended", attendedAt: now - 1, attendance: "attended"},
  {status: "attended", attendedAt: now, attendance: "attended"},
  {status: "signedUp", attendedAt: null, attendance: "notRecorded"},
  {status: "signedUp", attendedAt: now - 1, attendance: "notRecorded"},
]) {
  test(`native participation ${status}/${attendedAt} keeps guest and native ` +
    "attendance evidence aligned without losing admission", async () => {
    const h = await fixture();
    Object.assign(h.event, {checkedInCount: 0, waitlistedCount: 0,
      cancelledAt: null, cancellationReason: null, genderCounts: {},
      cohortCounts: {}, waitlistedCohortCounts: {},
      startingPointLat: 12, startingPointLng: 77, locationDetails: null,
      distanceKm: 5, pace: "easy", description: "Synthetic event",
      constraints: {minAge: 0, maxAge: 99, maxMen: null, maxWomen: null},
      eventFormat: {version: 1, activityKind: "socialRun",
        interactionModel: "openFormat"},
      runtimeAccess: {enabled: true, publicRuntimeId: "r".repeat(20),
        walkInPolicy: "deny", termsVersion: "v1"}});
    h.event.eventPolicy = eventPolicyFromEvent(h.event as unknown as
      EventDocument);
    Object.assign(h.event, eventDiscoveryProjection({
      event: h.event as unknown as EventDocument, clubLocation: "mumbai",
      clubLocationMarketId: "in-mh-mumbai", bookedCount: 0}));
    assert.ok(validateEventDocument(h.event),
      JSON.stringify(validateEventDocument.errors));
    const participation = {eventId, clubId: h.event.clubId,
      organizerId: h.event.organizerId, uid, status,
      createdAt: Timestamp.fromMillis(now - 2000),
      updatedAt: Timestamp.fromMillis(now - 1000),
      signedUpAt: Timestamp.fromMillis(now - 2000), waitlistedAt: null,
      attendedAt: attendedAt === null ? null :
        Timestamp.fromMillis(attendedAt),
      cancelledAt: null, deletedAt: null, genderAtSignup: "man",
      paymentId: null};
    assert.ok(validateEventParticipationDocument(participation),
      JSON.stringify(validateEventParticipationDocument.errors));
    h.store.put(`eventParticipations/${eventParticipationId(eventId, uid)}`,
      {...participation});
    const native = await readNative({db: h.store.db(), uid, eventId,
      nowMillis: now});
    const guest = await h.read();
    assert.ok(native);
    assert.ok(guest);
    assert.equal(native.observedAtMillis, now);
    assert.equal(guest.observedAtMillis, now);
    assert.equal(native.admission, "nativeParticipation");
    assert.equal(guest.admission, native.admission);
    assert.equal(guest.guest.action, "registered");
    assert.equal(guest.guest.runtimeId, "r".repeat(20));
    assert.equal(guest.payment, "notRead");
    assert.ok(validate({viewer: guest}), JSON.stringify(validate.errors));
    assert.deepEqual(h.store.writes, []);
    assert.equal(native.attendance, attendance);
    assert.equal(guest.attendance, attendance);
    assert.equal(guest.attendance, native.attendance);
  });
}

test("guest entry needs current phone ownership but no native consumer profile",
  async () => {
    const h = await fixture();
    h.store.rows.delete(`users/${uid}`);
    const result = await h.read();
    assert.equal(result?.guest.action, "bookPaid");
    assert.ok(validate({viewer: result}), JSON.stringify(validate.errors));
    assert.deepEqual(h.store.writes, []);
    await assert.rejects(read({db: h.store.db(), uid,
      phoneE164: "+918888888888",
      eventId, nowMillis: now, loadCurrentAuthUser: h.auth}));
  });
test("unsupported policy does not manufacture an application or checkout route",
  async () => {
    const h = await fixture();
    const policy = h.event.eventPolicy as
    {admission: {membershipRequired?: boolean}};
    policy.admission.membershipRequired = true;
    assert.equal((await h.read())?.guest.action, "unsupported");
    assert.equal((await h.read())?.membership.state, "none");
    assert.equal((await h.read())?.guest.publicFormId, null);
  });
test("free and paid paths share start-time and publication guards",
  async () => {
    const h = await fixture();
    h.event.publicRegistrationMode = "free";
    h.event.priceInPaise = 0;
    h.event.eventPolicy = undefined;
    assert.equal((await h.read())?.guest.action, "registerFree");
    h.event.status = "cancelled";
    assert.equal((await h.read())?.guest.action, "closed");
    h.event.publicationState = "private";
    assert.equal(await h.read(), null);
  });
test("confirmed paid guests recover runtime access after registration closes",
  async () => {
    const h = await publicCapturedFixture();
    await h.finalize();
  h.store.get(`events/${eventId}`)!.runtimeAccess = {enabled: true,
    publicRuntimeId: "runtime1",
    walkInPolicy: "deny", termsVersion: "v1"};
  h.store.get(`events/${eventId}`)!.publicRegistrationEnabled = false;
  const result = await read({db: h.store.db(), uid, phoneE164: phone,
    eventId, nowMillis: now + 30, loadCurrentAuthUser: h.auth});
  assert.equal(result?.guest.action, "registered");
  assert.equal(result?.guest.runtimeId, "runtime1");
  assert.equal(result?.guest.publicPaymentId, h.paymentId);
  assert.equal(result?.admission, "publicPaidRoster");
  });
test("another account cannot retrieve a guest's receipt or runtime entry",
  async () => {
    const h = await publicCapturedFixture();
    await h.finalize();
    const result = await read({db: h.store.db(), uid: "other",
      phoneE164: "+919000000099",
      eventId, nowMillis: now + 30,
      loadCurrentAuthUser: async () => ({uid: "other",
        phoneNumber: "+919000000099"})});
    assert.equal(result?.guest.publicPaymentId, null);
    assert.equal(result?.guest.runtimeId, null);
    assert.equal(result?.guest.attendeeId, null);
  });

test("application review and withdrawal stay separate from admission",
  async () => {
    const h = await fixture();
    const application = approvedApplicationFixture();
    for (const [path, value] of application.store.rows) {
      if (/^organizer(?:Application|Form)/u.test(path)) {
        h.store.put(path, value);
      }
    }
    const app =
    h.store.get(`organizerApplications/${application.applicationId}`)!;
    app.linkedUid = uid;
  h.store.get(`organizerApplicationResponses/${responseId}`)!.linkedUid = uid;
  h.store.get(`organizerFormResponses/${responseId}`)!.respondentUid = uid;
  for (const [status, action] of [["submitted", "applicationPending"],
    ["inReview", "applicationPending"], ["waitlisted", "applicationWaitlisted"],
    ["approved", "awaitingOffer"], ["declined", "declined"]]) {
    app.reviewStatus = status;
    const result = await h.read();
    assert.equal(result?.guest.action, action);
    assert.equal(result?.admission, "none");
    assert.equal(result?.guest.runtimeId, null);
  }
  h.store.get(`organizerFormResponses/${responseId}`)!.status = "withdrawn";
  assert.equal((await h.read())?.guest.applicationStatus, "withdrawn");
  });

test("repeated invitation links for one offer keep a recoverable entry",
  async () => {
    const h = await fixture();
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
    const result = await read({db: h.store.db(), uid, phoneE164: phone,
      eventId, nowMillis: now + 20, loadCurrentAuthUser: h.auth});
    assert.equal(result?.guest.action, "offer");
    assert.equal(result?.guest.offerGrantId, offered.invitation.grantId);
  });
