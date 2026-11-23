import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import {randomUUID} from "node:crypto";
import * as admin from "firebase-admin";
import {initializeApp, deleteApp} from "firebase-admin/app";
import {createRequire} from "node:module";
import {baseSeed, request} from "../shared/testing/programFixtures";
import {
  requireProgramAccess,
  requireProgramGuestDirectoryAccess,
} from "../shared/programAuthority";
import {grantProgramStaffHandler, revokeProgramStaffHandler} from
  "./programStaff";

// FIX-10 (#2474): programme authority is never a projection. This runs
// against the Firestore emulator alone (emulators:exec --only firestore), so
// no Functions trigger is loaded: whatever the rules and callables see right
// after a command returns is what that command's own transaction wrote.

// The client SDK's types need a newer lib; load the test clients untyped,
// as the other rules-reading emulator tests do.
const requireTestClient = createRequire(__filename);
const {assertFails, assertSucceeds, initializeTestEnvironment} =
  requireTestClient("@firebase/rules-unit-testing");
const {doc, getDoc} = requireTestClient("firebase/firestore");

const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const rules = fs.readFileSync(path.resolve(__dirname, "..", "..", "..",
  "firestore.rules"), "utf8");

test("a grant and its revocation are in force for rules and callables the " +
  "moment each command commits, whatever the view says",
{skip: !enabled}, async () => {
  const id = randomUUID().slice(0, 8);
  const projectId = `demo-catch-access-${id}`;
  const app = initializeApp({projectId}, projectId);
  const db = getEmulatorFirestore(app);
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(":");
  const env = await initializeTestEnvironment({projectId,
    firestore: {rules, host, port: Number(port)}});
  const programId = "program-1";
  const seed = baseSeed();
  const deps = {firestore: () => db, checkRateLimit: async () => undefined,
    now: () => admin.firestore.Timestamp.now(),
    getUserByPhoneNumber: async () => ({uid: "desk-1",
      displayName: "Synthetic Desk"})} as never;
  const asDesk = () => env.authenticatedContext("desk-1",
    {phone_number: "+919900001111"}).firestore();
  const readDirectory = () => getDoc(doc(asDesk(),
    "programGuestDirectoryViews", "guest__g1"));
  const viewRef = db.doc(`programAccessViews/${programId}__desk-1`);
  const grantRef = db.doc(`accessGrants/program__${programId}__desk-1`);
  try {
    await db.doc("organizers/org-1").set(seed["organizers/org-1"]);
    await db.doc(`organizerPrograms/${programId}`).set(
      seed["organizerPrograms/program-1"]);
    await db.doc("programGuestDirectoryViews/guest__g1").set({programId,
      organizerId: "org-1", kind: "guest", sourceId: "g1", version: 1});
    // The owner's access document exists only from programme creation; the
    // seed bypassed it, and the callables read the programme itself.
    await assertFails(getDoc(doc(env.authenticatedContext("manager-1")
      .firestore(), "programGuestDirectoryViews", "guest__g1")));

    const granted = await grantProgramStaffHandler(request({programId,
      phoneNumber: "+919900001111",
      expiresAtMillis: Date.now() + 3_600_000,
      duties: [{duty: "guestRelations", pickupPointIds: [], hotelIds: []}],
    }, "manager-1"), deps);
    const access = (await grantRef.get()).data();
    assert.equal(access?.status, "active");
    assert.equal(access?.role, "staff");
    assert.ok(access?.reach.programAll.guestRelations > Date.now());
    assert.equal((await viewRef.get()).data()?.status, "active");
    assert.equal((await db.doc(`programStaffViews/${programId}__desk-1`)
      .get()).data()?.revoked, false);
    await assertSucceeds(readDirectory());

    // The callable decides from the grant with no view at all.
    const liveView = (await viewRef.get()).data()!;
    await viewRef.delete();
    await assertSucceeds(readDirectory());
    requireProgramGuestDirectoryAccess(await requireProgramAccess({db,
      programId, actorUid: "desk-1"}));

    await revokeProgramStaffHandler(request({programId, uid: "desk-1",
      expectedRevision: granted.revision}, "manager-1"), deps);
    assert.equal((await grantRef.get()).data()?.status, "inactive");
    assert.equal((await viewRef.get()).data()?.status, "inactive");
    assert.equal((await db.doc(`programStaffViews/${programId}__desk-1`)
      .get()).data()?.revoked, true);
    await assertFails(readDirectory());

    // A stale view that still says live changes nothing for either side.
    await viewRef.set(liveView);
    await assertFails(readDirectory());
    await assert.rejects(requireProgramAccess({db, programId,
      actorUid: "desk-1"}), {code: "permission-denied"});
  } finally {
    await env.cleanup();
    await db.terminate();
    await deleteApp(app);
  }
});
