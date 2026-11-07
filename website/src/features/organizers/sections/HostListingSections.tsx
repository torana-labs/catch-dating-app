import {CatchPageBody, CatchPaneLayout, CatchStack, useCatch} from "@catch/web-ui";
import type {OrganizerPageController} from "../useOrganizerPageController";
import {OrganizerAboutSection, OrganizerClaimSection, OrganizerPageFooter} from "./organizerPage/OrganizerAboutSections";
import {OrganizerEventsSection, OrganizerMomentsSection} from "./organizerPage/OrganizerEventsSections";
import {OrganizerCover, OrganizerIdentitySection} from "./organizerPage/OrganizerIdentitySection";
import {OrganizerLinksSection, OrganizerNextUpSection} from "./organizerPage/OrganizerRailSections";
import {OrganizerReviewsSection} from "./organizerPage/OrganizerReviewsSection";
import {PublicPageFooter} from "./PublicPageChrome";

/**
 * The organiser page as the RbWebOrgV2 board lays it out: the profile (the
 * cover, who they are, follow and share, the next event and the links) and
 * the main column (the claim pitch on a generated page, Coming up, What it's
 * like, Reviews, About, "Made with Catch" and the footer). A phone stacks
 * them in that order; a wider window puts the profile in the list pane
 * beside the rest, as the board's list-detail pane layout does.
 */
export function HostListingSections({controller}: {controller: OrganizerPageController}) {
  const {sizeClass} = useCatch();
  const profile = (
    <CatchStack aria-label={controller.view.name} as="aside" gap={20}>
      <OrganizerCover controller={controller} />
      <OrganizerIdentitySection controller={controller} />
      <OrganizerNextUpSection controller={controller} />
      <OrganizerLinksSection controller={controller} />
    </CatchStack>
  );
  const main = (
    <CatchStack gap={40}>
      <OrganizerClaimSection controller={controller} />
      <OrganizerEventsSection controller={controller} />
      <OrganizerMomentsSection controller={controller} />
      <OrganizerReviewsSection controller={controller} />
      <OrganizerAboutSection controller={controller} />
      <OrganizerPageFooter controller={controller} />
      <PublicPageFooter />
    </CatchStack>
  );
  if (sizeClass === "compact") {
    return <CatchPageBody gutter><CatchStack gap="section">{profile}{main}</CatchStack></CatchPageBody>;
  }
  return <CatchPaneLayout detail={main} main={profile} pattern="list-detail" />;
}
