import {onCall, CallableRequest, HttpsError} from
  "firebase-functions/v2/https";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import type {
  BlockDocument,
  MatchDocument,
} from "../shared/generated/firestoreAdminTypes";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {requireAuth} from "../shared/auth";
import type {BlockUserCallablePayload} from
  "../shared/generated/blockUserCallablePayload";
import {
  validateBlockUserCallablePayload,
} from "../shared/generated/validators/blockUserInput";
import {
  validateUnblockUserCallablePayload,
} from "../shared/generated/validators/unblockUserInput";
import type {UnblockUserCallablePayload} from
  "../shared/generated/unblockUserCallablePayload";
import {normalizePayloadStrings, normalizeSingleIdPayload} from
  "../shared/callablePayloadNormalization";
import {validateCallableWithAjv} from "../shared/validation";

const BLOCKS_COLLECTION = "blocks";
const MATCHES_COLLECTION = "matches";

interface BlockingDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: BlockingDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
};

/**
 * Builds the deterministic document ID for a directed block edge.
 * @param {string} blockerUserId User creating the block.
 * @param {string} blockedUserId User being blocked.
 * @return {string} Block document ID.
 */
export function blockDocId(
  blockerUserId: string,
  blockedUserId: string
): string {
  return `${blockerUserId}__${blockedUserId}`;
}

/**
 * Returns every directed block document ID needed to check one user against
 * multiple peers.
 * @param {string} userId User being checked.
 * @param {string[]} peerIds Peers in the surface.
 * @return {string[]} Directed block document IDs.
 */
export function blockDocIdsForPairs(
  userId: string,
  peerIds: string[]
): string[] {
  return [...new Set(peerIds.filter((id) => id !== userId))].flatMap((peerId) =>
    [blockDocId(userId, peerId), blockDocId(peerId, userId)]
  );
}

/**
 * Returns true if any block exists between [userId] and [peerIds].
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string} userId User being checked.
 * @param {string[]} peerIds Peers to check.
 * @return {Promise<boolean>} Whether a block exists in either direction.
 */
export async function hasBlockingRelationship(
  db: FirebaseFirestore.Firestore,
  userId: string,
  peerIds: string[]
): Promise<boolean> {
  const ids = blockDocIdsForPairs(userId, peerIds);
  if (ids.length === 0) return false;

  const refs = ids.map((id) => db.collection(BLOCKS_COLLECTION).doc(id));
  const snaps = await Promise.all(refs.map((ref) => ref.get()));
  return snaps.some((snap) => snap.exists);
}

/**
 * Transaction-safe block check for booking and waitlist promotion paths.
 * @param {FirebaseFirestore.Transaction} tx Firestore transaction.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string} userId User being checked.
 * @param {string[]} peerIds Peers to check.
 * @return {Promise<boolean>} Whether a block exists in either direction.
 */
export async function hasBlockingRelationshipInTransaction(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  userId: string,
  peerIds: string[]
): Promise<boolean> {
  const ids = blockDocIdsForPairs(userId, peerIds);
  if (ids.length === 0) return false;

  const refs = ids.map((id) => db.collection(BLOCKS_COLLECTION).doc(id));
  const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));
  return snaps.some((snap) => snap.exists);
}

/**
 * Throws a generic error if any block edge exists between a user and peers.
 * @param {FirebaseFirestore.Transaction} tx Firestore transaction.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string} userId User being checked.
 * @param {string[]} peerIds Peers to check.
 */
export async function assertNoBlockingRelationshipInTransaction(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  userId: string,
  peerIds: string[]
): Promise<void> {
  if (await hasBlockingRelationshipInTransaction(tx, db, userId, peerIds)) {
    throw new HttpsError(
      "failed-precondition",
      "This event is unavailable."
    );
  }
}

/**
 * Callable implementation for creating a directed block edge.
 * @param {CallableRequest<Partial<BlockUserData> | null>} request Callable.
 * @param {BlockingDeps} deps Injectable service dependencies.
 * @return {Promise<{blocked: boolean}>} Operation result.
 */
