import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import {
  Change,
  DocumentSnapshot,
  FirestoreEvent,
  onDocumentWritten,
} from "firebase-functions/v2/firestore";
import {operationCollections} from "../operations/collections";
import {EVENT_ASSISTANCE_MESSAGES} from
  "../eventSuccess/operations/firestoreMessageOutbox";
import {ASSISTANCE_WORKFLOW} from
  "../eventSuccess/operations/liveWorkRecords";
import {eventDeliveryViewsCollection, reconcileEventDeliveryView} from
  "./eventDeliveryViewStore";
import {
  distinctIds,
  isAssistanceId,
  pagedIds,
  perGuestFanoutLimit,
  sameFields,
  valueAt,
} from "./liveViewFanout";

type SourceData = FirebaseFirestore.DocumentData | undefined;

export type EventDeliveryViewSource =
  | "eventAssistanceMessages"
  | "eventAssistanceGuests"
  | "eventAttendees"
  | "events"
  | "operationWorkItems"
  | "operationRuns"
  | "organizers";

/** Attendee fields projectHostDelivery reads: identity, generation, name. */
export const deliveryViewAttendeeFields = [
  "eventId",
  "organizerId",
  "displayName",
  "status",
  "createdAt",
] as const;

/** Event fields the guest source facts and the message window read. */
export const deliveryViewEventFields = [
  "organizerId",
  "status",
  "endTime",
] as const;

/** Organizer fields that decide who manages it, and so handoff authority. */
export const deliveryViewOrganizerFields = [
  "hostUserId",
  "ownerUserId",
  "hostUserIds",
  "hostProfiles",
] as const;

const runIdPattern = /^run:delivery:([a-f0-9]{64})$/;
const messageIdPattern = /^outbox:[a-f0-9]{64}$/;

const isLiveIntent = (data: SourceData) =>
  valueAt(data, "intent.context.mode") === "live";

const isDeliveryWork = (data: SourceData) =>
  data?.workflowId === ASSISTANCE_WORKFLOW &&
  data?.entityKind === "message_delivery";

/** A guest's or attendee's live messages in one event, bounded. */
async function guestMessageIds(
  db: FirebaseFirestore.Firestore,
  attendeeId: unknown,
  eventId: unknown
): Promise<string[]> {
  if (!isAssistanceId(attendeeId) || !isAssistanceId(eventId)) return [];
  const snapshot = await db.collection(EVENT_ASSISTANCE_MESSAGES)
    .where("intent.attendeeId", "==", attendeeId)
    .where("intent.eventId", "==", eventId)
    .limit(perGuestFanoutLimit + 1)
    .get();
  if (snapshot.size > perGuestFanoutLimit) {
    logger.error("A guest has more event messages than one fan-out " +
      "evaluates.", {attendeeId, eventId, limit: perGuestFanoutLimit});
  }
  return snapshot.docs.slice(0, perGuestFanoutLimit)
    .filter((doc) => isLiveIntent(doc.data()))
    .map((doc) => doc.id);
}

async function collect(ids: AsyncGenerator<string>): Promise<string[]> {
  const found: string[] = [];
  for await (const id of ids) if (isAssistanceId(id)) found.push(id);
  return found;
}

/**
 * The messages whose delivery view a source write can change, from both the
 * old and the new version. Old data is only a routing hint: every evaluation
 * rereads current sources. Skips are optimisations for updates only.
 */
