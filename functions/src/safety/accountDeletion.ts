import {onCall, CallableRequest} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {requireAuth} from "../shared/auth";
import {eventBroadcastDeliveryKey} from "../shared/eventBroadcasts";
import type {
  ProfilePhoto,
  OrganizerFollowDocument,
  OrganizerContactIdentityLinkDocument,
} from "../shared/generated/firestoreAdminTypes";
import {releaseCrossPathsPairHold} from "../crossPaths/pairHolds";
import {deleteAccountEventParticipations} from "./accountDeletionSeats";
import {endAccountHostMemberships} from
  "../hostMemberships/accountDeletion";

type StorageBucket = ReturnType<ReturnType<typeof admin.storage>["bucket"]>;

interface AccountDeletionDeps {
  auth: () => admin.auth.Auth;
  firestore: () => FirebaseFirestore.Firestore;
  storageBucket: () => StorageBucket;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: AccountDeletionDeps = {
  auth: () => admin.auth(),
  firestore: () => admin.firestore(),
  storageBucket: () => admin.storage().bucket(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
};

/**
 * Callable implementation for deleting a user's account-facing data.
 * @param {CallableRequest<null>} request Callable request.
 * @param {AccountDeletionDeps} deps Injectable dependencies.
 * @return {Promise<{deleted: boolean}>} Operation result.
 */
export async function requestAccountDeletionHandler(
  request: CallableRequest<null>,
  deps: AccountDeletionDeps = defaultDeps
): Promise<{deleted: boolean}> {
  const uid = requireAuth(request);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, uid, "requestAccountDeletion", {
    maxRequests: 3, windowMs: 60 * 60 * 1000,
  });

  const deletedUserRef = db.collection("deletedUsers").doc(uid);
  const now = deps.serverTimestamp();

  // A legacy tombstone without status is treated as completed. A processing
  // tombstone is deliberately resumed: edge cleanup is status-aware, so a
  // retry does not double-decrement counters.
  const existingTombstone = await deletedUserRef.get();
  if (existingTombstone.exists &&
      existingTombstone.data()?.status !== "processing") {
    await deleteAuthUserIfPresent(deps.auth(), uid);
    return {deleted: true};
  }
  await deletedUserRef.set({
    uid,
    deletedAt: existingTombstone.data()?.deletedAt ?? now,
    status: "processing",
    updatedAt: now,
    retainedFor: ["safety", "payments", "fraud"],
  }, {merge: true});

  const userSnap = await db.collection("users").doc(uid).get();
  const userData = userSnap.data() ?? {};
  const hostProfile = await db.collection("hostProfiles").doc(uid).get();

  await deleteStoragePaths(
    profilePhotoDeletionStoragePaths(uid, {
      ...userData,
      profilePhotos: [
        ...(Array.isArray(userData.profilePhotos) ?
          userData.profilePhotos : []),
        {url: hostProfile.data()?.avatarUrl},
      ],
    }),
    deps.storageBucket()
  );

  const writer = new BatchQueue(db);
  writer.delete(db.collection("hostProfiles").doc(uid));
  writer.delete(db.collection("publicProfiles").doc(uid));
  writer.delete(db.collection("crossPathsShowcaseEligibility").doc(uid));
  writer.delete(db.collection("onboarding_drafts").doc(uid));

  await queueRelationshipCleanup({
    db,
    uid,
    now,
    writer,
  });
  await removeOrganizerHostIdentity(db, uid);

  writer.set(db.collection("users").doc(uid), {
    deleted: true,
    deletedAt: now,
    email: "",
    name: "Deleted user",
    firstName: "",
    lastName: "",
    displayName: "Deleted user",
    dateOfBirth: admin.firestore.Timestamp.fromMillis(0),
    profilePrompts: [],
    gender: "other",
    phoneNumber: "",
    profileComplete: false,
    profilePhotos: [],
    city: admin.firestore.FieldValue.delete(),
    interestedInGenders: [],
    minAgePreference: 18,
    maxAgePreference: 99,
    height: admin.firestore.FieldValue.delete(),
    occupation: admin.firestore.FieldValue.delete(),
    company: admin.firestore.FieldValue.delete(),
    education: admin.firestore.FieldValue.delete(),
    religion: admin.firestore.FieldValue.delete(),
    languages: [],
    relationshipGoal: admin.firestore.FieldValue.delete(),
    drinking: admin.firestore.FieldValue.delete(),
    smoking: admin.firestore.FieldValue.delete(),
    workout: admin.firestore.FieldValue.delete(),
    diet: admin.firestore.FieldValue.delete(),
    children: admin.firestore.FieldValue.delete(),
    activityPreferences: {
      running: {
        paceMinSecsPerKm: 300,
        paceMaxSecsPerKm: 420,
        preferredDistances: [],
        runningReasons: [],
        preferredRunTimes: [],
        version: 1,
      },
    },
    paceMinSecsPerKm: admin.firestore.FieldValue.delete(),
    paceMaxSecsPerKm: admin.firestore.FieldValue.delete(),
    preferredDistances: admin.firestore.FieldValue.delete(),
    runningReasons: admin.firestore.FieldValue.delete(),
    preferredRunTimes: admin.firestore.FieldValue.delete(),
    runPreferencesVersion: admin.firestore.FieldValue.delete(),
    prefsShowInCrossPaths: admin.firestore.FieldValue.delete(),
    prefsCrossPathsInvitations: admin.firestore.FieldValue.delete(),
    fcmToken: admin.firestore.FieldValue.delete(),
  }, {merge: true});

  await writer.commit();

  // Mark the already-present deletion guard complete only after cleanup.
  await deletedUserRef.set({
    uid,
    status: "completed",
    updatedAt: now,
    completedAt: now,
    retainedFor: ["safety", "payments", "fraud"],
  }, {merge: true});
  await deleteAuthUserIfPresent(deps.auth(), uid);

  return {deleted: true};
}

/** Removes personal Host projections and preserves shared business records. */
async function removeOrganizerHostIdentity(
  db: FirebaseFirestore.Firestore,
  uid: string
) {
  const organizers = db.collection("organizers");
  const groups = await Promise.all([
    organizers.where("hostUserIds", "array-contains", uid).get(),
    organizers.where("ownerUserId", "==", uid).get(),
    organizers.where("hostUserId", "==", uid).get(),
  ]);
  const refs = new Map(groups.flatMap((group) =>
    group.docs.map((doc) => [doc.id, doc.ref] as const)));
  for (const ref of refs.values()) {
    // Re-read within the transaction so a teammate's concurrent edit survives.
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      const data = snap.data()!;
      const patch: FirebaseFirestore.UpdateData<
        FirebaseFirestore.DocumentData
      > = {
        hostUserIds: (data.hostUserIds ?? []).filter(
          (id: string) => id !== uid),
        hostProfiles: (data.hostProfiles ?? []).filter(
          (profile: {uid: string}) => profile.uid !== uid),
      };
      if (data.ownerUserId === uid) patch.ownerUserId = null;
      if (data.hostUserId === uid) {
        patch.hostUserId = null;
        patch.hostName = null;
        patch.hostAvatarUrl = null;
      }
      tx.update(ref, patch);
    });
  }
}

