import * as admin from "firebase-admin";
import {
  Change,
  DocumentSnapshot,
  FirestoreEvent,
  onDocumentWritten,
} from "firebase-functions/v2/firestore";

type SourceData = FirebaseFirestore.DocumentData | undefined;

/** One content-free change signal per event chat, listened to by the app. */
export const eventChatSignals = "eventChatSignals";

/**
 * Which counter moves. Sends, removals and reactions move the message
 * revision and typing moves the typing revision, both in the command's own
 * transaction so other members hear about it without a trigger in between;
 * room and membership changes move the access revision through triggers.
 */
export type EventChatSignalKind = "message" | "typing" | "access";

export type EventChatSignalSource = "eventChatRooms" | "eventChatMemberships";

const fieldByKind: Record<EventChatSignalKind, string> = {
  message: "messageRevision",
  typing: "typingRevision",
  access: "accessRevision",
};

/**
 * The event chats a source write changes, from both versions. Room
 * documents are keyed by event id; every other source names its event. A
 * send also stamps the room's last message sequence; only a new room
 * revision (open, close, schedule and the like) changes access.
 * @param {EventChatSignalSource} source The written collection.
 * @param {string} documentId The written document.
 * @param {SourceData} before The previous version.
 * @param {SourceData} after The new version.
 * @return {string[]} Distinct event ids.
 */
export function eventChatSignalEventIds(
  source: EventChatSignalSource,
  documentId: string,
  before: SourceData,
  after: SourceData,
): string[] {
  if (source === "eventChatRooms" && before && after &&
      before.revision === after.revision) return [];
  const values = source === "eventChatRooms" ?
    [documentId] : [before?.eventId, after?.eventId];
  return [...new Set(values.filter((value): value is string =>
    typeof value === "string" && value.length > 0))];
}

/**
 * Moves one counter of an event chat's signal. The document holds no
 * message text, names or membership, only revisions, so a replayed trigger
 * at worst asks the app to read once more.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} eventId The event chat.
 * @param {EventChatSignalKind} kind Which counter moves.
 * @return {Promise<void>} Resolves after the write.
 */
export async function bumpEventChatSignal(
  db: FirebaseFirestore.Firestore,
  eventId: string,
  kind: EventChatSignalKind,
): Promise<void> {
  await db.collection(eventChatSignals).doc(eventId)
    .set(signalPatch(eventId, kind), {merge: true});
}

/**
 * The same move inside a command's transaction, committed with its write.
 * @param {FirebaseFirestore.Transaction} tx The command's transaction.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} eventId The event chat.
 * @param {EventChatSignalKind} kind Which counter moves.
 */
export function bumpEventChatSignalIn(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  eventId: string,
  kind: EventChatSignalKind,
): void {
  tx.set(db.collection(eventChatSignals).doc(eventId),
    signalPatch(eventId, kind), {merge: true});
}

function signalPatch(eventId: string, kind: EventChatSignalKind) {
  return {
    eventId,
    [fieldByKind[kind]]: admin.firestore.FieldValue.increment(1),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

async function signalForWrite(
  source: EventChatSignalSource,
  event: FirestoreEvent<Change<DocumentSnapshot> | undefined,
    {documentId: string}>,
): Promise<void> {
  const db = admin.firestore();
  const eventIds = eventChatSignalEventIds(source, event.params.documentId,
    event.data?.before.data(), event.data?.after.data());
  for (const eventId of eventIds) {
    await bumpEventChatSignal(db, eventId, "access");
  }
}

const options = {retry: true, memory: "256MiB" as const};

export const onEventChatSignalRoomWritten = onDocumentWritten({
  ...options, document: "eventChatRooms/{documentId}",
}, (event) => signalForWrite("eventChatRooms", event));
export const onEventChatSignalMembershipWritten = onDocumentWritten({
  ...options, document: "eventChatMemberships/{documentId}",
}, (event) => signalForWrite("eventChatMemberships", event));