export async function resolveEventDeliveryViewIds(
  db: FirebaseFirestore.Firestore,
  source: EventDeliveryViewSource,
  documentId: string,
  before: SourceData,
  after: SourceData
): Promise<string[]> {
  switch (source) {
  case "eventAssistanceMessages":
    return isLiveIntent(before) || isLiveIntent(after) ? [documentId] : [];
  case "eventAssistanceGuests":
  case "eventAttendees": {
    if (source === "eventAttendees" &&
        sameFields(before, after, deliveryViewAttendeeFields)) return [];
    const pairs = [before, after].map((data) => source === "eventAttendees" ?
      [documentId, data?.eventId] :
      [data?.attendeeId, valueAt(data, "context.eventId")]);
    const ids: string[] = [];
    const seen = new Set<string>();
    for (const [attendeeId, eventId] of pairs) {
      const key = `${attendeeId}|${eventId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      ids.push(...await guestMessageIds(db, attendeeId, eventId));
    }
    return [...new Set(ids)];
  }
  case "events":
    if (sameFields(before, after, deliveryViewEventFields)) return [];
    return collect(pagedIds(db.collection(EVENT_ASSISTANCE_MESSAGES)
      .where("intent.context.mode", "==", "live")
      .where("intent.eventId", "==", documentId)));
  case "operationWorkItems":
    return distinctIds([before, after]
      .filter(isDeliveryWork)
      .map((data) => data?.externalKey)
      .filter((key) => typeof key === "string" && messageIdPattern.test(key)));
  case "operationRuns": {
    // A delivery run and its work item share one key derived from the
    // message id, and the work item names the message.
    const match = runIdPattern.exec(documentId);
    if (!match || ![before, after].some((data) =>
      data?.workflowId === ASSISTANCE_WORKFLOW)) return [];
    const item = (await db.collection(operationCollections.workItems)
      .doc("work:delivery:" + match[1]).get()).data();
    return isDeliveryWork(item) && typeof item?.externalKey === "string" &&
      messageIdPattern.test(item.externalKey) ? [item.externalKey] : [];
  }
  case "organizers":
    if (sameFields(before, after, deliveryViewOrganizerFields)) return [];
    return collect(pagedIds(db.collection(eventDeliveryViewsCollection)
      .where("organizerId", "==", documentId)
      .where("view.handling.kind", "==", "manual")));
  }
}

const options = {retry: true, memory: "512MiB" as const};

/** Re-evaluates every delivery view a source write can affect. */
async function reconcileForWrite(
  source: EventDeliveryViewSource,
  event: FirestoreEvent<Change<DocumentSnapshot> | undefined,
    {documentId: string}>
): Promise<void> {
  const db = admin.firestore();
  const messageIds = await resolveEventDeliveryViewIds(db, source,
    event.params.documentId, event.data?.before.data(),
    event.data?.after.data());
  for (const messageId of messageIds) {
    await reconcileEventDeliveryView(db, messageId);
  }
}

export const onHostEventDeliveryViewMessageChanged = onDocumentWritten({
  ...options, document: "eventAssistanceMessages/{documentId}",
}, (event) => reconcileForWrite("eventAssistanceMessages", event));
export const onHostEventDeliveryViewGuestChanged = onDocumentWritten({
  ...options, document: "eventAssistanceGuests/{documentId}",
}, (event) => reconcileForWrite("eventAssistanceGuests", event));
export const onHostEventDeliveryViewAttendeeChanged = onDocumentWritten({
  ...options, document: "eventAttendees/{documentId}",
}, (event) => reconcileForWrite("eventAttendees", event));
export const onHostEventDeliveryViewEventChanged = onDocumentWritten({
  ...options, document: "events/{documentId}",
}, (event) => reconcileForWrite("events", event));
export const onHostEventDeliveryViewWorkItemChanged = onDocumentWritten({
  ...options, document: "operationWorkItems/{documentId}",
}, (event) => reconcileForWrite("operationWorkItems", event));
export const onHostEventDeliveryViewRunChanged = onDocumentWritten({
  ...options, document: "operationRuns/{documentId}",
}, (event) => reconcileForWrite("operationRuns", event));
export const onHostEventDeliveryViewOrganizerChanged = onDocumentWritten({
  ...options, document: "organizers/{documentId}",
}, (event) => reconcileForWrite("organizers", event));