/**
 * Deletes the Auth user, treating an already-removed user as success so the
 * deletion flow is safe to retry.
 * @param {admin.auth.Auth} auth Firebase Auth instance.
 * @param {string} uid User id to remove.
 * @return {Promise<void>}
 */
async function deleteAuthUserIfPresent(
  auth: admin.auth.Auth,
  uid: string
): Promise<void> {
  try {
    await auth.deleteUser(uid);
  } catch (error) {
    if ((error as {code?: string}).code === "auth/user-not-found") {
      return;
    }
    throw error;
  }
}

/**
 * Queues all relationship documents that can still expose a deleted account.
 * The operation is query-driven so new edge collections can be added without
 * scanning canonical parent documents.
 */
async function queueRelationshipCleanup(params: {
  db: FirebaseFirestore.Firestore;
  uid: string;
  now: FirebaseFirestore.FieldValue;
  writer: BatchQueue;
}) {
  const {db, uid, now, writer} = params;
  // Release pair holds while their persisted UID identity proof is current.
  await queueCrossPathsPairHoldCleanup(db, uid, writer);
  // The migration fence, participation and linked attendee identity update
  // share one transaction, including attendee-only imported seats.
  await deleteAccountEventParticipations({db, uid, now,
    nowMillis: Date.now()});
  // Paid memberships stop billing before their records are erased below.
  await endAccountHostMemberships(uid).catch(() => undefined);
  await Promise.all([
    queueOrganizerMembershipCleanup(db, uid, now, writer),
    queueOrganizerAudienceIdentityCleanup(db, uid, now, writer),
    queueCrossPathsConsentCleanup(db, uid, writer),
    queueCrossPathsSuggestionExposureCleanup(db, uid, writer),
    queueCrossPathsInvitationCleanup(db, uid, writer),
    queueSavedEventCleanup(db, uid, writer),
    queueSwipeCleanup(db, uid, writer),
    queueMatchCleanup(db, uid, now, writer),
    queueReviewCleanup(db, uid, now, writer),
    queuePaymentCleanup(db, uid, now, writer),
    queueNotificationCleanup(db, uid, writer),
    queueEventBroadcastCleanup(db, uid, writer),
    queueOrganizerCommunicationPreferenceCleanup(db, uid, writer),
    queueHostAnalyticsSnapshotCleanup(db, uid, writer),
    queueParticipantPrivateStateCleanup(db, uid, writer),
    queueBlockCleanup(db, uid, writer),
    queueReportCleanup(db, uid, now, writer),
  ]);
}

