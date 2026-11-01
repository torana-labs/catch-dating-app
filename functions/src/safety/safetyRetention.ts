import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {
  ACCOUNT_SAFETY_ACTIONS,
  ACCOUNT_SAFETY_NOTICES,
  ACCOUNT_SAFETY_STATES,
  ORGANIZER_GUEST_BLOCKS,
} from "./accountStanding";
import {BLOCKED_SIGNUP_ATTEMPTS} from "./bannedIdentities";
import {safetyRetainUntil} from "./safetyPolicy";

/** Case records purged once their 180 days after deletion have passed. */
const RETAINED_COLLECTIONS = [
  "reports",
  ACCOUNT_SAFETY_ACTIONS,
  BLOCKED_SIGNUP_ATTEMPTS,
] as const;

/**
 * Starts the 180-day clock on a deleted account's case records and removes
 * what only served the live account (its standing, notices and organizer
 * blocks). Banned phone and device hashes stay so the ban keeps holding.
 * Reports are marked by the report cleanup in account deletion.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} uid Deleted account.
 * @param {number} deletedAtMillis Deletion time.
 */
export async function retainSafetyRecordsForDeletedAccount(
  db: FirebaseFirestore.Firestore,
  uid: string,
  deletedAtMillis: number
): Promise<void> {
  const retainUntil = safetyRetainUntil(deletedAtMillis);
  const [actions, attempts, notices, blocks] = await Promise.all([
    db.collection(ACCOUNT_SAFETY_ACTIONS).where("uid", "==", uid).get(),
    db.collection(BLOCKED_SIGNUP_ATTEMPTS)
      .where("attemptedUid", "==", uid).get(),
    db.collection(`${ACCOUNT_SAFETY_NOTICES}/${uid}/items`).get(),
    db.collection(ORGANIZER_GUEST_BLOCKS).where("uid", "==", uid).get(),
  ]);
  const writes: Array<(batch: FirebaseFirestore.WriteBatch) => void> = [];
  for (const doc of [...actions.docs, ...attempts.docs]) {
    writes.push((batch) => batch.update(doc.ref, {retainUntil}));
  }
  for (const doc of [...notices.docs, ...blocks.docs]) {
    writes.push((batch) => batch.delete(doc.ref));
  }
  const state = db.collection(ACCOUNT_SAFETY_STATES).doc(uid);
  if ((await state.get()).exists) {
    writes.push((batch) => batch.delete(state));
  }
  for (let start = 0; start < writes.length; start += 400) {
    const batch = db.batch();
    writes.slice(start, start + 400).forEach((write) => write(batch));
    await batch.commit();
  }
}

/**
 * Deletes case records whose retention has run out.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {Timestamp} now Current time.
 * @return {Promise<number>} Records deleted.
 */
export async function purgeRetainedSafetyRecordsNow(
  db: FirebaseFirestore.Firestore,
  now: Timestamp
): Promise<number> {
  let deleted = 0;
  for (const collection of RETAINED_COLLECTIONS) {
    const due = await db.collection(collection)
      .where("retainUntil", "<=", now).limit(400).get();
    if (due.empty) continue;
    const batch = db.batch();
    due.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deleted += due.size;
  }
  return deleted;
}

export const purgeRetainedSafetyRecords = onSchedule(
  {schedule: "every day 03:30", timeZone: "Asia/Kolkata"},
  async () => {
    await purgeRetainedSafetyRecordsNow(admin.firestore(), Timestamp.now());
  }
);
