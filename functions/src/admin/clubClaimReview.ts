import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {appCheckCallableOptions} from "../shared/callableOptions";
import type {
  OrganizerClaimRequestDocument,
  OrganizerDocument,
  UserProfileDocument,
} from "../shared/generated/firestoreAdminTypes";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {requireDoc} from "../shared/validation";
import {requireAdminRole} from "./adminAuth";

const claimReviewRoles = ["admin", "adminOwner", "support"] as const;
const claimRequestIdPattern = /^[A-Za-z0-9_-]{1,200}$/u;

export interface AdminClubClaimListRow {
  requestId: string;
  targetPath: string;
  clubId: string;
  requesterUid: string;
  requesterName: string;
  requesterRole: string;
  contact: string | null;
  proofCount: number;
  status: string;
  createdAt: string | null;
}

export interface AdminListClubClaimRequestsResponse {
  generatedAt: string;
  rows: AdminClubClaimListRow[];
}

export interface AdminGetClubClaimRequestDetailsPayload {
  requestId: string;
}

export interface AdminClubClaimRequestDetails extends AdminClubClaimListRow {
  businessEmail: string | null;
  businessPhone: string | null;
  proofUrls: string[];
  message: string | null;
  updatedAt: string | null;
  requesterProfile: {
    exists: boolean;
    profileComplete: boolean;
  };
  club: {
    exists: boolean;
    name: string | null;
    claimState: string | null;
    ownershipState: string | null;
    ownerUserId: string | null;
    canonicalPath: string | null;
  };
}

export interface AdminGetClubClaimRequestDetailsResponse {
  request: AdminClubClaimRequestDetails;
}

interface ClubClaimReviewDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => Date;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: ClubClaimReviewDeps = {
  firestore: () => admin.firestore(),
  now: () => new Date(),
  checkRateLimit: defaultCheckRateLimit,
};

export async function adminListClubClaimRequestsHandler(
  request: CallableRequest<unknown>,
  deps: ClubClaimReviewDeps = defaultDeps
): Promise<AdminListClubClaimRequestsResponse> {
  const adminContext = requireAdminRole(request, claimReviewRoles);
  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    adminContext.uid,
    "adminListClubClaimRequests",
    {maxRequests: 60, windowMs: 60 * 1000}
  );
  const snapshot = await db.collection("organizerClaimRequests")
    .where("status", "==", "pending")
    .limit(100)
    .get();
  const rows = snapshot.docs
    .map((doc) => claimListRow(doc.id, doc.data()))
    .sort((left, right) => compareNullableIso(right.createdAt, left.createdAt));
  return {generatedAt: deps.now().toISOString(), rows};
}

export async function adminGetClubClaimRequestDetailsHandler(
  request: CallableRequest<unknown>,
  deps: ClubClaimReviewDeps = defaultDeps
): Promise<AdminGetClubClaimRequestDetailsResponse> {
  const adminContext = requireAdminRole(request, claimReviewRoles);
  const payload = normalizeClubClaimDetailsPayload(request.data);
  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    adminContext.uid,
    "adminGetClubClaimRequestDetails",
    {maxRequests: 60, windowMs: 60 * 1000}
  );
  const requestRef = db.collection("organizerClaimRequests")
    .doc(payload.requestId);
  const requestSnapshot = await requestRef.get();
  if (!requestSnapshot.exists) {
    throw new HttpsError("not-found", "Organizer claim request not found.");
  }
  const claimRequest = requireDoc<OrganizerClaimRequestDocument>(
    requestSnapshot,
    "OrganizerClaimRequestDocument"
  );
  const [clubSnapshot, requesterSnapshot] = await Promise.all([
    db.collection("organizers").doc(claimRequest.organizerId).get(),
    db.collection("users").doc(claimRequest.requesterUid).get(),
  ]);
  const club = clubSnapshot.exists ?
    requireDoc<OrganizerDocument>(clubSnapshot, "OrganizerDocument") :
    null;
  const requester = requesterSnapshot.exists ?
    requireDoc<UserProfileDocument>(requesterSnapshot, "UserProfileDocument") :
    null;
  return {
    request: claimDetails(payload.requestId, claimRequest, club, requester),
  };
}

export function normalizeClubClaimDetailsPayload(
  data: unknown
): AdminGetClubClaimRequestDetailsPayload {
  if (!isRecord(data)) {
    throw new HttpsError("invalid-argument", "Expected an object payload.");
  }
  const requestId = stringValue(data.requestId);
  if (!requestId || !claimRequestIdPattern.test(requestId)) {
    throw new HttpsError(
      "invalid-argument",
      "A valid organizer claim request id is required."
    );
  }
  return {requestId};
}

function claimListRow(
  requestId: string,
  data: FirebaseFirestore.DocumentData
): AdminClubClaimListRow {
  return {
    requestId,
    targetPath: `organizerClaimRequests/${requestId}`,
    clubId: stringValue(data.organizerId) ?? "unknown",
    requesterUid: stringValue(data.requesterUid) ?? "unknown",
    requesterName: stringValue(data.requesterName) ?? "Unknown requester",
    requesterRole: stringValue(data.requesterRole) ?? "unknown",
    contact: stringValue(data.businessEmail) ??
      stringValue(data.businessPhone) ??
      null,
    proofCount: stringArray(data.proofUrls).length,
    status: stringValue(data.status) ?? "unknown",
    createdAt: isoFromTimestamp(data.createdAt),
  };
}

function claimDetails(
  requestId: string,
  claimRequest: OrganizerClaimRequestDocument,
  club: OrganizerDocument | null,
  requester: UserProfileDocument | null
): AdminClubClaimRequestDetails {
  return {
    ...claimListRow(requestId, claimRequest),
    businessEmail: stringValue(claimRequest.businessEmail),
    businessPhone: stringValue(claimRequest.businessPhone),
    proofUrls: stringArray(claimRequest.proofUrls),
    message: stringValue(claimRequest.message),
    updatedAt: isoFromTimestamp(claimRequest.updatedAt),
    requesterProfile: {
      exists: requester !== null,
      profileComplete: requester?.profileComplete === true,
    },
    club: {
      exists: club !== null,
      name: stringValue(club?.name),
      claimState: stringValue(club?.claim?.state),
      ownershipState: stringValue(club?.ownership?.state),
      ownerUserId: stringValue(club?.ownerUserId),
      canonicalPath: stringValue(club?.publicPage?.canonicalPath),
    },
  };
}

function compareNullableIso(left: string | null, right: string | null): number {
  return String(left ?? "").localeCompare(String(right ?? ""));
}

function isoFromTimestamp(value: unknown): string | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString();
  }
  if (isRecord(value) && typeof value.toDate === "function") {
    const date = value.toDate();
    return date instanceof Date && Number.isFinite(date.getTime()) ?
      date.toISOString() :
      null;
  }
  if (typeof value === "string" && Number.isFinite(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  return null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ?
    value.filter((item): item is string => typeof item === "string") :
    [];
}

function stringValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const adminListOrganizerClaimRequests = onCall(
  appCheckCallableOptions,
  (request) => adminListClubClaimRequestsHandler(request)
);

export const adminGetOrganizerClaimRequestDetails = onCall(
  appCheckCallableOptions,
  (request) => adminGetClubClaimRequestDetailsHandler(request)
);
