import {onCall, CallableRequest, HttpsError} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {requireAdminRole} from "./adminAuth";
import {setAdminAuditLogInTransaction} from "./adminAudit";
import type {AdminSetOrganizerIndexStatusCallablePayload} from
  "../shared/generated/adminSetOrganizerIndexStatusCallablePayload";
import {
  validateAdminSetOrganizerIndexStatusCallablePayload,
} from "../shared/generated/validators/adminSetOrganizerIndexStatusInput";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import type {OrganizerDocument} from "../shared/generated/firestoreAdminTypes";
import {
  reserveOrganizerCanonicalRoute,
} from "./organizerPublishingGuards";
import {
  buildOrganizerAdminSearchProjection,
  organizerWithPublicPageForSearch,
} from "./organizerAdminSearch";
import {assertOrganizerPublicContent} from
  "../organizers/organizerPublicContent";

const indexReviewRoles = ["admin", "adminOwner", "support"] as const;

interface OrganizerIndexingDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: OrganizerIndexingDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
};

export interface AdminSetOrganizerIndexStatusResponse {
  organizerId: string;
  indexStatus: "noindex" | "indexReady" | "indexed";
  publishStatus: "qa" | "published";
  robots: "noindex, follow" | "index, follow";
}

type IndexReviewChecklist =
  AdminSetOrganizerIndexStatusCallablePayload["checklist"];

/**
 * Reviews and updates the SEO indexing state for a public organizer page.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {OrganizerIndexingDeps} deps Injectable dependencies.
 * @return {Promise<AdminSetOrganizerIndexStatusResponse>} Updated page state.
 */
export async function adminSetOrganizerIndexStatusHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerIndexingDeps = defaultDeps
): Promise<AdminSetOrganizerIndexStatusResponse> {
  const adminContext = requireAdminRole(request, indexReviewRoles);
  const data =
    validateCallableWithAjv<AdminSetOrganizerIndexStatusCallablePayload>(
      request,
      validateAdminSetOrganizerIndexStatusCallablePayload,
      normalizeAdminSetOrganizerIndexStatusPayload
    );
  assertChecklistForIndexableStatus(data.indexStatus, data.checklist);
  if (!data.reviewNote) {
    throw new HttpsError(
      "invalid-argument",
      "A review note is required for audited organizer indexing decisions."
    );
  }

  const db = deps.firestore();
  await deps.checkRateLimit?.(db, adminContext.uid,
    "adminSetOrganizerIndexStatus", {
      maxRequests: 30, windowMs: 60 * 1000,
    });
  const organizerRef = db.collection("organizers").doc(data.organizerId);
  const timestamp = deps.serverTimestamp();
  const publishStatus = data.indexStatus === "noindex" ? "qa" : "published";
  const robots = data.indexStatus === "noindex" ?
    "noindex, follow" :
    "index, follow";

  await db.runTransaction(async (tx) => {
    const organizerSnap = await tx.get(organizerRef);
    if (!organizerSnap.exists) {
      throw new HttpsError("not-found", "Organizer listing not found.");
    }
    const before = requireDoc<OrganizerDocument>(organizerSnap,
      "OrganizerDocument");
    if (data.indexStatus !== "noindex") {
      assertOrganizerPublicContent(before, "Publishing this organizer");
      await reserveOrganizerCanonicalRoute(tx, db, {
        organizerId: data.organizerId,
        canonicalPath: before.publicPage?.canonicalPath ?? "",
        slug: before.publicPage?.slug,
        citySlug: before.publicPage?.citySlug,
        previousCanonicalPath: before.publicPage?.canonicalPath ?? null,
        adminUid: adminContext.uid,
        source: "adminSetOrganizerIndexStatus",
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
        data.organizerId,
        organizerWithPublicPageForSearch(before, {
          indexStatus: data.indexStatus,
          publishStatus,
          robots,
        }),
        timestamp,
        "adminSetOrganizerIndexStatus"
      ),
    };
    tx.update(organizerRef, patch);
    setAdminAuditLogInTransaction(tx, db, adminContext, {
      action: "adminSetOrganizerIndexStatus",
      targetPath: organizerRef.path,
      request,
      before: {
        publicPage: before.publicPage ?? null,
      },
      after: {
        organizerId: data.organizerId,
        indexStatus: data.indexStatus,
        publishStatus,
        robots,
      },
      note: data.reviewNote,
      serverTimestamp: deps.serverTimestamp,
    });
  });

  return {
    organizerId: data.organizerId,
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
function normalizeAdminSetOrganizerIndexStatusPayload(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const data = value as Record<string, unknown>;
  return {
    ...data,
    organizerId: normalizeString(data.organizerId),
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
  (request) => adminSetOrganizerIndexStatusHandler(request)
);
