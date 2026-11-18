"use client";
import type {DiscoveryRoute} from "../../features/discovery/discoveryModel";
import type {HomeCatalog} from "../../features/home/homeTypes";
import {publicJsonLd} from "../../shared/next/publicJsonLd";
import dynamic from "next/dynamic";
import {useEffect} from "react";
import {retiredMarketingDestination} from "../retiredMarketingRoutes";
import {useLocation, useNavigate} from "react-router";
import {PageShell} from "../../shared/site";
import {isLegalPageKey, pageClassFor, type PageKey} from "../pageMeta";
import {useHashScroll, useMarketingAnalytics} from "../usePageLifecycle";
import {usePublicHostListings} from "../../features/organizers/usePublicEventListingsController";
import {getHostListingRouteForPath} from "../../features/organizers/routing";
import {buildPublicEventDetailRecords, getEventDetailForPath} from "../../features/events/eventDetailModel";
import {useEventPage} from "../../features/events/eventPageContext";
import {eventBreadcrumbJsonLd, eventBreadcrumbs} from "../../features/events/eventBreadcrumbs";
import {publishedLegalContent} from "../../content/legal";
import type {PublicContact} from "../../content/publicContact";
import {MarketingConsentBanner} from "../../features/marketing/MarketingConsentBanner";
import {marketingCaptures} from "../marketingCaptures";
import {claimRouteStateForLocation, claimUrlStateForListing} from "../../features/claims/claimRouting";
import {brand} from "@catch/brand";

const Home = dynamic(() => import("../../features/home/HomePage").then(m => m.HomePage));
const Explore = dynamic(() => import("../../features/home/ExplorePage").then(m => m.ExplorePage));
const Cities = dynamic(() => import("../../features/home/CitiesPage").then(m => m.CitiesPage));
const CityFormat = dynamic(() => import("../../features/discovery/CityFormatPage").then(m => m.CityFormatPage));
const NewToCity = dynamic(() => import("../../features/discovery/NewToCityPage").then(m => m.NewToCityPage));
const Host = dynamic(() => import("../../features/host/HostPage").then(m => m.HostPage));
const Weddings = dynamic(() => import("../../features/weddings/WeddingsPage").then(m => m.WeddingsPage));
const WeddingsApply = dynamic(() => import("../../features/weddings/WeddingsApplicationPage").then(m => m.WeddingsApplicationPage));
const Listing = dynamic(() => import("../../features/organizers/HostListingPage").then(m => m.HostListingPage));
const Event = dynamic(() => import("../../features/events/EventDetailPage").then(m => m.EventDetailPage));
const Claim = dynamic(() => import("../../features/claims/ClaimPage").then(m => m.ClaimPage));
const Legal = dynamic(() => import("../../features/legal/LegalPage").then(m => m.LegalPage));
const Missing = dynamic(() => import("../../features/notFound/NotFoundPage").then(m => m.NotFoundPage));

/**
 * A public page on the Next render. `discovery` is the city-by-format or
 * new-to-the-city page the server matched and read the city for (`home`);
 * it renders whatever the page key says.
 */
export function PublicPage({page, readAt, contact, home, discovery}: {
  page: PageKey; readAt: number; contact?: PublicContact; home?: HomeCatalog; discovery?: DiscoveryRoute;
}) {
  const location = useLocation();
  const {listings, readAt: currentReadAt, organizerPage} = usePublicHostListings();
  const eventRoute = useEventPage();
  const navigate = useNavigate();
  useEffect(() => {
    const destination = retiredMarketingDestination(location);
    if (destination) window.location.replace(destination);
  }, [location]);
  useHashScroll(page, location.hash);
  // Search strings may contain attribution or account continuation credentials.
  useMarketingAnalytics(page, location.pathname);
  let content;
  let structured: unknown = null;
  if (discovery) content = !home ? <Missing /> : discovery.kind === "cityFormat" ?
    <CityFormat catalog={home} format={discovery.format} /> : <NewToCity catalog={home} />;
  else if (page === "home") content = home ? <Home captures={marketingCaptures} catalog={home} /> : <Missing />;
  else if (page === "visitor_discovery") content = home ? <Explore captures={marketingCaptures} catalog={home} /> : <Missing />;
  else if (page === "cities") content = home ? <Cities catalog={home} /> : <Missing />;
  else if (page === "host") content = <Host captures={marketingCaptures} />;
  else if (page === "weddings") content = location.pathname.replace(/\/$/, "") === "/weddings/apply"
    ? <WeddingsApply /> : <Weddings captures={marketingCaptures} />;
  else if (page === "listing") {
    const listing = getHostListingRouteForPath(location.pathname, listings)?.listing;
    if (listing) structured = {"@context": "https://schema.org", "@type": "Organization",
      name: listing.name, description: listing.description, url: `${brand.web.origin}${listing.path}`};
    content = listing ? <Listing listing={listing} page={organizerPage} readAt={currentReadAt ?? readAt} /> : <Missing />;
  } else if (page === "event_detail") {
    const event = getEventDetailForPath(location.pathname, buildPublicEventDetailRecords(listings, currentReadAt ?? readAt));
    if (event) structured = {"@context": "https://schema.org", "@type": "Event", name: event.title,
      startDate: event.startTime, ...(event.endTime ? {endDate: event.endTime} : {}),
      description: event.summary, url: `${brand.web.origin}${event.path}`,
      location: {"@type": "Place", name: event.location},
      organizer: {"@type": "Organization", name: event.listing.name, url: `${brand.web.origin}${event.listing.path}`}};
    const shown = event && eventRoute?.page.eventId === event.eventId ? eventRoute.page : null;
    // The breadcrumb the page draws, stated once more for search: What's on, the open city, the event.
    if (structured !== null && shown) structured = [structured, eventBreadcrumbJsonLd(
      eventBreadcrumbs({city: shown.organizer.city, title: shown.item.event.title}), {origin: brand.web.origin, path: shown.path})];
    content = event && shown ?
      <Event listing={event.listing} mapImageUrl={eventRoute!.mapImageUrl} page={shown} /> : <Missing />;
  } else if (page === "claim") {
    const state = claimRouteStateForLocation(location);
    state.listing = listings.find(item => item.id === state.lookup || item.slug === state.lookup || item.path === state.lookup || item.legacyPaths?.includes(state.lookup ?? "")) ?? null;
    state.urlState = claimUrlStateForListing(state.listing, state.lookup);
    content = <Claim key={location.pathname + location.search} routeState={state} />;
  } else if (isLegalPageKey(page)) {
    content = <Legal page={publishedLegalContent.pages[page]} effectiveDate={publishedLegalContent.effectiveDate} contact={contact} />;
  } else content = <Missing />;
  return <PageShell pageClassName={pageClassFor(page)}>{structured !== null && <script type="application/ld+json" dangerouslySetInnerHTML={{__html: publicJsonLd(structured)}} />}{content}<MarketingConsentBanner serverRendered /></PageShell>;
}
