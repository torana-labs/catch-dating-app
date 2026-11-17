import {isDeepStrictEqual} from "node:util";
import * as logger from "firebase-functions/logger";
import type {
  HostWhatsappThreadViewDocument,
  OrganizerContactDocument,
  OrganizerWhatsappThreadDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  organizerWhatsappThreadId,
  whatsappThreadSummary,
} from "../organizers/organizerWhatsappThreads";

export const hostWhatsappThreadViewsCollection = "hostWhatsappThreadViews";

/**
 * The manager inbox view of one retained WhatsApp thread, or null when the
 * thread is absent, lacks its owner or contact, or its retention has passed.
 * The fields are exactly the summary listOrganizerWhatsappThreads returns,
 * without the service-window flag that depends on the reader's clock, plus
 * the retention instant. Never the phone hash, the sender connection or the
 * message count.
 * @param {string} threadId The organizerWhatsappThreads document id.
 * @param {FirebaseFirestore.DocumentData|undefined} data The thread data.
 * @param {OrganizerContactDocument|undefined} contact The thread's contact.
 * @param {number} nowMillis The evaluation time.
 * @return {HostWhatsappThreadViewDocument|null} The view, or null.
 */
export function hostWhatsappThreadView(threadId: string,
  data: FirebaseFirestore.DocumentData | undefined,
  contact: OrganizerContactDocument | undefined,
  nowMillis: number): HostWhatsappThreadViewDocument | null {
  if (!data) return null;
  const thread = data as OrganizerWhatsappThreadDocument;
  if (typeof thread.organizerId !== "string" || !thread.organizerId ||
      typeof thread.contactId !== "string" || !thread.contactId ||
      thread.expiresAt.toMillis() <= nowMillis) return null;
  if (organizerWhatsappThreadId(thread.organizerId, thread.contactId) !==
      threadId) {
    throw new Error("WhatsApp thread id does not match its organizer and " +
      "contact.");
  }
  return {organizerId: thread.organizerId,
    ...whatsappThreadSummary(threadId, thread, contact),
    expiresAtMillis: thread.expiresAt.toMillis(), version: 1};
}

/**
 * Reads one thread's view from current sources inside a transaction, without
 * writing: the thread and, when it names one, its contact.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {FirebaseFirestore.Transaction} tx The read transaction.
 * @param {string} threadId The thread document id.
 * @param {number} nowMillis The evaluation time.
 * @return {Promise<HostWhatsappThreadViewDocument|null>} The view.
 */
export async function readHostWhatsappThreadView(
  db: FirebaseFirestore.Firestore, tx: FirebaseFirestore.Transaction,
  threadId: string, nowMillis: number
): Promise<HostWhatsappThreadViewDocument | null> {
  const thread = await tx.get(db.collection("organizerWhatsappThreads")
    .doc(threadId));
  const contactId = thread.data()?.contactId;
  const contact = typeof contactId === "string" && contactId ?
    await tx.get(db.collection("organizerContacts").doc(contactId)) : null;
  return hostWhatsappThreadView(threadId, thread.data(),
    contact?.data() as OrganizerContactDocument | undefined, nowMillis);
}

/**
 * Rewrites one thread's view from current sources, writing only on change.
 * A source that fails its contract is logged and keeps its previous view
 * rather than blocking a trigger retry loop; the nightly data validation
 * reports the document.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} threadId The thread document id.
 * @param {number} nowMillis The evaluation time.
 * @return {Promise<void>} Resolves once the view matches its sources.
 */
export async function reconcileWhatsappThreadView(
  db: FirebaseFirestore.Firestore, threadId: string,
  nowMillis = Date.now()): Promise<void> {
  await db.runTransaction(async (tx) => {
    const ref = db.collection(hostWhatsappThreadViewsCollection).doc(threadId);
    const old = await tx.get(ref);
    let next: HostWhatsappThreadViewDocument | null;
    try {
      next = await readHostWhatsappThreadView(db, tx, threadId, nowMillis);
    } catch (error) {
      logger.warn("WhatsApp thread view kept a source that fails its " +
        "contract.", {threadId,
        reason: error instanceof Error ? error.message : String(error)});
      return;
    }
    if (isDeepStrictEqual(old.data() ?? null, next)) return;
    if (next) tx.set(ref, next);
    else if (old.exists) tx.delete(ref);
  });
}

/** Contact fields the thread view reads; other contact writes are ignored. */
const viewedContactFields = ["organizerId", "displayName",
  "displayNameOverride", "identityState", "identityConfidence", "linkedUid",
  "deletedAt", "hiddenAt", "mergedIntoContactId"] as const;

/**
 * The thread views one contact write can change: the organizer's thread with
 * that contact, from the old and new document, and none when no field the
 * view reads changed. Thread ids are derived, so no query is needed.
 * @param {string} contactId The contact document id.
 * @param {FirebaseFirestore.DocumentData|undefined} before Old contact data.
 * @param {FirebaseFirestore.DocumentData|undefined} after New contact data.
 * @return {string[]} The thread ids to reconcile.
 */
export function contactWhatsappThreadIds(contactId: string,
  before: FirebaseFirestore.DocumentData | undefined,
  after: FirebaseFirestore.DocumentData | undefined): string[] {
  const pick = (data: FirebaseFirestore.DocumentData | undefined) =>
    viewedContactFields.map((field) => data?.[field] ?? null);
  if (before && after && isDeepStrictEqual(pick(before), pick(after))) {
    return [];
  }
  const organizerIds = new Set([before?.organizerId, after?.organizerId]
    .filter((id): id is string => typeof id === "string" && id.length > 0));
  return [...organizerIds].map((organizerId) =>
    organizerWhatsappThreadId(organizerId, contactId));
}
