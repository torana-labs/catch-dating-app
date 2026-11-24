import {GUEST_PAYMENTS} from "../payments/guestPayments";
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
import {defineProjections} from "../platform/dispatch/runtime";

type SourceData = FirebaseFirestore.DocumentData | undefined;

export type EventSetupViewSource =
  | "events"
  | "eventSetupPreferences"
  | "organizers"
  | "organizerMoments"
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
  case "organizerMoments":
    // Only an event's start reminder is its arrival message.
    return documentId.endsWith("_event_start_reminder") ?
      distinctIds([before?.scopeKind === "event" ? before.scopeId : null,
        after?.scopeKind === "event" ? after.scopeId : null]) : [];
  default:
    // A payment update can change the gross the view states.
    if (before && after && source === GUEST_PAYMENTS) {
      return isSame(before.status, after.status) &&
        isSame(before.amount, after.amount) &&
        isSame(before.amountMinor, after.amountMinor) ? [] :
        distinctIds([before.eventId, after.eventId]);
    }
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
async function reconcileForChange(source: EventSetupViewSource,
  documentId: string,
  before: FirebaseFirestore.DocumentData | undefined,
  after: FirebaseFirestore.DocumentData | undefined): Promise<void> {
  const db = admin.firestore();
  const eventIds = await resolveEventSetupViewEventIds(db, source,
    documentId, before,
    after);
  for (const eventId of eventIds) {
    await reconcileEventSetupView(db, eventId);
  }
}

async function reconcileForWrite(
  source: EventSetupViewSource,
  event: FirestoreEvent<Change<DocumentSnapshot> | undefined,
    {documentId: string}>
): Promise<void> {
  await reconcileForChange(source, event.params.documentId,
    event.data?.before.data(), event.data?.after.data());
}

/**
 * An event write: its setup view.
 * Served by the events dispatcher (issue #2451); it re-reads its
 * sources, so a retry or a replay converges.
 */
export const hostEventSetupViewEventProjections = defineProjections("events", [{
  id: "hostEventSetupView", kind: "projection",
  when: () => true,
  run: (change) => reconcileForChange("events", change.documentId,
    change.before, change.after),
}]);
export const onHostEventSetupViewPreferencesChanged = onDocumentWritten({
  ...options, document: "eventSetupPreferences/{documentId}",
}, (event) => reconcileForWrite("eventSetupPreferences", event));

/**
 * An organizer write: the setup views of its events.
 * Served by the organizers dispatcher (issue #2451); it re-reads its
 * sources, so a retry or a replay converges.
 */
export const hostEventSetupViewProjections = defineProjections("organizers", [{
  id: "hostEventSetupView", kind: "projection", when: () => true,
  run: (change) => reconcileForChange("organizers", change.documentId,
    change.before, change.after),
}]);
export const onHostEventSetupViewAttendeeChanged = onDocumentWritten({
  ...options, document: "eventAttendees/{documentId}",
}, (event) => reconcileForWrite("eventAttendees", event));

/**
 * An attendee write: its event's setup view.
 * dispatchEventAttendees (issue #2451) runs the same work; both run until the
 * old trigger retires, which is safe because it re-reads its sources,
 * so a retry, a replay or a second run converges.
 */
export const hostEventSetupViewAttendeeProjections = defineProjections(
  "eventAttendees", [{
    id: "hostEventSetupView", kind: "projection",
    when: () => true,
    run: (change) => reconcileForChange("eventAttendees", change.documentId,
      change.before, change.after),
  }]);
export const onHostEventSetupViewAttendeeImportChanged = onDocumentWritten({
  ...options, document: "eventAttendeeImports/{documentId}",
}, (event) => reconcileForWrite("eventAttendeeImports", event));
export const onHostEventSetupViewParticipationChanged = onDocumentWritten({
  ...options, document: "eventBookings/{documentId}",
}, (event) => reconcileForWrite("eventBookings", event));
export const onHostEventSetupViewWaitlistOfferChanged = onDocumentWritten({
  ...options, document: "eventWaitlistOffers/{documentId}",
}, (event) => reconcileForWrite("eventWaitlistOffers", event));
export const onHostEventSetupViewEventOfferChanged = onDocumentWritten({
  ...options, document: "organizerEventOffers/{documentId}",
}, (event) => reconcileForWrite("organizerEventOffers", event));
export const onHostEventSetupViewGuestPaymentChanged = onDocumentWritten({
  ...options, document: `${GUEST_PAYMENTS}/{documentId}`,
}, (event) => reconcileForWrite(GUEST_PAYMENTS, event));

/**
 * A guest payment of any purpose: its event's setup view.
 * dispatchGuestPayments (issue #2451) runs the same work; both run until the
 * old trigger retires, which is safe because it re-reads its sources,
 * so a retry, a replay or a second run converges.
 */
export const hostEventSetupViewPaymentProjections = defineProjections(
  "guestPayments", [{
    id: "hostEventSetupView", kind: "projection",
    when: () => true,
    run: (change) => reconcileForChange(GUEST_PAYMENTS, change.documentId,
      change.before, change.after),
  }]);
export const onHostEventSetupViewMomentChanged = onDocumentWritten({
  ...options, document: "organizerMoments/{documentId}",
}, (event) => reconcileForWrite("organizerMoments", event));
