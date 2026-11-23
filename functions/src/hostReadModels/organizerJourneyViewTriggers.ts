import {isDeepStrictEqual} from "node:util";
import * as admin from "firebase-admin";
import {
  Change,
  DocumentSnapshot,
  FirestoreEvent,
  onDocumentWritten,
} from "firebase-functions/v2/firestore";
import {timestampMillis} from "../shared/dates";
import {catchEventTitle} from "../shared/eventLabels";
import type {
  EventDocument,
  OrganizerDocument,
} from "../shared/generated/firestoreAdminTypes";
import {organizerManagerUserIds} from "../shared/organizerHosts";
import {reconcileOrganizerJourneyViews} from "./organizerJourneyViewStore";
import {defineProjections} from "../platform/dispatch/runtime";

type SourceData = FirebaseFirestore.DocumentData | undefined;

export type JourneyViewSource =
  | "organizers"
  | "organizerClaimRequests"
  | "supplyIntakeRequests"
  | "events"
  | "organizerGrowthFacts";

function distinctIds(values: unknown[]): string[] {
  return [...new Set(values.filter((value): value is string =>
    typeof value === "string" && value.length > 0))];
}

/** What of an organizer its journey and its readers depend on. */
function organizerFacts(data: SourceData) {
  if (!data) return null;
  const organizer = data as Partial<OrganizerDocument>;
  return {name: organizer.name ?? null,
    createdAt: timestampMillis(organizer.createdAt),
    claimedAt: timestampMillis(organizer.ownership?.claimedAt),
    managers: organizerManagerUserIds(organizer as OrganizerDocument).sort()};
}

/** What of an event the first-event step depends on. */
function eventFacts(data: SourceData) {
  if (!data) return null;
  const event = data as Partial<EventDocument>;
  return {organizerId: event.organizerId ?? null,
    startTime: timestampMillis(event.startTime),
    title: catchEventTitle(event)};
}

/**
 * The organizers whose journey views a source write can change, from both
 * the old and the new version. Old data is only a routing hint: every
 * evaluation rereads current sources. Writes that change nothing a journey
 * shows (an organizer's follower count, an event's bookings) route nowhere.
 * @param {JourneyViewSource} source The written collection.
 * @param {string} documentId The written document id.
 * @param {SourceData} before Old data.
 * @param {SourceData} after New data.
 * @return {string[]} The organizers to reconcile.
 */
export function resolveJourneyViewOrganizerIds(source: JourneyViewSource,
  documentId: string, before: SourceData, after: SourceData): string[] {
  switch (source) {
  case "organizers":
    return isDeepStrictEqual(organizerFacts(before), organizerFacts(after)) ?
      [] : [documentId];
  case "organizerClaimRequests":
    return distinctIds([before?.organizerId, after?.organizerId]);
  case "supplyIntakeRequests":
    return distinctIds([before?.approval?.organizerId,
      after?.approval?.organizerId]);
  case "events":
    return isDeepStrictEqual(eventFacts(before), eventFacts(after)) ? [] :
      distinctIds([before?.organizerId, after?.organizerId]);
  case "organizerGrowthFacts":
    return timestampMillis(before?.milestones?.firstPaidBookingAt) ===
      timestampMillis(after?.milestones?.firstPaidBookingAt) &&
      !before === !after ? [] : [documentId];
  }
}

const options = {retry: true};

async function reconcileForChange(source: JourneyViewSource,
  documentId: string,
  before: FirebaseFirestore.DocumentData | undefined,
  after: FirebaseFirestore.DocumentData | undefined): Promise<void> {
  const organizerIds = resolveJourneyViewOrganizerIds(source,
    documentId, before,
    after);
  for (const organizerId of organizerIds) {
    await reconcileOrganizerJourneyViews(admin.firestore(), organizerId);
  }
}

async function reconcileForWrite(
  source: JourneyViewSource,
  event: FirestoreEvent<Change<DocumentSnapshot> | undefined,
    {documentId: string}>
): Promise<void> {
  await reconcileForChange(source, event.params.documentId,
    event.data?.before.data(), event.data?.after.data());
}

/**
 * Name, listing, claim and managers: who reads a journey and its steps.
 * Served by the organizers dispatcher (issue #2451); it re-reads its
 * sources, so a retry or a replay converges.
 */
export const hostOrganizerJourneyViewProjections = defineProjections(
  "organizers", [{
    id: "hostOrganizerJourneyView", kind: "projection", when: () => true,
    run: (change) => reconcileForChange("organizers", change.documentId,
      change.before, change.after),
  }]);

/** A claim request adds, decides or withdraws its requester's steps. */
export const onHostOrganizerJourneyViewClaimChanged = onDocumentWritten({
  ...options, document: "organizerClaimRequests/{documentId}",
}, (event) => reconcileForWrite("organizerClaimRequests", event));

/** An approved nomination is the journey's first step. */
export const onHostOrganizerJourneyViewIntakeChanged = onDocumentWritten({
  ...options, document: "supplyIntakeRequests/{documentId}",
}, (event) => reconcileForWrite("supplyIntakeRequests", event));

/** The organizer's earliest event is its first-event step. */
export const onHostOrganizerJourneyViewEventChanged = onDocumentWritten({
  ...options, document: "events/{documentId}",
}, (event) => reconcileForWrite("events", event));

/** The first paid booking milestone. */
export const onHostOrganizerJourneyViewGrowthChanged = onDocumentWritten({
  ...options, document: "organizerGrowthFacts/{documentId}",
}, (event) => reconcileForWrite("organizerGrowthFacts", event));
