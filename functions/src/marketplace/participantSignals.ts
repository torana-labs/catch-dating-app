import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

export const participantSignalFactsCollection = "participantSignalFacts";
export const participantMetricCountersCollection = "participantMetricCounters";

export type ParticipantSignalType =
  | "outgoing_like"
  | "incoming_like"
  | "private_interest_sent"
  | "private_interest_received"
  | "match_created"
  | "chat_message_sent"
  | "chat_message_received"
  | "chat_started"
  | "event_attended"
  | "event_attendance_removed"
  | "event_feedback_submitted";

export type ParticipantSignalSource =
  | "swipe"
  | "match"
  | "chat"
  | "attendance"
  | "event_feedback";

export type ParticipantSignalDirection = "sent" | "received" | "self";

export type ParticipantSignalVisibility = "adminOnly" | "aggregateSafe";

export interface ParticipantSignalFactInput {
  id: string;
  uid: string;
  type: ParticipantSignalType;
  source: ParticipantSignalSource;
  direction: ParticipantSignalDirection;
  eventId?: string;
  organizerId?: string;
  matchId?: string;
  peerUid?: string;
  value?: number;
  visibility?: ParticipantSignalVisibility;
  occurredAt?: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

interface ParticipantSignalDeps {
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  increment: (value: number) => FirebaseFirestore.FieldValue;
}

const defaultDeps: ParticipantSignalDeps = {
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  increment: (value) => admin.firestore.FieldValue.increment(value),
};

/**
 * Builds a deterministic Firestore document id for an idempotent signal fact.
 * @param {ParticipantSignalType} type Signal type.
 * @param {string} uid Subject user id.
 * @param {string} sourceId Stable source id.
 * @return {string} Firestore-safe document id.
 */
export function participantSignalFactId(
  type: ParticipantSignalType,
  uid: string,
  sourceId: string
): string {
  return [type, uid, sourceId].map(stableIdSegment).join("__");
}

/**
 * Writes a batch of participant signal facts without letting metric failures
 * block the user-facing product flow that emitted them.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {ParticipantSignalFactInput[]} facts Facts to write.
 * @param {ParticipantSignalDeps} deps Injectable Firestore helpers.
 */
export async function recordParticipantSignalFactsBestEffort(
  db: FirebaseFirestore.Firestore,
  facts: ParticipantSignalFactInput[],
  deps: ParticipantSignalDeps = defaultDeps
): Promise<void> {
  if (facts.length === 0) return;
  try {
    await recordParticipantSignalFacts(db, facts, deps);
  } catch (error) {
    logger.error("Failed to record participant signal facts", {error});
  }
}

/**
 * Writes signal facts and updates materialized per-user counters idempotently.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {ParticipantSignalFactInput[]} facts Facts to write.
 * @param {ParticipantSignalDeps} deps Injectable Firestore helpers.
 */
export async function recordParticipantSignalFacts(
  db: FirebaseFirestore.Firestore,
  facts: ParticipantSignalFactInput[],
  deps: ParticipantSignalDeps = defaultDeps
): Promise<void> {
  for (const fact of facts) {
    await recordParticipantSignalFact(db, fact, deps);
  }
}

/**
 * Builds the Firestore write payload for a signal fact.
 * @param {ParticipantSignalFactInput} fact Fact input.
 * @param {FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue} now
 * Shared server timestamp for this write.
 * @return {Record<string, unknown>} Firestore document payload.
 */
export function participantSignalFactData(
  fact: ParticipantSignalFactInput,
  now: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue
): Record<string, unknown> {
  const occurredAt = fact.occurredAt ?? now;
  const data: Record<string, unknown> = {
    uid: fact.uid,
    type: fact.type,
    source: fact.source,
    direction: fact.direction,
    value: fact.value ?? 1,
    visibility: fact.visibility ?? "adminOnly",
    occurredAt,
    createdAt: now,
  };

  setOptional(data, "eventId", fact.eventId);
  setOptional(data, "organizerId", fact.organizerId);
  setOptional(data, "matchId", fact.matchId);
  setOptional(data, "peerUid", fact.peerUid);

  const metadata = compactMetadata(fact.metadata);
  if (Object.keys(metadata).length > 0) {
    data.metadata = metadata;
  }

  return data;
}

/**
 * Builds the merge payload for the participant counter materialization.
 * @param {ParticipantSignalFactInput} fact Fact input.
 * @param {FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue} now
 * Shared server timestamp for this write.
 * @param {Function} increment Firestore increment helper.
 * @return {Record<string, unknown>} Firestore merge payload.
 */
export function participantCounterPatch(
  fact: ParticipantSignalFactInput,
  now: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue,
  increment: (value: number) => FirebaseFirestore.FieldValue
): Record<string, unknown> {
  return {
    uid: fact.uid,
    updatedAt: now,
    counters: {
      [fact.type]: increment(fact.value ?? 1),
    },
    lastSeenByType: {
      [fact.type]: fact.occurredAt ?? now,
    },
  };
}

/**
 * Records one idempotent signal fact and matching counter patch.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {ParticipantSignalFactInput} fact Fact to record.
 * @param {ParticipantSignalDeps} deps Injectable Firestore helpers.
 */
async function recordParticipantSignalFact(
  db: FirebaseFirestore.Firestore,
  fact: ParticipantSignalFactInput,
  deps: ParticipantSignalDeps
): Promise<void> {
  const now = deps.serverTimestamp();
  const factRef = db.collection(participantSignalFactsCollection).doc(fact.id);
  const counterRef = db
    .collection(participantMetricCountersCollection)
    .doc(fact.uid);

  await db.runTransaction(async (tx) => {
    const existing = await tx.get(factRef);
    if (existing.exists) return;

    tx.create(factRef, participantSignalFactData(fact, now));
    tx.set(counterRef, participantCounterPatch(fact, now, deps.increment), {
      merge: true,
    });
  });
}

/**
 * Normalizes a dynamic id segment into a Firestore-safe fragment.
 * @param {string} value Raw segment value.
 * @return {string} Safe deterministic segment.
 */
function stableIdSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 180);
}

/**
 * Copies a non-empty optional string into a Firestore payload.
 * @param {Record<string, unknown>} data Mutable payload.
 * @param {string} key Payload key.
 * @param {string | undefined} value Optional value.
 */
function setOptional(
  data: Record<string, unknown>,
  key: string,
  value: string | undefined
): void {
  if (value != null && value.length > 0) {
    data[key] = value;
  }
}

/**
 * Drops null and undefined metadata values before writing Firestore data.
 * @param {object | undefined} metadata Raw metadata.
 * @return {Record<string, string | number | boolean>} Compact metadata.
 */
function compactMetadata(
  metadata: ParticipantSignalFactInput["metadata"]
): Record<string, string | number | boolean> {
  if (!metadata) return {};
  return Object.fromEntries(
    Object.entries(metadata).filter(
      (entry): entry is [string, string | number | boolean] =>
        entry[1] !== null && entry[1] !== undefined
    )
  );
}
