import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {eventChatMembershipId, getEventChatAccessHandler,
  updateEventChatAccessHandler} from "./eventChatAccess";
import {manageEventChatMemberHandler} from "./manageEventChatMember";

const emulator = process.env.FIRESTORE_EMULATOR_HOST;
test("manager moderation fences old access and requires a fresh rejoin",
  {skip: !emulator}, async () => {
    assert.match(emulator!, /^(127\.0\.0\.1|localhost):[0-9]+$/u);
    const suffix = randomUUID();
    const eventId = `event-${suffix}`;
    const organizerId = `org-${suffix}`;
    const host = `host-${suffix}`;
    const person = `person-${suffix}`;
    const outsider = `outsider-${suffix}`;
    const app = initializeApp({projectId: "demo-catch-form-payments"}, suffix);
    const db = getEmulatorFirestore(app);
    const deps = {db: () => db, now: () => Timestamp.now(),
      rateLimit: async () => undefined};
    const ref = (collection: string, id: string) => db.collection(collection)
      .doc(id);
    const memberRef = ref("eventChatMemberships",
      eventChatMembershipId(eventId, person));
    const participation = ref("eventParticipations", `${eventId}_${person}`);
    const request = (uid: string, data: object) => ({auth: {uid,
      token: {phone_number: "+919000000001"}}, data: {expectedUid: uid,
      ...data}}) as unknown as CallableRequest<unknown>;
    const access = (uid: string) => getEventChatAccessHandler(
      {auth: {uid}, data: {eventId}} as CallableRequest<unknown>, deps);
    const change = (uid: string, action: string, revision: number) =>
      updateEventChatAccessHandler(request(uid, {eventId, action,
        expectedRevision: revision, requestId: randomUUID(),
        termsVersion: action === "join" ? "event-chat-v1" : null}), deps);
    const moderate = (uid: string, action: string, revision: number,
      requestId = randomUUID()) => manageEventChatMemberHandler(request(uid,
      {eventId, targetUid: person, action, expectedRevision: revision,
        requestId}), deps);
    try {
      await ref("events", eventId).set({organizerId, name: "Room",
        status: "active"});
      await ref("organizers", organizerId).set({ownerUserId: host,
        hostUserId: host, hostUserIds: [], hostProfiles: []});
      await participation.set({eventId, organizerId, uid: person,
        status: "signedUp"});
      await ref("users", person).set({displayName: "Participant",
        profileRevision: 1, profileComplete: false,
        profileClaimedAt: Timestamp.now(), prefsShowInCrossPaths: false});
      await change(host, "open", 0);
      await change(person, "join", 0);
      assert.equal((await access(person)).canReadMessages, true);
      await assert.rejects(moderate(outsider, "ban", 1),
        {code: "permission-denied"});
      const removeId = randomUUID();
      const removed = await moderate(host, "remove", 1, removeId);
      assert.deepEqual(removed, {revision: 2, replayed: false});
      assert.deepEqual(await moderate(host, "remove", 1, removeId),
        {revision: 2, replayed: true});
      assert.equal((await access(person)).canReadMessages, false);
      assert.equal((await access(person)).canJoin, false);
      await assert.rejects(change(person, "join", 2),
        {code: "permission-denied"});
      await assert.rejects(change(person, "leave", 2),
        {code: "permission-denied"});
      await assert.rejects(moderate(host, "ban", 1), {code: "aborted"});
      await moderate(host, "ban", 2);
      assert.equal((await memberRef.get()).data()?.status, "banned");
      await participation.update({status: "cancelled"});
      await assert.rejects(moderate(host, "reinstate", 3),
        {code: "permission-denied"});
      await participation.update({status: "signedUp"});
      await moderate(host, "reinstate", 3);
      assert.equal((await memberRef.get()).data()?.status, "left");
      assert.equal((await access(person)).canReadMessages, false);
      await change(person, "join", 4);
      assert.equal((await access(person)).canReadMessages, true);
      await assert.rejects(moderate(host, "remove", 4), {code: "aborted"});
    } finally {
      const batch = db.batch();
      for (const path of [ref("events", eventId),
        ref("organizers", organizerId), participation, memberRef,
        ref("eventChatRooms", eventId), ref("users", person)]) {
        batch.delete(path);
      }
      const receipts = await db.collection("eventChatAccessReceipts")
        .where("eventId", "==", eventId).limit(100).get();
      for (const row of receipts.docs) batch.delete(row.ref);
      await batch.commit();
      await deleteApp(app);
    }
  });
