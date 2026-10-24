import {act, cleanup, renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {createQueryHarness} from "../../../../shared/test/queryHarness";
import {useOrganizerListingReviewController} from "./useOrganizerListingReviewController";

const repository = vi.hoisted(() => ({
  listOrganizerListingReviews: vi.fn(),
  approveOrganizerListing: vi.fn(),
}));
vi.mock("../api/organizerListingReviewRepository", () => repository);

const row = (id: string) => ({requestId: `nom-${id}`, listingWorkItemId: id, kind: "nomination",
  submittedByRole: "associate", submittedAt: "2026-10-24T08:00:00.000Z", origin: "admin_nomination",
  market: {slug: "mumbai", marketId: "in-mh-mumbai", label: "Mumbai · Maharashtra", open: true},
  suggestedSlug: id, listing: {name: id, description: null, categories: [], links: [], gaps: [], eventCount: 0,
    researchNeeded: false, contentHash: "a".repeat(64), pageCount: 0, fetchedPageCount: 0}});

const approvalInput = {listingWorkItemId: "afterfly", contentHash: "a".repeat(64), name: "Afterfly",
  publicSlug: "afterfly", marketId: "in-mh-mumbai", organizerType: "community",
  checklist: {identityReviewed: true, surfaceInventoryReviewed: true, ownerSafeCopyReviewed: true,
    marketScopeReviewed: true, mediaRightsReviewed: true, crawlDisabledReviewed: true,
    claimTargetReviewed: true, takedownPathReviewed: true, impersonationReviewed: true},
  note: "Checked the Luma calendar."} as const;

describe("useOrganizerListingReviewController", () => {
  afterEach(cleanup);
  beforeEach(() => {
    Object.values(repository).forEach((mock) => mock.mockReset());
    repository.listOrganizerListingReviews.mockImplementation(async ({cursor}: {cursor: string | null}) =>
      cursor ? {rows: [row("older")], nextCursor: null, unavailableCount: 0, canApprove: true} :
        {rows: [row("afterfly")], nextCursor: "page-2", unavailableCount: 1, canApprove: true});
  });

  it("pages through the queue with the server's cursor", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useOrganizerListingReviewController({onError: vi.fn(), onNotice: vi.fn()}),
      {wrapper});
    await waitFor(() => expect(result.current.rows.map((entry) => entry.listingWorkItemId)).toEqual(["afterfly"]));
    expect([result.current.canApprove, result.current.unavailableCount, result.current.hasNextPage]).toEqual([true, 1, true]);
    act(() => result.current.nextPage());
    await waitFor(() => expect(result.current.rows.map((entry) => entry.listingWorkItemId)).toEqual(["older"]));
    expect(repository.listOrganizerListingReviews).toHaveBeenLastCalledWith({limit: 10, cursor: "page-2"});
    act(() => result.current.previousPage());
    await waitFor(() => expect(result.current.rows.map((entry) => entry.listingWorkItemId)).toEqual(["afterfly"]));
    expect(result.current.hasPreviousPage).toBe(false);
  });

  it("retries an approval under the same request id and reports the outcome", async () => {
    const {wrapper} = createQueryHarness();
    const onError = vi.fn(), onNotice = vi.fn(), onApproved = vi.fn();
    repository.approveOrganizerListing.mockRejectedValueOnce(new Error("deadline-exceeded"))
      .mockResolvedValueOnce({approvalId: `listing-${"b".repeat(40)}`, organizerId: "org-1",
        organizerPath: "organizers/org-1", created: true, publishStatus: "published", indexStatus: "noindex",
        appVisibility: "hidden", claimState: "unclaimed", salesOwnerUid: "associate-1"});
    const {result} = renderHook(() => useOrganizerListingReviewController({onError, onNotice, onApproved}),
      {wrapper});
    let first = true, second = false;
    await act(async () => { first = await result.current.approve(approvalInput); });
    await act(async () => { second = await result.current.approve(approvalInput); });
    expect([first, second]).toEqual([false, true]);
    expect(onError).toHaveBeenCalledWith("deadline-exceeded");
    const [a, b] = repository.approveOrganizerListing.mock.calls.map(([request]) => request.requestId);
    expect(b).toBe(a);
    expect(onNotice).toHaveBeenCalledWith(
      "Afterfly is published as an unclaimed page, not yet indexed. Its Sales work is open.");
    expect(onApproved).toHaveBeenCalledWith(expect.objectContaining({organizerId: "org-1"}));
  });
});
