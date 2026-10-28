import {CatchBand, CatchGap, CatchSplit} from "@catch/web-ui";
import type {OrganizerPageController} from "../useOrganizerPageController";
import {OrganizerAboutSection, OrganizerClaimSection, OrganizerPageFooter} from "./organizerPage/OrganizerAboutSections";
import {OrganizerEventsSection, OrganizerMomentsSection} from "./organizerPage/OrganizerEventsSections";
import {OrganizerIdentitySection} from "./organizerPage/OrganizerIdentitySection";
import {OrganizerLinksSection, OrganizerNextUpSection} from "./organizerPage/OrganizerRailSections";
import {OrganizerReviewsSection} from "./organizerPage/OrganizerReviewsSection";

/**
 * The organiser page as a link-in-bio page. The rail holds what the first
 * phone screen must show: who they are, follow and share, the next event and
 * the links. The main column follows with the claim pitch on a generated page,
 * the calendar, past moments, reviews and about.
 */
export function HostListingSections({controller}: {controller: OrganizerPageController}) {
  return (
    <CatchBand pb="regular" pt="compact">
      <CatchSplit
        end={(
          <CatchGap size="majorSection">
            <OrganizerClaimSection controller={controller} />
            <OrganizerEventsSection controller={controller} />
            <OrganizerMomentsSection controller={controller} />
            <OrganizerReviewsSection controller={controller} />
            <OrganizerAboutSection controller={controller} />
            <OrganizerPageFooter controller={controller} />
          </CatchGap>
        )}
        gap="regular"
        ratio="wideRail"
        start={(
          <CatchGap as="aside" aria-label={controller.view.name} size="related">
            <OrganizerIdentitySection controller={controller} />
            <OrganizerNextUpSection controller={controller} />
            <OrganizerLinksSection controller={controller} />
          </CatchGap>
        )}
      />
    </CatchBand>
  );
}
