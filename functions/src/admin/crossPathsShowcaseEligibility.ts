import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import type {
  CrossPathsShowcaseEligibilityDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {AdminListCrossPathsShowcaseCandidatesCallablePayload} from
  "../shared/generated/adminListCrossPathsShowcaseCandidatesCallablePayload";
import type {AdminListCrossPathsShowcaseCandidatesCallableResponse} from
  "../shared/generated/adminListCrossPathsShowcaseCandidatesCallableResponse";
import type {AdminSetCrossPathsShowcaseEligibilityCallablePayload} from
  "../shared/generated/adminSetCrossPathsShowcaseEligibilityCallablePayload";
import type {AdminSetCrossPathsShowcaseEligibilityCallableResponse} from
  "../shared/generated/adminSetCrossPathsShowcaseEligibilityCallableResponse";
import {
  validateAdminListCrossPathsShowcaseCandidatesCallablePayload,
} from
  "../shared/generated/validators/adminListCrossPathsShowcaseCandidatesInput";
import {
  validateAdminListCrossPathsShowcaseCandidatesCallableResponse,
} from
  "../shared/generated/validators/adminListCrossPathsShowcaseCandidatesOutput";
import {
  validateAdminSetCrossPathsShowcaseEligibilityCallablePayload,
} from
  "../shared/generated/validators/adminSetCrossPathsShowcaseEligibilityInput";
import {
  validateAdminSetCrossPathsShowcaseEligibilityCallableResponse,
} from
  "../shared/generated/validators/adminSetCrossPathsShowcaseEligibilityOutput";
import {validateCallableWithAjv} from "../shared/validation";
import {
  crossPathsShowcaseRuleVersion,
  effectiveCrossPathsShowcaseEligibility,
  evaluateCrossPathsShowcaseReadiness,
  CrossPathsShowcaseReasonCode,
} from "../crossPaths/showcaseEligibility";
import {requireAdminRole} from "./adminAuth";
import {setAdminAuditLogInTransaction} from "./adminAudit";

const reviewReadRoles = [
  "admin",
  "adminOwner",
  "safetyReviewer",
  "support",
] as const;
const reviewWriteRoles = ["admin", "adminOwner", "safetyReviewer"] as const;
const eligibilityCollection = "crossPathsShowcaseEligibility";
const publicProfilesCollection = "publicProfiles";

interface CrossPathsShowcaseEligibilityDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => FirebaseFirestore.Timestamp;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  documentIdField: () => FirebaseFirestore.FieldPath;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: CrossPathsShowcaseEligibilityDeps = {
  firestore: () => admin.firestore(),
  now: () => admin.firestore.Timestamp.now(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  documentIdField: () => admin.firestore.FieldPath.documentId(),
  checkRateLimit: defaultCheckRateLimit,
};

type Candidate =
  AdminListCrossPathsShowcaseCandidatesCallableResponse["candidates"][number];

/**
 * Lists a bounded reviewer queue without exposing private profile or consent
 * records. The queue projects publicProfiles plus coarse server-only review
 * state; it never returns a score.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {CrossPathsShowcaseEligibilityDeps} deps Injectable dependencies.
 * @return {Promise<AdminListCrossPathsShowcaseCandidatesCallableResponse>}
 * Review queue.
 */
export async function adminListCrossPathsShowcaseCandidatesHandler(
  request: CallableRequest<unknown>,
  deps: CrossPathsShowcaseEligibilityDeps = defaultDeps
): Promise<AdminListCrossPathsShowcaseCandidatesCallableResponse> {
  const adminContext = requireAdminRole(request, reviewReadRoles);
  const data = validateCallableWithAjv<
    AdminListCrossPathsShowcaseCandidatesCallablePayload
  >(
    request,
    validateAdminListCrossPathsShowcaseCandidatesCallablePayload,
    normalizeListPayload
  );
  if (data.uid && data.cursor) {
    throw new HttpsError(
      "invalid-argument",
      "An exact uid lookup cannot be combined with a queue cursor."
    );
  }

  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    adminContext.uid,
    "adminListCrossPathsShowcaseCandidates",
    {maxRequests: 60, windowMs: 60 * 1000}
  );
  const limit = data.limit ?? 25;
  const profileSnapshots = data.uid ?
    [await db.collection(publicProfilesCollection).doc(data.uid).get()] :
    await listPublicProfileSnapshots(db, data, limit, deps);
  const existingProfileSnapshots = profileSnapshots.filter(
    (snapshot) => snapshot.exists &&
      (!data.marketId || snapshot.data()?.city === data.marketId)
  );
  const eligibilityRefs = existingProfileSnapshots.map((snapshot) =>
    db.collection(eligibilityCollection).doc(snapshot.id)
  );
  const eligibilitySnapshots = eligibilityRefs.length === 0 ? [] :
    await db.getAll(...eligibilityRefs);
  const statusFilter = data.status ?? "all";
  const candidates = existingProfileSnapshots
    .map((snapshot, index) => candidateProjection(
      snapshot.id,
      snapshot.data(),
      eligibilitySnapshots[index]?.data()
    ))
    .filter((candidate) =>
      statusFilter === "all" || candidate.effectiveStatus === statusFilter
    );
  const nextCursor = !data.uid && existingProfileSnapshots.length === limit ?
    existingProfileSnapshots.at(-1)?.id ?? null : null;
  const response: AdminListCrossPathsShowcaseCandidatesCallableResponse = {
    schemaVersion: 1,
    generatedAt: deps.now().toDate().toISOString(),
    candidates,
    nextCursor,
  };
  const isValidResponse =
    validateAdminListCrossPathsShowcaseCandidatesCallableResponse(response);
  if (!isValidResponse) {
    throw new HttpsError(
      "internal",
      "Cross Paths showcase candidate listing produced an invalid response."
    );
  }
  return response;
}

/**
 * Records one human review decision bound to the current public profile hash.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {CrossPathsShowcaseEligibilityDeps} deps Injectable dependencies.
 * @return {Promise<AdminSetCrossPathsShowcaseEligibilityCallableResponse>}
 * Saved decision.
 */
export async function adminSetCrossPathsShowcaseEligibilityHandler(
  request: CallableRequest<unknown>,
  deps: CrossPathsShowcaseEligibilityDeps = defaultDeps
): Promise<AdminSetCrossPathsShowcaseEligibilityCallableResponse> {
  const adminContext = requireAdminRole(request, reviewWriteRoles);
  const data = validateCallableWithAjv<
    AdminSetCrossPathsShowcaseEligibilityCallablePayload
  >(
    request,
    validateAdminSetCrossPathsShowcaseEligibilityCallablePayload,
    normalizeSetPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    adminContext.uid,
    "adminSetCrossPathsShowcaseEligibility",
    {maxRequests: 30, windowMs: 60 * 1000}
  );
  const profileRef = db.collection(publicProfilesCollection).doc(data.uid);
  const eligibilityRef = db.collection(eligibilityCollection).doc(data.uid);
  const now = deps.now();
  let response: AdminSetCrossPathsShowcaseEligibilityCallableResponse | null =
    null;

  await db.runTransaction(async (tx) => {
    const [profileSnapshot, eligibilitySnapshot] = await Promise.all([
      tx.get(profileRef),
      tx.get(eligibilityRef),
    ]);
    if (!profileSnapshot.exists) {
      throw new HttpsError("not-found", "Public profile not found.");
    }
    const profile = profileSnapshot.data();
    const readiness = evaluateCrossPathsShowcaseReadiness(profile);
    assertDecisionAllowed(data, readiness.reasonCodes);
    const previous = eligibilitySnapshot.exists ?
      eligibilitySnapshot.data() as CrossPathsShowcaseEligibilityDocument :
      undefined;
    const reasonCodes = reasonCodesForDecision(
      data.status,
      readiness.reasonCodes
    );
    const document: CrossPathsShowcaseEligibilityDocument = {
      status: data.status,
      reasonCodes,
      ruleVersion: crossPathsShowcaseRuleVersion,
      reviewVersion: (previous?.reviewVersion ?? 0) + 1,
      profileFingerprint: readiness.profileFingerprint,
      reviewChecklist: data.reviewChecklist,
      reviewNote: data.reviewNote,
      reviewedByUid: adminContext.uid,
      reviewedAt: now,
      updatedAt: now,
    };
    tx.set(eligibilityRef, document);
    setAdminAuditLogInTransaction(tx, db, adminContext, {
      action: "adminSetCrossPathsShowcaseEligibility",
      targetPath: eligibilityRef.path,
      request,
      before: previous ? {
        status: previous.status,
        reasonCodes: previous.reasonCodes,
        ruleVersion: previous.ruleVersion,
        reviewVersion: previous.reviewVersion,
        profileFingerprint: previous.profileFingerprint,
      } : {},
      after: {
        status: document.status,
        reasonCodes: document.reasonCodes,
        ruleVersion: document.ruleVersion,
        reviewVersion: document.reviewVersion,
        profileFingerprint: document.profileFingerprint,
      },
      note: data.reviewNote,
      serverTimestamp: deps.serverTimestamp,
    });
    response = {
      uid: data.uid,
      status: document.status,
      reasonCodes: document.reasonCodes,
      profileFingerprint: document.profileFingerprint,
      ruleVersion: document.ruleVersion,
      reviewVersion: document.reviewVersion,
      reviewedAt: now.toDate().toISOString(),
    };
  });

  if (!response) {
    throw new HttpsError(
      "internal",
      "Cross Paths showcase decision did not produce a response."
    );
  }
  const isValidResponse =
    validateAdminSetCrossPathsShowcaseEligibilityCallableResponse(response);
  if (!isValidResponse) {
    throw new HttpsError(
      "internal",
      "Cross Paths showcase decision produced an invalid response."
    );
  }
  return response;
}

async function listPublicProfileSnapshots(
  db: FirebaseFirestore.Firestore,
  data: AdminListCrossPathsShowcaseCandidatesCallablePayload,
  limit: number,
  deps: CrossPathsShowcaseEligibilityDeps
): Promise<FirebaseFirestore.DocumentSnapshot[]> {
  let query: FirebaseFirestore.Query = db.collection(publicProfilesCollection);
  if (data.marketId) query = query.where("city", "==", data.marketId);
  query = query.orderBy(deps.documentIdField());
  if (data.cursor) query = query.startAfter(data.cursor);
  return (await query.limit(limit).get()).docs;
}

function candidateProjection(
  uid: string,
  profileValue: FirebaseFirestore.DocumentData | undefined,
  eligibilityValue: FirebaseFirestore.DocumentData | undefined
): Candidate {
  const profile = recordOrNull(profileValue) ?? {};
  const readiness = evaluateCrossPathsShowcaseReadiness(profileValue);
  const stored = eligibilityValue as
    CrossPathsShowcaseEligibilityDocument | undefined;
  const effective = effectiveCrossPathsShowcaseEligibility(readiness, stored);
  const photos = Array.isArray(profile.profilePhotos) ?
    profile.profilePhotos : [];
  const prompts = Array.isArray(profile.profilePrompts) ?
    profile.profilePrompts : [];
  return {
    uid,
    name: boundedStringOrNull(profile.name, 80),
    age: validAgeOrNull(profile.age),
    gender: boundedStringOrNull(profile.gender, 40),
    city: boundedStringOrNull(profile.city, 80),
    photoUrls: photos
      .map((photo) => recordOrNull(photo)?.url)
      .filter(validHttpUrl)
      .slice(0, 6),
    promptAnswers: prompts
      .map((prompt) => recordOrNull(prompt))
      .filter((prompt): prompt is Record<string, unknown> => Boolean(prompt))
      .map((prompt) => ({
        prompt: boundedString(prompt.prompt, 140),
        answer: boundedString(prompt.answer, 300),
      }))
      .slice(0, 3),
    relationshipGoal: boundedStringOrNull(profile.relationshipGoal, 80),
    automaticStatus: readiness.automaticStatus,
    automaticReasonCodes: readiness.reasonCodes,
    storedStatus: stored?.status ?? null,
    effectiveStatus: effective.status,
    effectiveReasonCodes: effective.reasonCodes,
    profileFingerprint: readiness.profileFingerprint,
    reviewedByUid: stored?.reviewedByUid ?? null,
    reviewedAt: timestampToIso(stored?.reviewedAt),
    reviewNote: stored?.reviewNote ?? null,
  };
}

function assertDecisionAllowed(
  data: AdminSetCrossPathsShowcaseEligibilityCallablePayload,
  objectiveBlockers: CrossPathsShowcaseReasonCode[]
) {
  if (data.status !== "eligible") return;
  if (objectiveBlockers.length > 0) {
    throw new HttpsError(
      "failed-precondition",
      "Resolve the objective profile-readiness blockers before approval.",
      {reasonCodes: objectiveBlockers}
    );
  }
  const checklist = data.reviewChecklist;
  if (!checklist.primaryPortraitClear ||
      !checklist.profileRepresentsCurrentMember ||
      !checklist.showcasePolicyReviewed) {
    throw new HttpsError(
      "failed-precondition",
      "Complete every human review checkpoint before approval."
    );
  }
}

function reasonCodesForDecision(
  status: CrossPathsShowcaseEligibilityDocument["status"],
  objectiveBlockers: CrossPathsShowcaseReasonCode[]
): CrossPathsShowcaseReasonCode[] {
  if (status === "eligible") return [];
  const manualReason: CrossPathsShowcaseReasonCode =
    status === "paused" ? "manual_pause" : "reviewer_hold";
  return [...new Set([...objectiveBlockers, manualReason])];
}

function normalizeListPayload(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const data = value as Record<string, unknown>;
  return {
    ...data,
    uid: normalizeNullableString(data.uid),
    status: normalizeNullableString(data.status),
    marketId: normalizeNullableMarketId(data.marketId),
    cursor: normalizeNullableString(data.cursor),
  };
}

function normalizeNullableMarketId(value: unknown): unknown {
  const normalized = normalizeNullableString(value);
  return typeof normalized === "string" ? normalized.toLowerCase() : normalized;
}

function normalizeSetPayload(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const data = value as Record<string, unknown>;
  return {
    ...data,
    uid: normalizeString(data.uid),
    status: normalizeString(data.status),
    reviewNote: normalizeString(data.reviewNote),
  };
}

function normalizeString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

function normalizeNullableString(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function recordOrNull(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ?
    value as Record<string, unknown> : null;
}

function boundedString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

function boundedStringOrNull(
  value: unknown,
  maxLength: number
): string | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  return value.slice(0, maxLength);
}

function validAgeOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) &&
    value >= 18 && value <= 99 ? value : null;
}

function validHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function timestampToIso(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const toDate = (value as {toDate?: unknown}).toDate;
  return typeof toDate === "function" ?
    (toDate as () => Date).call(value).toISOString() : null;
}

export const adminListCrossPathsShowcaseCandidates = onCall(
  appCheckCallableOptions,
  (request) => adminListCrossPathsShowcaseCandidatesHandler(request)
);

export const adminSetCrossPathsShowcaseEligibility = onCall(
  appCheckCallableOptions,
  (request) => adminSetCrossPathsShowcaseEligibilityHandler(request)
);
