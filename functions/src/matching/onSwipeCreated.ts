import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {createHash} from "node:crypto";
import type {
  MatchDocument,
  SwipeDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  schemaProfileDecisionCollectionPath,
  schemaProfileDecisionOutgoingSubcollectionPath,
  schemaProfileDecisionTriggerPath,
} from "../shared/generated/schemaPaths";
import {hasBlockingRelationship} from "../safety/blocking";
import {buildSwipeSignalFacts} from "../marketplace/signalBuilders";
import {
  recordParticipantSignalFactsBestEffort,
} from "../marketplace/participantSignals";
import {
  refreshEventSuccessScorecard,
} from "../marketplace/eventSuccessScorecards";
import {isCurrentPick} from "./deckEraDecision";

interface SwipeCreatedParams {
  swiperId: string;
  targetId: string;
  swipeData: SwipeDocument | undefined;
}

interface SwipeCreatedDeps {
  firestore: () => FirebaseFirestore.Firestore;
  hasBlockingRelationship: (
    db: FirebaseFirestore.Firestore,
    userId: string,
    peerIds: string[]
  ) => Promise<boolean>;
  arrayUnion: (...elements: string[]) => FirebaseFirestore.FieldValue;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  recordSignalFacts?: typeof recordParticipantSignalFactsBestEffort;
  refreshScorecard?: typeof refreshEventSuccessScorecard;
}

const defaultDeps: SwipeCreatedDeps = {
  firestore: () => admin.firestore(),
  hasBlockingRelationship,
  arrayUnion: (...elements) =>
    admin.firestore.FieldValue.arrayUnion(...elements),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  recordSignalFacts: recordParticipantSignalFactsBestEffort,
  refreshScorecard: refreshEventSuccessScorecard,
};

/**
 * Creates a match when a newly created pick has a reciprocal current pick.
 *
 * Only current Stay in touch picks count. A deck-era decision (a pass, a like
 * with a reaction or comment, or anything older than the deck's retirement,
 * see `deckEraDecision.ts`) never opens a chat, never records signals and
 * never becomes a chat message, whichever side it is on.
 *
 * The Firestore trigger adapter passes path params and document data here so
 * tests can verify the match contract without the Functions event runtime.
 * @param {SwipeCreatedParams} params Trigger path params and swipe data.
 * @param {SwipeCreatedDeps} deps Injectable Firebase dependencies.
 * @return {Promise<void>} Resolves when processing is complete.
 */
