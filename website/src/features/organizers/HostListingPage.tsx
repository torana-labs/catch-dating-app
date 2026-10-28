import {useMemo} from "react";
import {PublicSiteHeader, WebsitePageMain} from "../../shared/site";
import {organizerPageFromListing, type OrganizerPageRecord} from "./organizerPage";
import {HostListingSections} from "./sections/HostListingSections";
import type {HostListing} from "./types";
import {organizerPageBackends, useOrganizerPageController, type OrganizerPageBackends} from "./useOrganizerPageController";

/**
 * /organizers/<slug>/. It renders the organizer's `organizerPublicPage` read
 * model when the route read one, and otherwise the same record built from the
 * listing (pages assembled from their sources, and the static build). A
 * generated page keeps the Catch header; a claimed page is the organiser's own.
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
    <>
      {controller.view.kind === "generated" ? <PublicSiteHeader /> : null}
      <WebsitePageMain id="profile">
        <HostListingSections controller={controller} />
      </WebsitePageMain>
    </>
  );
}