export async function blockUserHandler(
  request: CallableRequest<unknown>,
  deps: BlockingDeps = defaultDeps
): Promise<{blocked: boolean}> {
  const blockerUserId = requireAuth(request);
  const data = validateCallableWithAjv<BlockUserCallablePayload>(
    request,
    validateBlockUserCallablePayload,
    normalizeBlockUserPayload
  );

  if (data.targetUserId === blockerUserId) {
    throw new HttpsError("invalid-argument", "targetUserId is invalid.");
  }

  const db = deps.firestore();
  await deps.checkRateLimit?.(db, blockerUserId, "blockUser", {
    maxRequests: 10, windowMs: 60 * 1000,
  });

  await db
    .collection(BLOCKS_COLLECTION)
    .doc(blockDocId(blockerUserId, data.targetUserId))
    .set({
      blockerUserId,
      blockedUserId: data.targetUserId,
      createdAt: deps.serverTimestamp(),
      source: data.source ?? "profile",
      ...(data.reasonCode && {reasonCode: data.reasonCode}),
    });

  await closeMatchesForBlockedPair({
    db,
    userAId: blockerUserId,
    userBId: data.targetUserId,
    blockedBy: blockerUserId,
    serverTimestamp: deps.serverTimestamp,
  });

  return {blocked: true};
}

/**
 * Callable implementation for removing a directed block edge.
 * @param {CallableRequest<Partial<UnblockUserData> | null>} request Callable.
 * @param {BlockingDeps} deps Injectable service dependencies.
 * @return {Promise<{unblocked: boolean}>} Operation result.
 */
export async function unblockUserHandler(
  request: CallableRequest<unknown>,
  deps: BlockingDeps = defaultDeps
): Promise<{unblocked: boolean}> {
  const blockerUserId = requireAuth(request);
  const data = validateCallableWithAjv<UnblockUserCallablePayload>(
    request,
    validateUnblockUserCallablePayload,
    normalizeSingleIdPayload("targetUserId")
  );

  if (data.targetUserId === blockerUserId) {
    throw new HttpsError("invalid-argument", "targetUserId is invalid.");
  }

  const db = deps.firestore();
  await deps.checkRateLimit?.(db, blockerUserId, "unblockUser", {
    maxRequests: 10, windowMs: 60 * 1000,
  });

  await db
    .collection(BLOCKS_COLLECTION)
    .doc(blockDocId(blockerUserId, data.targetUserId))
    .delete();

  return {unblocked: true};
}

/**
 * Trims block-user payload fields before generated schema validation.
 * @param {unknown} data Raw callable payload.
 * @return {unknown} Normalized payload.
 */
function normalizeBlockUserPayload(data: unknown): unknown {
  return normalizePayloadStrings(data, {
    stringFields: ["targetUserId", "source", "reasonCode"],
  });
}

/**
 * Closes existing matches between users after a block.
 * @param {object} params Dependencies and pair IDs.
 * @return {Promise<void>} Resolves after matching docs update.
 */
async function closeMatchesForBlockedPair({
  db,
  userAId,
  userBId,
  blockedBy,
  serverTimestamp,
}: {
  db: FirebaseFirestore.Firestore;
  userAId: string;
  userBId: string;
  blockedBy: string;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
}): Promise<void> {
  const snap = await db
    .collection(MATCHES_COLLECTION)
    .where("participantIds", "array-contains", userAId)
    .get();

  const batch = db.batch();
  let updates = 0;
  for (const doc of snap.docs) {
    const match = doc.data() as MatchDocument;
    if (!match.participantIds?.includes(userBId)) continue;

    batch.update(doc.ref, {
      status: "blocked",
      blockedBy,
      blockedAt: serverTimestamp(),
      unreadCounts: {
        [match.user1Id]: 0,
        [match.user2Id]: 0,
      },
    });
    updates++;
  }

  if (updates > 0) {
    await batch.commit();
  }
}

export const blockUser = onCall(appCheckCallableOptions, (request) =>
  blockUserHandler(request)
);

export const unblockUser = onCall(appCheckCallableOptions, (request) =>
  unblockUserHandler(request)
);

export const onBlockCreated = onDocumentCreated(
  "blocks/{blockId}",
  async (event) => {
    const block = event.data?.data() as BlockDocument | undefined;
    if (!block) return;

    logger.info("Block created", {
      blockerUserId: block.blockerUserId,
      blockedUserId: block.blockedUserId,
    });

    await closeMatchesForBlockedPair({
      db: admin.firestore(),
      userAId: block.blockerUserId,
      userBId: block.blockedUserId,
      blockedBy: block.blockerUserId,
      serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
    });
  }
);
