import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {getEventChatAccessHandler as get,
  updateEventChatAccessHandler as update} from "./eventChatAccess";
import {sendEventChatMessageHandler as send} from "./eventChatMessages";

const emulator = process.env.FIRESTORE_EMULATOR_HOST;
test("scheduled, announcement-only, paused and archived room authority",
  {skip: !emulator}, async () => {
    assert.match(emulator!, /^(127\.0\.0\.1|localhost):[0-9]+$/u);
    const suffix = randomUUID();
    const eventId = `event-${suffix}`;
    const organizerId = `org-${suffix}`;
    const host = `host-${suffix}`;
    const person = `person-${suffix}`;
    const app = initializeApp({projectId: "demo-catch-form-payments"}, suffix);
    const db = getEmulatorFirestore(app);
    let now = 500;
    const deps = {db: () => db, now: () => Timestamp.fromMillis(now),
      rateLimit: async () => undefined};
    const ref = (collection: string, id: string) => db.collection(collection)
      .doc(id);
    const request = (uid: string, data: object) => ({auth: {uid,
      token: {phone_number: "+919000000001"}},
    data: {expectedUid: uid, eventId, ...data}}) as CallableRequest<unknown>;
    const view = (uid: string) => get({auth: {uid}, data: {eventId}} as
      CallableRequest<unknown>, deps);
    const change = (uid: string, action: string, expectedRevision: number,
      timing: object = {}) => update(request(uid, {action, expectedRevision,
      requestId: randomUUID(), termsVersion: action === "join" ?
        "event-chat-v1" : null, ...timing}), deps);
    const message = (uid: string, kind = "text") => send(request(uid,
      {text: "Room update", replyToMessageId: null, kind,
        requestId: randomUUID()}), deps);
    try {
      await ref("events", eventId).set({organizerId, name: "Room",
        status: "active"});
      await ref("organizers", organizerId).set({ownerUserId: host,
        hostUserId: host, hostUserIds: [], hostProfiles: []});
      await ref("eventParticipations", `${eventId}_${person}`).set({
        eventId, organizerId, uid: person, status: "signedUp"});
      for (const uid of [host, person]) {
        await ref("users", uid).set({displayName: uid,
          profileComplete: true, profileRevision: 1});
      }
      await change(host, "schedule", 0, {opensAtMillis: 1000,
        closesAtMillis: 2000});
      assert.equal((await view(person)).room.status, "scheduled");
      assert.equal((await view(person)).canJoin, false);
      await assert.rejects(change(person, "join", 0),
        {code: "permission-denied"});
      now = 1000;
      assert.equal((await view(person)).room.status, "open");
      await change(person, "join", 0);
      await change(host, "join", 0);
      assert.equal((await view(person)).canPostMessages, true);
      await message(person);
      await change(host, "announcementsOnly", 1);
      assert.equal((await view(person)).canReadMessages, true);
      assert.equal((await view(person)).canPostMessages, false);
      assert.equal((await view(host)).canPostMessages, true);
      await assert.rejects(message(person), {code: "permission-denied"});
      await assert.rejects(message(host), {code: "permission-denied"});
      await message(host, "announcement");
      await change(host, "pause", 2);
      assert.equal((await view(person)).canReadMessages, true);
      assert.equal((await view(host)).canPostMessages, false);
      await assert.rejects(message(host, "announcement"),
        {code: "permission-denied"});
      await change(host, "resume", 3);
      now = 2000;
      assert.equal((await view(person)).room.status, "closed");
      assert.equal((await view(person)).canReadMessages, false);
      await assert.rejects(message(person), {code: "permission-denied"});
      await change(host, "archive", 4);
      assert.equal((await view(person)).room.status, "archived");
      await assert.rejects(change(host, "open", 5),
        {code: "permission-denied"});
    } finally {
      const batch = db.batch();
      for (const path of [ref("events", eventId),
        ref("organizers", organizerId),
        ref("eventParticipations", `${eventId}_${person}`),
        ref("eventChatRooms", eventId),
        ref("users", host), ref("users", person)]) batch.delete(path);
      for (const collection of ["eventChatAccessReceipts",
        "eventChatMemberships", "eventChatMessages"]) {
        const rows = await db.collection(collection)
          .where("eventId", "==", eventId).limit(100).get();
        for (const row of rows.docs) batch.delete(row.ref);
      }
      await batch.commit();
      await deleteApp(app);
    }
  });
