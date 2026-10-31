import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {listEventChatsHandler as list} from "./listEventChats";
import type {ListEventChatsCallableResponse as Result} from
  "../shared/generated/listEventChatsCallableResponse";
import {validateListEventChatsCallableResponse as valid} from
  "../shared/generated/validators/listEventChatsOutput";
import {eventChatMembershipId} from "./eventChatAccess";

const emulator = process.env.FIRESTORE_EMULATOR_HOST;
test("Firestore directory discovers admitted native and imported rooms only",
  {skip: !emulator}, async () => {
    assert.match(emulator!, /^(127\.0\.0\.1|localhost):[0-9]+$/u);
    const suffix = randomUUID();
    const uid = `guest-${suffix}`; const other = `other-${suffix}`;
    const organizerId = `organizer-${suffix}`;
    const app = initializeApp({projectId: "demo-catch-form-payments"}, suffix);
    const db = getEmulatorFirestore(app);
    const deps = {db: () => db, rateLimit: async () => undefined};
    const written: FirebaseFirestore.DocumentReference[] = [];
    const put = async (collection: string, id: string, data: object) => {
      const ref = db.collection(collection).doc(id);
      written.push(ref);
      await ref.set(data);
      return ref;
    };
    const id = (key: string) => `${key}-${suffix}`;
    const request = (cursor: Result["nextCursor"], limit = 1) => ({
      auth: {uid, token: {}}, data: {cursor, limit},
    }) as CallableRequest<unknown>;
    try {
      await put("organizers", organizerId, {ownerUserId: other,
        hostUserId: other, hostUserIds: [], hostProfiles: []});
      for (const key of ["native", "imported", "cancelled", "waiting",
        "conflict", "duplicate", "closed", "foreign", "inactive"]) {
        await put("events", id(key), {organizerId, name: key, status: key === "inactive" ? "cancelled" : "active"});
      }
      for (const key of ["native", "cancelled", "conflict", "closed",
        "inactive"]) {
        await put("eventParticipations", `${id(key)}_${uid}`, {
          eventId: id(key), organizerId, uid,
          status: ["cancelled", "conflict"].includes(key) ?
            "cancelled" : "signedUp"});
      }
      for (const key of ["imported", "waiting", "conflict", "duplicate",
        "foreign"]) {
        await put("eventAttendees", id(`attendee-${key}`), {eventId: id(key),
          organizerId, linkedUid: key === "foreign" ? other : uid,
          status: key === "waiting" ? "waitlisted" : "registered"});
      }
      await put("eventAttendees", id("duplicate-second"), {
        eventId: id("duplicate"), organizerId, linkedUid: uid,
        status: "registered"});
      for (const key of ["native", "cancelled", "missing"]) {
        await put("eventChatMemberships", eventChatMembershipId(id(key), uid), {
          eventId: id(key), organizerId, uid, status: "joined", revision: 1,
          termsVersion: "event-chat-v1", joinedAt: Timestamp.now(),
          leftAt: null, createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()});
      }
      await put("eventChatRooms", id("closed"), {eventId: id("closed"),
        organizerId, status: "closed", revision: 1});
      let cursor: Result["nextCursor"] = null;
      const found = new Map<string, Result["items"][number]>();
      const cursors = new Set<string>();
      let emptyContinuation = false;
      for (let page = 0; page < 25; page++) {
        const result = await list(request(cursor), deps);
        assert.equal(valid(result), true, JSON.stringify(valid.errors));
        assert.ok(result.items.length <= 1);
        for (const item of result.items) found.set(item.eventId, item);
        if (!result.items.length && result.nextCursor) emptyContinuation = true;
        cursor = result.nextCursor;
        if (!cursor) break;
        const key = JSON.stringify(cursor);
        assert.equal(cursors.has(key), false, "cursor must advance");
        cursors.add(key);
      }
      assert.equal(cursor, null, "all sources must terminate");
      assert.equal(emptyContinuation, true);
      assert.deepEqual([...found.keys()].sort(),
        ["native", "imported", "closed"].map(id).sort());
      assert.equal(found.get(id("native"))!.profileClaimRequired, true);
      assert.equal(found.get(id("native"))!.canReadMessages, false);
      assert.equal(found.get(id("closed"))!.room.status, "closed");

      await db.collection("eventParticipations").doc(`${id("native")}_${uid}`)
        .update({status: "cancelled"});
      const first = await list(request(null, 10), deps);
      assert.equal(first.items.some((item) => item.eventId === id("native")),
        false, "stale membership cannot keep a cancelled entry visible");
      await put("deletedUsers", uid, {status: "processing"});
      await assert.rejects(list(request(null), deps),
        {code: "permission-denied"});
    } finally {
      const batch = db.batch();
      for (const ref of written) batch.delete(ref);
      await batch.commit();
      await deleteApp(app);
    }
  });
