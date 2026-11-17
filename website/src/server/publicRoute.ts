import {productionIndexing} from "./publicEnvironment";
import {cache} from "react";
import {readRouteCatalog} from "./publicCatalog";
import {readPublicContact} from "./publicContact";
import {cityForPath, isLegalPageKey, pageMeta, pageMetaForCity, pageMetaForWeddingsPath, pageMetaForListing, pageMetaForEvent, pageMetaForPlaybook, type PageKey} from "../app/pageMeta";
import {loadPlaybookPage, resolvePlaybookPage} from "../features/playbook/playbookPages";
import {matchDiscoveryRoute} from "../features/discovery/discoveryModel";
import {discoveryPageMeta, discoveryPageStatus} from "../features/discovery/discoveryRoute";
import {readHomeCatalog} from "./homeCatalog";
import {getHostListingRouteForPath} from "../features/organizers/routing";
import {previewCardFor, previewCardImage} from "./previewCards";
import {generatedPreviewCardFor, generatedPreviewCardImage} from "./generatedPreviewCards";
import {buildPublicEventDetailRecords, getEventDetailForPath} from "../features/events/eventDetailModel";
import type {Metadata} from "next";
import {brand} from "@catch/brand";

export const resolvePublicRoute = cache(async (pathname: string) => {
  const key = pathname.replace(/\/+$/, "") || "/";
  // The homepage reads its cityPlans documents in the page itself.
  // Explore and the city pages read their cityPlans documents in the page itself.
  const live = /^\/(organizers\/[^/]|events(\/|$)|claim(\/|$))/.test(key);
  // Detail routes read only their organizer or event, reviews included.
  const catalog = live ? await readRouteCatalog(pathname) : {listings: [], readAt: 0};
  const listingRoute = getHostListingRouteForPath(pathname, catalog.listings);
  const event = getEventDetailForPath(pathname, buildPublicEventDetailRecords(catalog.listings, catalog.readAt));
  const routes: Record<string, PageKey> = {"/": "home", "/explore": "visitor_discovery", "/cities": "cities", "/host": "host",
    "/weddings": "weddings", "/weddings/apply": "weddings", "/organizers": "organizers", "/privacy": "privacy", "/terms": "terms", "/help": "help",
    "/delete-account": "account_deletion", "/refunds": "refunds", "/contact": "contact", "/claim": "claim"};
  const city = cityForPath(key);
  // A city-by-format or new-to-the-city page reads its city here, before the playbook pages: whether
  // it is a page or a 404 must be known before the render streams (the proxy decides the status).
  const discoveryRoute = listingRoute || event ? null : matchDiscoveryRoute(pathname);
  const discoveryCatalog = discoveryRoute ? await readHomeCatalog(discoveryRoute.citySlug) : undefined;
  const discoveryStatus = discoveryRoute && discoveryCatalog ? discoveryPageStatus(discoveryRoute, discoveryCatalog) : null;
  const discovery = discoveryRoute && discoveryCatalog && discoveryStatus !== "notFound" ?
    {route: discoveryRoute, catalog: discoveryCatalog, unavailable: discoveryStatus === "unavailable"} : undefined;
  // A redesign page renders from its content file; a registered route without one, or whose page
  // uses a section no kit component draws yet, is not found.
  const playbookRef = listingRoute || event || discoveryRoute ? null : resolvePlaybookPage(pathname);
  const playbookPage = playbookRef ? await loadPlaybookPage(playbookRef) : null;
  const playbook = playbookRef && playbookPage ? {page: playbookPage, canonicalPath: playbookRef.match.canonicalPath} : undefined;
  const page: PageKey = listingRoute ? "listing" : event ? "event_detail" : discovery ? "discovery" :
    discoveryRoute ? "not_found" : playbook ? "playbook" : city ? "visitor_discovery" : routes[key] ??
    (/^\/claim\/[^/]+$/.test(key) ? "claim" : "not_found");
  const contact = isLegalPageKey(page) ? await readPublicContact() : null;
  const meta = listingRoute ? pageMetaForListing(listingRoute.listing) : event ? pageMetaForEvent(event) :
    discovery ? discoveryPageMeta(discovery.route, discovery.catalog) : discoveryRoute ? pageMeta.not_found :
    playbook ? pageMetaForPlaybook(playbook.page, playbook.canonicalPath) :
    city ? pageMetaForCity(city) :
    pageMetaForWeddingsPath(pathname) ?? pageMeta[page as keyof typeof pageMeta];
  // Organiser and event pages draw their own card from the record they render.
  const generated = generatedPreviewCardFor({listingRoute, event});
  const ogImage = playbook?.page.meta.ogImage;
  const image = generated ? generatedPreviewCardImage(generated) :
    ogImage ? {url: `${brand.web.origin}${ogImage}`, alt: playbook?.page.meta.title} : previewCardImage(previewCardFor(meta.canonicalPath));
  const metadata: Metadata = {title: meta.title, description: meta.description,
    alternates: {canonical: `${brand.web.origin}${meta.canonicalPath}`},
    robots: productionIndexing() ? meta.robots ?? "index, follow" : "noindex, follow", openGraph: {title: meta.title, description: meta.description,
      url: `${brand.web.origin}${meta.canonicalPath}`, type: "website", images: [image]},
    twitter: {card: "summary_large_image", title: meta.title, description: meta.twitterDescription, images: [image]}};
  return {page, catalog, metadata, listingRoute, event, live, contact, citySlug: city?.slug, playbook, discovery};
});
