import {CatchRoot} from "@catch/web-ui";
import {useMemo} from "react";
import {WebsitePageMain} from "../../shared/site";
import {organizerPageFromListing, type OrganizerPageRecord} from "./organizerPage";
import {HostListingSections} from "./sections/HostListingSections";
import {PublicPageHeader} from "./sections/PublicPageChrome";
import type {HostListing} from "./types";
import {organizerPageBackends, useOrganizerPageController, type OrganizerPageBackends} from "./useOrganizerPageController";

/**
 * /organizers/<slug>/ on the white ground, as the RbWebOrgV2 board. It
 * renders the organizer's `organizerPublicPage` read model when the route
 * read one, and otherwise the same record built from the listing (pages
 * assembled from their sources, and the static build).
 */
export function HostListingPage({backends = organizerPageBackends, listing, page, readAt}: {
  backends?: OrganizerPageBackends;
  listing: HostListing;
  page?: OrganizerPageRecord | null;
  readAt?: number;
}) {
  const at = useMemo(() => readAt ?? Date.now(), [readAt]);
  const record = useMemo(() => page?.organizerId === listing.id ? page : organizerPageFromListing(listing, at),
    [at, listing, page]);
  const controller = useOrganizerPageController({backends, listing, page: record, readAt: at});

  return (
    <CatchRoot theme="day">
      <PublicPageHeader />
      <WebsitePageMain id="profile">
        <HostListingSections controller={controller} />
      </WebsitePageMain>
    </CatchRoot>
  );
}
