import {websiteCopy} from "@content/generated";
import {organizerListingCopy} from "@content/organizer";
import {useMutation} from "@tanstack/react-query";
import {type FormEvent, useEffect, useMemo, useState} from "react";
import {trackMarketingEvent} from "../../analytics";
import {publicReviewsFirebaseConfigured} from "../../firebaseConfig";
import type {FormStatus} from "../../shared/forms/types";
import {organizerPolicyForListing} from "../organizers/organizerPolicy";
import {listingReviewPresentationFor} from "../organizers/listingPresentation";
import type {HostListing, HostListingReview} from "../organizers/types";
import {buildListingReviewSummary, mergeReviews} from "./reviewModel";

/**
 * The reviews block on an organiser or event page. The reviews themselves
 * are the ones the server rendered from the page read model (and refreshed
 * with the public catalog); a review this visitor just published shows at
 * once until the next read carries it.
 */
export function useListingReviewsController(listing: HostListing) {
  const policy = organizerPolicyForListing(listing);
  const presentation = listingReviewPresentationFor({
    canReadPublicReviews: policy.canReadPublicReviews,
    canWritePublicReview: policy.canWritePublicReview,
    isPubliclyReadable: policy.isPubliclyReadable,
    runtimeAvailable: publicReviewsFirebaseConfigured,
  });
  const seedReviews = useMemo(
    () => policy.canReadPublicReviews ? listing.reviews ?? [] : [],
    [listing, policy.canReadPublicReviews]
  );
  const publicReviewWriteEnabled = presentation.write === "form";
  const publicReviewReason = policy.canWritePublicReview && !publicReviewsFirebaseConfigured ?
    organizerListingCopy.reviews.runtimeUnavailable :
    policy.publicReviewReason;
  const [localReviews, setLocalReviews] = useState<HostListingReview[]>([]);
  const [rating, setRating] = useState(5);
  const [reviewerName, setReviewerName] = useState("");
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [status, setStatus] = useState<FormStatus>({message: "", tone: ""});

  useEffect(() => {
    setLocalReviews([]);
    setStatus({message: "", tone: ""});
  }, [listing.id]);

  const createReviewMutation = useMutation({
    mutationFn: async (payload: {
      comment: string;
      isAnonymous: boolean;
      localReview: HostListingReview;
      rating: number;
      reviewerName: string;
    }) => {
      if (!publicReviewsFirebaseConfigured) {
        throw new Error(organizerListingCopy.reviews.runtimeUnavailable);
      }
      const {createPublicOrganizerReview} = await import("../../firebase");
      const result = await createPublicOrganizerReview({
        organizerId: listing.id,
        rating: payload.rating,
        comment: payload.comment,
        reviewerName: payload.reviewerName,
        isAnonymous: payload.isAnonymous,
        submittedFromPath: listing.path,
      });
      const review = result.review as typeof result.review & {
        moderationStatus?: "published" | "pending";
      };
      return {
        moderationStatus: review.moderationStatus ?? "pending",
        review: organizerReviewForListing(review),
      };
    },
  });

  const reviews = useMemo(() => policy.canReadPublicReviews ?
    mergeReviews(localReviews, seedReviews) : [],
  [localReviews, policy.canReadPublicReviews, seedReviews]);

  const summary = useMemo(
    () => buildListingReviewSummary(listing, reviews),
    [listing, reviews]
  );

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({message: "", tone: ""});

    if (!publicReviewWriteEnabled) {
      setStatus({
        message: publicReviewReason,
        tone: "is-error",
      });
      return;
    }

    const trimmedComment = comment.trim();
    const trimmedName = reviewerName.trim();
    if (!trimmedComment) {
      setStatus({message: websiteCopy["uselistingreviewscontroller_0505"], tone: "is-error"});
      return;
    }
    if (!isAnonymous && !trimmedName) {
      setStatus({
        message: websiteCopy["uselistingreviewscontroller_0502"],
        tone: "is-error",
      });
      return;
    }

    const localReview: HostListingReview = {
      id: `local-${Date.now()}`,
      eventId: null,
      reviewerName: isAnonymous ? "Anonymous reviewer" : trimmedName,
      rating,
      comment: trimmedComment,
      createdAt: new Date().toISOString(),
      verificationStatus: "unverified",
      source: "publicListing",
      isAnonymous,
      ownerResponse: null,
    };

    try {
      const result = await createReviewMutation.mutateAsync({
        comment: trimmedComment,
        isAnonymous,
        localReview,
        rating,
        reviewerName: trimmedName,
      });

      if (result.moderationStatus === "pending") {
        setStatus({
          message: organizerListingCopy.reviews.pendingAcknowledgement,
          tone: "is-success",
        });
        setComment("");
        if (isAnonymous) setReviewerName("");
        trackMarketingEvent("listing_public_review_submitted", {
          club_id: listing.id,
          anonymous: isAnonymous,
          configured: true,
          moderation_status: "pending",
        });
        return;
      }
      // Keep a published review visible until the page's next read carries
      // it; mergeReviews deduplicates it by id then.
      setLocalReviews((current) => mergeReviews([result.review], current));
      setStatus({
        message: websiteCopy["uselistingreviewscontroller_0504"],
        tone: "is-success",
      });
      setComment("");
      if (isAnonymous) setReviewerName("");
      trackMarketingEvent("listing_public_review_submitted", {
        club_id: listing.id,
        anonymous: isAnonymous,
        configured: true,
        moderation_status: result.moderationStatus,
      });
    } catch (error) {
      setStatus({
        message: readableError(error),
        tone: "is-error",
      });
    }
  }

  return {
    comment,
    isAnonymous,
    isSubmitting: createReviewMutation.isPending,
    publicApiEnabled: publicReviewWriteEnabled,
    presentation,
    publicReviewReadEnabled: presentation.read === "content",
    publicReviewReason,
    publicReviewWriteEnabled,
    rating,
    reviewFormId: `review-${listing.id}`,
    reviewerName,
    reviews,
    setComment,
    setIsAnonymous,
    setRating,
    setReviewerName,
    status,
    submitReview,
    summary,
  };
}

function organizerReviewForListing(
  review: Omit<HostListingReview, "eventId">
): HostListingReview {
  return {
    ...review,
    eventId: null,
  };
}

function readableError(error: unknown): string {
  return error instanceof Error ?
    error.message :
    "Something went wrong. Please try again.";
}