/** Removes Catch identity linkage from retained organizer CRM projections. */
async function queueOrganizerAudienceIdentityCleanup(
  db: FirebaseFirestore.Firestore,
  uid: string,
  now: FirebaseFirestore.FieldValue,
  writer: BatchQueue
) {
  const contacts = await db.collection("organizerContacts")
    .where("linkedUid", "==", uid)
    .get();
  for (const contact of contacts.docs) {
    writer.update(contact.ref, {
      linkedUid: null,
      identityState: "unlinked",
      identityConfidence: "proposed",
      whatsappStatus: "unknown",
      smsStatus: "unknown",
      updatedAt: now,
    });
    const [edges, evidence] = await Promise.all([
      db.collection("organizerContactEventEdges")
        .where("contactId", "==", contact.id).get(),
      db.collection("organizerContactIdentityLinks")
        .where("contactId", "==", contact.id).get(),
    ]);
    edges.forEach((edge) => {
      if (edge.data().linkedUid === uid) {
        writer.update(edge.ref, {linkedUid: null, updatedAt: now});
      }
    });
    evidence.forEach((item) => {
      const link = item.data() as OrganizerContactIdentityLinkDocument;
      if (link.kind !== "uid") return;
      writer.delete(item.ref);
      writer.delete(db.collection("organizerContactIdentityClaims")
        .doc(`ocic_${link.identityHash.slice(0, 48)}`));
    });
  }
}

/** Deletes permission evidence and redacts retained contact provenance. */
async function queueOrganizerCommunicationPreferenceCleanup(
  db: FirebaseFirestore.Firestore,
  uid: string,
  writer: BatchQueue
) {
  const [preferences, receipts, origins, catchReceipts] = await Promise.all([
    db.collection("organizerCommunicationPreferences")
      .where("uid", "==", uid).get(),
    db.collection("organizerCommunicationPermissionReceipts")
      .where("uid", "==", uid).get(),
    db.collection("organizerContactOrigins")
      .where("actorUid", "==", uid).get(),
    db.collection("catchCommunicationPermissionReceipts")
      .where("uid", "==", uid).get(),
  ]);
  preferences.forEach((doc) => writer.delete(doc.ref));
  receipts.forEach((doc) => writer.delete(doc.ref));
  catchReceipts.forEach((doc) => writer.delete(doc.ref));
  writer.delete(db.collection("catchCommunicationPreferences").doc(uid));
  origins.forEach((doc) => writer.update(doc.ref, {actorUid: null}));
}

