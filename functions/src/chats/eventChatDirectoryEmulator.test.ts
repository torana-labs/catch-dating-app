import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Timestamp} from "firebase-admin/firestore";
import {eventChatMembershipId} from "./eventChatAccess";
import {eventChatDirectoryEntries, refreshEventChatDirectoryEntriesFor,
  refreshEventChatDirectoryEntry} from "./eventChatDirectory";

const emulator = process.env.FIRESTORE_EMULATOR_HOST;
test("directory rows follow current admission, room and membership",
  {skip: !emulator}, async () => {
    assert.match(emulator!, /^(127\.0\.0\.1|localhost):[0-9]+$/u);
    const suffix = randomUUID();
    const uid = `guest-${suffix}`; const other = `other-${suffix}`;
    const organizerId = `organizer-${suffix}`;
    const app = initializeApp({projectId: "demo-catch-form-payments"}, suffix);
    const db = getEmulatorFirestore(app);
    const written: FirebaseFirestore.DocumentReference[] = [];
    const put = async (collection: string, id: string, data: object) => {
      const ref = db.collection(collection).doc(id);
      written.push(ref);
      await ref.set(data);
      return ref;
    };
    const id = (key: string) => `${key}-${suffix}`;
    const row = (key: string) => db.collection(eventChatDirectoryEntries)
      .doc(`${id(key)}_${uid}`);
    try {
      await put("users", uid, {displayName: "Guest", profileComplete: true});
      await put("organizers", organizerId, {ownerUserId: other,
        hostUserId: other, hostUserIds: [], hostProfiles: []});
      const keys = ["native", "imported", "cancelled", "waiting", "conflict",
        "duplicate", "closed", "inactive"];
      for (const key of keys) {
        await put("events", id(key), {organizerId, name: key,
          startTime: Timestamp.fromMillis(1_800_000_000_000),
          status: key === "inactive" ? "cancelled" : "active"});
      }
      for (const key of ["native", "cancelled", "conflict", "closed",
        "inactive"]) {
        await put("eventBookings", `${id(key)}_${uid}`, {
          eventId: id(key), organizerId, uid,
          status: ["cancelled", "conflict"].includes(key) ?
            "cancelled" : "signedUp"});
      }
      for (const key of ["imported", "waiting", "conflict", "duplicate"]) {
        await put("eventAttendees", id(`attendee-${key}`), {eventId: id(key),
          organizerId, linkedUid: uid,
          status: key === "waiting" ? "waitlisted" : "registered"});
      }
      await put("eventAttendees", id("duplicate-second"), {
        eventId: id("duplicate"), organizerId, linkedUid: uid,
        status: "registered"});
      const memberId = eventChatMembershipId(id("native"), uid);
      await put("eventChatMemberships", memberId,
        {eventId: id("native"), organizerId, uid, status: "joined",
          revision: 1, termsVersion: "event-chat-v1",
          joinedAt: Timestamp.now(), leftAt: null, createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()});
      await put("eventChatRooms", id("closed"), {eventId: id("closed"),
        organizerId, status: "closed", revision: 1});
      await put("eventChatRooms", id("native"), {eventId: id("native"),
        organizerId, status: "open", revision: 2, opensAtMillis: null,
        closesAtMillis: null});

      const outcomes: Record<string, string> = {};
      for (const key of keys) {
        outcomes[key] = await refreshEventChatDirectoryEntry(db, id(key), uid,
          1_700_000_000_000);
      }
      assert.deepEqual(outcomes, {native: "written", imported: "written",
        cancelled: "removed", waiting: "removed", conflict: "removed",
        duplicate: "removed", closed: "written", inactive: "removed"});
      const native = (await row("native").get()).data();
      assert.deepEqual(native, {schemaVersion: 1, uid, eventId: id("native"),
        organizerId, title: "native", role: "attendee",
        eventStartAtMillis: 1_800_000_000_000,
        room: {status: "open", revision: 2, opensAtMillis: null,
          closesAtMillis: null},
        membership: {status: "joined", revision: 1,
          notificationsMuted: false},
        profileClaimed: true, termsVersion: "event-chat-v1",
        updatedAtMillis: 1_700_000_000_000});
      assert.equal((await row("imported").get()).data()?.room.status,
        "notCreated");
      assert.equal((await row("closed").get()).data()?.room.status, "closed");

      // A cancelled booking removes the row on the next rebuild.
      await db.collection("eventBookings").doc(`${id("native")}_${uid}`)
        .update({status: "cancelled"});
      assert.equal(await refreshEventChatDirectoryEntry(db, id("native"), uid),
        "removed");
      assert.equal((await row("native").get()).exists, false);

      // A profile change rebuilds every row the person has.
      await db.collection("users").doc(uid).update({displayName: ""});
      await db.collection("users").doc(uid).update({profileComplete: false});
      assert.equal(
        await refreshEventChatDirectoryEntriesFor(db, "uid", uid), 2);
      assert.equal((await row("imported").get()).data()?.profileClaimed, false);
    } finally {
      const rows = await db.collection(eventChatDirectoryEntries)
        .where("uid", "==", uid).get();
      await Promise.all([...written, ...rows.docs.map((doc) => doc.ref)]
        .map((ref) => ref.delete()));
      await deleteApp(app);
    }
  });
