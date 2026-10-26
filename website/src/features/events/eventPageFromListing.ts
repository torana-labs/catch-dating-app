import {organizerPolicyForListing} from "../organizers/organizerPolicy";
import type {HostListing} from "../organizers/types";
import {buildListingReviewSummary} from "../reviews/reviewModel";
import type {EventPageData} from "./eventPageModel";

type CatchItem = Extract<EventPageData["item"], {source: "catch"}>;

/**
 * The event page for an event without an eventPublicPage read model,
 * arranged from its organizer listing as functions/src/publicPages/
 * pageModel.ts arranges the read model. Two readers need it: the Next server
 * until every environment is backfilled (assembleEventDetailFromSources;
 * functions/scripts/backfill-public-pages.cjs --check), and the static Vite
 * rollback build, which has only listings. Neither knows the organizer's
 * other events, so "More from" stays empty.
 */
export function eventPageFromListing(listing: HostListing, eventId: string): EventPageData | null {
  const catchEvent = listing.catchEvents?.find((event) => event.id === eventId);
  const external = listing.externalEvents?.find((event) => event.id === eventId);
  const path = `/events/${encodeURIComponent(eventId)}/`;
  let item: EventPageData["item"];
  if (catchEvent) {
    // Catch is not a dating product (CAT-247): drop the same framing the read model drops.
    const {admissionLabels, catchExperienceActivities, scorecard: _scorecard, ...rest} = catchEvent;
    const labels = (admissionLabels ?? []).filter((label) => label !== "balanced");
    const experience = (catchExperienceActivities ?? []).filter((activity) => activity !== "rotations");
    const mixer = rest.activityKind === "singlesMixer";
    const event: CatchItem["event"] = {
      ...rest,
      ...(mixer ? {activityKind: "openActivity", ...(rest.title === "Singles mixer" ? {title: "Hosted event"} : {})} : {}),
      ...(labels.length ? {admissionLabels: labels} : {}),
      ...(experience.length ? {catchExperienceActivities: experience} : {}),
    };
    item = {source: "catch", eventId, path, event, booking: {kind: "catch", path,
      registrationAccess: event.registrationAccess ?? "app", spotsLeft: Math.max(0, event.capacityLimit - event.bookedCount)}};
  } else if (external) {
    const event = external.activityKind === "singlesMixer" ? {...external, activityKind: "openActivity"} : external;
    item = {source: "external", eventId, path, event,
      booking: {kind: "external", url: event.sourceHref, label: event.sourceLabel}};
  } else {
    return null;
  }
  const policy = organizerPolicyForListing(listing);
  const reviews = policy.canReadPublicReviews ? listing.reviews : [];
  const summary = buildListingReviewSummary(listing, reviews);
  const spotsLeft = item.source === "catch" ? item.booking.spotsLeft : null;
  return {
    schemaVersion: 1,
    eventId,
    organizerId: listing.id,
    path,
    item,
    capacity: item.source === "catch" ? {
      state: spotsLeft ? "open" : "full",
      capacityLimit: item.event.capacityLimit,
      bookedCount: item.event.bookedCount,
      waitlistedCount: item.event.waitlistedCount,
      spotsLeft,
      waitlistAvailable: item.event.waitlistAvailable === true,
    } : {state: "external", capacityLimit: null, bookedCount: null, waitlistedCount: null, spotsLeft: null,
      waitlistAvailable: false},
    organizer: {
      organizerId: listing.id,
      name: listing.name,
      path: listing.path,
      category: listing.category,
      city: listing.city,
      logo: listing.logo,
      verified: policy.trustState === "firstParty" || policy.trustState === "ownerVerified",
      followerCount: listing.metrics?.followerCount ?? 0,
      rating: summary.verifiedCount > 0 && summary.displayRating > 0 ? summary.displayRating : null,
      reviewCount: reviews.length,
      verifiedReviewCount: summary.verifiedCount,
      upcomingEventCount: 0,
    },
    reviews: [...reviews].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 2),
    moreEvents: [],
  };
}
