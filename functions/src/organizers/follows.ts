import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {isAccountReadyUserProfile} from "../shared/profileReadiness";
import {requireAuth} from "../shared/auth";
import type {
  OrganizerDocument,
  UserProfileDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {OrganizerFollowCallablePayload} from
  "../shared/generated/organizerFollowCallablePayload";
import type {SetOrganizerNotificationPreferenceCallablePayload} from
  "../shared/generated/setOrganizerNotificationPreferenceCallablePayload";
import {
  validateOrganizerFollowCallablePayload,
} from "../shared/generated/validators/organizerFollowInput";
import {
  validateSetOrganizerNotificationPreferenceCallablePayload,
} from
  "../shared/generated/validators/setOrganizerNotificationPreferenceInput";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {
  activeOrganizerFollowPatch,
  organizerRelationshipId,
} from "../shared/relationshipDocuments";
import {normalizeOrganizerIdPayload} from
  "./organizerPayloadNormalization";

interface OrganizerFollowDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: OrganizerFollowDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit: defaultCheckRateLimit,
};

export async function followOrganizerHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerFollowDeps = defaultDeps
): Promise<{following: boolean}> {
  const uid = requireAuth(request);
  const {organizerId, expectedUid} =
    validateCallableWithAjv<OrganizerFollowCallablePayload>(
      request,
      validateOrganizerFollowCallablePayload,
      normalizeOrganizerIdPayload
    );
  if (expectedUid !== undefined && expectedUid !== uid) {
    throw new HttpsError("aborted", "Your signed-in account changed.");
  }
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, uid, "followOrganizer", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  await db.runTransaction(async (tx) => {
    const organizerRef = db.collection("organizers").doc(organizerId);
    const userRef = db.collection("users").doc(uid);
    const deletedUserRef = db.collection("deletedUsers").doc(uid);
    const followRef = db.collection("organizerFollows")
      .doc(organizerRelationshipId(organizerId, uid));
    const [
      organizerSnap,
      userSnap,
      deletedUserSnap,
      followSnap,
    ] = await Promise.all([
      tx.get(organizerRef),
      tx.get(userRef),
      tx.get(deletedUserRef),
      tx.get(followRef),
    ]);
    assertCanFollow(organizerSnap, userSnap, deletedUserSnap);
    const organizer = requireDoc<OrganizerDocument>(
      organizerSnap,
      "OrganizerDocument"
    );
    const previous = followSnap.data() as {
      status?: string;
      pushNotificationsEnabled?: boolean;
    } | undefined;
    if (previous?.status !== "active") {
      tx.update(organizerRef, {
        followerCount: (organizer.followerCount ?? 0) + 1,
      });
    }
    tx.set(followRef, activeOrganizerFollowPatch({
      organizerId,
      uid,
      pushNotificationsEnabled: previous?.pushNotificationsEnabled,
    }), {merge: true});
  });
  return {following: true};
}

export async function unfollowOrganizerHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerFollowDeps = defaultDeps
): Promise<{following: boolean}> {
  const uid = requireAuth(request);
  const {organizerId, expectedUid} =
    validateCallableWithAjv<OrganizerFollowCallablePayload>(
      request,
      validateOrganizerFollowCallablePayload,
      normalizeOrganizerIdPayload
    );
  if (expectedUid !== undefined && expectedUid !== uid) {
    throw new HttpsError("aborted", "Your signed-in account changed.");
  }
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, uid, "unfollowOrganizer", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  await db.runTransaction(async (tx) => {
    const organizerRef = db.collection("organizers").doc(organizerId);
    const followRef = db.collection("organizerFollows")
      .doc(organizerRelationshipId(organizerId, uid));
    const [organizerSnap, followSnap] = await Promise.all([
      tx.get(organizerRef),
      tx.get(followRef),
    ]);
    if (!organizerSnap.exists) {
      throw new HttpsError("not-found", "Organizer not found.");
    }
    const organizer = requireDoc<OrganizerDocument>(
      organizerSnap,
      "OrganizerDocument"
    );
    const follow = followSnap.data() as {status?: string} | undefined;
    if (follow?.status === "active") {
      tx.update(organizerRef, {
        followerCount: Math.max(0, (organizer.followerCount ?? 0) - 1),
      });
    }
    tx.set(followRef, {
      organizerId,
      uid,
      status: "inactive",
      pushNotificationsEnabled: false,
      unfollowedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});
  });
  return {following: false};
}

export async function setOrganizerNotificationPreferenceHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerFollowDeps = defaultDeps
): Promise<{enabled: boolean}> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<
    SetOrganizerNotificationPreferenceCallablePayload
  >(
    request,
    validateSetOrganizerNotificationPreferenceCallablePayload,
    normalizeOrganizerIdPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    uid,
    "setOrganizerNotificationPreference",
    {maxRequests: 30, windowMs: 60 * 1000}
  );
  await db.runTransaction(async (tx) => {
    const followRef = db.collection("organizerFollows")
      .doc(organizerRelationshipId(data.organizerId, uid));
    const followSnap = await tx.get(followRef);
    if (!followSnap.exists || followSnap.data()?.status !== "active") {
      throw new HttpsError(
        "failed-precondition",
        "Follow this organizer before enabling notifications."
      );
    }
    tx.update(followRef, {pushNotificationsEnabled: data.enabled});
  });
  return {enabled: data.enabled};
}

function assertCanFollow(
  organizerSnap: FirebaseFirestore.DocumentSnapshot,
  userSnap: FirebaseFirestore.DocumentSnapshot,
  deletedUserSnap: FirebaseFirestore.DocumentSnapshot
) {
  if (!organizerSnap.exists) {
    throw new HttpsError("not-found", "Organizer not found.");
  }
  if (!userSnap.exists) {
    throw new HttpsError("not-found", "User profile not found.");
  }
  if (deletedUserSnap.exists) {
    throw new HttpsError(
      "failed-precondition",
      "This account cannot follow organizers."
    );
  }
  const user = requireDoc<UserProfileDocument>(userSnap, "UserProfileDocument");
  if (!isAccountReadyUserProfile(user, "organizerFollow")) {
    throw new HttpsError(
      "failed-precondition",
      "Add your name and verified phone before following organizers."
    );
  }
}

export const followOrganizer = onCall(
  appCheckCallableOptions,
  (request) => followOrganizerHandler(request)
);
export const unfollowOrganizer = onCall(
  appCheckCallableOptions,
  (request) => unfollowOrganizerHandler(request)
);
export const setOrganizerNotificationPreference = onCall(
  appCheckCallableOptions,
  (request) => setOrganizerNotificationPreferenceHandler(request)
);
