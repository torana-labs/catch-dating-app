import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {initializeApp, deleteApp} from "firebase-admin/app";
import {baseSeed, request, now} from "../shared/testing/programFixtures";
import {inviteProgramStaffHandler} from "./programStaffInvites";

const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

test("Firestore serializes same-phone invite issuance, including empty queries",
  {skip: !enabled}, async () => {
    const id = randomUUID();
    const app = initializeApp({projectId: "demo-catch-rules"}, id);
    const db = getEmulatorFirestore(app);
    const programId = `staff-test-${id}`;
    const organizerId = `staff-org-${id}`;
    const seed = baseSeed();
    const deps = {firestore: () => db, checkRateLimit: async () => undefined,
      now: () => now} as never;
    const organizer = db.doc(`organizers/${organizerId}`);
    const program = db.doc(`organizerPrograms/${programId}`);
    const payload = {programId, phoneNumber: "+919900001111",
      displayName: "Synthetic Staff", expiresAtMillis: now.toMillis() + 60_000,
      duties: [{duty: "airportGreeter", pickupPointIds: [], hotelIds: []}]};
    const issue = (patch: object = {}) => inviteProgramStaffHandler(
      request({...payload, ...patch}, "manager-1"), deps);
    try {
      await organizer.set(seed["organizers/org-1"]);
      await program.set({...seed["organizerPrograms/program-1"], organizerId});
      const same = await Promise.all([issue(), issue(), issue()]);
      assert.equal(new Set(same.map((result) => result.entityId)).size, 1);
      assert.equal(same.filter((result) => !result.alreadyApplied).length, 1);
      const different = await Promise.allSettled([
        issue({phoneNumber: "+919900002222", displayName: "First request"}),
        issue({phoneNumber: "+919900002222", displayName: "Second request"}),
      ]);
      assert.equal(different.filter((r) => r.status === "fulfilled").length, 1);
      const rejected = different.find((r) => r.status === "rejected");
      assert.equal(rejected?.status === "rejected" ? rejected.reason.code :
        null, "failed-precondition");
      const invites = await db.collection("programStaffInvites")
        .where("programId", "==", programId).get();
      assert.equal(invites.size, 2);
      for (const doc of invites.docs) {
        assert.equal(doc.data().status, "pending");
        assert.equal(doc.data().organizerId, organizerId);
      }
    } finally {
      const invites = await db.collection("programStaffInvites")
        .where("programId", "==", programId).get();
      await Promise.all([...invites.docs.map((doc) => doc.ref.delete()),
        organizer.delete(), program.delete()]);
      await db.terminate();
      await deleteApp(app);
    }
  });