/** Releases and deletes pair reservations that expose the deleted account. */
async function queueCrossPathsPairHoldCleanup(
  db: FirebaseFirestore.Firestore,
  uid: string,
  writer: BatchQueue
) {
  const holds = await db.collection("crossPathsPairHolds")
    .where("participantIds", "array-contains", uid)
    .get();
  for (const doc of holds.docs) {
    await releaseCrossPathsPairHold({
      db,
      holdId: doc.id,
      reason: "safety_state_changed",
    });
    writer.delete(doc.ref);
  }
}

/** Deletes short-lived host analytics responses owned by the account. */
async function queueHostAnalyticsSnapshotCleanup(
  db: FirebaseFirestore.Firestore,
  uid: string,
  writer: BatchQueue
) {
  const snapshots = await db.collection("hostAnalyticsSnapshots")
    .where("uid", "==", uid)
    .get();
  snapshots.forEach((doc) => writer.delete(doc.ref));
}

/** Deletes private form and room decisions without touching organizer CRM. */
async function queueParticipantPrivateStateCleanup(
  db: FirebaseFirestore.Firestore,
  uid: string,
  writer: BatchQueue
) {
  for (const collection of ["participantFormProfileProposals",
    "participantOrganizerCards", "participantProfileClaimReceipts",
    "eventChatMemberships", "eventChatAccessReceipts",
    "eventChatReactions", "eventChatPresence", "eventChatProfileShares",
    "eventAssignmentFeatureConsents", "organizerCommunityMemberships",
    "organizerCommunityMembershipDecisions",
    "eventApprovalNotificationPreferences",
    "eventApprovalNotificationReceipts", "hostMemberships",
    "hostMembershipCheckouts", "hostMembershipBenefitUses"]) {
    const records = await db.collection(collection)
      .where("uid", "==", uid).get();
    records.forEach((doc) => writer.delete(doc.ref));
  }
  const messages = await db.collection("eventChatMessages")
    .where("uid", "==", uid).get();
  messages.forEach((doc) => writer.update(doc.ref, {
    uid: null, text: null, replyToMessageId: null, status: "removed",
    removedAt: admin.firestore.FieldValue.serverTimestamp(),
    reactionCounts: {like: 0, love: 0, laugh: 0, wow: 0, sad: 0, thanks: 0},
  }));
}

/**
 * Marks the user's organizer follow edges inactive and updates aggregates.
 */
async function queueOrganizerMembershipCleanup(
  db: FirebaseFirestore.Firestore,
  uid: string,
  now: FirebaseFirestore.FieldValue,
  writer: BatchQueue
) {
  const follows = await db.collection("organizerFollows")
    .where("uid", "==", uid).get();
  follows.forEach((doc) => {
    const follow = doc.data() as OrganizerFollowDocument;
    writer.set(doc.ref, {
      status: "inactive",
      unfollowedAt: now,
      pushNotificationsEnabled: false,
    }, {merge: true});
    if (follow.status === "active") {
      writer.update(db.collection("organizers").doc(follow.organizerId), {
        followerCount: admin.firestore.FieldValue.increment(-1),
      });
    }
  });
}

/** Deletes private Cross Paths consent edges owned by the account. */
async function queueCrossPathsConsentCleanup(
  db: FirebaseFirestore.Firestore,
  uid: string,
  writer: BatchQueue
) {
  const consents = await db
    .collection("eventCrossPathsConsents")
    .where("uid", "==", uid)
    .get();
  consents.forEach((doc) => writer.delete(doc.ref));
}

/** Deletes server-only suggestion receipts involving the account. */
async function queueCrossPathsSuggestionExposureCleanup(
  db: FirebaseFirestore.Firestore,
  uid: string,
  writer: BatchQueue
) {
  const [viewed, shown] = await Promise.all([
    db.collection("crossPathsSuggestionExposures")
      .where("viewerUid", "==", uid).get(),
    db.collection("crossPathsSuggestionExposures")
      .where("candidateUid", "==", uid).get(),
  ]);
  const seen = new Set<string>();
  [...viewed.docs, ...shown.docs].forEach((doc) => {
    if (seen.has(doc.ref.path)) return;
    seen.add(doc.ref.path);
    writer.delete(doc.ref);
  });
}

