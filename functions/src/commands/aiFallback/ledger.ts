import {createHash} from "node:crypto";

// Durable spend for the AI fallback, enforced against Firestore and never
// against process memory (the supplyIntakeUsage pattern). Before a paid
// call, one transaction checks the visitor's reads today and the month's
// spend, then reserves the call's worst-case cost (price book step ceiling)
// and counts the read. After the call, the reservation settles to the
// priced tokens; a call that may have been billed (timeout, malformed
// reply) keeps its whole reservation as spent. Cache hits reserve nothing.

export const AI_FALLBACK_USAGE = "aiFallbackUsage";
const DAY_MS = 24 * 60 * 60 * 1000;

export type AiFallbackRefusalReason =
  "ai_cap_reached" | "ai_daily_limit" | "ai_unreadable";

/** A refusal the command turns into its own needs_input or refusal. */
export class AiFallbackRefusal extends Error {
  constructor(readonly reason: AiFallbackRefusalReason) {
    super(reason);
  }
}

export interface AiFallbackReservation {
  monthKey: string;
  worstMicros: number;
}

export interface LedgerDeps {
  db: FirebaseFirestore.Firestore;
  now: () => Date;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  timestampFromMillis: (millis: number) => FirebaseFirestore.Timestamp;
}

/** The month document id: YYYY-MM (UTC). */
export function monthKeyOf(now: Date): string {
  return now.toISOString().slice(0, 7);
}

/** One visitor's day: reads-YYYY-MM-DD-<sha256(uid) prefix>, no raw uid. */
export function readerDayDocId(uid: string, now: Date): string {
  const reader = createHash("sha256").update(`ai-fallback\u0000${uid}`)
    .digest("hex").slice(0, 32);
  return `reads-${now.toISOString().slice(0, 10)}-${reader}`;
}

const count = (value: unknown) =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0 ?
    value : 0;

/**
 * Reserves one paid read, or refuses with ai_daily_limit / ai_cap_reached.
 * @return {Promise<AiFallbackReservation>} What settle or release returns.
 */
export async function reserveAiRead(deps: LedgerDeps, params: {
  uid: string; worstMicros: number; monthlyCapMicros: number;
  perUidDailyReads: number;
}): Promise<AiFallbackReservation> {
  const now = deps.now();
  const monthKey = monthKeyOf(now);
  const usage = deps.db.collection(AI_FALLBACK_USAGE);
  const monthRef = usage.doc(monthKey);
  const dayRef = usage.doc(readerDayDocId(params.uid, now));
  await deps.db.runTransaction(async (tx) => {
    const [month, day] = await Promise.all([tx.get(monthRef), tx.get(dayRef)]);
    const reads = count(day.data()?.reads);
    if (reads >= params.perUidDailyReads) {
      throw new AiFallbackRefusal("ai_daily_limit");
    }
    const reserved = count(month.data()?.reservedMicros);
    const spent = count(month.data()?.spentMicros);
    if (reserved + spent + params.worstMicros > params.monthlyCapMicros) {
      throw new AiFallbackRefusal("ai_cap_reached");
    }
    tx.set(monthRef, {schemaVersion: 1, kind: "month", key: monthKey,
      reservedMicros: reserved + params.worstMicros, spentMicros: spent,
      paidReads: count(month.data()?.paidReads),
      updatedAt: deps.serverTimestamp()});
    tx.set(dayRef, {schemaVersion: 1, kind: "reader_day",
      key: dayRef.id, reads: reads + 1, updatedAt: deps.serverTimestamp(),
      // A TTL policy on expiresAt removes day counters after a week.
      expiresAt: deps.timestampFromMillis(now.getTime() + 7 * DAY_MS)});
  });
  return {monthKey, worstMicros: params.worstMicros};
}

/**
 * Settles a reservation to what the call cost: spentMicros gets the actual
 * cost (capped at the reservation), so a call that never reached the
 * provider (actualMicros 0) gives the whole reservation back.
 * @return {Promise<void>} Settled.
 */
export async function settleAiRead(deps: LedgerDeps,
  reservation: AiFallbackReservation,
  outcome: {actualMicros: number; paid: boolean}): Promise<void> {
  const monthRef = deps.db.collection(AI_FALLBACK_USAGE)
    .doc(reservation.monthKey);
  const charged = Math.min(Math.max(0, Math.ceil(outcome.actualMicros)),
    reservation.worstMicros);
  await deps.db.runTransaction(async (tx) => {
    const month = await tx.get(monthRef);
    const data = month.data() ?? {};
    tx.set(monthRef, {schemaVersion: 1, kind: "month",
      key: reservation.monthKey,
      reservedMicros: Math.max(0,
        count(data.reservedMicros) - reservation.worstMicros),
      spentMicros: count(data.spentMicros) + charged,
      paidReads: count(data.paidReads) + (outcome.paid ? 1 : 0),
      updatedAt: deps.serverTimestamp()});
  });
}
