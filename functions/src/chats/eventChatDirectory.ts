import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import {
  Change,
  DocumentSnapshot,
  onDocumentWritten,
} from "firebase-functions/v2/firestore";
import {readEventChatAccess} from "./eventChatAccess";
import {defineProjections} from "../platform/dispatch/runtime";

type Data = FirebaseFirestore.DocumentData | undefined;

/**
 * eventChatDirectoryEntries/{eventId}_{uid}: one row per event chat a person
 * may see in their chat list, rebuilt from current authority whenever an
 * input changes. The app lists its own rows with one listener; opening a
 * chat still goes through the access and message callables, which re-check
 * admission and hide blocked senders per viewer.
 */
export const eventChatDirectoryEntries = "eventChatDirectoryEntries";

export const eventChatDirectoryEntryId = (eventId: string, uid: string) =>
  `${eventId}_${uid}`;

const pageSize = 300;

/**
 * One person's row for one event chat from current authority, or null when
 * they have no access or the event is no longer active. Admission, the
 * event, the room and the membership decide it exactly as getEventChatAccess
 * does.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {FirebaseFirestore.Transaction} tx The reading transaction.
 * @param {string} eventId The event chat.
 * @param {string} uid The person.
 * @param {number} nowMillis The clock.
 * @return {Promise<Record<string, unknown> | null>} The row, if any.
 */
export async function eventChatDirectoryEntry(
  db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction,
  eventId: string,
  uid: string,
  nowMillis: number,
): Promise<Record<string, unknown> | null> {
  let access: Awaited<ReturnType<typeof readEventChatAccess>>;
  try {
    access = await readEventChatAccess(db, tx, eventId, uid, nowMillis);
  } catch (error) {
    if (error instanceof HttpsError &&
        ["permission-denied", "not-found"].includes(error.code)) return null;
    throw error;
  }
  if (access.event.status !== "active") return null;
  const {view, room, member, event} = access;
  return {
    schemaVersion: 1,
    uid,
    eventId,
    organizerId: view.organizerId,
    title: view.title,
    role: view.role,
    eventStartAtMillis: typeof event.startTime?.toMillis === "function" ?
      event.startTime.toMillis() : null,
    room: {
      status: room?.status ?? "notCreated",
      revision: room?.revision ?? 0,
      opensAtMillis: room?.opensAtMillis ?? null,
      closesAtMillis: room?.closesAtMillis ?? null,
    },
    membership: {
      status: member?.status ?? "notJoined",
      revision: member?.revision ?? 0,
      notificationsMuted: member?.notificationsMuted === true,
    },
    profileClaimed: !view.profileClaimRequired,
    termsVersion: view.termsVersion,
    updatedAtMillis: nowMillis,
  };
}

/**
 * Rebuilds one person's row for one event chat; a person without access has
 * no row. Every call reads current state, so out-of-order triggers converge.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} eventId The event chat.
 * @param {string} uid The person.
 * @param {number} nowMillis The clock.
 * @return {Promise<"written" | "removed">} What happened to the row.
 */
export async function refreshEventChatDirectoryEntry(
  db: FirebaseFirestore.Firestore,
  eventId: string,
  uid: string,
  nowMillis = Date.now(),
): Promise<"written" | "removed"> {
  const ref = db.collection(eventChatDirectoryEntries)
    .doc(eventChatDirectoryEntryId(eventId, uid));
  return db.runTransaction(async (tx) => {
    const entry = await eventChatDirectoryEntry(db, tx, eventId, uid,
      nowMillis);
    if (entry === null) {
      tx.delete(ref);
      return "removed" as const;
    }
    tx.set(ref, entry);
    return "written" as const;
  });
}

/**
 * Rebuilds every existing row matching one field, a page at a time: all of an
 * event's rows when its room or details change, all of a person's rows when
 * their profile claim changes.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {"eventId" | "uid"} field Which side changed.
 * @param {string} value Its id.
 * @return {Promise<number>} Rows rebuilt.
 */
export async function refreshEventChatDirectoryEntriesFor(
  db: FirebaseFirestore.Firestore,
  field: "eventId" | "uid",
  value: string,
): Promise<number> {
  let count = 0;
  let after: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  for (;;) {
    let query = db.collection(eventChatDirectoryEntries)
      .where(field, "==", value)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(pageSize);
    if (after) query = query.startAfter(after);
    const page = await query.get();
    for (const row of page.docs) {
      const eventId = row.get("eventId");
      const uid = row.get("uid");
      if (typeof eventId === "string" && typeof uid === "string") {
        await refreshEventChatDirectoryEntry(db, eventId, uid);
        count++;
      }
    }
    if (page.docs.length < pageSize) return count;
    after = page.docs.at(-1);
  }
}