/** Deletes private Cross Paths invitations involving the account. */
async function queueCrossPathsInvitationCleanup(
  db: FirebaseFirestore.Firestore,
  uid: string,
  writer: BatchQueue
) {
  const invitations = await db.collection("crossPathsInvitations")
    .where("participantIds", "array-contains", uid)
    .get();
  invitations.forEach((doc) => writer.delete(doc.ref));
}

/**
 * Deletes direct saved-event edges for the account.
 */
async function queueSavedEventCleanup(
  db: FirebaseFirestore.Firestore,
  uid: string,
  writer: BatchQueue
) {
  const savedEvents = await db
    .collection("savedEvents")
    .where("uid", "==", uid)
    .get();
  savedEvents.forEach((doc) => writer.delete(doc.ref));
}

/**
 * Deletes swipe edges where the account is either actor or target.
 */
async function queueSwipeCleanup(
  db: FirebaseFirestore.Firestore,
  uid: string,
  writer: BatchQueue
) {
  const [outgoing, incoming] = await Promise.all([
    db.collectionGroup("outgoing").where("swiperId", "==", uid).get(),
    db.collectionGroup("outgoing").where("targetId", "==", uid).get(),
  ]);
  const seen = new Set<string>();
  [...outgoing.docs, ...incoming.docs].forEach((doc) => {
    if (seen.has(doc.ref.path)) return;
    seen.add(doc.ref.path);
    writer.delete(doc.ref);
  });
}

/**
 * Closes active matches involving the account and suppresses unread badges.
 */
async function queueMatchCleanup(
  db: FirebaseFirestore.Firestore,
  uid: string,
  now: FirebaseFirestore.FieldValue,
  writer: BatchQueue
) {
  const [participantMatches, user1Matches, user2Matches] = await Promise.all([
    db.collection("matches").where("participantIds", "array-contains", uid)
      .get(),
    db.collection("matches").where("user1Id", "==", uid).get(),
    db.collection("matches").where("user2Id", "==", uid).get(),
  ]);
  const seen = new Set<string>();
  [...participantMatches.docs, ...user1Matches.docs, ...user2Matches.docs]
    .forEach((doc) => {
      if (seen.has(doc.ref.path)) return;
      seen.add(doc.ref.path);
      writer.set(doc.ref, {
        status: "blocked",
        blockedBy: uid,
        blockedAt: now,
        unreadCounts: {},
      }, {merge: true});
    });
}

/**
 * Anonymizes retained reviews so rating history remains intact.
 */
async function queueReviewCleanup(
  db: FirebaseFirestore.Firestore,
  uid: string,
  now: FirebaseFirestore.FieldValue,
  writer: BatchQueue
) {
  const reviews = await db
    .collection("reviews")
    .where("reviewerUserId", "==", uid)
    .get();
  reviews.forEach((doc) => writer.set(doc.ref, {
    reviewerName: "Deleted user",
    reviewerDeleted: true,
    reviewerDeletedAt: now,
    updatedAt: now,
  }, {merge: true}));
}

/**
 * Keeps payment records but removes them from active user-facing ownership.
 */
async function queuePaymentCleanup(
  db: FirebaseFirestore.Firestore,
  uid: string,
  now: FirebaseFirestore.FieldValue,
  writer: BatchQueue
) {
  const payments = await db
    .collection("payments")
    .where("userId", "==", uid)
    .get();
  payments.forEach((doc) => writer.set(doc.ref, {
    userDeleted: true,
    userDeletedAt: now,
  }, {merge: true}));
}

/**
 * Deletes the user's notification timeline items.
 */
async function queueNotificationCleanup(
  db: FirebaseFirestore.Firestore,
  uid: string,
  writer: BatchQueue
) {
  const notifications = await db
    .collection("notifications")
    .doc(uid)
    .collection("items")
    .get();
  notifications.forEach((doc) => writer.delete(doc.ref));
}

