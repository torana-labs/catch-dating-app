import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {listEventChatParticipantsHandler as list} from
  "./listEventChatParticipants";
import {eventChatMembershipId as memberId} from "./eventChatAccess";
import {blockDocId} from "../safety/blocking";
import type {ListEventChatParticipantsCallableResponse as Result} from
  "../shared/generated/listEventChatParticipantsCallableResponse";
import {contractValidator} from "../shared/contractTestValidators";

const valid =
  contractValidator<Result>(
    "ListEventChatParticipantsCallableResponse"
  );

const emulator = process.env.FIRESTORE_EMULATOR_HOST;
test("Firestore room participants are current, bounded and private",
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
    const refs: FirebaseFirestore.DocumentReference[] = [];
    const ref = (collection: string, id: string) => db.collection(collection)
      .doc(id);
    const put = async (collection: string, id: string, value: object) => {
      const doc = ref(collection, id);
      refs.push(doc);
      await doc.set(value);
      return doc;
    };
    const deps = {db: () => db, now: () => now,
      rateLimit: async () => undefined};
    const request = (uid = host, data: object = {}) => ({
      auth: {uid, token: {}},
      data: {eventId, expectedUid: uid, cursor: null, limit: 10, ...data},
    }) as CallableRequest<unknown>;
    const read = () => list(request(), deps);
    const member = (uid: string, status = "joined") => ({uid, eventId,
      organizerId, status, revision: 1, termsVersion: "event-chat-v1",
      joinedAt: now, leftAt: null, createdAt: now, updatedAt: now});
    try {
      await put("events", eventId, {organizerId, name: "Private event",
        status: "active"});
      await put("organizers", organizerId, {ownerUserId: host, hostUserId: host,
        hostUserIds: [], hostProfiles: []});
      const room = await put("eventChatRooms", eventId, {eventId, organizerId,
        status: "open", revision: 1});
      for (const uid of [host, person]) {
        await put("users", uid, {displayName: uid === host ? "Host" : "Sara",
          profileClaimedAt: now, profileComplete: false,
          phoneNumber: "+919000000001", email: "private@example.test",
          occupation: "Private occupation"});
        await put("eventChatMemberships", memberId(eventId, uid), member(uid));
      }
      const admission = await put("eventParticipations", `${eventId}_${person}`,
        {eventId, organizerId, uid: person,
          status: "signedUp"});
      await t.test("silent participants expose no answers", async () => {
        const result = await read();
        assert.ok(valid(result), JSON.stringify(valid.errors));
        assert.deepEqual(
          result.items.sort((a, b) => a.uid.localeCompare(b.uid)), [
            {uid: host, displayName: "Host", role: "host",
              membershipStatus: "joined", membershipRevision: 1},
            {uid: person, displayName: "Sara", role: "attendee",
              membershipStatus: "joined", membershipRevision: 1},
          ].sort((a, b) => a.uid.localeCompare(b.uid)));
        assert.equal(result.nextCursor, null);
        assert.equal(
          JSON.stringify(result).includes("Private occupation"), false);
      });
      await t.test("managers see removed or banned revision; subject cannot",
        async () => {
          const subject = ref("eventChatMemberships", memberId(eventId,
            person));
          for (const status of ["removed", "banned"]) {
            await subject.update({status, revision: 2});
            const owner = await read();
            assert.ok(valid(owner), JSON.stringify(valid.errors));
            assert.equal(owner.items.find((row) => row.uid === person)
              ?.membershipStatus, status);
            assert.equal(owner.items.find((row) => row.uid === person)
              ?.membershipRevision, 2);
            await assert.rejects(list(request(person), deps),
              {code: "permission-denied"});
          }
          await subject.update({status: "joined", revision: 1});
        });
      await t.test("browsing needs membership and account", async () => {
        for (const req of [request("outsider"),
          request(host, {expectedUid: person}),
          request(host, {cursor: {accountUid: person, eventId, after: "a"}}),
          request(host, {cursor: {accountUid: host,
            eventId: "other", after: "a"}})]) {
          await assert.rejects(list(req, deps), {code: "permission-denied"});
        }
        await room.update({status: "closed"});
        await assert.rejects(read(), {code: "permission-denied"});
        await room.update({status: "open"});
      });
      await t.test("both block directions hide the participant", async () => {
        for (const [a, b] of [[host, person], [person, host]]) {
          const block = await put("blocks", blockDocId(a, b), {
            blockerUserId: a, blockedUserId: b});
          assert.deepEqual((await read()).items.map((row) => row.uid), [host]);
          await block.delete();
        }
      });
      await t.test("admission and identity stay live", async () => {
        const checks: [
          FirebaseFirestore.DocumentReference, object, object,
        ][] = [
          [admission, {status: "cancelled"}, {status: "signedUp"}],
          [ref("eventChatMemberships", memberId(eventId, person)),
            {status: "left"}, {status: "joined"}],
          [ref("users", person), {profileClaimedAt: null},
            {profileClaimedAt: now}],
        ];
        for (const [doc, removed, restore] of checks) {
          await doc.update(removed);
          assert.deepEqual((await read()).items.map((row) => row.uid), [host]);
          await doc.update(restore);
        }
        const deleted = await put("deletedUsers", person,
          {status: "processing"});
        assert.deepEqual((await read()).items.map((row) => row.uid), [host]);
        await deleted.delete();
      });
      await t.test("filtered scans advance without duplicates", async () => {
        // The first candidate is not a canonical membership; it cannot publish
        // an identity, but still has a valid continuation for the next page.
        await put("eventChatMemberships", `000-${suffix}`, member(person));
        const first = await list(request(host, {limit: 1}), deps);
        assert.ok(valid(first), JSON.stringify(valid.errors));
        assert.deepEqual(first.items, []);
        assert.ok(first.nextCursor);
        const found: string[] = [];
        let cursor: Result["nextCursor"] = first.nextCursor;
        while (cursor) {
          const result = await list(request(host, {limit: 1, cursor}), deps);
          found.push(...result.items.map((row) => row.uid));
          cursor = result.nextCursor;
        }
        assert.deepEqual(found.sort(), [host, person].sort());
        await ref("eventChatMemberships", memberId(eventId, host))
          .update({status: "left"});
        await assert.rejects(
          list(request(host, {cursor: first.nextCursor}), deps),
          {code: "permission-denied"});
      });
    } finally {
      const batch = db.batch();
      for (const doc of refs) batch.delete(doc);
      await batch.commit();
      await deleteApp(app);
    }
  });
