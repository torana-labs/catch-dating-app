import {claimGuidance} from "@content/claimGuidance";
import {HostPreviewFaqList, HostPreviewSection, HostPreviewSectionHead, ButtonLink, ActionGroup} from "../../shared/ui/primitives";
import {DemoContinuationWorkspace} from "./DemoContinuationWorkspace";
import {PublicSiteFooter, PublicSiteHeader} from "../../shared/site";
import {ClaimFlowMain} from "../../shared/ui/primitives";
import {
  ClaimHeroSection,
  ClaimSearchSection,
  ClaimUrlStateSection,
} from "./sections/ClaimPageSections";
import {InstantClaimPanel} from "./sections/InstantClaimSection";
import type {HostListing} from "../organizers/types";
import {useInstantClaimController} from "./useInstantClaimController";
import type {ClaimRouteState} from "./claimRouting";
import {useClaimFlowController} from "./useClaimFlowController";

export function ClaimPage({routeState}: {routeState: ClaimRouteState}) {
  if (routeState.continuationId) return <DemoContinuationWorkspace key={routeState.continuationId} continuationId={routeState.continuationId} />;
  return <PublicClaimPage routeState={routeState} />;
}
/**
 * One way through: find the page (unless the link already named it), sign in
 * with a phone, then prove it with a code or ask for a review. A pending
 * review does not block proving it straight away.
 */
function PublicClaimPage({routeState}: {routeState: ClaimRouteState}) {
  const controller = useClaimFlowController(routeState);
  const {claimUrlState, listing} = controller;
  const pendingReview = claimUrlState === "pendingClaim";
  const claimable = Boolean(listing) && (!claimUrlState || pendingReview);

  return (
    <>
      <PublicSiteHeader />

      <ClaimFlowMain>
        <ClaimHeroSection listing={listing} />

        {claimUrlState && !claimable ? (
          <ClaimUrlStateSection
            state={claimUrlState}
            listing={listing}
            lookup={controller.claimLookup}
            requestId={controller.activeRequestId}
          />
        ) : null}
        {!claimUrlState && !controller.listingFromLink ? <ClaimSearchSection controller={controller} /> : null}
        {claimable && listing ? <InstantClaim key={listing.id} listing={listing} pendingReview={pendingReview}
          onStart={controller.markClaimStarted} /> : null}
        <HostPreviewSection variant="faq">
          <HostPreviewSectionHead titleId="claim-guidance-title" title={claimGuidance.title} body={claimGuidance.body} />
          <HostPreviewFaqList items={[...claimGuidance.items]} />
          <ActionGroup><ButtonLink href="/help/" variant="ghost">{claimGuidance.help}</ButtonLink><ButtonLink href="/host/apply/" variant="ghost">{claimGuidance.pilot}</ButtonLink></ActionGroup>
        </HostPreviewSection>
      </ClaimFlowMain>

      <PublicSiteFooter />
    </>
  );
}

function InstantClaim({listing, pendingReview, onStart}: {
  listing: HostListing; pendingReview: boolean; onStart: () => void;
}) {
  return <InstantClaimPanel controller={useInstantClaimController(listing.id, onStart)} listing={listing}
    pendingReview={pendingReview} />;
}
