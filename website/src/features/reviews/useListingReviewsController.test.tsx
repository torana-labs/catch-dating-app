import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, renderHook} from "@testing-library/react";
import type {PropsWithChildren} from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {hostListings} from "../organizers/data";
import {organizerPolicyForListing} from "../organizers/organizerPolicy";
import type {HostListing} from "../organizers/types";

const reviewConfig = vi.hoisted(() => ({enabled: false}));
const createPublicOrganizerReview = vi.hoisted(() => vi.fn());
const trackMarketingEvent = vi.hoisted(() => vi.fn());

vi.mock("../../analytics", () => ({trackMarketingEvent}));
vi.mock("../../firebase", () => ({
  createPublicOrganizerReview,
}));
vi.mock("../../firebaseConfig", () => ({
  get publicReviewsFirebaseConfigured() {
    return reviewConfig.enabled;
  },
}));

import {useListingReviewsController} from "./useListingReviewsController";

function queryHarness() {
  const client = new QueryClient({
    defaultOptions: {
      mutations: {retry: false},
      queries: {retry: false},
    },
  });
  return {
    client,
    wrapper({children}: PropsWithChildren) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    },
  };
}

function enabledListing(): HostListing {
  return {
    ...hostListings[0],
    authority: {
      ...hostListings[0].authority,
      claimState: "claimed",
      ownershipState: "claimed",
      publishStatus: "published",
    },
    capabilities: {
      ...hostListings[0].capabilities,
      publicReviews: {
        targetState: "enabled",
        readState: "enabled",
        writeState: "enabled",
        reason: "",
      },
      supply: {
        mode: "claimed_managed",
        bookable: true,
        paymentsEnabled: true,
        waitlistEnabled: true,
        hostContactEnabled: true,
        claimable: false,
        reviewPolicy: "attended_event_only",
      },
    },
  };
}

function submitEvent() {
  return {
    currentTarget: document.createElement("form"),
    preventDefault: vi.fn(),
  } as never;
}

