import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {eventChatMembershipId, updateEventChatAccessHandler} from
  "./eventChatAccess";
import {dispatchEventChatNotification,
  dispatchEventChatNotificationCandidates} from
  "./eventChatNotificationPolicy";
import {blockDocId} from "../safety/blocking";
import {activityNotificationId, buildFcmMessage,
  type FcmParams} from "../shared/notifications";

const emulator = process.env.FIRESTORE_EMULATOR_HOST;
test("queued chat previews suppress mute, leave, removal and closed rooms",
  {skip: !emulator}, async () => {
    assert.match(emulator!, /^(127\.0\.0\.1|localhost):[0-9]+$/u);
    const suffix = randomUUID();
    const eventId = `event-${suffix}`;
    const organizerId = `org-${suffix}`;
    const host = `host-${suffix}`;
    const person = `person-${suffix}`;
    const messageId = `message-${suffix}`;
    const app = initializeApp({projectId: "demo-catch-form-payments"}, suffix);
    const db = getEmulatorFirestore(app);
    const ref = (collection: string, id: string) => db.collection(collection)
      .doc(id);
    const member = (uid: string) => ref("eventChatMemberships",
      eventChatMembershipId(eventId, uid));
    const deps = {db: () => db, now: () => Timestamp.now(),
      rateLimit: async () => undefined};
    const change = (uid: string, action: string, revision: number) =>
      updateEventChatAccessHandler({auth: {uid,
        token: {phone_number: "+919000000001"}}, data: {expectedUid: uid,
        eventId, action, expectedRevision: revision,
        requestId: randomUUID(), termsVersion: action === "join" ?
          "event-chat-v1" : null}} as CallableRequest<unknown>, deps);
    const previews: FcmParams[] = [];
    const candidate = {eventId, messageId, recipientUid: person};
    const receipt = db.collection("notifications").doc(person)
      .collection("items").doc(activityNotificationId("message",
        `eventChat_${messageId}`));
    const fanout = () => dispatchEventChatNotificationCandidates({eventId,
      messageId}, {db: () => db, enabled: true,
      sink: async (preview) => {
        previews.push(preview);
      }});
    const dispatch = (enabled = true) => dispatchEventChatNotification(
      candidate, {db: () => db, enabled,
        sink: async (preview) => {
          previews.push(preview);
        }});
    try {
      await ref("events", eventId).set({organizerId, name: "Room",
        status: "active"});
      await ref("organizers", organizerId).set({ownerUserId: host,
        hostUserId: host, hostUserIds: [], hostProfiles: []});
      await ref("users", host).set({displayName: "Host",
        profileRevision: 1, profileComplete: true});
      await ref("users", person).set({displayName: "Participant",
        profileRevision: 1, profileComplete: false,
        profileClaimedAt: Timestamp.now()});
      await ref("users", person).collection("pushInstallations")
        .doc("synthetic").set({appRole: "consumer", token: "synthetic-token"});
      await ref("eventParticipations", `${eventId}_${person}`).set({
        eventId, organizerId, uid: person, status: "signedUp"});
      await change(host, "open", 0);
      await change(host, "join", 0);
      await change(person, "join", 0);
      await ref("eventChatMessages", messageId).set({eventId, organizerId,
        uid: host, sequence: 1, text: "Private message body",
        replyToMessageId: null, status: "visible", payloadHash: "hash",
        reactionCounts: {like: 0, love: 0, laugh: 0, wow: 0, sad: 0,
          thanks: 0}, createdAt: Timestamp.now(), removedAt: null});
      assert.equal(await dispatch(false), false);
      assert.equal(await fanout(), 1);
      assert.equal(previews.length, 1);
      assert.equal(JSON.stringify(previews).includes("Private message"),
        false);
      assert.deepEqual(buildFcmMessage(previews[0]).data, {
        type: "eventChatMessage", eventId, organizerId,
        messageId, notificationId: receipt.id, recipientUid: person,
        appRole: "consumer",
      });
      assert.equal(await dispatch(), false);
      assert.equal(await fanout(), 0);
      await receipt.delete();
      await assert.rejects(dispatchEventChatNotification(candidate, {
        db: () => db, enabled: true,
        sink: async () => {
          throw new Error("synthetic sink failure");
        },
      }), /synthetic sink failure/u);
      assert.equal(await dispatch(), false);
      await receipt.delete();
      for (const [blocker, blocked] of [[person, host], [host, person]]) {
        const edge = ref("blocks", blockDocId(blocker, blocked));
        await edge.set({blockerUserId: blocker, blockedUserId: blocked,
          createdAt: Timestamp.now(), source: "chat"});
        assert.equal(await dispatch(), false);
        assert.equal(await fanout(), 0);
        await edge.delete();
      }
      await ref("users", person).update({prefsMessages: false});
      assert.equal(await dispatch(), false);
      await ref("users", person).update({prefsMessages: true, deleted: true});
      assert.equal(await dispatch(), false);
      await ref("users", person).update({deleted: false});
      await ref("deletedUsers", person).set({deletedAt: Timestamp.now()});
      assert.equal(await dispatch(), false);
      await ref("deletedUsers", person).delete();
      await ref("users", person).collection("pushInstallations")
        .doc("synthetic").delete();
      assert.equal(await dispatch(), false);
      await ref("users", person).collection("pushInstallations")
        .doc("synthetic").set({appRole: "consumer", token: "synthetic-token"});
      await change(person, "mute", 1);
      assert.equal(await dispatch(), false);
      assert.equal(await fanout(), 0);
      await change(person, "unmute", 2);
      await change(person, "leave", 3);
      assert.equal(await dispatch(), false);
      assert.equal(await fanout(), 0);
      await change(person, "join", 4);
      await member(person).update({status: "removed", revision: 6});
      assert.equal(await dispatch(), false);
      await member(person).update({status: "joined", revision: 7});
      await change(host, "close", 1);
      assert.equal(await dispatch(), false);
    } finally {
      const batch = db.batch();
      for (const path of [ref("events", eventId),
        ref("organizers", organizerId), ref("users", host),
        ref("users", person), ref("deletedUsers", person),
        ref("eventChatRooms", eventId),
        ref("eventChatMessages", messageId), member(host), member(person),
        ref("blocks", blockDocId(person, host)),
        ref("blocks", blockDocId(host, person)),
        ref("eventParticipations", `${eventId}_${person}`)]) {
        batch.delete(path);
      }
      batch.delete(receipt);
      batch.delete(ref("users", person).collection("pushInstallations")
        .doc("synthetic"));
      const receipts = await db.collection("eventChatAccessReceipts")
        .where("eventId", "==", eventId).limit(100).get();
      for (const row of receipts.docs) batch.delete(row.ref);
      await batch.commit();
      await deleteApp(app);
    }
  });
