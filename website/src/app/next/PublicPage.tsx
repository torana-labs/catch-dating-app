"use client";
import {exploreRouteStateForSearch, exploreDiscoveryHref} from "../../features/home/exploreDiscovery";
import {homeRouteStateForSearch} from "../../features/home/homeDiscovery";
import {publicJsonLd} from "../../shared/next/publicJsonLd";
import dynamic from "next/dynamic";
import {useEffect} from "react";
import {retiredMarketingDestination} from "../retiredMarketingRoutes";
import {useLocation, useNavigate} from "react-router";
import {PageShell} from "../../shared/site";
import {isLegalPageKey, pageClassFor, type PageKey} from "../pageMeta";
import {useHashScroll, useMarketingAnalytics} from "../usePageLifecycle";
import {marketingCaptures as captures} from "../marketingCaptures";
import {usePublicHostListings} from "../../features/organizers/usePublicEventListingsController";
import {getHostListingRouteForPath} from "../../features/organizers/routing";
import {buildPublicEventDetailRecords, getEventDetailForPath} from "../../features/events/eventDetailModel";
import {publishedLegalContent} from "../../content/legal";
import type {PublicContact} from "../../content/publicContact";
import {MarketingConsentBanner} from "../../features/marketing/MarketingConsentBanner";
import {claimRouteStateForLocation, claimUrlStateForListing} from "../../features/claims/claimRouting";
const Home = dynamic(() => import("../../features/home/HomePage").then(m => m.HomePage));
const Explore = dynamic(() => import("../../features/home/HomePage").then(m => m.VisitorDiscoveryPage));
const Host = dynamic(() => import("../../features/host/HostPage").then(m => m.HostPage));
const Apply = dynamic(() => import("../../features/host/HostApplicationPage").then(m => m.HostApplicationPage));
const Directory = dynamic(() => import("../../features/organizers/OrganizerSearchPage").then(m => m.OrganizerSearchPage));
const Listing = dynamic(() => import("../../features/organizers/HostListingPage").then(m => m.HostListingPage));
const Event = dynamic(() => import("../../features/events/EventDetailPage").then(m => m.EventDetailPage));
const Claim = dynamic(() => import("../../features/claims/ClaimPage").then(m => m.ClaimPage));
const Legal = dynamic(() => import("../../features/legal/LegalPage").then(m => m.LegalPage));
const Missing = dynamic(() => import("../../features/notFound/NotFoundPage").then(m => m.NotFoundPage));

export function PublicPage({page, readAt, contact}: {page: PageKey; readAt: number; contact?: PublicContact}) {
  const location = useLocation();
  const {listings, readAt: currentReadAt} = usePublicHostListings();
  const navigate = useNavigate();
  const exploreRouteState = exploreRouteStateForSearch(location.search);
  const homeRouteState = homeRouteStateForSearch(location.search);
  const homeRouteKey = `${homeRouteState.city}:${homeRouteState.category}`;
  useEffect(() => {
    const destination = retiredMarketingDestination(location);
    if (destination) window.location.replace(destination);
  }, [location]);
  useHashScroll(page, location.hash);
  // Search strings may contain attribution or account continuation credentials.
  useMarketingAnalytics(page, location.pathname);
  let content;
  let structured: unknown = null;
  if (page === "home") content = <Home key={homeRouteKey} captures={captures} routeState={homeRouteState} />;
  else if (page === "visitor_discovery") content = <Explore captures={captures} routeState={exploreRouteState} onFiltersChange={filters => navigate(exploreDiscoveryHref(filters))} />;
  else if (page === "host") content = location.pathname.replace(/\/$/, "") === "/host/apply"
    ? <Apply /> : <Host captures={captures} />;
  else if (page === "organizers") content = <Directory />;
  else if (page === "listing") {
    const listing = getHostListingRouteForPath(location.pathname, listings)?.listing;
    if (listing) structured = {"@context": "https://schema.org", "@type": "Organization",
      name: listing.name, description: listing.description, url: `https://catchdates.com${listing.path}`};
    content = listing ? <Listing listing={listing} /> : <Missing />;
  } else if (page === "event_detail") {
    const event = getEventDetailForPath(location.pathname, buildPublicEventDetailRecords(listings, currentReadAt ?? readAt));
    if (event) structured = {"@context": "https://schema.org", "@type": "Event", name: event.title,
      startDate: event.startTime, ...(event.endTime ? {endDate: event.endTime} : {}),
      description: event.summary, url: `https://catchdates.com${event.path}`,
      location: {"@type": "Place", name: event.location},
      organizer: {"@type": "Organization", name: event.listing.name, url: `https://catchdates.com${event.listing.path}`}};
    content = event ? <Event event={event} /> : <Missing />;
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
