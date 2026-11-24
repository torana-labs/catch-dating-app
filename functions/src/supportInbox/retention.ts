import {FieldPath, Timestamp} from "firebase-admin/firestore";

/**
 * Support conversations expire by Firestore TTL on `expiresAt` (#2468): a
 * closed conversation and every message in it carry the same stamp, set
 * when it closes and cleared when it reopens. TTL deletes only the
 * document it fires on, so each message carries the stamp itself. The
 * first page of messages is written in the transaction that changes the
 * conversation; a longer thread is paged after it.
 */
export const SUPPORT_EXPIRY_PAGE = 400;

/** Kept equal to SUPPORT_CONVERSATIONS (conversations.ts imports this). */
const SUPPORT_CONVERSATIONS = "supportConversations";

type Tx = FirebaseFirestore.Transaction;
type Db = FirebaseFirestore.Firestore;
type Snapshot = FirebaseFirestore.QueryDocumentSnapshot;

/**
 * Reads the first page of a conversation's messages in a transaction,
 * before its writes.
 * @param {Tx} tx Transaction.
 * @param {Db} db Firestore.
 * @param {string} conversationId Conversation.
 * @return {Promise<Snapshot[]>} The first page.
 */
export async function readFirstMessagePage(tx: Tx, db: Db,
  conversationId: string): Promise<Snapshot[]> {
  return (await tx.get(messagePage(db, conversationId, null))).docs;
}

/**
 * Stamps (or clears, with null) the expiry of a page of messages.
 * @param {Tx} tx Transaction.
 * @param {Snapshot[]} page Messages.
 * @param {Timestamp|null} expiresAt Expiry, or null to clear it.
 */
export function writeMessagePageExpiry(tx: Tx, page: Snapshot[],
  expiresAt: Timestamp | null): void {
  for (const doc of page) tx.update(doc.ref, {expiresAt});
}

/**
 * Pages the rest of a thread after the first page, while the conversation
 * still carries the same expiry (a later close or reopen pages its own).
 * @param {Db} db Firestore.
 * @param {string} conversationId Conversation.
 * @param {Snapshot[]} firstPage The page written in the transaction.
 * @param {Timestamp|null} expiresAt Expiry, or null to clear it.
 * @return {Promise<void>} Resolves when every message carries it.
 */
export async function pageRemainingMessageExpiry(db: Db,
  conversationId: string, firstPage: Snapshot[],
  expiresAt: Timestamp | null): Promise<void> {
  let page = firstPage;
  while (page.length === SUPPORT_EXPIRY_PAGE) {
    const conversation = (await db.collection(SUPPORT_CONVERSATIONS)
      .doc(conversationId).get()).data();
    if (!sameExpiry(conversation?.expiresAt ?? null, expiresAt)) return;
    page = (await messagePage(db, conversationId,
      page[page.length - 1]).get()).docs;
    const batch = db.batch();
    for (const doc of page) batch.update(doc.ref, {expiresAt});
    if (page.length > 0) await batch.commit();
  }
}

function messagePage(db: Db, conversationId: string,
  after: Snapshot | null): FirebaseFirestore.Query {
  const query = db.collection(SUPPORT_CONVERSATIONS).doc(conversationId)
    .collection("messages").orderBy(FieldPath.documentId())
    .limit(SUPPORT_EXPIRY_PAGE);
  return after === null ? query : query.startAfter(after);
}

function sameExpiry(left: unknown, right: Timestamp | null): boolean {
  if (left === null || right === null) return left === right;
  return left instanceof Timestamp && left.isEqual(right);
}
