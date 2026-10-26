import crypto from "node:crypto";
import {HttpsError} from "firebase-functions/v2/https";
import type {
  OrganizerClaimRequestDocument,
  OrganizerDocument,
  UserProfileDocument,
} from "../shared/generated/firestoreAdminTypes";
import {requireDoc} from "../shared/validation";
import {
  activeOrganizerTeamMembershipPatch,
  organizerRelationshipId,
} from "../shared/relationshipDocuments";
import {publicAvatarUrl, publicDisplayName} from
  "../shared/profileProjection";
import {isAccountReadyUserProfile} from "../shared/profileReadiness";
import {
  activityNotificationId,
  setActivityNotificationInTransaction,
} from "../shared/notifications";
import {organizerSupplyCapabilitiesFor} from
  "../shared/organizerSupplyCapabilities";
import {prepareClaimSalesTransition} from "./claimSalesActivity";

/**
 * Everything that turns a claim request into ownership. Staff approval and
 * verified proof (an Instagram message or a Luma code) both go through
 * prepareOrganizerClaimApproval, so ownership has one writer.
 */
export interface OrganizerClaimApproval {
  requestId: string;
  organizerId: string;
  requesterUid: string;
  organizer: OrganizerDocument;
  /** The staff reviewer, or null when verified proof approved the claim. */
  decidedByUid: string | null;
  decisionReason: string | null;
  /** The uid the requester's notification names as its actor. */
  notificationActorUid: string;
  /**
   * Verified claims skip the staff form, so they create their request with
   * the approval. Staff approval decides an existing pending request.
   */
  newRequest: Pick<OrganizerClaimRequestDocument,
    "requesterRole" | "proofUrls"> | null;
  /**
   * Verified proof outranks another account's claim that is waiting for
   * staff review; that request becomes superseded.
   */
  supersedeOtherPendingClaim: boolean;
  transitionId: string;
  recordedAt: string;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
}

/**
 * Reads and checks everything the approval needs, then returns the step that
 * stages its writes. Call it before any other write in the transaction.
 * @return {Promise<Function>} Stages the approval writes.
 */
