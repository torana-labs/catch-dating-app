import {organiserDirectoryCopy as copy} from "@content/organiserDirectory";
import {ButtonLink} from "../../shared/ui/primitives";
import {OrganiserDirectory, DirectoryHostInvite} from "../../shared/ui/primitives/organiserDirectory";
import {PublicSiteFooter, PublicSiteHeader, WebsitePageMain} from "../../shared/site";
import {OrganizerResultsSection, OrganizerSearchHeroSection} from "./sections/OrganizerSearchSections";
import type {HostListing} from "./types";
import {useOrganizerDirectoryController} from "./useOrganizerDirectoryController";

export function OrganizerSearchPage({listings}: {listings?: readonly HostListing[]} = {}) {
  const controller = useOrganizerDirectoryController(listings);
  return <OrganiserDirectory>
    <PublicSiteHeader />
    <WebsitePageMain id="top">
      <OrganizerSearchHeroSection controller={controller} />
      <OrganizerResultsSection appearanceContext={controller.appearanceContext} clearFilters={controller.clearFilters} queryTerms={controller.queryTerms} results={controller.results} phase={controller.phase} />
      <DirectoryHostInvite><div><h2>{copy.hostTitle}</h2><p>{copy.hostBody}</p><ButtonLink href="/host/">{copy.hostAction}</ButtonLink></div><div><p>{copy.claimNote}</p><ButtonLink href="/claim/" variant="ghost">{copy.claimAction}</ButtonLink></div></DirectoryHostInvite>
    </WebsitePageMain>
    <PublicSiteFooter />
  </OrganiserDirectory>;
}
