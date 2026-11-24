import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import {randomUUID} from "node:crypto";
import {createRequire} from "node:module";
import {Timestamp} from "firebase-admin/firestore";
import {initializeApp, deleteApp} from "firebase-admin/app";
import type {CallableRequest} from "firebase-functions/v2/https";
import {grantEventStaffHandler, revokeEventStaffHandler} from "./eventStaff";

// #2474 step 2: an event operator's authority is the access document the
// staff command writes in its own transaction. Only the Firestore emulator
// runs here, so no trigger is loaded: what rules see right after a command
// returns is what that command committed.

const requireTestClient = createRequire(__filename);
const {assertFails, assertSucceeds, initializeTestEnvironment} =
  requireTestClient("@firebase/rules-unit-testing");
const {collection, doc, getDoc, getDocs, query, where} =
  requireTestClient("firebase/firestore");

const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const rules = fs.readFileSync(path.resolve(__dirname, "..", "..", "..",
  "firestore.rules"), "utf8");

test("an event staff grant and its revocation are in force for rules the " +
  "moment each command commits, whatever the grant record says",
{skip: !enabled}, async () => {
  const id = randomUUID().slice(0, 8);
  const projectId = `demo-catch-event-access-${id}`;
  const app = initializeApp({projectId}, projectId);
  const db = getEmulatorFirestore(app);
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(":");
  const env = await initializeTestEnvironment({projectId,
    firestore: {rules, host, port: Number(port)}});
  const eventId = "event-1";
  const deps = {firestore: () => db, checkRateLimit: async () => undefined,
    now: () => Timestamp.now(),
    getUserByPhoneNumber: async () => ({uid: "operator-1",
      displayName: "Synthetic Operator"})} as never;
  const asOperator = () => env.authenticatedContext("operator-1",
    {phone_number: "+919900002222"}).firestore();
  const readRoster = () => getDocs(query(collection(asOperator(),
    "eventAttendees"), where("eventId", "==", eventId)));
  const readEvent = () => getDoc(doc(asOperator(), "events", eventId));
  const grantRef = db.doc(`eventStaffGrants/${eventId}__operator-1`);
  const accessRef = db.doc(`accessGrants/event__${eventId}__operator-1`);
  try {
    await db.doc("organizers/club-1").set({hostUserId: "host-1",
      ownerUserId: "host-1", hostUserIds: ["host-1"], hostProfiles: [],
      name: "Sunset Striders"});
    await db.doc(`events/${eventId}`).set({organizerId: "club-1",
      publicationState: "private", title: "Synthetic Evening Run"});
    await db.doc("eventAttendees/attendee-1").set({eventId,
      organizerId: "club-1", displayName: "Asha Shah",
      phoneE164: "+919876543210", status: "registered"});

    await grantEventStaffHandler({auth: {uid: "host-1"}, data: {eventId,
      phoneNumber: "+919900002222",
      expiresAtMillis: Date.now() + 3_600_000}} as CallableRequest, deps);
    const access = (await accessRef.get()).data();
    assert.equal(access?.status, "active");
    assert.ok(access?.reach.permissions.viewRoster > Date.now());
    await assertSucceeds(readRoster());
    await assertSucceeds(readEvent());

    const liveGrant = (await grantRef.get()).data()!;
    await revokeEventStaffHandler({auth: {uid: "host-1"}, data: {eventId,
      uid: "operator-1", expectedRevision: liveGrant.revision}} as
      CallableRequest, deps);
    assert.equal((await accessRef.get()).data()?.status, "inactive");
    await assertFails(readRoster());
    await assertFails(readEvent());

    // A grant record written back to live outside the commands changes
    // nothing: rules read only the access document.
    await grantRef.set(liveGrant);
    await assertFails(readRoster());
  } finally {
    await env.cleanup();
    await db.terminate();
    await deleteApp(app);
  }
});