export async function prepareOrganizerClaimApproval(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  approval: OrganizerClaimApproval
): Promise<() => void> {
  const {organizer, organizerId, requesterUid, requestId} = approval;
  const requesterRef = db.collection("users").doc(requesterUid);
  const deletedUserRef = db.collection("deletedUsers").doc(requesterUid);
  const [requesterSnap, deletedUserSnap] = await Promise.all([
    tx.get(requesterRef),
    tx.get(deletedUserRef),
  ]);
  if (!requesterSnap.exists) {
    throw new HttpsError("not-found", "Requesting user profile not found.");
  }
  if (deletedUserSnap.exists) {
    throw new HttpsError(
      "failed-precondition",
      "This account cannot claim organizer listings."
    );
  }
  assertCanBeClaimed(organizer);
  const otherPendingRequestId = organizer.claim?.state === "claimPending" &&
    organizer.claim.lastClaimRequestId !== requestId ?
    organizer.claim.lastClaimRequestId ?? null : null;
  if (organizer.claim?.state === "claimPending" &&
      !claimRequestOwnsPendingState(organizer, requestId) &&
      !approval.supersedeOtherPendingClaim) {
    throw new HttpsError(
      "failed-precondition",
      "This claim request is no longer the active organizer claim."
    );
  }
  const user = requireDoc<UserProfileDocument>(
    requesterSnap,
    "UserProfileDocument"
  );
  // Running an organiser page needs an account (name and verified phone),
  // not the social profile that matching needs.
  if (!isAccountReadyUserProfile(user)) {
    throw new HttpsError(
      "failed-precondition",
      "The requester must finish their Catch account before claiming."
    );
  }
  const stageSalesTransition = await prepareClaimSalesTransition(tx, db, {
    organizerId, claimRequestId: requestId,
    transitionId: approval.transitionId, status: "approved",
    actorUid: approval.notificationActorUid, recordedAt: approval.recordedAt,
  });

  return () => {
    const timestamp = approval.serverTimestamp();
    const displayName = publicDisplayName(user);
    const avatarUrl = publicAvatarUrl(user);
    const organizerRef = db.collection("organizers").doc(organizerId);
    const requestRef = db.collection("organizerClaimRequests").doc(requestId);
    tx.update(organizerRef, {
      ownerUserId: requesterUid,
      hostUserId: requesterUid,
      hostName: displayName,
      hostAvatarUrl: avatarUrl,
      hostUserIds: [requesterUid],
      hostProfiles: [{uid: requesterUid, displayName, avatarUrl,
        role: "owner"}],
      // Ownership approval does not publish the organizer. The publication
      // action owns appVisibility and publicPage, including route reservation.
      supplyCapabilities: organizerSupplyCapabilitiesFor({
        ownershipState: "claimed",
        claimState: "claimed",
      }),
      ownership: {
        state: "claimed",
        ownerUserId: requesterUid,
        primaryHostUserId: requesterUid,
        hostUserIds: [requesterUid],
        claimedAt: timestamp,
        claimedByUid: requesterUid,
      },
      claim: {
        state: "claimed",
        claimHref: null,
        lastClaimRequestId: requestId,
      },
      provenance: {
        origin: organizer.provenance?.origin ?? "adminSeed",
        sourceConfidence: "ownerVerified",
        verificationStatus: "ownerVerified",
        lastVerifiedAt: timestamp,
      },
    });
    const decision = {
      status: "approved",
      updatedAt: timestamp,
      decidedAt: timestamp,
      decidedByUid: approval.decidedByUid,
      decisionReason: approval.decisionReason,
    };
    if (approval.newRequest) {
      tx.set(requestRef, {
        requestId,
        organizerId,
        requesterUid,
        requesterName: displayName.slice(0, 120),
        ...approval.newRequest,
        businessEmail: null,
        businessPhone: null,
        message: null,
        createdAt: timestamp,
        previousRequestId: null,
        ...decision,
      }, {merge: true});
    } else {
      tx.set(requestRef, decision, {merge: true});
    }
    if (otherPendingRequestId) {
      tx.set(db.collection("organizerClaimRequests").doc(otherPendingRequestId),
        {status: "superseded", updatedAt: timestamp}, {merge: true});
    }
    tx.set(
      db.collection("organizerTeamMemberships")
        .doc(organizerRelationshipId(organizerId, requesterUid)),
      activeOrganizerTeamMembershipPatch({
        organizerId,
        uid: requesterUid,
        role: "owner",
      }),
      {merge: true}
    );
    setActivityNotificationInTransaction(tx, db, {
      id: activityNotificationId("organizerUpdate", requestId),
      uid: requesterUid,
      type: "organizerUpdate",
      title: "Your organizer profile is ready",
      body: `Open Catch to finish setup for ${organizer.name}.`,
      createdAt: timestamp,
      organizerId,
      actorUid: approval.notificationActorUid,
    });
    stageSalesTransition();
  };
}

export function assertCanBeClaimed(organizer: OrganizerDocument) {
  if (organizer.archived || organizer.status === "archived") {
    throw new HttpsError(
      "failed-precondition",
      "Archived organizer listings cannot be claimed."
    );
  }
  if (organizer.ownerUserId || organizer.hostUserId ||
      organizer.ownership?.state === "claimed" ||
      organizer.claim?.state === "claimed" ||
      organizer.claim?.state === "verified") {
    throw new HttpsError(
      "failed-precondition",
      "This organizer listing has already been claimed."
    );
  }
  if (organizer.claim?.state === "suppressed") {
    throw new HttpsError(
      "failed-precondition",
      "This organizer listing is not available for claims."
    );
  }
}

export function claimRequestOwnsPendingState(
  organizer: OrganizerDocument,
  requestId: string
): boolean {
  return organizer.claim?.state === "claimPending" &&
    organizer.claim.lastClaimRequestId === requestId;
}

/** One claim request per organizer and account, whichever route it took. */
export function organizerClaimRequestId(
  organizerId: string,
  uid: string
): string {
  const hash = crypto.createHash("sha256")
    .update(`${organizerId}:${uid}`).digest("hex").slice(0, 24);
  return `organizer_claim_${hash}`;
}
