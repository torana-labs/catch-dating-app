import {HttpsError} from "firebase-functions/v2/https";
import {validateEventDocument} from
  "../../shared/generated/validators/eventDocument";
import {EVENT_MAX_DURATION_MINUTES} from "../../shared/businessRules";

const eventIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;

/** Existing downstream records that make a basics move unsafe. */
const commitmentCollections = [
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

  // Every query is an equality on the canonical eventId field and reads at
  // most one document. No lifecycle-status filter can hide prior commitments.
  for (const collection of commitmentCollections) {
    const witness = await tx.get(db.collection(collection)
      .where("eventId", "==", eventId).limit(1));
    if (!witness.empty) {
      throw new HttpsError("failed-precondition",
        "This event has roster, offer or payment commitments.");
    }
  }
}

/** Same transaction-bound authority for edit controls and mutation guards. */
export async function canEditPrivateEventBasics(
  params: Parameters<typeof assertPrivateEventBasicsEditable>[0]
): Promise<boolean> {
  try {
    await assertPrivateEventBasicsEditable(params);
    return true;
  } catch (error) {
    if (error instanceof HttpsError && error.code === "failed-precondition") {
      return false;
    }
    throw error;
  }
}
