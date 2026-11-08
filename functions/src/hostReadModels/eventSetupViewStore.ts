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
import {
  countOutcome,
  emptyOutcomeCounts,
  planViewWrite,
  positiveInteger,
  ViewOutcome,
  ViewOutcomeCounts,
} from "./support/viewWrite";

export const eventSetupViewsCollection = "hostEventSetupViews";

export type EventSetupFacts = NonNullable<HostEventSetupViewDocument["facts"]>;

const capturedCheckout = new Set(["captured", "admitted"]);

/** Whole minor units, never negative. */
function minor(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) &&
    value > 0 ? value : 0;
}

/** What the workspace states about the night: places booked, money taken
 * for it, and whether the arrival message (the event-start reminder moment)
 * is armed. Gross counts completed app payments and captured or admitted
 * checkout and offer payments, less what they refunded. Pure.
 */
export function projectEventSetupFacts(params: {
  event: FirebaseFirestore.DocumentData;
  payments: FirebaseFirestore.DocumentData[];
  checkoutPayments: FirebaseFirestore.DocumentData[];
  arrivalMoment: FirebaseFirestore.DocumentData | undefined;
}): EventSetupFacts {
  const appGross = params.payments
    .filter((payment) => payment.status === "completed")
    .reduce((sum, payment) =>
      sum + minor(payment.amountMinor ?? payment.amount), 0);
  const checkoutGross = params.checkoutPayments
    .filter((payment) => capturedCheckout.has(payment.status))
    .reduce((sum, payment) => sum + Math.max(0,
      minor(payment.amountPaise) - minor(payment.refundedAmountPaise)), 0);
  return {
    ticketsSold: minor(params.event.bookedCount),
    grossMinor: appGross + checkoutGross,
    arrivalMessage: {ready: params.arrivalMoment?.status === "armed"},
  };
}

/** The event-start reminder moment the moments engine seeds per event. */
export const arrivalMomentId = (eventId: string) =>
  `${eventId}_event_start_reminder`;
const documentIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;

export type EventSetupViewOutcome = ViewOutcome;

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
    const [organizerSnap, preferencesSnap, paymentsSnap, checkoutSnap,
      offerPaymentsSnap, momentSnap] = await Promise.all([
      tx.get(db.collection("organizers").doc(organizerId)),
      tx.get(db.collection("eventSetupPreferences").doc(eventId)),
      tx.get(db.collection("payments").where("eventId", "==", eventId)),
      tx.get(db.collection("publicEventPayments")
        .where("eventId", "==", eventId)),
      tx.get(db.collection("organizerEventOfferPayments")
        .where("eventId", "==", eventId)),
      tx.get(db.collection("organizerMoments").doc(arrivalMomentId(eventId))),
    ]);
    const facts = projectEventSetupFacts({event,
      payments: paymentsSnap.docs.map((doc) => doc.data()),
      checkoutPayments: [...checkoutSnap.docs, ...offerPaymentsSnap.docs]
        .map((doc) => doc.data()),
      arrivalMoment: momentSnap.data()});
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
      facts,
    };
    const plan = planViewWrite(previous, {schemaVersion: 1 as const, eventId,
      ...next}, deps.now());
    if (!plan.unchanged) tx.set(viewRef, plan.document);
    if (invalid !== null) {
      return {kind: "invalidSource", source: invalid.source,
        detail: invalid.detail, revision: plan.revision,
        written: !plan.unchanged};
    }
    return plan.unchanged ? {kind: "unchanged", revision: plan.revision} :
      {kind: "complete", revision: plan.revision};
  });
  // Logged once per committed evaluation, not once per transaction attempt.
  if (outcome.kind === "invalidSource") {
    logger.error("Host event setup view read an invalid source.", {
      eventId,
      source: outcome.source,
      detail: outcome.detail,
    });
  }
  return outcome;
}

export interface EventSetupViewBackfillReport {
  events: number;
  outcomes: ViewOutcomeCounts;
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
  const outcomes = emptyOutcomeCounts();
  let events = 0;
  for await (const eventId of setupEventIdsForOrganizer(db, organizerId)) {
    events++;
    if (apply) countOutcome(outcomes, await reconcile(eventId));
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
