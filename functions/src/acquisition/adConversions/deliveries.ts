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
  hashedPhoneForMeta,
  hostConversionEventId,
} from "./hostConversions";
import {isAdMatchingOptedOut} from "../adMatching/optOuts";

export const AD_CONVERSION_DELIVERIES = "adConversionDeliveries";
export const MAX_DELIVERY_ATTEMPTS = 5;

export type Delivery = AdConversionDeliveryDocument;

/**
 * Builds one queue record per destination. Pure: contact details are hashed
 * here and only digests are returned, so raw phone or email never reach the
 * queue. An opted-out owner's records are born cancelled with outcome
 * `opted_out` and no contact digests, so the conversion is never sent and a
 * retried trigger cannot queue it again.
 * @param {object} input Conversion, organizer, owner and time.
 * @return {Delivery[]} Records to create, or none.
 */
export function hostDeliveryRecords(input: {
  organizerId: string;
  conversion: HostConversionName;
  organizer: Record<string, unknown> | undefined;
  owner: Record<string, unknown> | undefined;
  nowMillis: number;
  /** The Meta lead-form lead this host came from, if one matched. */
  metaLeadId?: string | null;
  /** The owner's phone or email is opted out of ad matching. */
  optedOut?: boolean;
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
  const optedOut = input.optedOut === true;
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
      phoneSha256: optedOut ? null : phoneSha256,
      emailSha256: optedOut ? null : emailSha256,
      metaPhoneSha256: optedOut ? null :
        hashedPhoneForMeta(input.owner?.phoneNumber),
      externalIdSha256: hashedOrganizerId(input.organizerId),
    },
    metaLeadId: optedOut ? null : input.metaLeadId ?? null,
    valueMinor: null,
    currency: "INR",
    status: optedOut ? "cancelled" as const : "pending" as const,
    attempts: 0,
    nextAttemptAt: now,
    lastAttemptAt: null,
    lastOutcome: optedOut ? "opted_out" : null,
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
  // Checked once per enqueue and again by the worker before each send.
  const optedOut = await isAdMatchingOptedOut(input.db, {
    phoneSha256: hashedPhone(owner?.phoneNumber),
    emailSha256: hashedEmail(owner?.email) ?? hashedEmail(organizer?.email),
  });
  const metaLeadId = optedOut ? null :
    await matchingMetaLead(input.db, owner, organizer);
  let created = 0;
  for (const conversion of input.conversions) {
    for (const record of hostDeliveryRecords({organizerId: input.organizerId,
      conversion, organizer, owner, nowMillis: input.nowMillis,
      metaLeadId, optedOut})) {
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

/**
 * The Meta lead-form lead an owner came from: a processed lead whose hashed
 * phone, then email, matches the owner's. A lead carrying any opted-out
 * identifier is never attached. Null when there is none.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {object|undefined} owner Owner's user document.
 * @param {object|undefined} organizer Organizer document.
 * @return {Promise<string|null>} Meta lead ID.
 */
export async function matchingMetaLead(db: FirebaseFirestore.Firestore,
  owner: Record<string, unknown> | undefined,
  organizer: Record<string, unknown> | undefined): Promise<string | null> {
  const keys: Array<["phoneSha256" | "emailSha256", string | null]> = [
    ["phoneSha256", hashedPhone(owner?.phoneNumber)],
    ["emailSha256", hashedEmail(owner?.email) ?? hashedEmail(organizer?.email)],
  ];
  for (const [field, digest] of keys) {
    if (!digest) continue;
    const rows = await db.collection("metaLeadgenEvents")
      .where(field, "==", digest).limit(5).get();
    const lead = rows.docs.map((doc) => doc.data())
      .find((row) => row.status === "processed" &&
        typeof row.leadgenId === "string");
    if (!lead) continue;
    if (await isAdMatchingOptedOut(db, lead)) return null;
    return lead.leadgenId as string;
  }
  return null;
}

/**
 * Cancels pending deliveries that carry an opted-out digest, at once rather
 * than at the next send, and strips their contact digests.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {object} digests Phone and email digests just opted out.
 * @param {number} nowMillis Current time.
 * @return {Promise<number>} Deliveries cancelled.
 */
export async function cancelOptedOutDeliveries(db: FirebaseFirestore.Firestore,
  digests: {phoneSha256: string | null; emailSha256: string | null},
  nowMillis: number): Promise<number> {
  const seen = new Set<string>();
  let cancelled = 0;
  for (const [field, digest] of [
    ["matching.phoneSha256", digests.phoneSha256],
    ["matching.emailSha256", digests.emailSha256],
  ] as const) {
    if (!digest) continue;
    const rows = await db.collection(AD_CONVERSION_DELIVERIES)
      .where(field, "==", digest).limit(100).get();
    for (const doc of rows.docs) {
      const delivery = doc.data() as Delivery;
      if (seen.has(doc.id) || delivery.status !== "pending") continue;
      seen.add(doc.id);
      await doc.ref.update(optedOutCancellation(delivery, nowMillis));
      cancelled += 1;
    }
  }
  return cancelled;
}

/**
 * The update that cancels a delivery for an opt-out: no contact digest or
 * lead stays on the record.
 * @param {Delivery} delivery Queue record.
 * @param {number} nowMillis Current time.
 * @return {Partial<Delivery>} Fields to update.
 */
export function optedOutCancellation(delivery: Delivery,
  nowMillis: number): Partial<Delivery> {
  return {
    status: "cancelled",
    lastOutcome: "opted_out",
    matching: {...delivery.matching, phoneSha256: null, emailSha256: null,
      metaPhoneSha256: null},
    metaLeadId: null,
    updatedAt: Timestamp.fromMillis(nowMillis),
  };
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
