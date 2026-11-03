import {isDeepStrictEqual} from "node:util";
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import type {HostEventSetupViewDocument} from
  "../shared/generated/firestoreAdminTypes";
import {
  hasEventCommitment,
  privateEventBasicsShapeEditable,
} from "../events/progressiveSetup/commitments";
import {
  EventSetupSourceInvalidError,
  PrivateEventSetupSummary,
  projectPrivateEventSetupSummary,
} from "../events/progressiveSetup/readModel";

export const eventSetupViewsCollection = "hostEventSetupViews";
const documentIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;

export type EventSetupViewOutcome =
  | {kind: "removed"; existed: boolean}
  | {kind: "unchanged"; revision: number}
  | {kind: "complete"; revision: number}
  | {
    kind: "invalidSource";
    incompleteSource: string;
    detail: string;
    revision: number;
    written: boolean;
  };

export interface EventSetupViewStoreDeps {
  now: () => FirebaseFirestore.Timestamp;
}

const defaultDeps: EventSetupViewStoreDeps = {
  now: () => admin.firestore.Timestamp.now(),
};

/**
 * Re-evaluates hostEventSetupViews/{eventId} from current sources in one
 * transaction: the event, its organizer, its preferences and, while the event
 * alone still allows a basics edit, one witness from each commitment
 * collection. Writes only when the projection changed. A source document that
 * fails validation records sourceCoverage invalidSource and keeps the previous
 * summary, so a trigger never retries forever on it; any other error throws,
 * so the trigger retries. An event that is gone, has no setupRevision, or has
 * no usable organizer id has no view.
 */
export async function reconcileEventSetupView(
  db: FirebaseFirestore.Firestore,
  eventId: string,
  deps: EventSetupViewStoreDeps = defaultDeps
): Promise<EventSetupViewOutcome> {
  const outcome = await db.runTransaction(async (tx):
    Promise<EventSetupViewOutcome> => {
    const viewRef = db.collection(eventSetupViewsCollection).doc(eventId);
    const [eventSnap, viewSnap] = await Promise.all([
      tx.get(db.collection("events").doc(eventId)),
      tx.get(viewRef),
    ]);
    const event = eventSnap.data();
    const organizerId = event?.organizerId;
    if (!event || !Object.prototype.hasOwnProperty.call(event,
      "setupRevision") || typeof organizerId !== "string" ||
        !documentIdPattern.test(organizerId)) {
      // Without a usable organizer id no manager could be authorized, and a
      // stale view must not stay readable by a previous organizer.
      if (viewSnap.exists) tx.delete(viewRef);
      return {kind: "removed", existed: viewSnap.exists};
    }
    const [organizerSnap, preferencesSnap] = await Promise.all([
      tx.get(db.collection("organizers").doc(organizerId)),
      tx.get(db.collection("eventSetupPreferences").doc(eventId)),
    ]);
    // Published, cancelled or booked events can never edit basics, so their
    // seven witness reads are skipped; the answer cannot depend on them.
    const shapeEditable = privateEventBasicsShapeEditable(eventId, event);
    const committed = shapeEditable ?
      await hasEventCommitment(tx, db, eventId) : false;
    const previous = viewSnap.exists ?
      viewSnap.data() as HostEventSetupViewDocument : null;
    let summary: PrivateEventSetupSummary | null;
    let invalid: EventSetupSourceInvalidError | null = null;
    try {
      summary = projectPrivateEventSetupSummary({eventId, event,
        organizer: organizerSnap.data(), preferences: preferencesSnap.data(),
        canEditBasics: shapeEditable && !committed});
    } catch (error) {
      if (!(error instanceof EventSetupSourceInvalidError)) throw error;
      invalid = error;
      summary = previous?.summary ?? null;
    }
    const setupRevision = invalid === null ?
      (summary as PrivateEventSetupSummary).setupRevision :
      positiveInteger(event.setupRevision) ?? previous?.setupRevision ?? 1;
    const next = {
      organizerId,
      setupRevision,
      sourceCoverage: invalid === null ? "complete" as const :
        "invalidSource" as const,
      incompleteSource: invalid?.source ?? null,
      summary,
    };
    const previousRevision = positiveInteger(previous?.revision) ?? 0;
    const unchanged = previous !== null && isDeepStrictEqual({
      organizerId: previous.organizerId,
      setupRevision: previous.setupRevision,
      sourceCoverage: previous.sourceCoverage,
      incompleteSource: previous.incompleteSource,
      summary: previous.summary,
    }, next);
    const revision = unchanged ? previousRevision : previousRevision + 1;
    if (!unchanged) {
      const document: HostEventSetupViewDocument = {
        schemaVersion: 1,
        eventId,
        ...next,
        revision,
        evaluatedAt: deps.now(),
      };
      tx.set(viewRef, document);
    }
    if (invalid !== null) {
      return {kind: "invalidSource", incompleteSource: invalid.source,
        detail: invalid.detail, revision, written: !unchanged};
    }
    return unchanged ? {kind: "unchanged", revision} :
      {kind: "complete", revision};
  });
  // Logged once per committed evaluation, not once per transaction attempt.
  if (outcome.kind === "invalidSource") {
    logger.error("Host event setup view read an invalid source.", {
      eventId,
      incompleteSource: outcome.incompleteSource,
      detail: outcome.detail,
    });
  }
  return outcome;
}

export interface EventSetupViewBackfillReport {
  events: number;
  outcomes: Record<EventSetupViewOutcome["kind"], number>;
}

/**
 * Explicit organizer scope: every event of the organizer that carries a
 * setupRevision. Without apply it only counts them.
 */
export async function backfillEventSetupViews(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  apply: boolean,
  reconcile: (eventId: string) => Promise<EventSetupViewOutcome> =
  (eventId) => reconcileEventSetupView(db, eventId)
): Promise<EventSetupViewBackfillReport> {
  const outcomes: EventSetupViewBackfillReport["outcomes"] = {
    removed: 0, unchanged: 0, complete: 0, invalidSource: 0,
  };
  let events = 0;
  for await (const eventId of setupEventIdsForOrganizer(db, organizerId)) {
    events++;
    if (apply) outcomes[(await reconcile(eventId)).kind]++;
  }
  return {events, outcomes};
}

export const organizerEventPageSize = 100;

/** Every event of an organizer with a setupRevision, in pages of 100. */
export async function* setupEventIdsForOrganizer(
  db: FirebaseFirestore.Firestore,
  organizerId: string
): AsyncGenerator<string> {
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  do {
    let query = db.collection("events")
      .where("organizerId", "==", organizerId)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(organizerEventPageSize);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    for (const doc of page.docs) {
      if (Object.prototype.hasOwnProperty.call(doc.data(), "setupRevision")) {
        yield doc.id;
      }
    }
    cursor = page.size === organizerEventPageSize ? page.docs.at(-1) :
      undefined;
  } while (cursor);
}

function positiveInteger(value: unknown): number | null {
  return Number.isSafeInteger(value) && (value as number) > 0 ?
    value as number : null;
}
