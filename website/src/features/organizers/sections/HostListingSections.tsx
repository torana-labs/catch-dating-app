import {CatchBand, CatchStack} from "@catch/web-ui";
import type {ReactNode} from "react";
import type {OrganizerPageController} from "../useOrganizerPageController";
import {OrganizerAboutSection, OrganizerClaimSection, OrganizerPageFooter} from "./organizerPage/OrganizerAboutSections";
import {OrganizerEventsSection, OrganizerMomentsSection} from "./organizerPage/OrganizerEventsSections";
import {OrganizerIdentitySection} from "./organizerPage/OrganizerIdentitySection";
import {OrganizerLinksSection, OrganizerNextUpSection} from "./organizerPage/OrganizerRailSections";
import {OrganizerReviewsSection} from "./organizerPage/OrganizerReviewsSection";

/**
 * The organiser page as the WebOrgV2 board orders it, drawn in the
 * playbook's panels language. It opens with the profile band: who they are,
 * follow and share in the organiser rail, beside the next event and the
 * links, which together fill the first phone screen. Then one band each: the
 * claim pitch on a generated page, Coming up as a card grid, What it's like,
 * Reviews, About, and "Made with Catch". A phone stacks it all in that order.
 * The owner view (#1109) adds its bar above the page and its sign-in line at
 * the end, for a claimed page only.
 */
export function HostListingSections({controller, owner, ownerFooter}: {
  controller: OrganizerPageController;
  owner?: ReactNode;
  ownerFooter?: ReactNode;
}) {
  return (
    <CatchStack gap={0}>
      {owner ? <CatchBand as="div" pb="none" pt="compact" width="content">{owner}</CatchBand> : null}
      <CatchBand as="div" pb="compact" pt="compact" width="content">
        <CatchStack collapseBelow="expanded" direction="row" gap={48} railSide="start" railWidth="wide">
          <CatchStack aria-label={controller.view.name} as="aside" gap={20}>
            <OrganizerIdentitySection controller={controller} />
          </CatchStack>
          <CatchStack gap={20}>
            <OrganizerNextUpSection controller={controller} />
            <OrganizerLinksSection controller={controller} />
          </CatchStack>
        </CatchStack>
      </CatchBand>
      <OrganizerClaimSection controller={controller} />
      <OrganizerEventsSection controller={controller} />
      <OrganizerMomentsSection controller={controller} />
      <OrganizerReviewsSection controller={controller} />
      <OrganizerAboutSection controller={controller} />
      <CatchBand as="div" pb="regular" pt="compact" width="content">
        <CatchStack gap={24}>
          <OrganizerPageFooter controller={controller} />
          {ownerFooter}
        </CatchStack>
      </CatchBand>
    </CatchStack>
  );
}