export async function onSwipeCreatedHandler(
  {swiperId, targetId, swipeData}: SwipeCreatedParams,
  deps: SwipeCreatedDeps = defaultDeps
): Promise<void> {
  if (!swipeData || swipeData.direction !== "like") return;
  if (!isCurrentPick(swipeData)) {
    logger.info("Ignoring deck-era profile decision", {swiperId, targetId});
    return;
  }

  const db = deps.firestore();

  if (await deps.hasBlockingRelationship(db, swiperId, [targetId])) {
    logger.info("Skipping blocked profile decision metrics", {
      swiperId,
      targetId,
    });
    return;
  }

  if (deps.recordSignalFacts) {
    await deps.recordSignalFacts(
      db,
      buildSwipeSignalFacts(swiperId, targetId, swipeData)
    );
  }
  const refreshedEventIds = new Set<string>();
  const refreshEvents = (eventIds: string[]) =>
    refreshScorecardsForEvents(
      eventIds.filter((eventId) => {
        if (refreshedEventIds.has(eventId)) return false;
        refreshedEventIds.add(eventId);
        return true;
      }),
      deps
    );
  await refreshEvents([swipeData.eventId]);

  // Check if the target has already picked the swiper with a current pick.
  const reverseSwipeDoc = await db
    .collection(schemaProfileDecisionCollectionPath)
    .doc(targetId)
    .collection(schemaProfileDecisionOutgoingSubcollectionPath)
    .doc(swiperId)
    .get();

  const reverseSwipe = reverseSwipeDoc.data() as SwipeDocument | undefined;
  if (!reverseSwipeDoc.exists || !isCurrentPick(reverseSwipe)) {
    return;
  }

  const sharedEventIds = Array.from(
    new Set([reverseSwipe.eventId, swipeData.eventId].filter(Boolean))
  );

  // Deterministic match ID, regardless of who swiped first.
  const [id1, id2] = [swiperId, targetId].sort();
  const matchId = `${id1}_${id2}`;
  const matchRef = db.collection("matches").doc(matchId);

  const matchDoc: MatchDocument = {
    user1Id: id1,
    user2Id: id2,
    participantIds: [id1, id2],
    eventIds: sharedEventIds,
    createdAt:
      deps.serverTimestamp() as unknown as FirebaseFirestore.Timestamp,
    lastMessageAt: null,
    lastMessagePreview: null,
    lastMessageSenderId: null,
    unreadCounts: {[id1]: 0, [id2]: 0},
    status: "active",
    blockedBy: null,
    blockedAt: null,
    conversationType: "match",
  };

  let resolvedMatchRef = matchRef;
  let resolvedMatchId = matchId;
  let createdDatingMatch = false;
  try {
    // create() throws if the document already exists.
    await matchRef.create(matchDoc);
    createdDatingMatch = true;
  } catch (e: unknown) {
    const code = (e as {code?: unknown}).code;
    if (code === 6 || code === "already-exists") {
      const existingPairSnap = await matchRef.get();
      const existingPair = existingPairSnap.data() as
        MatchDocument | undefined;
      if (existingPair?.conversationType === "organizerHostInquiry") {
        // Some legacy Host inquiries used the same pair-only document id as a
        // dating match. Never convert that document (and its organizer chat
        // history) into a dating conversation. Use a separate deterministic
        // opaque id for the reciprocal match instead.
        resolvedMatchId = datingMatchIdForPair(id1, id2);
        resolvedMatchRef = db.collection("matches").doc(resolvedMatchId);
        try {
          await resolvedMatchRef.create(matchDoc);
          createdDatingMatch = true;
        } catch (opaqueError: unknown) {
          const opaqueCode = (opaqueError as {code?: unknown}).code;
          if (opaqueCode !== 6 && opaqueCode !== "already-exists") {
            throw opaqueError;
          }
          if (sharedEventIds.length > 0) {
            await resolvedMatchRef.update({
              eventIds: deps.arrayUnion(...sharedEventIds),
              conversationType: "match",
              organizerId: admin.firestore.FieldValue.delete(),
            });
          }
        }
      } else if (sharedEventIds.length > 0) {
        // ALREADY_EXISTS - keep one dating match doc per pair and append
        // shared event history instead of creating another conversation.
        await matchRef.update({
          eventIds: deps.arrayUnion(...sharedEventIds),
          conversationType: "match",
          organizerId: admin.firestore.FieldValue.delete(),
        });
      }
    } else {
      throw e;
    }
  }

  if (createdDatingMatch) {
    logger.info("Match created", {
      matchId: resolvedMatchId,
      user1Id: id1,
      user2Id: id2,
    });
  }
  await refreshEvents(sharedEventIds);
}

/**
 * Returns the deterministic fallback id used only when a legacy Host inquiry
 * already occupies the historical pair-only dating match id.
 * @param {string} user1Id First sorted participant id.
 * @param {string} user2Id Second sorted participant id.
 * @return {string} Firestore-safe opaque dating match id.
 */
export function datingMatchIdForPair(user1Id: string, user2Id: string): string {
  const digest = createHash("sha256")
    .update(JSON.stringify([user1Id, user2Id]))
    .digest("hex");
  return `datingMatch_${digest}`;
}

/**
 * Refreshes host scorecards touched by a reciprocal catch.
 * @param {string[]} eventIds Event ids attached to the match.
 * @param {SwipeCreatedDeps} deps Injectable dependencies.
 */
async function refreshScorecardsForEvents(
  eventIds: string[],
  deps: SwipeCreatedDeps
): Promise<void> {
  const refreshScorecard = deps.refreshScorecard;
  if (!refreshScorecard || eventIds.length === 0) return;
  await Promise.all(eventIds.map((eventId) => refreshScorecard(eventId)));
}

export const onSwipeCreated = onDocumentCreated(
  schemaProfileDecisionTriggerPath,
  async (event) => {
    const {swiperId, targetId} = event.params;
    const swipeData = event.data?.data() as SwipeDocument | undefined;
    await onSwipeCreatedHandler({swiperId, targetId, swipeData});
  }
);
