/* eslint-disable max-len */
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {appCheckCallableOptionsWithSecrets} from "../shared/callableOptions";
import type {AdminApproveOrganizerListingCallablePayload} from "../shared/generated/adminApproveOrganizerListingCallablePayload";
import type {AdminApproveOrganizerListingCallableResponse} from "../shared/generated/adminApproveOrganizerListingCallableResponse";
import {validateAdminApproveOrganizerListingCallablePayload} from "../shared/generated/validators/adminApproveOrganizerListingInput";
import {validateCallableWithAjv} from "../shared/validation";
import {requireAdminRole} from "../platform/adminAuth";
import {listingSuppressionHmacKey} from "../listingSuppressions/registry";
import {assertOrganizerVisibilityDecisionAllowed} from "../domain/supply/supplyVisibilityPolicy";
import {
  approveListing,
  defaultListingApprovalDeps,
  openMarket,
  type ListingApprovalDeps,
} from "../domain/supply/listingApproval";

// The Admin endpoint for listing approval. The approval itself, shared with
// Supply Intake's auto-publishing, is domain/supply/listingApproval.ts.

// Ops approve listings and events; claims stay the owner's (one of Admin's
// three jobs: owner, sales associate, ops and support). Approving also opens
// the listing's Sales records, owned by the Sales owner it names, unless the
// approval tags the organizer with a programmatic listing cohort.
export const listingApprovalRoles = ["admin", "adminOwner", "support"] as const;

/**
 * Approves a listing Supply Intake built. One transaction publishes the
 * organizer page claimable and noindex, hidden in the app; records the
 * curation receipt and the review decision; marks the request approved;
 * links the website or partner enquiry it came from; and opens the
 * organizer's Sales account, opportunity, review and claim-invite tasks, and
 * an activity attributed to the request. Indexing and app discovery stay
 * separate decisions, made after the organizer is verified.
 */
export async function adminApproveOrganizerListingHandler(
  request: CallableRequest<unknown>,
  deps: ListingApprovalDeps = defaultListingApprovalDeps
): Promise<AdminApproveOrganizerListingCallableResponse> {
  const adminContext = requireAdminRole(request, listingApprovalRoles);
  const data = validateCallableWithAjv<AdminApproveOrganizerListingCallablePayload>(request,
    validateAdminApproveOrganizerListingCallablePayload, normalizePayload);
  // The same gate as an Organizer Intake decision to publish on the web.
  assertOrganizerVisibilityDecisionAllowed({decision: "approve_public", publishStatus: "published",
    indexStatus: "noindex", appVisibility: "hidden", checklist: data.checklist});
  if (!openMarket(data.marketId)) {
    throw new HttpsError("failed-precondition", "Choose an open organizer launch market for this listing.");
  }
  await deps.checkRateLimit?.(
    deps.firestore(),
    adminContext.uid,
    "adminApproveOrganizerListing",
    {maxRequests: 10, windowMs: 60 * 1000}
  );
  return approveListing(deps, {adminContext, request, auditAction: "adminApproveOrganizerListing",
    checklist: data.checklist, activityLead: "Listing approved", reviewedByStaff: true,
    ...(data.salesRecords === undefined ? {} : {salesRecords: data.salesRecords})}, data);
}

export const adminApproveOrganizerListing = onCall(appCheckCallableOptionsWithSecrets([listingSuppressionHmacKey]),
  (request) => adminApproveOrganizerListingHandler(request));

function normalizePayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const data = value as Record<string, unknown>;
  const trimmed = (entry: unknown) => typeof entry === "string" ? entry.trim() : entry;
  return {...data, listingWorkItemId: trimmed(data.listingWorkItemId), name: trimmed(data.name),
    publicSlug: typeof data.publicSlug === "string" ? data.publicSlug.trim().toLowerCase() : data.publicSlug,
    marketId: trimmed(data.marketId), organizerType: trimmed(data.organizerType), note: trimmed(data.note),
    ...(typeof data.cohortId === "string" ? {cohortId: data.cohortId.trim().toLowerCase()} : {}),
    ...(Array.isArray(data.formats) ? {formats: [...new Set(data.formats)].sort()} : {})};
}
