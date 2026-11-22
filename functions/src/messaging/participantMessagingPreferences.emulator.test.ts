import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {organizerCommunicationPreferenceId} from
  "../shared/organizerCommunicationPreferences";
import {withdrawParticipantMessagingPermissionHandler as withdraw} from
  "./participantMessagingPreferences";

const emulator = process.env.FIRESTORE_EMULATOR_HOST;
test("Firestore serializes sender withdrawals",
  {skip: !emulator}, async () => {
    assert.match(emulator!, /^(127\.0\.0\.1|localhost):[0-9]+$/u);
    const suffix = Date.now().toString();
    const uid = `permission-${suffix}`;
    const organizerId = `organizer-${suffix}`;
    const app = initializeApp({projectId: "demo-catch-form-payments"}, uid);
    const db = getEmulatorFirestore(app);
    const deps = {db: () => db, now: () => Timestamp.now(),
      rateLimit: async () => undefined};
    const request = (data: unknown) => ({auth: {uid, token: {}}, data}) as
      unknown as CallableRequest<unknown>;
    const catchRequest = request({scope: "catch", organizerId: null,
      expectedReceiptId: null, requestId: "stop-catch"});
    try {
      await db.doc(`organizers/${organizerId}`).set({name: "Demo organizer"});
      const pair = await Promise.all([
        withdraw(catchRequest, deps), withdraw(catchRequest, deps),
      ]);
      assert.equal(pair[0].preference.receiptId, pair[1].preference.receiptId);
      assert.deepEqual(pair.map((v) => v.replayed).sort(), [false, true]);
      const race = await Promise.allSettled(["first", "second"].map(
        (requestId) => withdraw(request({scope: "organizer", organizerId,
          expectedReceiptId: null, requestId}), deps)));
      assert.equal(race.filter((r) => r.status === "fulfilled").length, 1);
      const rejected = race.find((r) => r.status === "rejected");
      assert.ok(rejected?.status === "rejected");
      assert.equal(rejected.reason.code, "aborted");
      const catchPreference = await db
        .doc(`catchCommunicationPreferences/${uid}`).get();
      assert.equal(catchPreference.get("whatsapp.status"), "optedOut");
      const organizerPreference = await db.doc(
        "organizerCommunicationPreferences/" +
        organizerCommunicationPreferenceId(organizerId, uid)).get();
      assert.equal(organizerPreference.get("organizerId"), organizerId);
      assert.equal(organizerPreference.get("whatsapp.status"), "optedOut");
    } finally {
      const batch = db.batch();
      for (const collection of ["catchCommunicationPermissionReceipts",
        "organizerCommunicationPermissionReceipts"]) {
        const rows = await db.collection(collection).where("uid", "==", uid)
          .limit(10).get();
        for (const row of rows.docs) batch.delete(row.ref);
      }
      batch.delete(db.doc(`catchCommunicationPreferences/${uid}`));
      batch.delete(db.doc("organizerCommunicationPreferences/" +
        organizerCommunicationPreferenceId(organizerId, uid)));
      batch.delete(db.doc(`organizers/${organizerId}`));
      await batch.commit();
      await deleteApp(app);
    }
  });