const stringField = (data: Data, field: string): string | null => {
  const value = data?.[field];
  return typeof value === "string" && value.length > 0 &&
    !value.includes("/") ? value : null;
};

const changed = (before: Data, after: Data, fields: string[]) =>
  fields.some((field) =>
    JSON.stringify(before?.[field] ?? null) !==
      JSON.stringify(after?.[field] ?? null));

/**
 * The (eventId, uid) rows a write to a per-person source can change: a chat
 * membership or a booking (uid field), or a roster row (linkedUid field).
 * @param {Data} before The previous version.
 * @param {Data} after The new version.
 * @param {"uid" | "linkedUid"} personField Which field names the person.
 * @param {string[]} fields The fields whose change matters.
 * @return {Array<[string, string]>} Distinct event and person pairs.
 */
export function eventChatDirectoryPairs(
  before: Data,
  after: Data,
  personField: "uid" | "linkedUid",
  fields: string[],
): Array<[string, string]> {
  if (before && after && !changed(before, after,
    ["eventId", personField, ...fields])) return [];
  const pairs = new Map<string, [string, string]>();
  for (const data of [before, after]) {
    const eventId = stringField(data, "eventId");
    const uid = stringField(data, personField);
    if (eventId && uid) pairs.set(`${eventId}_${uid}`, [eventId, uid]);
  }
  return [...pairs.values()];
}

async function refreshPairs(pairs: Array<[string, string]>) {
  const db = admin.firestore();
  for (const [eventId, uid] of pairs) {
    await refreshEventChatDirectoryEntry(db, eventId, uid);
  }
}

type Written = {data?: Change<DocumentSnapshot>; params: {documentId: string}};
const versions = (event: Written) =>
  [event.data?.before.data(), event.data?.after.data()] as const;
const options = {retry: true, memory: "256MiB" as const};

export const onEventChatDirectoryMembershipWritten = onDocumentWritten({
  ...options, document: "eventChatMemberships/{documentId}",
}, (event) => refreshPairs(eventChatDirectoryPairs(...versions(event), "uid",
  ["status", "revision", "notificationsMuted"])));

export const onEventChatDirectoryParticipationWritten = onDocumentWritten({
  ...options, document: "eventBookings/{documentId}",
}, (event) => refreshPairs(eventChatDirectoryPairs(...versions(event), "uid",
  ["status", "organizerId"])));

/**
 * A linked guest's roster row: their chat directory row.
 * Served by dispatchEventAttendees (issue #2451); it re-reads its sources,
 * so a retry or a replay converges.
 */
export const eventChatDirectoryAttendeeProjections = defineProjections(
  "eventAttendees", [{
    id: "eventChatDirectory", kind: "projection",
    when: () => true,
    run: (change) => refreshPairs(eventChatDirectoryPairs(change.before,
      change.after, "linkedUid", ["status", "organizerId"])),
  }]);

export const onEventChatDirectoryRoomWritten = onDocumentWritten({
  ...options, document: "eventChatRooms/{documentId}",
}, async (event) => {
  const [before, after] = versions(event);
  if (before && after && before.revision === after.revision) return;
  await refreshEventChatDirectoryEntriesFor(admin.firestore(), "eventId",
    event.params.documentId);
});

/**
 * An event's name, status, organizer or start: its chat directory rows.
 * Served by the events dispatcher (issue #2451); it re-reads its
 * sources, so a retry or a replay converges.
 */
export const eventChatDirectoryEventProjections = defineProjections("events", [{
  id: "eventChatDirectory", kind: "projection",
  when: ({before, after}) => !before || !after ||
    changed(before, after, ["name", "status", "organizerId",
      "startTime"]),
  run: (change, ctx) => refreshEventChatDirectoryEntriesFor(ctx.db,
    "eventId", change.documentId),
}]);

/**
 * Dispatcher specs (issue #2451). Each body re-reads its sources, so a
 * retry or a replay converges.
 */
export const usersProjections = defineProjections("users", [
  {
    id: "eventChatDirectoryUserWritten", kind: "projection",
    when: () => true,
    run: async (change) => {
      const {before, after, documentId} = change;
      if (before && after && !changed(before, after,
        ["displayName", "profileComplete", "profileClaimedAt", "deleted"])) {
        return;
      }
      await refreshEventChatDirectoryEntriesFor(admin.firestore(), "uid",
        documentId);
    },
  },
]);
