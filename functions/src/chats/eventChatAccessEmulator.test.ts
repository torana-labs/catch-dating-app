import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {createHash, randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {eventChatMembershipId, getEventChatAccessHandler as get,
  updateEventChatAccessHandler as update, requireEventChatMember} from
  "./eventChatAccess";
import type {GetEventChatAccessCallableResponse} from
  "../shared/generated/getEventChatAccessCallableResponse";
import {contractValidator} from "../shared/contractTestValidators";

const validView =
  contractValidator<GetEventChatAccessCallableResponse>(
    "GetEventChatAccessCallableResponse"
  );
const validRoom = contractValidator("EventChatRoomDocument");
const validMember = contractValidator("EventChatMembershipDocument");

const emulator = process.env.FIRESTORE_EMULATOR_HOST;
test("Firestore room access follows current authority and explicit choices",
  {skip: !emulator}, async () => {
    assert.match(emulator!, /^(127\.0\.0\.1|localhost):[0-9]+$/u);
    const suffix = randomUUID();
    const eventId = `event-${suffix}`;
    const organizerId = `org-${suffix}`;
    const host = `host-${suffix}`;
    const person = `person-${suffix}`;
    const imported = `imported-${suffix}`;
    const stranger = `stranger-${suffix}`;
    const app = initializeApp({projectId: "demo-catch-form-payments"}, suffix);
    const db = getEmulatorFirestore(app);
    const deps = {db: () => db, now: () => Timestamp.now(),
      rateLimit: async () => undefined};
    const ref = (collection: string, id: string) => db.collection(collection)
      .doc(id);
    const request = (uid: string, data: unknown) => ({auth: {uid,
      token: {phone_number: "+919000000001"}},
    data: {expectedUid: uid, ...data as object}}) as
      unknown as CallableRequest<unknown>;
    const change = (uid: string, action: string, expectedRevision: number,
      requestId = randomUUID()) => request(uid, {eventId, action,
      expectedRevision, requestId,
      termsVersion: action === "join" ? "event-chat-v1" : null});
    const view = (uid: string) => get({...request(uid, {}),
      data: {eventId}}, deps);
    const member = (uid: string) => ref("eventChatMemberships",
      eventChatMembershipId(eventId, uid));
    const participation = ref("eventParticipations", `${eventId}_${person}`);
    const attendeeId = `attendee-${suffix}`;
    const duplicateId = `duplicate-${suffix}`;
    const paths = [ref("events", eventId), ref("organizers", organizerId),
      ref("eventChatRooms", eventId), participation,
      ref("eventAttendees", attendeeId), ref("eventAttendees", duplicateId),
      ...[host, person, imported, stranger].flatMap((uid) =>
        [ref("users", uid), ref("deletedUsers", uid), member(uid)])];
    try {
      await ref("events", eventId).set({organizerId, name: "Demo event",
        status: "active"});
      await ref("organizers", organizerId).set({ownerUserId: host,
        hostUserId: host, hostUserIds: [], hostProfiles: []});
      await participation.set({eventId, organizerId, uid: person,
        status: "signedUp"});
      assert.equal((await view(person)).room.status, "notCreated");
      const open = change(host, "open", 0);
      const opens = await Promise.all([update(open, deps), update(open, deps)]);
      assert.deepEqual(opens.map((r) => r.replayed).sort(), [false, true]);
      assert.equal(validRoom((await ref("eventChatRooms", eventId).get())
        .data()), true);
      const unclaimed = await view(person);
      assert.equal(validView(unclaimed), true);
      assert.equal(unclaimed.profileClaimRequired, true);
      assert.equal(unclaimed.canJoin, false);
      await assert.rejects(update(change(person, "join", 0), deps),
        {code: "permission-denied"});
      assert.equal((await member(person).get()).exists, false);

      const profile = {displayName: "Sara Demo", profileRevision: 1,
        profileComplete: false, profileClaimedAt: Timestamp.now(),
        prefsShowInCrossPaths: false};
      await ref("users", person).set({displayName: "Private draft",
        profileRevision: 1, profileComplete: false});
      assert.equal((await view(person)).canJoin, false);
      await assert.rejects(update(change(person, "join", 0), deps),
        {code: "permission-denied"});
      await ref("users", person).set(profile);
      const join = change(person, "join", 0);
      await assert.rejects(update({...join, data: {...join.data as object,
        termsVersion: null}}, deps), {code: "failed-precondition"});
      await assert.rejects(update({...join, auth: {...join.auth!, token: {}}} as
        CallableRequest<unknown>, deps), {code: "failed-precondition"});
      const joins = await Promise.all([update(join, deps), update(join, deps)]);
      assert.deepEqual(joins.map((r) => r.replayed).sort(), [false, true]);
      assert.equal(validMember((await member(person).get()).data()), true);
      assert.equal((await view(person)).canReadMessages, true);
      const oldClose = change(host, "close", 1);
      const oldHash = (value: unknown) => createHash("sha256")
        .update(JSON.stringify(value)).digest("hex");
      await ref("eventChatAccessReceipts", oldHash([host,
        (oldClose.data as {requestId: string}).requestId])).set({eventId,
        uid: host, payloadHash: oldHash([eventId, "close", 1, null]),
        revision: 2, createdAt: Timestamp.now()});
      assert.deepEqual(await update(oldClose, deps),
        {revision: 2, replayed: true});
      await assert.rejects(update({...oldClose, data: {...oldClose.data as
        object, action: "open"}}, deps), {code: "already-exists"});
      assert.deepEqual((await ref("users", person).get()).data(), profile);
      assert.equal((await participation.get()).data()?.status, "signedUp");
      await assert.rejects(update(change(person, "open", 1), deps),
        {code: "permission-denied"});
      await assert.rejects(view(stranger), {code: "permission-denied"});
      await assert.rejects(update({...join, data: {...join.data as object,
        action: "leave", termsVersion: null}}, deps), {code: "already-exists"});
      await assert.rejects(update(change(person, "leave", 0), deps),
        {code: "aborted"});

      await update(change(host, "close", 1), deps);
      assert.equal((await view(person)).canReadMessages, false);
      await update(open, deps);
      assert.equal((await view(person)).room.status, "closed");
      await update(change(host, "open", 2), deps);
      await participation.update({status: "cancelled"});
      await assert.rejects(db.runTransaction((tx) =>
        requireEventChatMember(db, tx, eventId, person)),
      {code: "permission-denied"});
      await update(change(person, "leave", 1), deps);
      await update(join, deps);
      assert.equal((await member(person).get()).data()?.status, "left");

      await ref("users", imported).set(profile);
      const attendee = {eventId, organizerId, linkedUid: imported,
        status: "registered"};
      await ref("eventAttendees", attendeeId).set(attendee);
      await update(change(imported, "join", 0), deps);
      assert.equal((await view(imported)).canReadMessages, true);
      await ref("eventAttendees", duplicateId).set(attendee);
      await assert.rejects(view(imported), {code: "permission-denied"});
      await ref("eventAttendees", duplicateId).delete();
      await ref("eventAttendees", attendeeId).update({status: "waitlisted"});
      await assert.rejects(view(imported), {code: "permission-denied"});
      await ref("eventAttendees", attendeeId).update({status: "checkedIn"});
      assert.equal((await view(imported)).canReadMessages, true);
      await ref("events", eventId).update({status: "cancelled"});
      assert.equal((await view(imported)).canReadMessages, false);
      await assert.rejects(update(change(host, "open", 3), deps),
        {code: "permission-denied"});
      await ref("events", eventId).delete();
      await update(change(imported, "leave", 1), deps);
      await ref("deletedUsers", person).set({status: "processing"});
      await assert.rejects(update(join, deps), {code: "permission-denied"});
    } finally {
      const batch = db.batch();
      for (const path of paths) batch.delete(path);
      const receipts = await db.collection("eventChatAccessReceipts")
        .where("eventId", "==", eventId).limit(100).get();
      for (const row of receipts.docs) batch.delete(row.ref);
      await batch.commit();
      await deleteApp(app);
    }
  });