/** Deletes authored broadcasts and removes recipient evidence for this user. */
async function queueEventBroadcastCleanup(
  db: FirebaseFirestore.Firestore,
  uid: string,
  writer: BatchQueue
) {
  const [authored, targeted] = await Promise.all([
    db.collection("eventBroadcasts").where("actorUid", "==", uid).get(),
    db.collection("eventBroadcasts")
      .where("targetUids", "array-contains", uid).get(),
  ]);
  const authoredPaths = new Set(authored.docs.map((doc) => doc.ref.path));
  authored.forEach((doc) => writer.delete(doc.ref));
  const deliveryKey = eventBroadcastDeliveryKey(uid);
  targeted.forEach((doc) => {
    if (authoredPaths.has(doc.ref.path)) return;
    writer.update(
      doc.ref,
      eventBroadcastRecipientDeletionPatch(doc.data(), uid, deliveryKey)
    );
  });
}

function eventBroadcastRecipientDeletionPatch(
  receipt: FirebaseFirestore.DocumentData,
  uid: string,
  deliveryKey: string
): Record<string, unknown> {
  const targetUids = Array.isArray(receipt.targetUids) ?
    [...new Set(receipt.targetUids.filter((value: unknown) =>
      typeof value === "string" && value.length > 0 && value !== uid
    ))] :
    [];
  const sourceDeliveries =
    typeof receipt.deliveries === "object" && receipt.deliveries !== null ?
      receipt.deliveries as Record<string, Record<string, unknown>> :
      {};
  const deliveries: Record<string, Record<string, unknown>> = {};
  for (const targetUid of targetUids) {
    const key = eventBroadcastDeliveryKey(targetUid);
    if (key === deliveryKey) continue;
    const delivery = sourceDeliveries[key];
    if (delivery) deliveries[key] = delivery;
  }
  const evidence = Object.values(deliveries)
    .filter((delivery) => delivery.excluded !== true);
  const activityAvailableCount = evidence.filter((delivery) =>
    delivery.activityStatus === "created" ||
    delivery.activityStatus === "existing"
  ).length;
  const pushAcceptedCount = evidence.filter((delivery) =>
    delivery.pushStatus === "accepted"
  ).length;
  const pushFailedCount = evidence.filter((delivery) =>
    delivery.pushStatus === "failed"
  ).length;
  const pushUnknownCount = evidence.filter((delivery) =>
    delivery.pushStatus === "unknown"
  ).length;
  return {
    targetUids,
    deliveries,
    recipientCount: evidence.length,
    excludedCount: targetUids.length - evidence.length,
    activityAvailableCount,
    pushAttemptedCount:
      pushAcceptedCount + pushFailedCount + pushUnknownCount,
    pushAcceptedCount,
    pushFailedCount,
    pushUnknownCount,
  };
}

/**
 * Deletes directed block edges involving the account.
 */
async function queueBlockCleanup(
  db: FirebaseFirestore.Firestore,
  uid: string,
  writer: BatchQueue
) {
  const [blockedByUser, blockingUser] = await Promise.all([
    db.collection("blocks").where("blockerUserId", "==", uid).get(),
    db.collection("blocks").where("blockedUserId", "==", uid).get(),
  ]);
  const seen = new Set<string>();
  [...blockedByUser.docs, ...blockingUser.docs].forEach((doc) => {
    if (seen.has(doc.ref.path)) return;
    seen.add(doc.ref.path);
    writer.delete(doc.ref);
  });
}

/**
 * Marks safety reports involving the deleted account for reviewer context.
 */
async function queueReportCleanup(
  db: FirebaseFirestore.Firestore,
  uid: string,
  now: FirebaseFirestore.FieldValue,
  writer: BatchQueue
) {
  const [reportsByUser, reportsAgainstUser] = await Promise.all([
    db.collection("reports").where("reporterUserId", "==", uid).get(),
    db.collection("reports").where("reportedUserId", "==", uid).get(),
  ]);
  const seen = new Set<string>();
  [...reportsByUser.docs, ...reportsAgainstUser.docs].forEach((doc) => {
    if (seen.has(doc.ref.path)) return;
    seen.add(doc.ref.path);
    writer.set(doc.ref, {
      hasDeletedUser: true,
      deletedUserId: uid,
      deletedUserMarkedAt: now,
    }, {merge: true});
  });
}

