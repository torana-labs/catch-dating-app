import {CatchBand, CatchRoot} from "@catch/web-ui";
import {useMemo} from "react";
import {PublicPageFooter, PublicSiteFooter, PublicSiteHeader, WebsitePageMain} from "../../shared/site";
import {organizerPageFromListing, type OrganizerPageRecord} from "./organizerPage";
import {OwnerSignInPrompt, OwnerView} from "./owner/OwnerView";
import {ownerViewBackends, type OwnerViewBackends} from "./owner/ownerViewBackends";
import {useOwnerViewController} from "./owner/useOwnerViewController";
import {HostListingSections} from "./sections/HostListingSections";
import type {HostListing} from "./types";
import {organizerPageBackends, useOrganizerPageController, type OrganizerPageBackends} from "./useOrganizerPageController";

/**
 * /organizers/<slug>/ on the white ground, as the WebOrgV2 board in the
 * playbook's panels language. It renders the organizer's
 * `organizerPublicPage` read model when the route read one, and otherwise the
 * same record built from the listing (pages assembled from their sources, and
 * the static build). The women-led label comes from the read model's
 * `womenLed`; the listing has no such field, so its record never shows it. On the site's own domain it carries the site header and
 * footer (owner decision, 14 Nov 2026). A page served on the organiser's own
 * domain (`servedOn="ownDomain"`, the board's guest state) drops the site
 * header and keeps the short footer, so it reads as the club's page; custom
 * domains are not served yet, so only stories pass it.
 */
export function HostListingPage({backends = organizerPageBackends, listing, ownerBackends = ownerViewBackends, ownerUid, page,
  readAt, servedOn = "site"}: {
  backends?: OrganizerPageBackends;
  listing: HostListing;
  /** The owner view's reads and writes (#1109); stories pass fakes. */
  ownerBackends?: OwnerViewBackends;
  /** Stories start the owner view signed in (a uid) or out (null). */
  ownerUid?: string | null;
  page?: OrganizerPageRecord | null;
  readAt?: number;
  /** Where the page is served: the site's domain, or the organiser's own once custom domains ship. */
  servedOn?: "site" | "ownDomain";
}) {
  const at = useMemo(() => readAt ?? Date.now(), [readAt]);
  const record = useMemo(() => page?.organizerId === listing.id ? page : organizerPageFromListing(listing, at),
    [at, listing, page]);
  const controller = useOrganizerPageController({backends, listing, page: record, readAt: at});
  const owner = useOwnerViewController({backends: ownerBackends, claimed: controller.view.kind === "claimed",
    initialUid: ownerUid, organizerId: listing.id});
  const ownDomain = servedOn === "ownDomain";

  return (
    <CatchRoot theme="day">
      {ownDomain ? null : <PublicSiteHeader />}
      <WebsitePageMain id="profile">
        <HostListingSections
          controller={controller}
          owner={owner.hidden || !owner.data ? undefined : <OwnerView controller={owner} displayUrl={controller.share.displayUrl} events={controller.view.events.rows}
            name={controller.view.name} readAt={at} />}
          ownerFooter={owner.signedOut ? <OwnerSignInPrompt controller={owner} /> : undefined}
        />
      </WebsitePageMain>
      {ownDomain ? <CatchBand as="div" pb="compact" pt="compact" width="content"><PublicPageFooter /></CatchBand> : <PublicSiteFooter />}
    </CatchRoot>
  );
}
