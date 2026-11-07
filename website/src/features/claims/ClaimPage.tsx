import {CatchPageBody, CatchPaneLayout, CatchRoot, CatchStack} from "@catch/web-ui";
import {DemoContinuationWorkspace} from "./DemoContinuationWorkspace";
import {PublicSiteHeader, WebsitePageMain} from "../../shared/site";
import {ClaimGuidance, ClaimSiteFooter} from "./sections/ClaimParts";
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
 * review does not block proving it straight away. On the white ground, in the
 * desktop board's reading layout: the flow in the lane, the page card and
 * steps (or, before a page is chosen, the help) beside it.
 */
function PublicClaimPage({routeState}: {routeState: ClaimRouteState}) {
  const controller = useClaimFlowController(routeState);
  const {claimUrlState, listing} = controller;
  const pendingReview = claimUrlState === "pendingClaim";
  const claimable = Boolean(listing) && (!claimUrlState || pendingReview);

  return (
    <CatchRoot theme="day">
      <PublicSiteHeader />
      <WebsitePageMain id="claim">
        <CatchPageBody gutter={false} pb="s0" pt="s4">
          {claimable && listing ? (
            <InstantClaim key={listing.id} listing={listing} onChangeListing={controller.listingFromLink ? undefined : controller.clearListing}
              onStart={controller.markClaimStarted} pendingReview={pendingReview} />
          ) : (
            <CatchPaneLayout
              aside={<ClaimGuidance />}
              main={
                claimUrlState ? (
                  <ClaimUrlStateSection lookup={controller.claimLookup} listing={listing} requestId={controller.activeRequestId} state={claimUrlState} />
                ) : (
                  <CatchStack gap={24}>
                    <ClaimHeroSection listing={null} />
                    {controller.listingFromLink ? null : <ClaimSearchSection controller={controller} />}
                  </CatchStack>
                )
              }
              pattern="reading"
            />
          )}
        </CatchPageBody>
      </WebsitePageMain>
      <ClaimSiteFooter />
    </CatchRoot>
  );
}

function InstantClaim({listing, pendingReview, onStart, onChangeListing}: {
  listing: HostListing; pendingReview: boolean; onStart: () => void; onChangeListing?: () => void;
}) {
  return <InstantClaimPanel controller={useInstantClaimController(listing.id, onStart)} listing={listing}
    onChangeListing={onChangeListing} pendingReview={pendingReview} />;
}
