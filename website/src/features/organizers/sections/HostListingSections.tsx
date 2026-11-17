import {CatchBand, CatchStack} from "@catch/web-ui";
import type {ReactNode} from "react";
import type {OrganizerPageController} from "../useOrganizerPageController";
import {OrganizerAboutSection, OrganizerClaimSection, OrganizerPageFooter} from "./organizerPage/OrganizerAboutSections";
import {OrganizerEventsSection, OrganizerMomentsSection} from "./organizerPage/OrganizerEventsSections";
import {OrganizerFollowPanels, OrganizerIdentitySection} from "./organizerPage/OrganizerIdentitySection";
import {OrganizerLinksSection, OrganizerNextUpSection, OrganizerSocialsSection} from "./organizerPage/OrganizerRailSections";
import {OrganizerReviewsSection} from "./organizerPage/OrganizerReviewsSection";

/**
 * The organiser page in the owner-approved hero layout (17 Nov 2026), drawn
 * from the WebOrgV2 board. The hero runs across the content width: the cover
 * with the logo over its foot, then who they are on the left and Follow and
 * Share on the right. Under it, the board's two columns: the rail holds the
 * follow and share panels when open, the next event, the links and the social
 * profiles; the main column holds the claim pitch on a generated page, Coming
 * up, What it's like, Reviews, About and "Made with Catch". A phone stacks it
 * all in that order. The owner view (#1109) adds its bar above the page and
 * its sign-in line at the end, for a claimed page only.
 */
export function HostListingSections({controller, owner, ownerFooter}: {
  controller: OrganizerPageController;
  owner?: ReactNode;
  ownerFooter?: ReactNode;
}) {
  return (
    <CatchStack gap={0}>
      {owner ? <CatchBand as="div" pb="none" pt="compact" width="content">{owner}</CatchBand> : null}
      <CatchBand as="div" pb="none" pt="compact" width="content">
        <OrganizerIdentitySection controller={controller} />
      </CatchBand>
      <CatchBand as="div" pb="regular" pt="compact" width="content">
        <CatchStack collapseBelow="expanded" direction="row" gap={48} railSide="start" railWidth="wide">
          <CatchStack aria-label={controller.view.name} as="aside" gap={12}>
            <OrganizerFollowPanels controller={controller} />
            <OrganizerNextUpSection controller={controller} />
            <OrganizerLinksSection controller={controller} />
            <OrganizerSocialsSection controller={controller} />
          </CatchStack>
          <CatchStack gap={48}>
            <OrganizerClaimSection controller={controller} />
            <OrganizerEventsSection controller={controller} />
            <OrganizerMomentsSection controller={controller} />
            <OrganizerReviewsSection controller={controller} />
            <OrganizerAboutSection controller={controller} />
            <CatchStack gap={24}>
              <OrganizerPageFooter controller={controller} />
              {ownerFooter}
            </CatchStack>
          </CatchStack>
        </CatchStack>
      </CatchBand>
    </CatchStack>
  );
}
