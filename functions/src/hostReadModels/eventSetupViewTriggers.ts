import * as admin from "firebase-admin";
import {
  Change,
  DocumentSnapshot,
  FirestoreEvent,
  onDocumentWritten,
} from "firebase-functions/v2/firestore";
import {commitmentCollections} from "../events/progressiveSetup/commitments";
import {
  reconcileEventSetupView,
  setupEventIdsForOrganizer,
} from "./eventSetupViewStore";

type SourceData = FirebaseFirestore.DocumentData | undefined;

export type EventSetupViewSource =
  | "events"
  | "eventSetupPreferences"
  | "organizers"
  | typeof commitmentCollections[number];

/** Organizer fields the projection and its readiness read. */
export const eventSetupOrganizerFields = [
  "appVisibility",
  "status",
  "archived",
  "locationCityId",
  "locationMarketId",
] as const;

const hasSetupRevision = (data: SourceData) => data !== undefined &&
  Object.prototype.hasOwnProperty.call(data, "setupRevision");

function distinctIds(values: unknown[]): string[] {
  return [...new Set(values.filter((value): value is string =>
    typeof value === "string" && value.length > 0))];
}

/**
 * The events whose setup view a source write can change, from both the old
 * and the new version. Old data is only a routing hint: every evaluation
 * rereads current sources. Skips are optimisations for updates only.
 */
export async function resolveEventSetupViewEventIds(
  db: FirebaseFirestore.Firestore,
  source: EventSetupViewSource,
  documentId: string,
  before: SourceData,
  after: SourceData
): Promise<string[]> {
  switch (source) {
  case "events":
    return hasSetupRevision(before) || hasSetupRevision(after) ?
      [documentId] : [];
  case "eventSetupPreferences":
    return [documentId];
  case "organizers": {
    if (before && after && eventSetupOrganizerFields.every((field) =>
      isSame(before[field], after[field]))) return [];
    const ids: string[] = [];
    for await (const eventId of setupEventIdsForOrganizer(db, documentId)) {
      ids.push(eventId);
    }
    return ids;
  }
  default:
    // An update cannot change whether a commitment witness exists.
    if (before && after) return [];
    return distinctIds([before?.eventId, after?.eventId]);
  }
}

function isSame(left: unknown, right: unknown): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

const options = {retry: true, memory: "512MiB" as const};

/** Re-evaluates every event setup view a source write can affect. */
async function reconcileForWrite(
  source: EventSetupViewSource,
  event: FirestoreEvent<Change<DocumentSnapshot> | undefined,
    {documentId: string}>
): Promise<void> {
  const db = admin.firestore();
  const eventIds = await resolveEventSetupViewEventIds(db, source,
    event.params.documentId, event.data?.before.data(),
    event.data?.after.data());
  for (const eventId of eventIds) {
    await reconcileEventSetupView(db, eventId);
  }
}

export const onHostEventSetupViewEventChanged = onDocumentWritten({
  ...options, document: "events/{documentId}",
}, (event) => reconcileForWrite("events", event));
export const onHostEventSetupViewPreferencesChanged = onDocumentWritten({
  ...options, document: "eventSetupPreferences/{documentId}",
}, (event) => reconcileForWrite("eventSetupPreferences", event));
export const onHostEventSetupViewOrganizerChanged = onDocumentWritten({
  ...options, document: "organizers/{documentId}",
}, (event) => reconcileForWrite("organizers", event));
export const onHostEventSetupViewAttendeeChanged = onDocumentWritten({
  ...options, document: "eventAttendees/{documentId}",
}, (event) => reconcileForWrite("eventAttendees", event));
export const onHostEventSetupViewAttendeeImportChanged = onDocumentWritten({
  ...options, document: "eventAttendeeImports/{documentId}",
}, (event) => reconcileForWrite("eventAttendeeImports", event));
export const onHostEventSetupViewParticipationChanged = onDocumentWritten({
  ...options, document: "eventParticipations/{documentId}",
}, (event) => reconcileForWrite("eventParticipations", event));
export const onHostEventSetupViewWaitlistOfferChanged = onDocumentWritten({
  ...options, document: "eventWaitlistOffers/{documentId}",
}, (event) => reconcileForWrite("eventWaitlistOffers", event));
export const onHostEventSetupViewEventOfferChanged = onDocumentWritten({
  ...options, document: "organizerEventOffers/{documentId}",
}, (event) => reconcileForWrite("organizerEventOffers", event));
export const onHostEventSetupViewPaymentChanged = onDocumentWritten({
  ...options, document: "payments/{documentId}",
}, (event) => reconcileForWrite("payments", event));
export const onHostEventSetupViewPendingOrderChanged = onDocumentWritten({
  ...options, document: "razorpayPendingOrders/{documentId}",
}, (event) => reconcileForWrite("razorpayPendingOrders", event));
