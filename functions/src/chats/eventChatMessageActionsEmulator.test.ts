import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {updateEventChatAccessHandler as access} from "./eventChatAccess";
import {sendEventChatMessageHandler as send} from "./eventChatMessages";
import {actOnEventChatMessageHandler as act} from "./eventChatMessageActions";
import {listEventChatMessagesHandler as list} from "./listEventChatMessages";
import {blockDocId} from "../safety/blocking";
import {validateActOnEventChatMessageCallableResponse as valid} from
  "../shared/generated/validators/actOnEventChatMessageOutput";

const emulator = process.env.FIRESTORE_EMULATOR_HOST;
test("message safety actions enforce authority and replay boundaries",
  {skip: !emulator}, async (t) => {
    assert.match(emulator!, /^(127\.0\.0\.1|localhost):[0-9]+$/u);
    const suffix = randomUUID();
    const eventId = `event-${suffix}`;
    const organizerId = `org-${suffix}`;
    const host = `host-${suffix}`;
    const person = `person-${suffix}`;
    const app = initializeApp({projectId: "demo-catch-form-payments"}, suffix);
    const db = getEmulatorFirestore(app);
    const now = Timestamp.now();
    const deps = {db: () => db, now: () => now,
      rateLimit: async () => undefined};
    const refs: FirebaseFirestore.DocumentReference[] = [];
    const ref = (collection: string, id: string) => db.collection(collection)
      .doc(id);
    const put = async (collection: string, id: string, value: object) => {
      const doc = ref(collection, id);
      refs.push(doc);
      await doc.set(value);
      return doc;
    };
    const request = (uid: string, data: object) => ({auth: {uid,
      token: {phone_number: "+919000000001"}},
    data: {eventId, expectedUid: uid, ...data}}) as CallableRequest<unknown>;
    const command = (uid: string, messageId: string, action: string,
      reasonCode: string | null = null) => request(uid, {
      messageId, action, reasonCode, requestId: randomUUID()});
    const page = (uid = person) => list({auth: {uid}, data: {
      eventId, limit: 30, beforeSequence: null,
    }} as CallableRequest<unknown>, deps);
    const change = (uid: string, action: string) => access(request(uid, {
      action, expectedRevision: 0, requestId: randomUUID(),
      termsVersion: action === "join" ? "event-chat-v1" : null,
    }), deps);
    try {
      await put("events", eventId, {organizerId, name: "Demo event",
        status: "active"});
      const organizer = await put("organizers", organizerId,
        {ownerUserId: host, hostUserId: host,
          hostUserIds: [], hostProfiles: []});
      const participation = await put("eventParticipations",
        `${eventId}_${person}`, {eventId, organizerId, uid: person,
          status: "signedUp"});
      for (const uid of [host, person]) {
        await put("users", uid, {displayName: uid === host ? "Host" : "Sara",
          profileClaimedAt: now, profileComplete: false});
      }
      await change(host, "open");
      await change(host, "join");
      await change(person, "join");
      const welcome = await send(request(host, {text: "Welcome",
        replyToMessageId: null, requestId: randomUUID()}), deps);
      const reply = await send(request(person, {text: "Thank you",
        replyToMessageId: welcome.messageId, requestId: randomUUID()}), deps);
      await t.test("self and wrong-actor actions are denied", async () => {
        for (const req of [
          command(person, reply.messageId, "report", "spam"),
          command(person, reply.messageId, "block"),
          command(person, welcome.messageId, "remove"),
          request(person, {messageId: welcome.messageId, action: "block",
            reasonCode: null, requestId: randomUUID(), expectedUid: host}),
        ]) {
          await assert.rejects(act(req, deps), {code: "permission-denied"});
        }
        for (const req of [command(person, welcome.messageId, "report"),
          command(person, welcome.messageId, "block", "spam")]) {
          await assert.rejects(act(req, deps), {code: "invalid-argument"});
        }
      });
      await t.test("reports are private and idempotent", async () => {
        const req = command(person, welcome.messageId, "report", "harassment");
        const results = await Promise.all([act(req, deps), act(req, deps)]);
        assert.ok(results.every((result) => valid(result)));
        assert.deepEqual(results.map((result) => result.replayed).sort(),
          [false, true]);
        const reports = await db.collection("reports")
          .where("reporterUserId", "==", person).get();
        assert.equal(reports.size, 1);
        const stored = reports.docs[0].data();
        refs.push(reports.docs[0].ref);
        assert.equal(stored.targetUserId, host);
        assert.equal(stored.contextId,
          `eventChatMessages/${welcome.messageId}`);
        assert.equal(stored.reasonCode, "harassment");
        assert.equal(stored.text, undefined);
        assert.equal((await page()).messages.at(-1)?.available, true);
        await assert.rejects(act({...req, data: {
          ...req.data as object, reasonCode: "spam"}}, deps),
        {code: "already-exists"});
      });
      await t.test("blocks hide both ways", async () => {
        const req = command(person, welcome.messageId, "block");
        await act(req, deps);
        const block = ref("blocks", blockDocId(person, host));
        refs.push(block);
        const own = await page();
        assert.equal(own.messages.at(-1)?.available, false);
        assert.equal(own.messages[0].reply?.available, false);
        assert.equal((await page(host)).messages[0].available, false);
        await block.delete();
        assert.equal((await act(req, deps)).replayed, true);
        assert.equal((await block.get()).exists, false);
        assert.equal((await page()).messages.at(-1)?.available, true);
      });
      await t.test("current admission and authority are required", async () => {
        await participation.update({status: "cancelled"});
        await assert.rejects(act(command(person, welcome.messageId,
          "report", "spam"), deps), {code: "permission-denied"});
        await participation.update({status: "signedUp"});
        await organizer.update({ownerUserId: "other", hostUserId: "other"});
        await assert.rejects(
          act(command(host, reply.messageId, "remove"), deps),
          {code: "permission-denied"});
        await organizer.update({ownerUserId: host, hostUserId: host});
      });
      await t.test("removals redact content and reply previews", async () => {
        const req = command(host, welcome.messageId, "remove");
        await act(req, deps);
        const current = await page();
        assert.equal(current.messages.at(-1)?.available, false);
        assert.equal(current.messages.at(-1)?.text, null);
        assert.equal(current.messages[0].reply?.available, false);
        assert.equal(current.messages[0].reply?.text, null);
        assert.equal((await act(req, deps)).replayed, true);
        await act(command(host, reply.messageId, "remove"), deps);
        assert.ok((await page()).messages.every((row) => !row.available));
        const deleted = await put("deletedUsers", host, {status: "processing"});
        await assert.rejects(act(req, deps), {code: "permission-denied"});
        await deleted.delete();
      });
    } finally {
      const batch = db.batch();
      for (const collection of ["eventChatMemberships", "eventChatMessages",
        "eventChatAccessReceipts"]) {
        const docs = await db.collection(collection)
          .where("eventId", "==", eventId).get();
        for (const doc of docs.docs) batch.delete(doc.ref);
      }
      for (const doc of [...refs, ref("eventChatRooms", eventId)]) {
        batch.delete(doc);
      }
      await batch.commit();
      await deleteApp(app);
    }
  });