describe("useListingReviewsController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reviewConfig.enabled = false;
  });

  it("keeps disabled listing routes read-only", async () => {
    const listing = {
      ...hostListings[0],
      capabilities: {
        ...hostListings[0].capabilities,
        publicReviews: {
          targetState: "enabled",
          readState: "disabled",
          writeState: "disabled",
          reason: "Public reviews are disabled for this fixture.",
        },
      },
    } as HostListing;
    const {wrapper} = queryHarness();
    const {result} = renderHook(() => useListingReviewsController(listing), {wrapper});

    act(() => {
      result.current.setComment("A thoughtful evening.");
      result.current.setReviewerName("Guest");
    });
    await act(async () => result.current.submitReview(submitEvent()));

    expect(result.current.status).toEqual({
      message: organizerPolicyForListing(listing).publicReviewReason,
      tone: "is-error",
    });
    expect(createPublicOrganizerReview).not.toHaveBeenCalled();
  });

  it("shows the reviews the page rendered and reads none of its own", async () => {
    reviewConfig.enabled = true;
    const listing = enabledListing();
    const {wrapper} = queryHarness();
    const {result} = renderHook(() => useListingReviewsController(listing), {wrapper});

    expect(result.current.reviews).toEqual(listing.reviews);
    expect(result.current.status).toEqual({message: "", tone: ""});
  });

  it("validates review identity before creating a mutation", async () => {
    reviewConfig.enabled = true;
    const {wrapper} = queryHarness();
    const {result} = renderHook(() => useListingReviewsController(enabledListing()), {wrapper});

    act(() => result.current.setComment("A thoughtful evening."));
    await act(async () => result.current.submitReview(submitEvent()));

    expect(result.current.status).toEqual({
      message: "Add your name, or choose anonymous.",
      tone: "is-error",
    });
    expect(createPublicOrganizerReview).not.toHaveBeenCalled();
  });

  it("keeps public reviews enabled when only claim submission is disabled", async () => {
    reviewConfig.enabled = true;
    const listing = {
      ...hostListings[0],
      authority: {
        ...hostListings[0].authority,
        claimState: "claimed",
        ownershipState: "claimed",
        publishStatus: "published",
        verificationStatus: "sourceBacked",
      },
      capabilities: {
        claimRequest: {state: "disabled", reason: "Claim target is syncing."},
        publicReviews: {
          targetState: "enabled",
          readState: "enabled",
          writeState: "enabled",
          reason: "",
        },
        supply: {
          mode: "claimed_managed",
          bookable: true,
          paymentsEnabled: true,
          waitlistEnabled: true,
          hostContactEnabled: true,
          claimable: false,
          reviewPolicy: "attended_event_only",
        },
      },
    } as HostListing;
    const {wrapper} = queryHarness();
    const {result} = renderHook(() => useListingReviewsController(listing), {wrapper});

    expect(result.current.publicReviewWriteEnabled).toBe(true);
    expect(result.current.publicReviewReason).toBe("");
    expect(createPublicOrganizerReview).not.toHaveBeenCalled();
  });

  it("fails closed when the review runtime is unavailable", async () => {
    const listing = enabledListing();
    const {wrapper} = queryHarness();
    const {result} = renderHook(() => useListingReviewsController(listing), {wrapper});

    act(() => {
      result.current.setComment("  Warm hosts and clear facilitation.  ");
      result.current.setReviewerName("  Guest  ");
      result.current.setRating(4);
    });
    await act(async () => result.current.submitReview(submitEvent()));

    expect(result.current.status).toEqual({
      message: "Review submission is unavailable in this website build.",
      tone: "is-error",
    });
    expect(createPublicOrganizerReview).not.toHaveBeenCalled();
    expect(result.current.reviews).toEqual(listing.reviews);
    expect(trackMarketingEvent).not.toHaveBeenCalled();
  });

  it("publishes configured reviews and shows them until the page's next read", async () => {
    reviewConfig.enabled = true;
    const listing = enabledListing();
    const remoteReview = {
      id: "review-1",
      reviewerName: "Guest",
      rating: 5,
      comment: "Would attend again.",
      createdAt: "2026-07-13T08:00:00.000Z",
      verificationStatus: "unverified" as const,
      source: "publicListing" as const,
      isAnonymous: false,
      ownerResponse: null,
    };
    createPublicOrganizerReview.mockResolvedValue({
      reviewId: remoteReview.id,
      review: {...remoteReview, moderationStatus: "published"},
    });
    const {wrapper} = queryHarness();
    const {result} = renderHook(() => useListingReviewsController(listing), {wrapper});

    act(() => {
      result.current.setComment("Would attend again.");
      result.current.setReviewerName("Guest");
    });
    await act(async () => result.current.submitReview(submitEvent()));

    expect(createPublicOrganizerReview).toHaveBeenCalledWith(expect.objectContaining({
      organizerId: listing.id,
      comment: "Would attend again.",
      isAnonymous: false,
      rating: 5,
      reviewerName: "Guest",
      submittedFromPath: listing.path,
    }));
    expect(result.current.status).toEqual({
      message: "Review published as an unverified public review.",
      tone: "is-success",
    });
    expect(result.current.reviews[0]).toMatchObject({id: "review-1"});
  });

  it("acknowledges moderation-pending reviews without rendering them", async () => {
    reviewConfig.enabled = true;
    const listing = enabledListing();
    const pendingReview = {
      id: "review-pending",
      reviewerName: "Guest",
      rating: 2,
      comment: "Needs moderation.",
      createdAt: "2026-07-13T08:00:00.000Z",
      verificationStatus: "unverified" as const,
      source: "publicListing" as const,
      isAnonymous: false,
      ownerResponse: null,
    };
    createPublicOrganizerReview.mockResolvedValue({
      reviewId: pendingReview.id,
      review: {...pendingReview, moderationStatus: "pending"},
    });
    const {wrapper} = queryHarness();
    const {result} = renderHook(() => useListingReviewsController(listing), {wrapper});

    act(() => {
      result.current.setComment("Needs moderation.");
      result.current.setReviewerName("Guest");
      result.current.setRating(2);
    });
    await act(async () => result.current.submitReview(submitEvent()));

    expect(result.current.status).toEqual({
      message: "Review submitted for moderation.",
      tone: "is-success",
    });
    expect(result.current.reviews).not.toEqual(expect.arrayContaining([
      expect.objectContaining({id: "review-pending"}),
    ]));
    expect(result.current.summary.displayReviewCount).toBe(
      listing.metrics?.reviewCount ?? listing.reviews.length
    );
  });
});
