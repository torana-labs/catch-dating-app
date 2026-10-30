import {productionIndexing} from "./publicEnvironment";
import {cache} from "react";
import {readRouteCatalog} from "./publicCatalog";
import {readPublicContact} from "./publicContact";
import {cityForPath, isLegalPageKey, pageMeta, pageMetaForCity, pageMetaForHostPath, pageMetaForListing, pageMetaForEvent, type PageKey} from "../app/pageMeta";
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
  const routes: Record<string, PageKey> = {"/": "home", "/explore": "visitor_discovery", "/host": "host",
    "/host/apply": "host", "/organizers": "organizers", "/privacy": "privacy", "/terms": "terms", "/help": "help",
    "/delete-account": "account_deletion", "/refunds": "refunds", "/contact": "contact", "/claim": "claim"};
  const city = cityForPath(key);
  const page: PageKey = listingRoute ? "listing" : event ? "event_detail" : city ? "visitor_discovery" : routes[key] ??
    (/^\/claim\/[^/]+$/.test(key) ? "claim" : "not_found");
  const contact = isLegalPageKey(page) ? await readPublicContact() : null;
  const meta = listingRoute ? pageMetaForListing(listingRoute.listing) : event ? pageMetaForEvent(event) :
    city ? pageMetaForCity(city) :
    pageMetaForHostPath(pathname) ?? pageMeta[page as keyof typeof pageMeta];
  // Organiser and event pages draw their own card from the record they render.
  const generated = generatedPreviewCardFor({listingRoute, event});
  const image = generated ? generatedPreviewCardImage(generated) : previewCardImage(previewCardFor(meta.canonicalPath));
  const metadata: Metadata = {title: meta.title, description: meta.description,
    alternates: {canonical: `${brand.web.origin}${meta.canonicalPath}`},
    robots: productionIndexing() ? meta.robots ?? "index, follow" : "noindex, follow", openGraph: {title: meta.title, description: meta.description,
      url: `${brand.web.origin}${meta.canonicalPath}`, type: "website", images: [image]},
    twitter: {card: "summary_large_image", title: meta.title, description: meta.twitterDescription, images: [image]}};
  return {page, catalog, metadata, listingRoute, event, live, contact, citySlug: city?.slug};
});
