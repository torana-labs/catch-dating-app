import {HttpsError} from "firebase-functions/v2/https";
import {validateEventDocument} from
  "../../shared/generated/validators/eventDocument";
import {EVENT_MAX_DURATION_MINUTES} from "../../shared/businessRules";

const eventIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;

/** Existing downstream records that make a basics move unsafe. */
export const commitmentCollections = [
  "eventAttendees",
  "eventAttendeeImports",
  "eventParticipations",
  "eventWaitlistOffers",
  "organizerEventOffers",
  "payments",
  "razorpayPendingOrders",
] as const;

/**
 * Call inside the same transaction that read and will update events/{id}.
 * A row of any lifecycle status is a commitment: a withdrawal, refund or
 * historical import must not make the previous date/city context disappear.
 */
export async function assertPrivateEventBasicsEditable(params: {
  tx: FirebaseFirestore.Transaction;
  db: FirebaseFirestore.Firestore;
  eventId: string;
  event: Record<string, unknown>;
}): Promise<void> {
  const {tx, db, eventId, event} = params;
  assertPrivateEventBasicsShape(eventId, event);

  // Every query is an equality on the canonical eventId field and reads at
  // most one document. No lifecycle-status filter can hide prior commitments.
  for (const collection of commitmentCollections) {
    const witness = await tx.get(commitmentWitnessQuery(db, collection,
      eventId));
    if (!witness.empty) {
      throw new HttpsError("failed-precondition",
        "This event has roster, offer or payment commitments.");
    }
  }
}

/** One witness query: any row of any lifecycle status is a commitment. */
export function commitmentWitnessQuery(db: FirebaseFirestore.Firestore,
  collection: typeof commitmentCollections[number], eventId: string
): FirebaseFirestore.Query {
  return db.collection(collection).where("eventId", "==", eventId).limit(1);
}

/**
 * The event-only half of the basics guard: an uncommitted, unpublished,
 * active private setup with a sane duration. Throws failed-precondition.
 */
function assertPrivateEventBasicsShape(eventId: string,
  event: Record<string, unknown>): void {
  if (!eventIdPattern.test(eventId) ||
      !validateEventDocument(event) ||
      event.publicationState !== "private" ||
      event.publicRegistrationEnabled !== false ||
      event.status !== "active" ||
      event.organizerId !== event.organizerId ||
      event.eventOrigin !== undefined ||
      event.firstPublishedAt !== undefined ||
      event.eventSuccessPlanId !== undefined ||
      !Number.isSafeInteger(event.setupRevision) ||
      Number(event.setupRevision) < 1 ||
      event.bookedCount !== 0 || event.checkedInCount !== 0 ||
      event.waitlistedCount !== 0) {
    throw new HttpsError("failed-precondition",
      "Event basics are no longer an uncommitted private setup.");
  }

  if (event.endTime !== undefined) {
    const end = event.endTime as unknown as FirebaseFirestore.Timestamp;
    const start = event.startTime as unknown as FirebaseFirestore.Timestamp;
    const duration = end?.toMillis?.() - start?.toMillis?.();
    if (!Number.isSafeInteger(duration) || duration <= 0 ||
        duration > EVENT_MAX_DURATION_MINUTES * 60_000) {
      throw new HttpsError("failed-precondition",
        "Review event duration before editing basics.");
    }
  }
}

/**
 * Whether the event alone still allows a basics edit. A caller that answers
 * true reads the commitment witnesses next, in the same transaction.
 */
export function privateEventBasicsShapeEditable(eventId: string,
  event: Record<string, unknown>): boolean {
  try {
    assertPrivateEventBasicsShape(eventId, event);
    return true;
  } catch (error) {
    if (error instanceof HttpsError && error.code === "failed-precondition") {
      return false;
    }
    throw error;
  }
}

/**
 * Whether any commitment witness exists, read through the caller's
 * transaction. The same seven queries as the mutation guard.
 */
export async function hasEventCommitment(tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore, eventId: string): Promise<boolean> {
  const witnesses = await Promise.all(commitmentCollections.map(
    (collection) => tx.get(commitmentWitnessQuery(db, collection, eventId))));
  return witnesses.some((witness) => !witness.empty);
}
