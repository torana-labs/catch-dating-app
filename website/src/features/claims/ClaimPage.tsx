import {claimGuidance} from "@content/claimGuidance";
import {HostPreviewFaqList, HostPreviewSection, HostPreviewSectionHead, ButtonLink, ActionGroup} from "../../shared/ui/primitives";
import {DemoContinuationWorkspace} from "./DemoContinuationWorkspace";
import {PublicSiteFooter, PublicSiteHeader} from "../../shared/site";
import {ClaimFlowMain} from "../../shared/ui/primitives";
import {
  ClaimHeroSection,
  ClaimUrlStateSection,
  ClaimWorkspaceSection,
} from "./sections/ClaimPageSections";
import type {ClaimRouteState} from "./claimRouting";
import {useClaimFlowController} from "./useClaimFlowController";

export function ClaimPage({routeState}: {routeState: ClaimRouteState}) {
  if (routeState.continuationId) return <DemoContinuationWorkspace key={routeState.continuationId} continuationId={routeState.continuationId} />;
  return <PublicClaimPage routeState={routeState} />;
}
function PublicClaimPage({routeState}: {routeState: ClaimRouteState}) {
  const controller = useClaimFlowController(routeState);
  const {claimUrlState} = controller;

  return (
    <>
      <PublicSiteHeader />

      <ClaimFlowMain>
        <ClaimHeroSection listing={controller.listing} />

        {claimUrlState ? (
          <ClaimUrlStateSection
            state={claimUrlState}
            listing={controller.listing}
            lookup={controller.claimLookup}
            requestId={controller.activeRequestId}
          />
        ) : (
          <ClaimWorkspaceSection controller={controller} />
        )}
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
