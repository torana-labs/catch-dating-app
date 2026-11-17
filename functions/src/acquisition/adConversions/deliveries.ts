import {Timestamp} from "firebase-admin/firestore";
import type {AdConversionDeliveryDocument} from
  "../../shared/generated/firestoreAdminTypes";
import {
  AD_DESTINATIONS,
  HOST_CONVERSION_MAX_AGE_MILLIS,
  type HostConversionName,
  conversionOwner,
  hashedEmail,
  hashedOrganizerId,
  hashedPhone,
  hostConversionEventId,
} from "./hostConversions";

export const AD_CONVERSION_DELIVERIES = "adConversionDeliveries";
export const MAX_DELIVERY_ATTEMPTS = 5;

export type Delivery = AdConversionDeliveryDocument;

/**
 * Builds one queue record per destination. Pure: contact details are hashed
 * here and only digests are returned, so raw phone or email never reach the
 * queue.
 * @param {object} input Conversion, organizer, owner and time.
 * @return {Delivery[]} Records to create, or none.
 */
export function hostDeliveryRecords(input: {
  organizerId: string;
  conversion: HostConversionName;
  organizer: Record<string, unknown> | undefined;
  owner: Record<string, unknown> | undefined;
  nowMillis: number;
}): Delivery[] {
  const uid = conversionOwner(input.organizer);
  if (!uid || !input.owner || input.owner.deletedAt) return [];
  const phoneSha256 = hashedPhone(input.owner.phoneNumber);
  const emailSha256 = hashedEmail(input.owner.email) ??
    hashedEmail(input.organizer?.email);
  // Without a contact key neither platform can match the conversion.
  if (!phoneSha256 && !emailSha256) return [];
  const eventId = hostConversionEventId(input.organizerId, input.conversion);
  const now = Timestamp.fromMillis(input.nowMillis);
  return AD_DESTINATIONS.map((destination) => ({
    schemaVersion: 1 as const,
    deliveryId: `${destination}_${eventId}`,
    destination,
    eventName: input.conversion,
    eventId,
    organizerId: input.organizerId,
    uid,
    occurredAt: now,
    matching: {
      phoneSha256,
      emailSha256,
      externalIdSha256: hashedOrganizerId(input.organizerId),
    },
    valueMinor: null,
    currency: "INR",
    status: "pending" as const,
    attempts: 0,
    nextAttemptAt: now,
    lastAttemptAt: null,
    lastOutcome: null,
    createdAt: now,
    updatedAt: now,
    expiresAt: Timestamp.fromMillis(
      input.nowMillis + HOST_CONVERSION_MAX_AGE_MILLIS),
  }));
}

/**
 * Enqueues conversions for an organizer. Creating by ID makes a retried
 * trigger a no-op; an existing record is never overwritten.
 * @param {object} input Firestore, organizer, conversions and time.
 * @return {Promise<number>} Records created.
 */
export async function enqueueHostConversions(input: {
  db: FirebaseFirestore.Firestore;
  organizerId: string;
  conversions: HostConversionName[];
  nowMillis: number;
}): Promise<number> {
  if (input.conversions.length === 0) return 0;
  const organizer = (await input.db.collection("organizers")
    .doc(input.organizerId).get()).data();
  const uid = conversionOwner(organizer);
  if (!uid) return 0;
  const owner = (await input.db.collection("users").doc(uid).get()).data();
  let created = 0;
  for (const conversion of input.conversions) {
    for (const record of hostDeliveryRecords({organizerId: input.organizerId,
      conversion, organizer, owner, nowMillis: input.nowMillis})) {
      try {
        await input.db.collection(AD_CONVERSION_DELIVERIES)
          .doc(record.deliveryId).create(record);
        created += 1;
      } catch (error) {
        if ((error as {code?: unknown}).code !== 6) throw error;
      }
    }
  }
  return created;
}

/** Backoff after a retryable outcome: 5, 10, 20, 40 minutes. */
export function nextAttemptMillis(attempts: number, nowMillis: number) {
  return nowMillis + 5 * 60_000 * 2 ** Math.max(0, attempts - 1);
}

export type SendOutcome =
  | {kind: "accepted"}
  | {kind: "rejected"; code: string}
  | {kind: "retry"; code: string};

/**
 * The record's next state after one live attempt. Both platforms
 * deduplicate on the event ID, so a retry after an uncertain outcome cannot
 * double-count; after five attempts it stops as `unknown`.
 * @param {Delivery} delivery Record before the attempt.
 * @param {SendOutcome} outcome What the provider said.
 * @param {number} nowMillis Attempt time.
 * @return {Partial<Delivery>} Fields to update.
 */
export function afterAttempt(delivery: Delivery, outcome: SendOutcome,
  nowMillis: number): Partial<Delivery> {
  const attempts = Math.min(delivery.attempts + 1, MAX_DELIVERY_ATTEMPTS);
  const now = Timestamp.fromMillis(nowMillis);
  const base = {attempts, lastAttemptAt: now, updatedAt: now};
  if (outcome.kind === "accepted") {
    return {...base, status: "accepted", lastOutcome: "accepted"};
  }
  if (outcome.kind === "rejected") {
    return {...base, status: "rejected", lastOutcome: outcome.code};
  }
  return attempts >= MAX_DELIVERY_ATTEMPTS ?
    {...base, status: "unknown", lastOutcome: outcome.code} :
    {...base, status: "pending", lastOutcome: outcome.code,
      nextAttemptAt: Timestamp.fromMillis(
        nextAttemptMillis(attempts, nowMillis))};
}
