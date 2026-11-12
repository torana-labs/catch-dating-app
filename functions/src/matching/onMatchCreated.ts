import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import type {
  MatchDocument,
  PublicProfileDocument,
  UserProfileDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  allowsPushPreference,
  activityNotificationId,
  sendFcmNotification,
  setActivityNotification,
  notificationProfileAvatar,
} from "../shared/notifications";
import {resolveConversationPushTokens} from "../shared/conversationPushTargets";
import {demoMetadataFromSources} from "../shared/demoMetadata";
import {withEventReceipt} from "../shared/eventReceipts";
import {buildMatchSignalFacts} from "../marketplace/signalBuilders";
import {
  recordParticipantSignalFactsBestEffort,
} from "../marketplace/participantSignals";

interface MatchCreatedEvent {
  params: {matchId: string};
  data?: {
    data(): FirebaseFirestore.DocumentData | undefined;
  };
}

interface MatchCreatedDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  sendNotification: typeof sendFcmNotification;
  resolvePushTokens?: typeof resolveConversationPushTokens;
  recordSignalFacts?: typeof recordParticipantSignalFactsBestEffort;
}

const defaultDeps: MatchCreatedDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  sendNotification: sendFcmNotification,
  recordSignalFacts: recordParticipantSignalFactsBestEffort,
};

/**
 * Creates durable activity notifications and push notifications for a match.
 * @param {MatchCreatedEvent} event Firestore match-created event.
 * @param {MatchCreatedDeps} deps Injectable dependencies for tests.
 */
export async function onMatchCreatedHandler(
  event: MatchCreatedEvent,
  deps: MatchCreatedDeps = defaultDeps
): Promise<void> {
  const {matchId} = event.params;
  const match = event.data?.data() as MatchDocument | undefined;
  if (!match) return;
  if (match.conversationType && match.conversationType !== "match") {
    logger.info("Skipping non-match conversation notification", {matchId});
    return;
  }

  const db = deps.firestore();
  const {user1Id, user2Id} = match;
  const [user1Doc, user2Doc, profile1Doc, profile2Doc] = await Promise.all([
    db.collection("users").doc(user1Id).get(),
    db.collection("users").doc(user2Id).get(),
    db.collection("publicProfiles").doc(user1Id).get(),
    db.collection("publicProfiles").doc(user2Id).get(),
  ]);

  const user1 = user1Doc.data() as UserProfileDocument | undefined;
  const user2 = user2Doc.data() as UserProfileDocument | undefined;
  const profile1 = profile1Doc.data() as PublicProfileDocument | undefined;
  const profile2 = profile2Doc.data() as PublicProfileDocument | undefined;
  const profile1Name = profile1?.name ?? "Someone";
  const profile2Name = profile2?.name ?? "Someone";
  const latestEventId = latestMatchEventId(match);

  if (deps.recordSignalFacts) {
    await deps.recordSignalFacts(db, buildMatchSignalFacts(matchId, match));
  }

  await Promise.all([
    setActivityNotification(db, {
      id: activityNotificationId("match", matchId),
      uid: user1Id,
      type: "match",
      title: "You picked each other",
      body: `You and ${profile2Name} picked each other. Say hi!`,
      createdAt: deps.serverTimestamp(),
      matchId,
      eventId: latestEventId,
      actorUid: user2Id,
      actorName: profile2Name,
      ...demoMetadataFromSources(match),
    }),
    setActivityNotification(db, {
      id: activityNotificationId("match", matchId),
      uid: user2Id,
      type: "match",
      title: "You picked each other",
      body: `You and ${profile1Name} picked each other. Say hi!`,
      createdAt: deps.serverTimestamp(),
      matchId,
      eventId: latestEventId,
      actorUid: user1Id,
      actorName: profile1Name,
      ...demoMetadataFromSources(match),
    }),
  ]);

  const resolveTokens = deps.resolvePushTokens ?? resolveConversationPushTokens;
  const recipients = [
    {
      uid: user1Id,
      user: user1,
      actor: profile2,
      enabled: allowsPushPreference(user1, "matches"),
      body: `You and ${profile2Name} picked each other. Say hi!`,
    },
    {
      uid: user2Id,
      user: user2,
      actor: profile1,
      enabled: allowsPushPreference(user2, "matches"),
      body: `You and ${profile1Name} picked each other. Say hi!`,
    },
  ];
  const pushTargets = (await Promise.all(recipients.map(async (recipient) => {
    if (!recipient.enabled) return [];
    const tokens = await resolveTokens(db, recipient.uid, "consumer");
    return tokens.map((token) => ({...recipient, token}));
  }))).flat();

  if (pushTargets.length === 0) return;

  // Guard the push behind an event receipt: this trigger is at-least-once, and
  // the activity notifications above are idempotent (deterministic id), but a
  // redelivery would otherwise re-send the match push.
  await withEventReceipt(
    db,
    {
      receiptId: `onMatchCreated_${matchId}`,
      handler: "onMatchCreated",
      matchId,
      eventId: latestEventId,
    },
    async () => {
      logger.info("Sending match notifications", {
        matchId,
        tokenCount: pushTargets.length,
      });

      await Promise.allSettled(
        pushTargets.map((target) =>
          deps.sendNotification({
            token: target.token,
            title: "You picked each other",
            body: target.body,
            type: "match",
            matchId,
            notificationId: activityNotificationId("match", matchId),
            recipientUid: target.uid,
            appRole: "consumer",
            actorName: target.actor?.name,
            actorAvatarUrl: notificationProfileAvatar(target.actor),
          })
        )
      );
    }
  );
}

/**
 * Returns the newest shared event id for a match.
 *
 * @param {MatchDocument} match Match document data.
 * @return {string | undefined} Latest event id when one is available.
 */
function latestMatchEventId(match: MatchDocument): string | undefined {
  return match.eventIds.at(-1);
}

export const onMatchCreated = onDocumentCreated(
  "matches/{matchId}",
  (event) => onMatchCreatedHandler(event)
);
