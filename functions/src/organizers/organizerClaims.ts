import crypto from "node:crypto";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {requireAuth} from "../shared/auth";
import {requireAdminRole} from "../admin/adminAuth";
import {setAdminAuditLogInTransaction} from "../admin/adminAudit";
import type {
  OrganizerClaimRequestDocument,
  OrganizerDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {RequestOrganizerClaimCallablePayload} from
  "../shared/generated/requestOrganizerClaimCallablePayload";
import type {RequestOrganizerClaimCallableResponse} from
  "../shared/generated/requestOrganizerClaimCallableResponse";
import type {AdminDecideOrganizerClaimCallablePayload} from
  "../shared/generated/adminDecideOrganizerClaimCallablePayload";
import {
  validateAdminDecideOrganizerClaimCallablePayload,
} from
  "../shared/generated/validators/adminDecideOrganizerClaimInput";
import {
  validateRequestOrganizerClaimCallablePayload,
} from "../shared/generated/validators/requestOrganizerClaimInput";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {
  activityNotificationId,
  setActivityNotificationInTransaction,
} from "../shared/notifications";
import {organizerSupplyCapabilitiesFor} from
  "../shared/organizerSupplyCapabilities";
import {prepareClaimSalesTransition} from "./claimSalesActivity";
import {
  assertCanBeClaimed,
  claimRequestOwnsPendingState,
  organizerClaimRequestId,
  prepareOrganizerClaimApproval,
} from "./organizerClaimApproval";

const claimReviewRoles = ["admin", "adminOwner", "support"] as const;

interface OrganizerClaimDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: OrganizerClaimDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
};

export interface AdminDecideOrganizerClaimResponse {
  requestId: string;
  organizerId: string;
  decision: "approve" | "reject";
  status: "approved" | "rejected";
}

export async function requestOrganizerClaimHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerClaimDeps = defaultDeps
): Promise<RequestOrganizerClaimCallableResponse> {
  const requesterUid = requireAuth(request);
  const data = validateCallableWithAjv<RequestOrganizerClaimCallablePayload>(
    request,
    validateRequestOrganizerClaimCallablePayload,
    normalizeRequestPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, requesterUid, "requestOrganizerClaim", {
    maxRequests: 5, windowMs: 60 * 60 * 1000,
  });
  const requestId = organizerClaimRequestId(data.organizerId, requesterUid);
  const organizerRef = db.collection("organizers").doc(data.organizerId);
  const requestRef = db.collection("organizerClaimRequests").doc(requestId);
  const deletedUserRef = db.collection("deletedUsers").doc(requesterUid);
  const transitionId = crypto.randomUUID();
  const recordedAt = new Date().toISOString();

  await db.runTransaction(async (tx) => {
    const [organizerSnap, requestSnap, deletedUserSnap] =
      await Promise.all([
        tx.get(organizerRef),
        tx.get(requestRef),
        tx.get(deletedUserRef),
      ]);
    if (deletedUserSnap.exists) {
      throw new HttpsError(
        "failed-precondition",
        "This account cannot claim organizer listings."
      );
    }
    if (!organizerSnap.exists) {
      throw new HttpsError("not-found", "Organizer listing not found.");
    }
    const organizer = requireDoc<OrganizerDocument>(
      organizerSnap,
      "OrganizerDocument"
    );
    assertCanBeClaimed(organizer);
    if (requestSnap.exists) {
      const existing = requireDoc<OrganizerClaimRequestDocument>(
        requestSnap,
        "OrganizerClaimRequestDocument"
      );
      if (existing.status === "pending") {
        if (claimRequestOwnsPendingState(organizer, requestId)) return;
        throw new HttpsError(
          "failed-precondition",
          "Another organizer claim is already under review."
        );
      }
      if (existing.status === "approved") {
        throw new HttpsError(
          "failed-precondition",
          "This claim request has already been approved."
        );
      }
    }
    if (organizer.claim?.state === "claimPending") {
      throw new HttpsError(
        "failed-precondition",
        "Another organizer claim is already under review."
      );
    }
    const stageSalesTransition = await prepareClaimSalesTransition(tx, db, {
      organizerId: data.organizerId, claimRequestId: requestId,
      transitionId, status: "requested", actorUid: requesterUid, recordedAt,
    });
    const timestamp = deps.serverTimestamp();
    tx.set(requestRef, {
      requestId,
      organizerId: data.organizerId,
      requesterUid,
      requesterName: data.requesterName,
      requesterRole: data.requesterRole,
      businessEmail: data.businessEmail ?? null,
      businessPhone: data.businessPhone ?? null,
      proofUrls: data.proofUrls ?? [],
      message: data.message ?? null,
      status: "pending",
      createdAt: timestamp,
      updatedAt: timestamp,
      decidedAt: null,
      decidedByUid: null,
      decisionReason: null,
      previousRequestId: null,
    });
    const claim = {
      state: "claimPending",
      claimHref: organizer.claim?.claimHref ?? "/host/#founding-hosts",
      lastClaimRequestId: requestId,
    };
    const supplyCapabilities = organizerSupplyCapabilitiesFor({
      ownershipState: organizer.ownership?.state,
      claimState: claim.state,
    });
    tx.update(organizerRef, {claim, supplyCapabilities});
    stageSalesTransition();
  });
  return {requestId, status: "pending"};
}

export async function adminDecideOrganizerClaimHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerClaimDeps = defaultDeps
): Promise<AdminDecideOrganizerClaimResponse> {
  const adminContext = requireAdminRole(request, claimReviewRoles);
  const data = validateCallableWithAjv<
    AdminDecideOrganizerClaimCallablePayload
  >(
    request,
    validateAdminDecideOrganizerClaimCallablePayload,
    normalizeDecisionPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    adminContext.uid,
    "adminDecideOrganizerClaim",
    {maxRequests: 30, windowMs: 60 * 1000}
  );
  let response: AdminDecideOrganizerClaimResponse | null = null;
  const transitionId = crypto.randomUUID();
  const recordedAt = new Date().toISOString();

  await db.runTransaction(async (tx) => {
    const requestRef = db.collection("organizerClaimRequests")
      .doc(data.requestId);
    const requestSnap = await tx.get(requestRef);
    if (!requestSnap.exists) {
      throw new HttpsError("not-found", "Organizer claim request not found.");
    }
    const claimRequest = requireDoc<OrganizerClaimRequestDocument>(
      requestSnap,
      "OrganizerClaimRequestDocument"
    );
    if (claimRequest.status !== "pending") {
      throw new HttpsError(
        "failed-precondition",
        "This claim request has already been reviewed."
      );
    }
    const organizerRef = db.collection("organizers")
      .doc(claimRequest.organizerId);
    const organizerSnap = await tx.get(organizerRef);
    const organizer = organizerSnap.exists ?
      requireDoc<OrganizerDocument>(organizerSnap, "OrganizerDocument") : null;

    if (data.decision === "reject") {
      const stageSalesTransition = await prepareClaimSalesTransition(tx, db, {
        organizerId: claimRequest.organizerId, claimRequestId: data.requestId,
        transitionId, status: "rejected", actorUid: adminContext.uid,
        recordedAt,
      });
      const timestamp = deps.serverTimestamp();
      tx.set(requestRef, {
        status: "rejected",
        updatedAt: timestamp,
        decidedAt: timestamp,
        decidedByUid: adminContext.uid,
        decisionReason: data.decisionReason ?? null,
      }, {merge: true});
      if (organizer && claimRequestOwnsPendingState(
        organizer,
        data.requestId
      )) {
        const claim = {
          state: "unclaimed",
          claimHref: organizer.claim?.claimHref ?? "/host/#founding-hosts",
          lastClaimRequestId: data.requestId,
        };
        const supplyCapabilities = organizerSupplyCapabilitiesFor({
          ownershipState: organizer.ownership?.state,
          claimState: claim.state,
        });
        tx.update(organizerRef, {claim, supplyCapabilities});
      }
      setActivityNotificationInTransaction(tx, db, {
        id: activityNotificationId(
          "organizerUpdate",
          `${data.requestId}_rejected`
        ),
        uid: claimRequest.requesterUid,
        type: "organizerUpdate",
        title: "Organizer claim update",
        body: organizer?.name ?
          `Catch could not verify the claim for ${organizer.name}.` :
          "Catch could not verify this organizer claim.",
        createdAt: timestamp,
        organizerId: claimRequest.organizerId,
        actorUid: adminContext.uid,
      });
      setAdminAuditLogInTransaction(tx, db, adminContext, {
        action: "adminDecideOrganizerClaim",
        targetPath: requestRef.path,
        request,
        before: {status: claimRequest.status},
        after: {
          status: "rejected",
          decision: data.decision,
          organizerId: claimRequest.organizerId,
        },
        note: data.decisionReason,
        serverTimestamp: deps.serverTimestamp,
      });
      response = {
        requestId: data.requestId,
        organizerId: claimRequest.organizerId,
        decision: "reject",
        status: "rejected",
      };
      stageSalesTransition();
      return;
    }

    if (!organizer) {
      throw new HttpsError("not-found", "Organizer listing not found.");
    }
    // Ownership has one writer: verified claims approve through it too.
    const stageApproval = await prepareOrganizerClaimApproval(tx, db, {
      requestId: data.requestId,
      organizerId: claimRequest.organizerId,
      requesterUid: claimRequest.requesterUid,
      organizer,
      decidedByUid: adminContext.uid,
      decisionReason: data.decisionReason ?? null,
      notificationActorUid: adminContext.uid,
      newRequest: null,
      supersedeOtherPendingClaim: false,
      transitionId,
      recordedAt,
      serverTimestamp: deps.serverTimestamp,
    });
    stageApproval();
    setAdminAuditLogInTransaction(tx, db, adminContext, {
      action: "adminDecideOrganizerClaim",
      targetPath: requestRef.path,
      request,
      before: {status: claimRequest.status},
      after: {
        status: "approved",
        decision: data.decision,
        organizerId: claimRequest.organizerId,
        requesterUid: claimRequest.requesterUid,
      },
      note: data.decisionReason,
      serverTimestamp: deps.serverTimestamp,
    });
    response = {
      requestId: data.requestId,
      organizerId: claimRequest.organizerId,
      decision: "approve",
      status: "approved",
    };
  });

  if (!response) {
    throw new HttpsError("internal", "Claim decision did not complete.");
  }
  return response;
}

