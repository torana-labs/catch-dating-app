import fs from "node:fs";
import path from "node:path";
import {createElement, Fragment} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it} from "vitest";
import {eventDetailCopy} from "../../content/events";
import {interpolateContent} from "../../content/interpolate";
import {
  buildPublicEventDetailRecords,
  getEventDetailForPath,
} from "../events/eventDetailModel";
import {eventPageFromListing} from "../events/eventPageFromListing";
import {buildEventPageView} from "../events/eventPageModel";
import {EventBookingCard, EventPageMain} from "../events/sections/EventPageSections";
import {hostListings} from "./data";
import {
  listingClaimPresentationFor,
  listingReviewPresentationFor,
} from "./listingPresentation";
import {organizerPolicyForListing} from "./organizerPolicy";
import {claimHrefForListing} from "./routing";
import type {HostListing} from "./types";

type MatrixExpectation = {
  disposition: string;
  target?: string;
  variant?: string;
};
type MatrixConfiguration = {
  expectations: Record<string, MatrixExpectation>;
  id: string;
  values: Record<string, string>;
};
type MatrixSurface = {
  configurations: MatrixConfiguration[];
  id: string;
  platform: "app" | "web";
};

const matrix = JSON.parse(fs.readFileSync(path.resolve(
  process.cwd(),
  "../design/public_surface_behavior.json"
), "utf8")) as {
  proofHarnesses: Array<{configurationIds: string[]; id: string}>;
  surfaces: MatrixSurface[];
};
const webSurfaces = matrix.surfaces.filter((surface) => surface.platform === "web");
const configurations = webSurfaces.flatMap((surface) =>
  surface.configurations.map((configuration) => ({configuration, surfaceId: surface.id}))
);

describe("public surface behavior contract", () => {
  it("enumerates every registered website row", () => {
    const registered = matrix.proofHarnesses.find(
      (harness) => harness.id === "web.publicSurfaceBehavior"
    )?.configurationIds;
    expect(new Set(configurations.map(({configuration}) => configuration.id)))
      .toEqual(new Set(registered));
    expect(configurations).toHaveLength(registered?.length ?? 0);
  });

  for (const {configuration, surfaceId} of configurations) {
    it(configuration.id, () => {
      const listing = listingFor(configuration.values);
      const policy = organizerPolicyForListing(listing);
      verifyAuthorityBadge(configuration, policy.trustState);
      switch (surfaceId) {
      case "web.homeOrganizerDiscovery":
      case "web.organizerSearch":
        verifyDiscovery(configuration, policy.isPubliclyReadable);
        break;
      case "web.organizerListing":
        verifyListing(configuration, listing, policy);
        break;
      case "web.eventDetail":
        verifyEventDetail(configuration, listing, policy);
        break;
      case "web.claim":
        verifyClaim(configuration, policy);
        break;
      default:
        throw new Error(`Unowned website behavior surface ${surfaceId}.`);
      }
    });
  }
});

function listingFor(values: Record<string, string>): HostListing {
  const base = hostListings[0];
  const managed = ["userCreated", "claimed", "transferred"].includes(
    values["organizer.ownershipState"] ?? "programmatic"
  ) || ["claimed", "verified"].includes(
    values["organizer.claimState"] ?? "unclaimed"
  );
  return {
    ...base,
    authority: {
      ...base.authority,
      appVisibility: values["organizer.appVisibility"] ?? "discoverable",
      claimState: values["organizer.claimState"] ?? "unclaimed",
      ownershipState: values["organizer.ownershipState"] ?? "programmatic",
      publishStatus: values["organizer.publishStatus"] ?? "published",
      verificationStatus: values["organizer.verificationStatus"] ?? "unverified",
    },
    capabilities: {
      claimRequest: {
        state: values["website.claimRequestCapability"] ?? "disabled",
        reason: "Matrix claim capability is unavailable.",
      },
      publicReviews: {
        targetState: values["website.publicReviewTargetCapability"] ?? "disabled",
        readState: values["website.publicReviewReadCapability"] ?? "disabled",
        writeState: values["website.publicReviewWriteCapability"] ?? "disabled",
        reason: "Matrix review capability is unavailable.",
      },
      supply: managed ? {
        mode: "claimed_managed",
        bookable: true,
        paymentsEnabled: true,
        waitlistEnabled: true,
        hostContactEnabled: true,
        claimable: false,
        reviewPolicy: "attended_event_only",
      } : {
        mode: "unclaimed_read_only",
        bookable: false,
        paymentsEnabled: false,
        waitlistEnabled: false,
        hostContactEnabled: false,
        claimable: true,
        reviewPolicy: "after_event_end",
      },
    },
  } as HostListing;
}

function verifyAuthorityBadge(
  configuration: MatrixConfiguration,
  trustState: ReturnType<typeof organizerPolicyForListing>["trustState"]
) {
  const expected = configuration.expectations["organizer.provenanceBadge"];
  if (!expected?.variant) return;
  const variant = {
    crawledUnclaimed: "crawled-unclaimed",
    sourceBacked: "crawled-source-backed",
    claimPending: "claim-pending",
    claimedUnverified: "claimed-source-backed",
    firstParty: "first-party",
    ownerVerified: "claimed-verified",
    suppressed: "suppressed",
    unknown: "unknown",
  }[trustState];
  expect(variant).toBe(expected.variant);
}

