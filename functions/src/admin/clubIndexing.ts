import {onCall, CallableRequest, HttpsError} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {requireAdminRole} from "./adminAuth";
import {setAdminAuditLogInTransaction} from "./adminAudit";
import type {AdminSetClubIndexStatusCallablePayload} from
  "../shared/generated/adminSetClubIndexStatusCallablePayload";
import {
  validateAdminSetClubIndexStatusCallablePayload,
} from "../shared/generated/validators/adminSetClubIndexStatusInput";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import type {ClubDocument} from "../shared/generated/firestoreAdminTypes";
import {
  reserveOrganizerCanonicalRoute,
} from "./organizerPublishingGuards";
import {
  buildOrganizerAdminSearchProjection,
  clubWithPublicPageForSearch,
} from "./organizerAdminSearch";
import {assertOrganizerPublicContent} from
  "../organizers/organizerPublicContent";

const indexReviewRoles = ["admin", "adminOwner", "support"] as const;

interface ClubIndexingDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: ClubIndexingDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
};

export interface AdminSetClubIndexStatusResponse {
  clubId: string;
  indexStatus: "noindex" | "indexReady" | "indexed";
  publishStatus: "qa" | "published";
  robots: "noindex, follow" | "index, follow";
}

type IndexReviewChecklist =
  AdminSetClubIndexStatusCallablePayload["checklist"];

/**
 * Reviews and updates the SEO indexing state for a public organizer page.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {ClubIndexingDeps} deps Injectable dependencies.
 * @return {Promise<AdminSetClubIndexStatusResponse>} Updated page state.
 */
export async function adminSetClubIndexStatusHandler(
  request: CallableRequest<unknown>,
  deps: ClubIndexingDeps = defaultDeps
): Promise<AdminSetClubIndexStatusResponse> {
  const adminContext = requireAdminRole(request, indexReviewRoles);
  const data =
    validateCallableWithAjv<AdminSetClubIndexStatusCallablePayload>(
      request,
      validateAdminSetClubIndexStatusCallablePayload,
      normalizeAdminSetClubIndexStatusPayload
    );
  assertChecklistForIndexableStatus(data.indexStatus, data.checklist);
  if (!data.reviewNote) {
    throw new HttpsError(
      "invalid-argument",
      "A review note is required for audited organizer indexing decisions."
    );
  }

  const db = deps.firestore();
  await deps.checkRateLimit?.(db, adminContext.uid, "adminSetClubIndexStatus", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const clubRef = db.collection("organizers").doc(data.clubId);
  const timestamp = deps.serverTimestamp();
  const publishStatus = data.indexStatus === "noindex" ? "qa" : "published";
  const robots = data.indexStatus === "noindex" ?
    "noindex, follow" :
    "index, follow";

  await db.runTransaction(async (tx) => {
    const clubSnap = await tx.get(clubRef);
    if (!clubSnap.exists) {
      throw new HttpsError("not-found", "Organizer listing not found.");
    }
    const before = requireDoc<ClubDocument>(clubSnap, "ClubDocument");
    if (data.indexStatus !== "noindex") {
      assertOrganizerPublicContent(before, "Publishing this organizer");
      await reserveOrganizerCanonicalRoute(tx, db, {
        clubId: data.clubId,
        canonicalPath: before.publicPage?.canonicalPath ?? "",
        slug: before.publicPage?.slug,
        citySlug: before.publicPage?.citySlug,
        previousCanonicalPath: before.publicPage?.canonicalPath ?? null,
        adminUid: adminContext.uid,
        source: "adminSetClubIndexStatus",
        serverTimestamp: () => timestamp,
      });
    }

    const patch = {
      "publicPage.indexStatus": data.indexStatus,
      "publicPage.publishStatus": publishStatus,
      "publicPage.robots": robots,
      "publicPage.indexReview": {
        reviewedAt: timestamp,
        reviewedByUid: adminContext.uid,
        indexStatus: data.indexStatus,
        checklist: data.checklist,
        reviewNote: data.reviewNote ?? null,
      },
      "adminSearch": buildOrganizerAdminSearchProjection(
        data.clubId,
        clubWithPublicPageForSearch(before, {
          indexStatus: data.indexStatus,
          publishStatus,
          robots,
        }),
        timestamp,
        "adminSetClubIndexStatus"
      ),
    };
    tx.update(clubRef, patch);
    setAdminAuditLogInTransaction(tx, db, adminContext, {
      action: "adminSetClubIndexStatus",
      targetPath: clubRef.path,
      request,
      before: {
        publicPage: before.publicPage ?? null,
      },
      after: {
        clubId: data.clubId,
        indexStatus: data.indexStatus,
        publishStatus,
        robots,
      },
      note: data.reviewNote,
      serverTimestamp: deps.serverTimestamp,
    });
  });

  return {
    clubId: data.clubId,
    indexStatus: data.indexStatus,
    publishStatus,
    robots,
  };
}

/**
 * Normalizes nullable review note text before schema validation.
 * @param {unknown} value Raw callable payload.
 * @return {unknown} Normalized payload.
 */
function normalizeAdminSetClubIndexStatusPayload(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const data = value as Record<string, unknown>;
  return {
    ...data,
    clubId: normalizeString(data.clubId),
    indexStatus: normalizeString(data.indexStatus),
    reviewNote: normalizeNullableString(data.reviewNote),
  };
}

/**
 * Requires every index-readiness gate before a page can become indexable.
 * @param {string} indexStatus Target index status.
 * @param {IndexReviewChecklist} checklist Admin-reviewed checklist.
 */
function assertChecklistForIndexableStatus(
  indexStatus: string,
  checklist: IndexReviewChecklist
) {
  if (indexStatus === "noindex") return;
  const complete =
    checklist.sourceEvidenceVerified &&
    checklist.mediaRightsVerified &&
    checklist.cadenceVerified &&
    checklist.ownerContactVerified;
  if (!complete) {
    throw new HttpsError(
      "failed-precondition",
      "Source evidence, media rights, cadence, and owner/contact " +
        "verification must be reviewed before indexing."
    );
  }
}

/**
 * Trims string payload fields.
 * @param {unknown} value Raw value.
 * @return {unknown} Trimmed value.
 */
function normalizeString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

/**
 * Trims optional string fields and converts blanks to null.
 * @param {unknown} value Raw value.
 * @return {unknown} Normalized nullable text.
 */
function normalizeNullableString(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export const adminSetOrganizerIndexStatus = onCall(
  appCheckCallableOptions,
  (request) => adminSetClubIndexStatusHandler(request)
);