/**
 * Small write-batch queue that chunks account deletion work under Firestore's
 * 500-write batch limit.
 */
class BatchQueue {
  private batches: FirebaseFirestore.WriteBatch[] = [];
  private current: FirebaseFirestore.WriteBatch;
  private operationCount = 0;
  private currentOperationCount = 0;

  constructor(private readonly db: FirebaseFirestore.Firestore) {
    this.current = db.batch();
    this.batches.push(this.current);
  }

  set(
    ref: FirebaseFirestore.DocumentReference,
    data: FirebaseFirestore.DocumentData,
    options?: FirebaseFirestore.SetOptions
  ) {
    this.ensureCapacity();
    if (options) {
      this.current.set(ref, data, options);
    } else {
      this.current.set(ref, data);
    }
    this.trackWrite();
  }

  update(
    ref: FirebaseFirestore.DocumentReference,
    data: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>
  ) {
    this.ensureCapacity();
    this.current.update(ref, data);
    this.trackWrite();
  }

  delete(ref: FirebaseFirestore.DocumentReference) {
    this.ensureCapacity();
    this.current.delete(ref);
    this.trackWrite();
  }

  async commit() {
    if (this.operationCount === 0) return;
    await Promise.all(this.batches.map((batch) => batch.commit()));
  }

  private trackWrite() {
    this.operationCount += 1;
    this.currentOperationCount += 1;
  }

  private ensureCapacity() {
    if (this.currentOperationCount >= 450) {
      this.current = this.db.batch();
      this.batches.push(this.current);
      this.currentOperationCount = 0;
    }
  }
}

/**
 * Extracts grouped and legacy profile photo object paths.
 * @param {FirebaseFirestore.DocumentData} user User profile data.
 * @return {string[]} Storage object paths to delete.
 */
function profilePhotoDeletionStoragePaths(
  uid: string,
  user: FirebaseFirestore.DocumentData
): string[] {
  const paths = new Set<string>();
  // storagePath/url are client-supplied (via updateUserProfile), so only delete
  // objects the account actually owns — never a path targeting another user.
  const ownsPath = (value: string): boolean =>
    value.startsWith(`users/${uid}/`);
  const addPath = (value: unknown) => {
    if (typeof value !== "string") return;
    const trimmed = value.trim();
    if (trimmed.length > 0 && ownsPath(trimmed)) paths.add(trimmed);
  };
  const addUrl = (value: unknown) => {
    if (typeof value !== "string") return;
    addPath(storagePathFromDownloadUrl(value));
  };

  const profilePhotos = Array.isArray(user.profilePhotos) ?
    user.profilePhotos as Partial<ProfilePhoto>[] :
    [];
  for (const photo of profilePhotos) {
    if (photo === null || typeof photo !== "object") continue;
    addPath(photo.storagePath);
    addPath(photo.thumbnailStoragePath);
    addUrl(photo.url);
    addUrl(photo.thumbnailUrl);
  }

  return [...paths];
}


/**
 * Deletes Firebase Storage objects represented by object paths.
 * @param {string[]} paths Firebase Storage object paths.
 * @param {StorageBucket} bucket Default Firebase Storage bucket.
 */
async function deleteStoragePaths(
  paths: string[],
  bucket: StorageBucket
): Promise<void> {
  await Promise.all(
    paths.map((path) => bucket.file(path).delete({ignoreNotFound: true}))
  );
}

/**
 * Extracts the object path from Firebase Storage download URLs.
 * @param {string} url Download URL.
 * @return {string | null} Decoded Storage object path.
 */
export function storagePathFromDownloadUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const marker = "/o/";
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex === -1) return null;

    const encodedPath = parsed.pathname.substring(markerIndex + marker.length);
    return decodeURIComponent(encodedPath);
  } catch {
    return null;
  }
}

export const requestAccountDeletion = onCall(appCheckCallableOptions, (
  request
) =>
  requestAccountDeletionHandler(request as CallableRequest<null>)
);
