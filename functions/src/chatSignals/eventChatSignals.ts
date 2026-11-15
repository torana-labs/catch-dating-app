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
 * Which counter a source write moves. Messages (sends, removals and reaction
 * counts all write the message document) refresh the message list at once;
 * typing presence is paced by the app; room and membership changes refresh
 * access.
 */
export type EventChatSignalKind = "message" | "typing" | "access";

export type EventChatSignalSource =
  | "eventChatMessages"
  | "eventChatPresence"
  | "eventChatRooms"
  | "eventChatMemberships";

const kindBySource: Record<EventChatSignalSource, EventChatSignalKind> = {
  eventChatMessages: "message",
  eventChatPresence: "typing",
  eventChatRooms: "access",
  eventChatMemberships: "access",
};

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
  await db.collection(eventChatSignals).doc(eventId).set({
    eventId,
    [fieldByKind[kind]]: admin.firestore.FieldValue.increment(1),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, {merge: true});
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
    await bumpEventChatSignal(db, eventId, kindBySource[source]);
  }
}

const options = {retry: true, memory: "256MiB" as const};

export const onEventChatSignalMessageWritten = onDocumentWritten({
  ...options, document: "eventChatMessages/{documentId}",
}, (event) => signalForWrite("eventChatMessages", event));
export const onEventChatSignalPresenceWritten = onDocumentWritten({
  ...options, document: "eventChatPresence/{documentId}",
}, (event) => signalForWrite("eventChatPresence", event));
export const onEventChatSignalRoomWritten = onDocumentWritten({
  ...options, document: "eventChatRooms/{documentId}",
}, (event) => signalForWrite("eventChatRooms", event));
export const onEventChatSignalMembershipWritten = onDocumentWritten({
  ...options, document: "eventChatMemberships/{documentId}",
}, (event) => signalForWrite("eventChatMemberships", event));
