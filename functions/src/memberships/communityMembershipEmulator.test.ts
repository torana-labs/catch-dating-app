import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import {randomBytes} from "node:crypto";
import test from "node:test";
import {initializeApp, deleteApp} from "firebase-admin/app";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {communityMembershipFixture, communityMembershipRows} from
  "./communityMembershipFixture";
import {decideOrganizerCommunityMembershipHandler} from "./communityMembership";
import {communityMembershipId} from "./communityMembershipAuthority";
import {signUpUserForEvent} from "../events/signUpUserForEvent";
import {catchNativeEventOrigin} from "../shared/testUtils";
import {org, actorUid} from "../organizerFormAdmission/admissionTestFixture";

const emulator = process.env.FIRESTORE_EMULATOR_HOST;

/** Runs the complete race against a fresh synthetic Firestore namespace.
 * @param {string} projectId Namespace, reused only by the negative control.
 * @return {Promise<void>} Resolves after both scenarios and client teardown.
 */
async function runMembershipRace(
  projectId = `demo-cm-${randomBytes(10).toString("hex")}`
): Promise<void> {
  assert.ok(emulator && /^(127\.0\.0\.1|localhost):[0-9]{1,5}$/.test(emulator),
    "Only a local Firestore emulator may run this synthetic race.");
  const app = initializeApp({projectId}, projectId);
  const db = getEmulatorFirestore(app);
  try {
    const h = communityMembershipFixture();
    const future = Date.now() + 3600000;
    const user = {name: "Synthetic Guest", firstName: "Synthetic",
      displayName: "Synthetic", dateOfBirth: Timestamp.fromMillis(631152000000),
      gender: "man", phoneNumber: "+919999999999", countryCode: "+91",
      interestedInGenders: ["woman"], activityPreferences: {running: {
        version: 1, paceMinSecsPerKm: 300, paceMaxSecsPerKm: 420,
        preferredDistances: [], runningReasons: [], preferredRunTimes: [],
      }}};
    const event = {organizerId: org, status: "active",
      eventOrigin: catchNativeEventOrigin(),
      startTime: Timestamp.fromMillis(future),
      endTime: Timestamp.fromMillis(future + 3600000),
      meetingPoint: "Synthetic Park", meetingLocation: {name: "Synthetic Park",
        latitude: 19.07, longitude: 72.82},
      eventFormat: {version: 1, activityKind: "socialRun",
        interactionModel: "pacePods"},
      discoveryCityName: "mumbai", discoveryMarketId: "in-mh-mumbai",
      capacityLimit: 1, priceInPaise: 0, currency: "INR", bookedCount: 0,
      checkedInCount: 0, waitlistedCount: 0, genderCounts: {}, cohortCounts: {},
      constraints: {minAge: 0, maxAge: 99}, eventPolicy: {version: 2,
        admission: {format: "membersOnly", membershipRequired: true,
          capacityLimit: 1}, pricing: {basePriceInPaise: 0}}};
    const batch = db.batch();
    for (const [path, value] of h.store.rows) {
      if (path.startsWith("eventSeat")) continue;
      batch.set(db.doc(path), value);
    }
    batch.set(db.doc("events/event1"), event);
    batch.set(db.doc(`users/${h.uid}`), user);
    await batch.commit();
    const decide = (data: Record<string, unknown>) =>
      decideOrganizerCommunityMembershipHandler({
        auth: {uid: actorUid, token: {}}, data,
      } as CallableRequest<unknown>, {firestore: () => db,
        checkRateLimit: async () => undefined, nowMillis: Date.now});
    await decide(h.payload);
    assert.equal((await db.doc(`organizerCommunityMemberships/${
      h.membershipId}`).get()).data()?.state, "active",
    "Fresh grant must create active membership before the race.");
    const [booking, revocation] = await Promise.allSettled([
      signUpUserForEvent(db, "event1", h.uid),
      decide({...h.payload, action: "revoke", requestId: "revoke-race",
        expectedRevision: 1, applicationId: null,
        expectedApplicationRevision: null, reason: "Synthetic race"}),
    ]);
    assert.equal(revocation.status, "fulfilled");
    const participation = await db.doc(`eventParticipations/event1_${h.uid}`)
      .get();
    assert.equal(participation.exists, booking.status === "fulfilled");
    assert.equal((await db.doc("events/event1").get()).data()?.bookedCount,
      booking.status === "fulfilled" ? 1 : 0);
    if (booking.status === "rejected") {
      assert.match(String(booking.reason), /Approved community membership/);
    } else {
      await signUpUserForEvent(db, "event1", h.uid);
      const replayedCount = (await db.doc("events/event1").get())
        .data()?.bookedCount;
      assert.equal(replayedCount, 1);
    }
    assert.equal((await db.doc(`organizerCommunityMemberships/${
      communityMembershipId(org, h.uid)}`).get()).data()?.state, "revoked");

    // A different event exercises the existing atomic last-seat owner.
    const setup = db.batch();
    setup.set(db.doc("events/capacityEvent"), event);
    for (const uid of ["capacity1", "capacity2"]) {
      setup.set(db.doc(`users/${uid}`), user);
      for (const [path, value] of Object.entries(
        communityMembershipRows(org, uid))) setup.set(db.doc(path), value);
    }
    await setup.commit();
    const raced = await Promise.allSettled(["capacity1", "capacity2"].map(
      (uid) => signUpUserForEvent(db, "capacityEvent", uid)));
    assert.equal(raced.filter((r) => r.status === "fulfilled").length, 1,
      raced.map((r) => r.status === "rejected" ? String(r.reason) : r.status)
        .join("; "));
    const rejected = raced.find((r) => r.status === "rejected");
    assert.ok(rejected?.status === "rejected");
    assert.match(String(rejected.reason), /now full/);
    const capacityCount = (await db.doc("events/capacityEvent").get())
      .data()?.bookedCount;
    assert.equal(capacityCount, 1);
  } finally {
    try {
      await db.terminate();
    } finally {
      await deleteApp(app);
    }
  }
}

test("real transactions serialize community revocation and last-seat booking", {
  skip: !emulator,
}, async (t) => {
  // Reuse the same emulator session, with no reset between complete scenarios.
  await t.test("first invocation", () => runMembershipRace());
  await t.test("second invocation", () => runMembershipRace());
  await t.test("reused project detects stale decisions", async () => {
    const reusedProject = `demo-cm-${randomBytes(10).toString("hex")}`;
    await runMembershipRace(reusedProject);
    // Replaying grant1 cannot reverse the first run's completed revocation.
    // Match that exact invariant so transport or setup failures cannot pass.
    await assert.rejects(runMembershipRace(reusedProject), {
      name: "AssertionError",
      code: "ERR_ASSERTION",
      actual: "revoked",
      expected: "active",
      operator: "strictEqual",
      message: /Fresh grant must create active membership before the race/,
    });
  });
});
