import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {updateEventChatAccessHandler as access} from "./eventChatAccess";
import {sendEventChatMessageHandler as send,
  setEventChatReactionHandler as react, setEventChatTypingHandler as typing}
  from "./eventChatMessages";
import {listEventChatMessagesHandler as list} from "./listEventChatMessages";
import {validateListEventChatMessagesCallableResponse as validList} from
  "../shared/generated/validators/listEventChatMessagesOutput";
import {validateSendEventChatMessageCallableResponse as validSend} from
  "../shared/generated/validators/sendEventChatMessageOutput";
import {validateEventChatMessageDocument as validMessage} from
  "../shared/generated/validators/eventChatMessageDocument";
import {validateEventChatReactionDocument as validReaction} from
  "../shared/generated/validators/eventChatReactionDocument";
import {validateEventChatPresenceDocument as validPresence} from
  "../shared/generated/validators/eventChatPresenceDocument";
import {blockDocId} from "../safety/blocking";
import {chatHash} from "./eventChatMessageShared";

const emulator = process.env.FIRESTORE_EMULATOR_HOST;
test("event messages fence retries, protect replies and expire typing",
  {skip: !emulator}, async (t) => {
    assert.match(emulator!, /^(127\.0\.0\.1|localhost):[0-9]+$/u);
    const suffix = randomUUID();
    const eventId = `event-${suffix}`;
    const organizerId = `org-${suffix}`;
    const host = `host-${suffix}`;
    const person = `person-${suffix}`;
    const stranger = `stranger-${suffix}`;
    const app = initializeApp({projectId: "demo-catch-form-payments"}, suffix);
    const db = getEmulatorFirestore(app);
    let now = Timestamp.now();
    const deps = {db: () => db, now: () => now,
      rateLimit: async () => undefined};
    const ref = (collection: string, id: string) => db.collection(collection)
      .doc(id);
    const request = (uid: string, data: object) => ({auth: {uid,
      token: {phone_number: "+919000000001"}}, data: {eventId,
      ...("limit" in data ? {} : {expectedUid: uid}), ...data}}) as
      unknown as CallableRequest<unknown>;
    const change = (uid: string, action: string, expectedRevision: number) =>
      access(request(uid, {action, expectedRevision, requestId: randomUUID(),
        termsVersion: action === "join" ? "event-chat-v1" : null}), deps);
    const message = (uid: string, text: string,
      replyToMessageId: string | null = null) => request(uid, {text,
      replyToMessageId, requestId: randomUUID()});
    const page = (uid = person, beforeSequence: number | null = null,
      limit = 30) => list(request(uid, {beforeSequence, limit}), deps);
    const participation = ref("eventParticipations", `${eventId}_${person}`);
    const block = ref("blocks", blockDocId(person, host));
    const reverseBlock = ref("blocks", blockDocId(host, person));
    const paths = [ref("events", eventId), ref("organizers", organizerId),
      ref("eventChatRooms", eventId), participation, block, reverseBlock,
      ...[host, person, stranger].flatMap((uid) =>
        [ref("users", uid), ref("deletedUsers", uid)])];
    try {
      await ref("events", eventId).set({organizerId, name: "Demo event",
        status: "active"});
      await ref("organizers", organizerId).set({ownerUserId: host,
        hostUserId: host, hostUserIds: [], hostProfiles: []});
      await participation.set({eventId, organizerId, uid: person,
        status: "signedUp"});
      for (const uid of [host, person]) {
        await ref("users", uid).set({
          displayName: uid === host ? "Host" : "Sara",
          profileComplete: false, profileClaimedAt: now,
          occupation: "Never expose the entire profile"});
      }
      await change(host, "open", 0);
      await change(host, "join", 0);
      await change(person, "join", 0);
      const firstRequest = message(host, "  Welcome everyone 👋  ");
      const candidates: {eventId: string; messageId: string}[] = [];
      const sendDeps = {...deps, notificationDispatch: async (item: {
        eventId: string; messageId: string}) => {
        candidates.push(item);
      }};
      const duplicates = await Promise.all([send(firstRequest, sendDeps),
        send(firstRequest, sendDeps)]);
      const first = duplicates[0];
      assert.deepEqual(duplicates.map((r) => r.replayed).sort(), [false, true]);
      assert.deepEqual(candidates, [{eventId, messageId: first.messageId}]);
      assert.ok(validSend(first));
      assert.equal(first.sequence, 1);
      await assert.rejects(send({...firstRequest, data: {
        ...firstRequest.data as object, text: "Changed"}}, deps),
      {code: "already-exists"});
      const second = await send(
        message(person, "See you there", first.messageId), deps);
      const third = await send(message(host, "Meet at the entrance"), deps);
      await t.test("cursor order, reply identity and room reopen stay stable",
        async () => {
          const latest = await page(person, null, 2);
          assert.ok(validList(latest));
          assert.deepEqual(latest.messages.map((m) => m.sequence), [3, 2]);
          assert.equal(latest.nextBeforeSequence, 2);
          assert.equal(latest.messages[1].reply?.text, "Welcome everyone 👋");
          assert.equal(latest.messages[1].reply?.senderName, "Host");
          const older = await page(person, latest.nextBeforeSequence, 2);
          assert.deepEqual(older.messages.map((m) => m.sequence), [1]);
          assert.equal(older.nextBeforeSequence, null);
          assert.equal(JSON.stringify(latest).includes("occupation"), false);
          await change(host, "close", 1);
          await assert.rejects(page(), {code: "permission-denied"});
          await assert.rejects(send(firstRequest, deps),
            {code: "permission-denied"});
          await change(host, "open", 2);
          const next = await send(message(host, "Reopened"), deps);
          assert.equal(next.sequence, 4);
        });
      await t.test("distinct concurrent sends allocate unique ordered pages",
        async () => {
          const [a, b] = await Promise.all([
            send(message(person, "Concurrent attendee update"), deps),
            send(message(host, "Concurrent host update"), deps),
          ]);
          assert.deepEqual([a.sequence, b.sequence].sort((x, y) => x - y),
            [5, 6]);
          const newest = await page(person, null, 2);
          assert.deepEqual(newest.messages.map((row) => row.sequence),
            [6, 5]);
          assert.equal(newest.nextBeforeSequence, 5);
          const older = await page(person, newest.nextBeforeSequence, 2);
          assert.deepEqual(older.messages.map((row) => row.sequence),
            [4, 3]);
        });
      await t.test("one reaction per person, CAS and payload-bound replay",
        async () => {
          const action = request(person, {messageId: first.messageId,
            reaction: "love", expectedRevision: 0, requestId: randomUUID()});
          const results = await Promise.all([react(action, deps),
            react(action, deps)]);
          assert.deepEqual(results.map((r) => r.replayed).sort(),
            [false, true]);
          const current = (await page()).messages.find((m) =>
            m.messageId === first.messageId)!;
          assert.equal(current.myReaction, "love");
          assert.equal(current.myReactionRevision, 1);
          assert.equal(current.reactionCounts.love, 1);
          await assert.rejects(react(request(person, {
            messageId: first.messageId, reaction: "like", expectedRevision: 0,
            requestId: randomUUID()}), deps), {code: "aborted"});
          await react(request(person, {messageId: first.messageId,
            reaction: null, expectedRevision: 1, requestId: randomUUID()}),
          deps);
          await react(action, deps);
          assert.equal((await page()).messages.find((m) =>
            m.messageId === first.messageId)!.reactionCounts.love, 0);
          await assert.rejects(react({...action, data: {
            ...action.data as object, reaction: "thanks"}}, deps),
          {code: "already-exists"});
        });
      await t.test("typing expires and late starts cannot undo stops",
        async () => {
          const start = request(host, {isTyping: true, expectedRevision: 0});
          const active = await typing(start, deps);
          assert.equal(active.expiresAtMillis, now.toMillis() + 10000);
          assert.deepEqual((await page()).typing.map((p) => p.displayName),
            ["Host"]);
          assert.equal((await page(host)).ownTypingRevision, 1);
          assert.deepEqual((await page(host)).typing, []);
          await typing(request(host, {isTyping: false, expectedRevision: 1}),
            deps);
          await assert.rejects(typing(start, deps), {code: "aborted"});
          assert.deepEqual((await page()).typing, []);
          await typing(request(host, {isTyping: true, expectedRevision: 2}),
            deps);
          now = Timestamp.fromMillis(now.toMillis() + 10001);
          assert.deepEqual((await page()).typing, []);
        });
      await t.test("both block directions redact messages and reply quotes",
        async () => {
          for (const edge of [block, reverseBlock]) {
            await typing(request(host, {isTyping: true,
              expectedRevision: (await page(host)).ownTypingRevision}), deps);
            await edge.set({createdAt: now});
            const hidden = await page();
            assert.equal(hidden.messages.find((m) =>
              m.messageId === first.messageId)!.text, null);
            assert.equal(hidden.messages.find((m) =>
              m.messageId === second.messageId)!.reply?.available, false);
            assert.equal(hidden.messages.find((m) =>
              m.messageId === second.messageId)!.reply?.senderUid, null);
            assert.deepEqual(hidden.typing, []);
            await assert.rejects(send(message(person, "Reply", first.messageId),
              deps), {code: "permission-denied"});
            await assert.rejects(react(request(person, {
              messageId: first.messageId, reaction: "like", expectedRevision: 2,
              requestId: randomUUID()}), deps), {code: "permission-denied"});
            await edge.delete();
          }
        });
      await t.test("removed and cross-room parents never leak through replies",
        async () => {
          await ref("eventChatMessages", first.messageId).update({
            status: "removed", text: null, removedAt: now});
          let result = await page();
          assert.equal(result.messages.find((m) =>
            m.messageId === second.messageId)!.reply?.text, null);
          await assert.rejects(send(message(person, "Reply", first.messageId),
            deps), {code: "permission-denied"});
          await ref("eventChatMessages", third.messageId).update({
            eventId: `foreign-${suffix}`});
          paths.push(ref("eventChatMessages", third.messageId));
          await assert.rejects(send(message(person, "Reply", third.messageId),
            deps), {code: "permission-denied"});
          await ref("eventChatMessages", second.messageId).update({
            replyToMessageId: third.messageId});
          result = await page();
          assert.equal(result.messages.find((m) =>
            m.messageId === second.messageId)!.reply?.text, null);
        });
      await t.test("moderation blocks writes or flags once in the same commit",
        async () => {
          await assert.rejects(send(message(person, "   "), deps),
            {code: "invalid-argument"});
          await assert.rejects(send(message(person, "I will kill you"), deps),
            {code: "invalid-argument"});
          const flagged = message(person, "WhatsApp me later");
          const sent = await send(flagged, deps);
          await send(flagged, deps);
          const flags = await db.collection("moderationFlags")
            .where("contextId", "==", sent.messageId).limit(5).get();
          assert.equal(flags.size, 1);
          paths.push(...flags.docs.map((d) => d.ref));
          assert.equal(flags.docs[0].data().status, "pending");
        });
      await t.test("pre-change text receipt still replays", async () => {
        const old = message(person, "Legacy replay");
        const oldId = chatHash([eventId, person,
          (old.data as {requestId: string}).requestId]);
        const source = (await ref("eventChatMessages", first.messageId).get())
          .data()!;
        await ref("eventChatMessages", oldId).set({...source,
          uid: person, sequence: 100, text: "Legacy replay",
          replyToMessageId: null,
          payloadHash: chatHash(["Legacy replay", null])});
        assert.deepEqual(await send(old, deps), {messageId: oldId,
          sequence: 100, replayed: true});
        await assert.rejects(send({...old, data: {...old.data as object,
          text: "Changed"}}, deps), {code: "already-exists"});
      });
      await t.test("revocation and tombstones deny reads and writes",
        async () => {
          await assert.rejects(page(stranger), {code: "permission-denied"});
          await typing(request(person, {isTyping: true, expectedRevision: 0}),
            deps);
          await participation.update({status: "cancelled"});
          assert.deepEqual((await page(host)).typing, []);
          await assert.rejects(page(), {code: "permission-denied"});
          await assert.rejects(send(message(person, "Hi"), deps),
            {code: "permission-denied"});
          await assert.rejects(typing(request(person, {isTyping: true,
            expectedRevision: 1}), deps), {code: "permission-denied"});
          await typing(request(person, {isTyping: false, expectedRevision: 1}),
            deps);
          await participation.update({status: "signedUp"});
          await ref("deletedUsers", host).set({status: "processing"});
          const result = await page();
          assert.ok(result.messages.filter((m) => m.senderUid === host)
            .every((m) => !m.available));
          assert.equal(result.messages.find((m) => m.sequence === 4)!.text,
            null);
          await assert.rejects(page(host), {code: "permission-denied"});
          await assert.rejects(send(firstRequest, deps),
            {code: "permission-denied"});
        });
      for (const [collection, validate] of [
        ["eventChatMessages", validMessage],
        ["eventChatReactions", validReaction],
        ["eventChatPresence", validPresence],
      ] as const) {
        const rows = await db.collection(collection)
          .where("eventId", "==", eventId).limit(100).get();
        assert.ok(rows.size > 0);
        for (const row of rows.docs) {
          assert.ok(validate(row.data()),
            `${collection}: ${JSON.stringify(validate.errors)}`);
        }
      }
    } finally {
      const batch = db.batch();
      for (const path of paths) batch.delete(path);
      for (const collection of ["eventChatAccessReceipts",
        "eventChatMemberships",
        "eventChatMessages", "eventChatReactions", "eventChatPresence"]) {
        const rows = await db.collection(collection)
          .where("eventId", "==", eventId).limit(100).get();
        for (const row of rows.docs) batch.delete(row.ref);
      }
      await batch.commit();
      await deleteApp(app);
    }
  });