function verifyDiscovery(
  configuration: MatrixConfiguration,
  isPubliclyReadable: boolean
) {
  const contentKey = configuration.expectations["organizer.card"] ?
    "organizer.card" : "organizer.result";
  expect(configuration.expectations[contentKey].disposition)
    .toBe(isPubliclyReadable ? "visibleReadOnly" : "hidden");
  expect(configuration.expectations["organizer.openDetail"].disposition)
    .toBe(isPubliclyReadable ? "visibleWeb" : "hidden");
}

function verifyListing(
  configuration: MatrixConfiguration,
  listing: HostListing,
  policy: ReturnType<typeof organizerPolicyForListing>
) {
  const {expectations, values} = configuration;
  const readable = policy.isPubliclyReadable;
  const claimRuntime = values["website.claimRuntimeAvailability"] === "available";
  const reviewRuntime = values["website.reviewRuntimeAvailability"] === "available";
  const claimPresentation = listingClaimPresentationFor({
    canRequestClaim: policy.canRequestClaim,
    isPubliclyReadable: readable,
    runtimeAvailable: claimRuntime,
  });
  const reviewPresentation = listingReviewPresentationFor({
    canReadPublicReviews: policy.canReadPublicReviews,
    canWritePublicReview: policy.canWritePublicReview,
    isPubliclyReadable: readable,
    runtimeAvailable: reviewRuntime,
  });
  expect(expectations["route.access"].disposition)
    .toBe(readable ? "visibleWeb" : "hidden");
  expect(expectations["organizer.claim"].disposition)
    .toBe(claimPresentation.panel === "hidden" ? "hidden" : "visibleWeb");
  if (claimPresentation.panel !== "hidden") {
    expect(expectations["organizer.claim"].target).toBe("/claim/?listing=:id");
    expect(claimHrefForListing(listing))
      .toBe(`/claim/?listing=${encodeURIComponent(listing.id)}`);
  }
  expect(expectations["claim.submit"].disposition).toBe(
    claimPresentation.panel === "form" ? "visibleWeb" : "hidden"
  );
  expect(expectations["claim.fallback"].disposition).toBe(
    claimPresentation.panel === "runtimeFallback" ? "visibleWeb" : "hidden"
  );
  expect(expectations["review.read"].disposition).toBe({
    content: "visibleReadOnly",
    hidden: "hidden",
    unavailable: "visibleDisabled",
  }[reviewPresentation.read]);
  expect(expectations["review.write"].disposition).toBe({
    form: "visibleWeb",
    hidden: "hidden",
    unavailable: "visibleDisabled",
  }[reviewPresentation.write]);
  const catchSupply = readable && values["event.supply"] === "catchNative";
  const externalSupply = readable && values["event.supply"] === "external";
  expect(expectations["event.catchAction"].disposition)
    .toBe(catchSupply ? "visibleExternal" : "hidden");
  expect(expectations["event.externalAction"].disposition)
    .toBe(externalSupply ? "visibleExternal" : "hidden");
  expect(expectations["organizer.save"].disposition)
    .toBe(readable ? "visibleWeb" : "hidden");
  expect(expectations["organizer.share"].disposition)
    .toBe(readable ? "visibleWeb" : "hidden");
}

function verifyClaim(
  configuration: MatrixConfiguration,
  policy: ReturnType<typeof organizerPolicyForListing>
) {
  const {expectations, values} = configuration;
  const session = values["viewer.session"];
  const runtimeAvailable = values["website.claimRuntimeAvailability"] === "available";
  const selectedListingAvailable = policy.isPubliclyReadable;
  const canRequest = selectedListingAvailable && policy.canRequestClaim;
  const claimState = values["organizer.claimState"];
  const alreadyOwned = ["claimed", "verified"].includes(claimState) ||
    values["organizer.ownershipState"] === "userCreated";

  const expected = !selectedListingAvailable ? {
    signIn: "hidden", form: "hidden", submit: "hidden", status: "visibleReadOnly",
  } : claimState === "claimPending" || alreadyOwned || !canRequest ? {
    signIn: "hidden", form: "hidden", submit: "hidden", status: "visibleReadOnly",
  } : !runtimeAvailable ? {
    signIn: "visibleDisabled", form: "visibleReadOnly", submit: "visibleDisabled", status: "visibleReadOnly",
  } : session === "resolving" ? {
    signIn: "visibleDisabled", form: "visibleReadOnly", submit: "visibleDisabled", status: "hidden",
  } : session === "guest" ? {
    signIn: "visibleWeb", form: "visibleReadOnly", submit: "visibleSignInGate", status: "hidden",
  } : {
    signIn: "hidden", form: "visibleReadOnly", submit: "visibleWeb", status: "hidden",
  };

  expect(expectations["claim.signIn"].disposition).toBe(expected.signIn);
  expect(expectations["claim.form"].disposition).toBe(expected.form);
  expect(expectations["claim.submit"].disposition).toBe(expected.submit);
  expect(expectations["claim.status"].disposition).toBe(expected.status);
}

