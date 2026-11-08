import {CatchRoot} from "@catch/web-ui";
import {useMemo} from "react";
import {PublicPageHeader, WebsitePageMain} from "../../shared/site";
import {organizerPageFromListing, type OrganizerPageRecord} from "./organizerPage";
import {OwnerSignInPrompt, OwnerView} from "./owner/OwnerView";
import {ownerViewBackends, type OwnerViewBackends} from "./owner/ownerViewBackends";
import {useOwnerViewController} from "./owner/useOwnerViewController";
import {HostListingSections} from "./sections/HostListingSections";
import type {HostListing} from "./types";
import {organizerPageBackends, useOrganizerPageController, type OrganizerPageBackends} from "./useOrganizerPageController";

/**
 * /organizers/<slug>/ on the white ground, as the RbWebOrgV2 board. It
 * renders the organizer's `organizerPublicPage` read model when the route
 * read one, and otherwise the same record built from the listing (pages
 * assembled from their sources, and the static build).
 */
export function HostListingPage({backends = organizerPageBackends, listing, ownerBackends = ownerViewBackends, ownerUid, page,
  readAt}: {
  backends?: OrganizerPageBackends;
  listing: HostListing;
  /** The owner view's reads and writes (#1109); stories pass fakes. */
  ownerBackends?: OwnerViewBackends;
  /** Stories start the owner view signed in (a uid) or out (null). */
  ownerUid?: string | null;
  page?: OrganizerPageRecord | null;
  readAt?: number;
}) {
  const at = useMemo(() => readAt ?? Date.now(), [readAt]);
  const record = useMemo(() => page?.organizerId === listing.id ? page : organizerPageFromListing(listing, at),
    [at, listing, page]);
  const controller = useOrganizerPageController({backends, listing, page: record, readAt: at});
  const owner = useOwnerViewController({backends: ownerBackends, claimed: controller.view.kind === "claimed",
    initialUid: ownerUid, organizerId: listing.id});

  return (
    <CatchRoot theme="day">
      <PublicPageHeader />
      <WebsitePageMain id="profile">
        <HostListingSections
          controller={controller}
          owner={owner.hidden || !owner.data ? undefined : <OwnerView controller={owner} displayUrl={controller.share.displayUrl} events={controller.view.events.rows}
            name={controller.view.name} readAt={at} />}
          ownerFooter={owner.signedOut ? <OwnerSignInPrompt controller={owner} /> : undefined}
        />
      </WebsitePageMain>
    </CatchRoot>
  );
}
