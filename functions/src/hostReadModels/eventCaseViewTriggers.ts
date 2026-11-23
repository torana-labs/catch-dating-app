import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import {
  Change,
  DocumentSnapshot,
  FirestoreEvent,
  onDocumentWritten,
} from "firebase-functions/v2/firestore";
import {guestCollections} from "../eventSuccess/operations/guestRecords";
import {eventCaseViewsCollection, reconcileEventCaseView} from
  "./eventCaseViewStore";
import {distinctIds, isAssistanceId} from "./support/ids";
import {
  pagedIds,
  perGuestFanoutLimit,
  sameFields,
  valueAt,
} from "./support/fanout";
import {defineProjections} from "../platform/dispatch/runtime";

type SourceData = FirebaseFirestore.DocumentData | undefined;

export type EventCaseViewSource =
  | "eventAssistanceCases"
  | "eventAttendees"
  | "events"
  | "organizers";

/** Attendee fields projectHostCase reads: identity, generation and name. */
export const caseViewAttendeeFields = [
  "eventId",
  "organizerId",
  "displayName",
  "status",
  "createdAt",
] as const;

/** Event fields the guest source facts read. */
export const caseViewEventFields = [
  "organizerId",
  "status",
  "endTime",
] as const;

/** Organizer fields that decide who manages it, and so assignment authority. */
export const caseViewOrganizerFields = [
  "hostUserId",
  "ownerUserId",
  "hostUserIds",
  "hostProfiles",
] as const;

const isPracticalLiveCase = (data: SourceData) =>
  data?.owner === "eventLead" && valueAt(data, "context.mode") === "live";

/**
 * The cases whose view a source write can change, from both the old and the
 * new version. Old data is only a routing hint: every evaluation rereads
 * current sources. Skips are optimisations for updates only.
 */
export async function resolveEventCaseViewIds(
  db: FirebaseFirestore.Firestore,
  source: EventCaseViewSource,
  documentId: string,
  before: SourceData,
  after: SourceData
): Promise<string[]> {
  switch (source) {
  case "eventAssistanceCases":
    return isPracticalLiveCase(before) || isPracticalLiveCase(after) ?
      [documentId] : [];
  case "eventAttendees": {
    if (sameFields(before, after, caseViewAttendeeFields)) return [];
    const ids: string[] = [];
    for (const eventId of distinctIds([before?.eventId, after?.eventId])) {
      const snapshot = await db.collection(guestCollections.cases)
        .where("attendeeId", "==", documentId)
        .where("context.eventId", "==", eventId)
        .limit(perGuestFanoutLimit + 1)
        .get();
      if (snapshot.size > perGuestFanoutLimit) {
        logger.error("An attendee has more help requests than one fan-out " +
          "evaluates.", {attendeeId: documentId, eventId,
          limit: perGuestFanoutLimit});
      }
      ids.push(...snapshot.docs.slice(0, perGuestFanoutLimit)
        .filter((doc) => isPracticalLiveCase(doc.data()))
        .map((doc) => doc.id));
    }
    return [...new Set(ids)];
  }
  case "events": {
    if (sameFields(before, after, caseViewEventFields)) return [];
    return collect(pagedIds(db.collection(guestCollections.cases)
      .where("context.mode", "==", "live")
      .where("context.eventId", "==", documentId)
      .where("owner", "==", "eventLead")));
  }
  case "organizers": {
    if (sameFields(before, after, caseViewOrganizerFields)) return [];
    return collect(pagedIds(db.collection(eventCaseViewsCollection)
      .where("organizerId", "==", documentId)
      .where("status", "==", "open")));
  }
  }
}

async function collect(ids: AsyncGenerator<string>): Promise<string[]> {
  const found: string[] = [];
  for await (const id of ids) if (isAssistanceId(id)) found.push(id);
  return found;
}

const options = {retry: true, memory: "512MiB" as const};

/** Re-evaluates every case view a source write can affect. */
async function reconcileForChange(source: EventCaseViewSource,
  documentId: string,
  before: FirebaseFirestore.DocumentData | undefined,
  after: FirebaseFirestore.DocumentData | undefined): Promise<void> {
  const db = admin.firestore();
  const caseIds = await resolveEventCaseViewIds(db, source,
    documentId, before,
    after);
  for (const caseId of caseIds) {
    await reconcileEventCaseView(db, caseId);
  }
}

async function reconcileForWrite(
  source: EventCaseViewSource,
  event: FirestoreEvent<Change<DocumentSnapshot> | undefined,
    {documentId: string}>
): Promise<void> {
  await reconcileForChange(source, event.params.documentId,
    event.data?.before.data(), event.data?.after.data());
}

export const onHostEventCaseViewCaseChanged = onDocumentWritten({
  ...options, document: "eventAssistanceCases/{documentId}",
}, (event) => reconcileForWrite("eventAssistanceCases", event));
export const onHostEventCaseViewAttendeeChanged = onDocumentWritten({
  ...options, document: "eventAttendees/{documentId}",
}, (event) => reconcileForWrite("eventAttendees", event));
export const onHostEventCaseViewEventChanged = onDocumentWritten({
  ...options, document: "events/{documentId}",
}, (event) => reconcileForWrite("events", event));

/**
 * An organizer's manager fields: its open case views.
 * Served by the organizers dispatcher (issue #2451); it re-reads its
 * sources, so a retry or a replay converges.
 */
export const hostEventCaseViewProjections = defineProjections("organizers", [{
  id: "hostEventCaseView", kind: "projection", when: () => true,
  run: (change) => reconcileForChange("organizers", change.documentId,
    change.before, change.after),
}]);
