import {randomUUID} from "node:crypto";
import type {Firestore} from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {isPublicConfiguredEvent} from "../events/configuredEvent";
import type {EventDocument} from "../shared/generated/firestoreAdminTypes";
import type {HostPilotEventReviewDocument} from
  "../shared/generated/hostPilotEventReviewDocument";
import type {HostOrganizerActivationDocument} from
  "../shared/generated/hostOrganizerActivationDocument";

export const HOST_PILOT_REVIEWS = "hostPilotEventReviews";
export const HOST_ACTIVATIONS = "hostOrganizerActivations";
const id = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{1,160}$/u.test(value);
const millis = (value: unknown): number => {
  if (!value || typeof value !== "object" ||
      typeof (value as {toMillis?: unknown}).toMillis !== "function") return 0;
  try {
    return (value as {toMillis: () => number}).toMillis();
  } catch {
    return 0;
  }
};

/** A staff review is operational evidence, never advertising permission. */
export function nextPilotReview(input: {
  eventId: string; organizerId: string; realEvent: boolean;
  expectedRevision: number; current: HostPilotEventReviewDocument | undefined;
  actorUid: string; now: number;
}): HostPilotEventReviewDocument {
  const old = input.current;
  if (!id(input.eventId) || !id(input.organizerId) || !id(input.actorUid) ||
      !Number.isSafeInteger(input.now) || input.now <= 0 ||
      (old && (old.eventId !== input.eventId ||
        old.organizerId !== input.organizerId)) ||
      input.expectedRevision !== (old?.revision ?? 0)) {
    throw new Error("Pilot review changed. Reload the event before reviewing.");
  }
  if (old?.realEvent === input.realEvent) return old;
  return {schemaVersion: 1, classification: "sales_private",
    eventId: input.eventId, organizerId: input.organizerId,
    realEvent: input.realEvent, revision: (old?.revision ?? 0) + 1,
    reviewedAt: input.now, reviewedBy: input.actorUid};
}

/** Only a new committed checked-in roster edge can propose activation.
 * Current roster, review and published event are read in the same transaction.
 * Consumer check-ins arrive through the existing canonical roster projection.
 * No attendee ID, contact field, consent capability or vendor payload is kept.
 */
export async function recordHostPilotActivation(input: {
  db: Firestore; attendeeId: string;
  before: Record<string, unknown> | undefined;
  after: Record<string, unknown> | undefined; now?: () => number;
}): Promise<boolean> {
  const {before, after} = input;
  if (!after || after.status !== "checkedIn" ||
      before?.status === "checkedIn" || !id(after.eventId) ||
      !id(after.organizerId) || !id(input.attendeeId)) return false;
  const checkedInAt = millis(after.checkedInAt);
  const now = (input.now ?? Date.now)();
  if (!Number.isSafeInteger(checkedInAt) || checkedInAt <= 0 ||
      checkedInAt > now) return false;
  const {db} = input;
  const activationRef = db.collection(HOST_ACTIVATIONS).doc(after.organizerId);
  const receiptId = `host_activation_${randomUUID()}`;
  return db.runTransaction(async (tx) => {
    const [current, eventSnap, reviewSnap, activation, organizer, restriction] =
      await Promise.all([
        tx.get(db.collection("eventAttendees").doc(input.attendeeId)),
        tx.get(db.collection("events").doc(after.eventId as string)),
        tx.get(db.collection(HOST_PILOT_REVIEWS).doc(after.eventId as string)),
        tx.get(activationRef),
        tx.get(db.collection("organizers").doc(after.organizerId as string)),
        tx.get(db.collection("salesPrivacyRestrictions")
          .doc(after.organizerId as string)),
      ]);
    const row = current.data();
    const event = eventSnap.data() as EventDocument | undefined;
    const review = reviewSnap.data() as
      HostPilotEventReviewDocument | undefined;
    if (restriction.exists || !organizer.exists ||
        row?.status !== "checkedIn" ||
        row.eventId !== after.eventId ||
        row.organizerId !== after.organizerId ||
        millis(row.checkedInAt) !== checkedInAt ||
        !isPublicConfiguredEvent(event) || event.status !== "active" ||
        (event.organizerId) !== after.organizerId ||
        review?.schemaVersion !== 1 || review.realEvent !== true ||
        review.eventId !== after.eventId ||
        review.organizerId !== after.organizerId ||
        !Number.isSafeInteger(review.reviewedAt) ||
        review.reviewedAt <= 0 || review.reviewedAt > checkedInAt ||
        review.classification !== "sales_private" ||
        !Number.isSafeInteger(review.revision) || review.revision < 1) {
      return false;
    }
    if (activation.exists) return false;
    const receipt: HostOrganizerActivationDocument = {
      schemaVersion: 1, classification: "sales_private",
      organizerId: after.organizerId as string,
      eventId: after.eventId as string,
      receiptId, activatedAt: checkedInAt, recordedAt: now,
      reviewRevision: review.revision,
    };
    tx.create(activationRef, receipt);
    return true;
  });
}

// Operational receipt only; no vendor delivery or advertising permission.
export const onHostPilotCheckIn = onDocumentWritten({
  document: "eventAttendees/{attendeeId}", region: "asia-south1",
  retry: true, maxInstances: 2,
}, async (event) => {
  await recordHostPilotActivation({db: admin.firestore(),
    attendeeId: event.params.attendeeId,
    before: event.data?.before.data(), after: event.data?.after.data()});
});
