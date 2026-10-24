import {productionIndexing} from "./publicEnvironment";
import {cache} from "react";
import {readRouteCatalog} from "./publicCatalog";
import {readPublicContact} from "./publicContact";
import {isLegalPageKey, pageMeta, pageMetaForHostPath, pageMetaForListing, pageMetaForEvent, type PageKey} from "../app/pageMeta";
import {getHostListingRouteForPath} from "../features/organizers/routing";
import {previewCardFor, previewCardImage} from "./previewCards";
import {buildPublicEventDetailRecords, getEventDetailForPath} from "../features/events/eventDetailModel";
import type {Metadata} from "next";
export const resolvePublicRoute = cache(async (pathname: string) => {
  const key = pathname.replace(/\/+$/, "") || "/";
  const live = key === "/" || key === "/explore" || /^\/(organizers|events|claim)(\/|$)/.test(key);
  // Detail routes read only their organizer or event, reviews included.
  const catalog = live ? await readRouteCatalog(pathname) : {listings: [], readAt: 0};
  const listingRoute = getHostListingRouteForPath(pathname, catalog.listings);
  const event = getEventDetailForPath(pathname, buildPublicEventDetailRecords(catalog.listings, catalog.readAt));
  const routes: Record<string, PageKey> = {"/": "home", "/explore": "visitor_discovery", "/host": "host",
    "/host/apply": "host", "/organizers": "organizers", "/privacy": "privacy", "/terms": "terms", "/help": "help",
    "/delete-account": "account_deletion", "/claim": "claim"};
  const page: PageKey = listingRoute ? "listing" : event ? "event_detail" : routes[key] ??
    (/^\/claim\/[^/]+$/.test(key) ? "claim" : "not_found");
  const contact = isLegalPageKey(page) ? await readPublicContact() : null;
  const meta = listingRoute ? pageMetaForListing(listingRoute.listing) : event ? pageMetaForEvent(event) :
    pageMetaForHostPath(pathname) ?? pageMeta[page as keyof typeof pageMeta];
  const image = previewCardImage(previewCardFor(meta.canonicalPath));
  const metadata: Metadata = {title: meta.title, description: meta.description,
    alternates: {canonical: `https://catchdates.com${meta.canonicalPath}`},
    robots: productionIndexing() ? meta.robots ?? "index, follow" : "noindex, follow", openGraph: {title: meta.title, description: meta.description,
      url: `https://catchdates.com${meta.canonicalPath}`, type: "website", images: [image]},
    twitter: {card: "summary_large_image", title: meta.title, description: meta.twitterDescription, images: [image]}};
  return {page, catalog, metadata, listingRoute, event, live, contact};
});
