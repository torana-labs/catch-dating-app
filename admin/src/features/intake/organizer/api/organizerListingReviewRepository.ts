import {httpsCallable} from "firebase/functions";
import {validateAdminCallableRequest, validateAdminCallableResponse} from
  "../../../../generated/validators/adminCallableValidators";
import type {AdminApproveOrganizerListingCallablePayload} from
  "../../../../generated/contracts/adminApproveOrganizerListingCallablePayload";
import type {AdminApproveOrganizerListingCallableResponse} from
  "../../../../generated/contracts/adminApproveOrganizerListingCallableResponse";
import type {AdminListOrganizerListingReviewsCallablePayload} from
  "../../../../generated/contracts/adminListOrganizerListingReviewsCallablePayload";
import type {AdminListOrganizerListingReviewsCallableResponse} from
  "../../../../generated/contracts/adminListOrganizerListingReviewsCallableResponse";
import {dataMode} from "../../../../shared/api/dataMode";
import {functions} from "../../../../shared/api/firebaseFunctions";

export type ListingReviewPage = AdminListOrganizerListingReviewsCallableResponse;
export type ListingReview = ListingReviewPage["rows"][number];
export type ListingApprovalInput = AdminApproveOrganizerListingCallablePayload;
export type ListingApproval = AdminApproveOrganizerListingCallableResponse;

function call<Request extends object, Response>(name: string, payload: Request): Promise<Response> {
  validateAdminCallableRequest(name, payload);
  return httpsCallable<Request, Response>(functions, name)(payload).then((result) => {
    validateAdminCallableResponse(name, result.data);
    return result.data;
  });
}

const sampleListing: ListingReview = {
  requestId: "nom-sample-afterfly", listingWorkItemId: "supply-intake-sample-listing",
  kind: "nomination", submittedByRole: "associate", submittedAt: "2026-10-24T08:00:00.000Z",
  origin: "admin_nomination",
  market: {slug: "mumbai", marketId: "in-mh-mumbai", label: "Mumbai · Maharashtra", open: true},
  suggestedSlug: "afterfly",
  listing: {name: "Afterfly", description: "Weekly social nights for people who would rather meet in person.",
    categories: ["social"], links: [{platform: "luma", url: "https://lu.ma/afterfly"}],
    gaps: [], eventCount: 3, researchNeeded: false, contentHash: "a".repeat(64), pageCount: 1,
    fetchedPageCount: 1},
};
const sampleApprovals = new Map<string, ListingApproval>();

/** Listings Supply Intake built that nobody has approved yet, newest first. */
export async function listOrganizerListingReviews(
  input: AdminListOrganizerListingReviewsCallablePayload
): Promise<ListingReviewPage> {
  if (dataMode() !== "sample") return call("adminListOrganizerListingReviews", input);
  const rows = sampleApprovals.has(sampleListing.listingWorkItemId) ? [] : [sampleListing];
  return {rows, nextCursor: null, unavailableCount: 0, canApprove: true};
}

/** Publishes the listing unclaimed and noindex and opens its Sales work. */
export async function approveOrganizerListing(input: ListingApprovalInput): Promise<ListingApproval> {
  if (dataMode() !== "sample") return call("adminApproveOrganizerListing", input);
  const approval: ListingApproval = sampleApprovals.get(input.listingWorkItemId) ?? {
    approvalId: `listing-${"0".repeat(40)}`, organizerId: "sample-afterfly", organizerPath: "organizers/sample-afterfly",
    created: true, publishStatus: "published", indexStatus: "noindex", appVisibility: "hidden",
    claimState: "unclaimed", salesOwnerUid: "sample-owner"};
  sampleApprovals.set(input.listingWorkItemId, approval);
  return approval;
}