function verifyEventDetail(
  configuration: MatrixConfiguration,
  listing: HostListing,
  policy: ReturnType<typeof organizerPolicyForListing>
) {
  const {expectations, values} = configuration;
  const supply = values["event.supply"];
  const eventId = `matrix-${supply}`;
  const eventListing = {
    ...listing,
    reviews: [{
      id: "matrix-event-review", eventId: "previous-event", reviewerName: "Matrix attendee",
      rating: 5, comment: "A welcoming event.", createdAt: "2026-07-20T10:00:00.000Z",
      verificationStatus: "verified", source: "catchEvent", isAnonymous: false,
      ownerResponse: null,
    }],
    catchEvents: supply === "catchNative" ? [{
      id: eventId,
      role: "hostEventSetup",
      title: eventDetailCopy.hero.catchActionHeading,
      activityKind: "dinner",
      timeline: "upcoming",
      startTime: "2099-01-01T10:00:00.000Z",
      endTime: "2099-01-01T12:00:00.000Z",
      timezone: "Asia/Kolkata",
      date: "Jan 1, 2099, 3:30 PM-5:30 PM",
      location: "Mumbai",
      summary: "Matrix event detail fixture.",
      capacityLimit: 20,
      bookedCount: 10,
      checkedInCount: 0,
      waitlistedCount: 0,
      priceLabel: "₹1,500",
      scorecard: null,
    }] : [],
    externalEvents: supply === "external" ? [{
      id: eventId,
      title: interpolateContent(eventDetailCopy.hero.externalActionHeading, {source: "Luma"}),
      activityKind: "socialRun",
      availability: "read_only_external",
      startTime: "2099-01-01T10:00:00.000Z",
      endTime: "2099-01-01T12:00:00.000Z",
      timezone: "Asia/Kolkata",
      date: "Jan 1, 2099, 3:30 PM-5:30 PM",
      location: "Indore",
      summary: "Matrix external event detail fixture.",
      priceLabel: "Free RSVP",
      sourceLabel: "Luma",
      sourceHref: "https://luma.com/matrix-event",
      externalLinkCount: 1,
      dedupeKey: "matrix-external-event",
    }] : [],
  } as HostListing;
  const records = buildPublicEventDetailRecords(
    [eventListing],
    Date.parse("2026-07-24T00:00:00.000Z")
  );
  const event = getEventDetailForPath(`/events/${eventId}/`, records);
  const readable = policy.isPubliclyReadable;

  expect(expectations["route.access"].disposition)
    .toBe(readable ? "visibleWeb" : "hidden");
  expect(Boolean(event)).toBe(readable);
  expect(expectations["event.details"].disposition)
    .toBe(readable ? "visibleReadOnly" : "hidden");
  expect(expectations["event.webGuestJourney"].disposition)
    .toBe(readable && supply === "catchNative" ? "visibleWeb" : "hidden");
  expect(expectations["event.officialSource"].disposition)
    .toBe(readable && supply === "external" ? "visibleExternal" : "hidden");
  expect(expectations["organizer.openDetail"].disposition)
    .toBe(readable ? "visibleWeb" : "hidden");
  expect(expectations["review.read"].disposition).toBe(
    event && policy.canReadPublicReviews && event.listing.reviews.length
      ? "visibleReadOnly" : "hidden"
  );

  // Exercise the same rendered sections as the page, so stale policy-only
  // expectations cannot keep an obsolete booking or claim action green.
  const page = event ? eventPageFromListing(event.listing, event.eventId) : null;
  const view = page ? buildEventPageView(page) : null;
  const root = document.createElement("div");
  root.innerHTML = view ? renderToStaticMarkup(createElement(Fragment, null,
    createElement(EventPageMain, {view}),
    createElement(EventBookingCard, {view, catchEntry: createElement("span", {"data-guest-entry": ""}),
      externalAction: (button) => button, onExternalClick: () => undefined}),
  )) : "";
  expect(Boolean(root.querySelector("[data-guest-entry]")))
    .toBe(expectations["event.webGuestJourney"].disposition === "visibleWeb");
  expect(Boolean(root.querySelector('a[href="https://luma.com/matrix-event"]')))
    .toBe(expectations["event.officialSource"].disposition === "visibleExternal");
  expect(Boolean(root.querySelector(`a[href="${event?.listing.path}"]`)))
    .toBe(expectations["organizer.openDetail"].disposition === "visibleWeb");
  expect(root.querySelector('a[href^="/claim/"]')).toBeNull();
  expect(Boolean(root.querySelector("#event-reviews")))
    .toBe(expectations["review.read"].disposition === "visibleReadOnly");
  if (page) {
    expect(renderToStaticMarkup(createElement(EventPageMain, {view: buildEventPageView({...page, reviews: []})})))
      .not.toContain('id="event-reviews"');
  }
}