function normalizeRequestPayload(value: unknown): Record<string, unknown> {
  const data = isRecord(value) ? value : {};
  return {
    ...data,
    organizerId: trimString(data.organizerId),
    requesterName: trimString(data.requesterName),
    requesterRole: trimString(data.requesterRole),
    businessEmail: nullableTrimmedString(data.businessEmail),
    businessPhone: nullableTrimmedString(data.businessPhone),
    proofUrls: uniqueStrings(Array.isArray(data.proofUrls) ?
      data.proofUrls.map((url) => trimString(url)) : []),
    message: nullableTrimmedString(data.message),
  };
}

function normalizeDecisionPayload(value: unknown): Record<string, unknown> {
  const data = isRecord(value) ? value : {};
  return {
    ...data,
    requestId: trimString(data.requestId),
    decision: trimString(data.decision),
    decisionReason: nullableTrimmedString(data.decisionReason),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function trimString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

function nullableTrimmedString(value: unknown): string | null {
  if (value == null || typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function uniqueStrings(values: unknown[]): string[] {
  return [...new Set(values.filter((value): value is string =>
    typeof value === "string" && value.length > 0
  ))];
}

export const requestOrganizerClaim = onCall(
  appCheckCallableOptions,
  (request) => requestOrganizerClaimHandler(request)
);
export const adminDecideOrganizerClaim = onCall(
  appCheckCallableOptions,
  (request) => adminDecideOrganizerClaimHandler(request)
);
