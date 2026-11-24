import {CatchRoot} from "@catch/web-ui";
import {useMemo} from "react";
import {PublicSiteFooter, PublicSiteHeader, WebsitePageMain} from "../../shared/site";
import {organizerPageFromListing, type OrganizerPageRecord} from "./organizerPage";
import {OwnerSignInPrompt, OwnerView} from "./owner/OwnerView";
import {ownerViewBackends, type OwnerViewBackends} from "./owner/ownerViewBackends";
import {useOwnerViewController} from "./owner/useOwnerViewController";
import type {OwnerReview} from "./owner/ownerViewTypes";
import {HostListingSections} from "./sections/HostListingSections";
import type {HostListing} from "./types";
import {organizerPageBackends, useOrganizerPageController, type OrganizerPageBackends} from "./useOrganizerPageController";

/**
 * /organizers/<slug>/ on the white ground, as the WebOrgV2 board in the
 * owner-approved hero layout (17 Nov 2026), between the site header and
 * footer (owner decision, 14 Nov 2026). It renders the organizer's
 * `organizerPublicPage` read model when the route read one, and otherwise the
 * same record built from the listing (the static build). The women-led label comes from the read model's
 * `womenLed`; the listing has no such field, so its record never shows it.
 */
export function HostListingPage({backends = organizerPageBackends, listing, ownerBackends = ownerViewBackends, ownerUid, page,
  readAt}: {
  backends?: OrganizerPageBackends;
  listing: HostListing;
  /** The owner view's reads and writes (#1109); stories pass fakes. */
  ownerBackends?: OwnerViewBackends;
  /** Stories start the owner view signed in (a uid) or out (null). */
  ownerUid?: string | null;
  page?: OrganizerPageRecord | null;
  readAt?: number;
}) {
  const at = useMemo(() => readAt ?? Date.now(), [readAt]);
  const record = useMemo(() => page?.organizerId === listing.id ? page : organizerPageFromListing(listing, at),
    [at, listing, page]);
  const controller = useOrganizerPageController({backends, listing, page: record, readAt: at});
  const ownerReviews = useMemo(() => record.latestReviews.map(ownerReview), [record]);
  const owner = useOwnerViewController({backends: ownerBackends, claimed: controller.view.kind === "claimed",
    initialUid: ownerUid, organizerId: listing.id, replyName: controller.view.name ?? listing.name, reviews: ownerReviews});

  return (
    <CatchRoot theme="day">
      <PublicSiteHeader />
      <WebsitePageMain id="profile">
        <HostListingSections
          controller={controller}
          owner={owner.hidden || !owner.data ? undefined : <OwnerView controller={owner} displayUrl={controller.share.displayUrl} events={controller.view.events.rows}
            name={controller.view.name} readAt={at} />}
          ownerFooter={owner.signedOut ? <OwnerSignInPrompt controller={owner} /> : undefined}
        />
      </WebsitePageMain>
      <PublicSiteFooter />
    </CatchRoot>
  );
}

/** A published review as the owner view lists it to reply to. */
function ownerReview(review: OrganizerPageRecord["latestReviews"][number], index: number): OwnerReview {
  return {id: review.id ?? `review-${index}`, reviewerName: review.reviewerName, rating: review.rating, comment: review.comment,
    createdAt: review.createdAt, verificationStatus: review.verificationStatus,
    ownerResponse: review.ownerResponse ? {message: review.ownerResponse.message, hostName: review.ownerResponse.hostName} : null};
}
