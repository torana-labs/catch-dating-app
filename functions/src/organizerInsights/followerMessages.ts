import {HttpsError} from "firebase-functions/v2/https";
import type {
  OrganizerFollowerMessageQuotaDocument,
} from "../shared/generated/organizerFollowerMessageQuotaDocument";

/**
 * "Message followers" from the website owner view (#1109): at most two per
 * calendar month per organiser, counted in Asia/Kolkata. The allowance is a
 * server-only document per organiser-month holding the request ids that
 * used it, reserved in a transaction before the follower update is sent and
 * released if sending fails, so two racing sends can never make three.
 */

export const followerMessageQuotasCollection =
  "organizerFollowerMessageQuotas";
export const followerMessageLimit = 2 as const;
const istOffsetMillis = (5 * 60 + 30) * 60 * 1000;

/**
 * The calendar month in India for a time, as YYYY-MM.
 * @param {Date} at Time.
 * @return {string} Month key.
 */
export function followerMessageMonth(at: Date): string {
  return new Date(at.getTime() + istOffsetMillis).toISOString().slice(0, 7);
}

/**
 * Quota document id for one organiser-month.
 * @param {string} organizerId Organiser.
 * @param {string} month YYYY-MM.
 * @return {string} Document id.
 */
export function followerMessageQuotaId(organizerId: string, month: string) {
  return `${organizerId}_${month.replace("-", "")}`;
}

/**
 * Reserves one of the month's two sends for a request, or reuses the slot a
 * replayed request already holds.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {object} input Organiser, request and time.
 * @return {Promise<object>} Usage after the reservation and whether it was
 * a replay.
 */
export async function reserveFollowerMessage(
  db: FirebaseFirestore.Firestore,
  input: {organizerId: string; requestId: string; now: Date}
): Promise<{month: string; used: number; replay: boolean}> {
  const month = followerMessageMonth(input.now);
  const ref = db.collection(followerMessageQuotasCollection)
    .doc(followerMessageQuotaId(input.organizerId, month));
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ?
      snap.data() as OrganizerFollowerMessageQuotaDocument : null;
    const requestIds = current?.organizerId === input.organizerId &&
      Array.isArray(current.requestIds) ? current.requestIds : [];
    if (requestIds.includes(input.requestId)) {
      return {month, used: requestIds.length, replay: true};
    }
    if (requestIds.length >= followerMessageLimit) {
      throw new HttpsError("resource-exhausted",
        "You have messaged your followers twice this month. " +
        "You can send again next month.");
    }
    const next: OrganizerFollowerMessageQuotaDocument = {
      organizerId: input.organizerId,
      month,
      requestIds: [...requestIds, input.requestId],
      updatedAtMillis: input.now.getTime(),
    };
    tx.set(ref, next);
    return {month, used: next.requestIds.length, replay: false};
  });
}

/**
 * Gives a reserved send back when the follower update did not go out.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {object} input Organiser, request, month and time.
 */
export async function releaseFollowerMessage(
  db: FirebaseFirestore.Firestore,
  input: {organizerId: string; requestId: string; month: string; now: Date}
): Promise<void> {
  const ref = db.collection(followerMessageQuotasCollection)
    .doc(followerMessageQuotaId(input.organizerId, input.month));
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const current = snap.data() as OrganizerFollowerMessageQuotaDocument;
    if (!current.requestIds.includes(input.requestId)) return;
    tx.set(ref, {...current,
      requestIds: current.requestIds.filter((id) => id !== input.requestId),
      updatedAtMillis: input.now.getTime()});
  });
}
