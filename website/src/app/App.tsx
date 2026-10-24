import {exploreRouteStateForSearch, exploreDiscoveryHref} from "../features/home/exploreDiscovery";
import {homeRouteStateForSearch} from "../features/home/homeDiscovery";
import {retiredMarketingDestination} from "./retiredMarketingRoutes";
import {salesDemoApiFromCallable} from "../features/salesDemo/salesDemoModel";
import {invokeSalesDemoCallable} from "../firebase";
import {captureOfferCredential} from "../features/eventOffers/offerCredential";
import {Suspense, useMemo, type ComponentType} from "react";
import {PublicEventListingsProvider} from "./PublicEventListingsProvider";
import {usePublicHostListings} from "../features/organizers/usePublicEventListingsController";
import {BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams} from "react-router";
import {
  getPageKey,
  pageClassFor,
  pageMeta,
  pageMetaForEvent,
  pageMetaForHostPath,
  pageMetaForListing,
  type PageKey,
} from "./pageMeta";
import {
  useDocumentMeta,
  useHashScroll,
  useMarketingAnalytics,
  useRevealAnimations,
} from "./usePageLifecycle";
import {isOrganizerSearchPath, marketingRoutePaths} from "./routeRegistry";
import {marketingCaptures as captures} from "./marketingCaptures";
import {MarketingConsentBanner} from "../features/marketing/MarketingConsentBanner";
import {publishedLegalContent} from "../content/legal";
import {assistanceCredential} from "../features/eventAssistance/eventAssistanceModel";
import {householdRsvpCredential} from "../features/householdRsvp/householdRsvpModel";
import {claimRouteStateForLocation} from "../features/claims/claimRouting";
import {
  buildPublicEventDetailRecords,
  getEventDetailForPath,
  isEventDetailPath,
} from "../features/events/eventDetailModel";
import {
  getHostListingRouteForPath,
} from "../features/organizers/routing";
import {PageShell} from "../shared/site";
import {PendingRequestProvider} from "../shared/pendingRequest";
import {RouteLoadingState} from "../shared/ui/primitives";
import {CustomFormDomainGate} from "./CustomFormDomainGate";
import {recoverableLazy, RouteChunkRecovery} from "./RouteChunkRecovery";

// Distinct compiled entries let a deliberate, bounded retry bypass a browser's
// cached failed import. Only these route modules are included, all still lazy.
const recoveryModules = import.meta.glob<Record<string, unknown>>([
  "../features/salesDemo/SalesDemoPage.tsx",
  "../features/claims/ClaimPage.tsx",
  "../features/home/HomePage.tsx",
  "../features/events/EventDetailPage.tsx",
  "../features/eventRuntime/EventRuntimePage.tsx",
  "../features/events/PublicBookingPage.tsx",
  "../features/eventOffers/EventOfferPage.tsx",
  "../features/eventAssistance/EventAssistancePage.tsx",
  "../features/eventRehearsal/EventRehearsalPage.tsx",
  "../features/events/EventInvitePage.tsx",
  "../features/householdRsvp/HouseholdRsvpPage.tsx",
  "../features/forms/PublicFormPage.tsx",
  "../features/organizers/HostListingPage.tsx",
  "../features/host/HostApplicationPage.tsx",
  "../features/host/HostPage.tsx",
  "../features/notFound/NotFoundPage.tsx",
  "../features/organizers/OrganizerSearchPage.tsx",
  "../features/legal/LegalPage.tsx",
], {query: "?route-recovery"});

function route<P extends object>(
  load: () => Promise<{default: ComponentType<P>}>, path: string, name: string,
) {
  return recoverableLazy(load, async () => {
    // Each entry selects the same named export as its typed primary loader.
    const module = await recoveryModules[`${path}.tsx`]();
    return {default: module[name] as ComponentType<P>};
  });
}

const salesDemoApi = salesDemoApiFromCallable(invokeSalesDemoCallable);
const SalesDemoPage = route(async () => ({
  default: (await import("../features/salesDemo/SalesDemoPage")).SalesDemoPage,
}), "../features/salesDemo/SalesDemoPage", "SalesDemoPage");

const ClaimPage = route(async () => ({
  default: (await import("../features/claims/ClaimPage")).ClaimPage,
}), "../features/claims/ClaimPage", "ClaimPage");
const VisitorDiscoveryPage = route(async () => ({
  default: (await import("../features/home/HomePage")).VisitorDiscoveryPage,
}), "../features/home/HomePage", "VisitorDiscoveryPage");
const HomePage = route(async () => ({
  default: (await import("../features/home/HomePage")).HomePage,
}), "../features/home/HomePage", "HomePage");
const EventDetailPage = route(async () => ({
  default: (await import("../features/events/EventDetailPage")).EventDetailPage,
}), "../features/events/EventDetailPage", "EventDetailPage");
const EventRuntimePage = route(async () => ({
  default: (await import("../features/eventRuntime/EventRuntimePage")).EventRuntimePage,
}), "../features/eventRuntime/EventRuntimePage", "EventRuntimePage");
const PublicBookingPage = route(async () => ({
  default: (await import("../features/events/PublicBookingPage")).PublicBookingPage,
}), "../features/events/PublicBookingPage", "PublicBookingPage");
const EventOfferPage = route(async () => ({
  default: (await import("../features/eventOffers/EventOfferPage")).EventOfferPage,
}), "../features/eventOffers/EventOfferPage", "EventOfferPage");
const EventAssistancePage = route(async () => ({
  default: (await import("../features/eventAssistance/EventAssistancePage")).EventAssistancePage,
}), "../features/eventAssistance/EventAssistancePage", "EventAssistancePage");
const EventRehearsalPage = route(async () => ({
  default: (await import("../features/eventRehearsal/EventRehearsalPage"))
    .EventRehearsalPage,
}), "../features/eventRehearsal/EventRehearsalPage", "EventRehearsalPage");
const EventInvitePage = route(async () => ({
  default: (await import("../features/events/EventInvitePage")).EventInvitePage,
}), "../features/events/EventInvitePage", "EventInvitePage");
const HouseholdRsvpPage = route(async () => ({
  default: (await import("../features/householdRsvp/HouseholdRsvpPage"))
    .HouseholdRsvpPage,
}), "../features/householdRsvp/HouseholdRsvpPage", "HouseholdRsvpPage");
const PublicFormPage = route(async () => ({
  default: (await import("../features/forms/PublicFormPage")).PublicFormPage,
}), "../features/forms/PublicFormPage", "PublicFormPage");
const HostListingPage = route(async () => ({
  default: (await import("../features/organizers/HostListingPage")).HostListingPage,
}), "../features/organizers/HostListingPage", "HostListingPage");
const HostApplicationPage = route(async () => ({
  default: (await import("../features/host/HostApplicationPage")).HostApplicationPage,
}), "../features/host/HostApplicationPage", "HostApplicationPage");
const HostPage = route(async () => ({
  default: (await import("../features/host/HostPage")).HostPage,
}), "../features/host/HostPage", "HostPage");
const NotFoundPage = route(async () => ({
  default: (await import("../features/notFound/NotFoundPage")).NotFoundPage,
}), "../features/notFound/NotFoundPage", "NotFoundPage");
const OrganizerSearchPage = route(async () => ({
  default: (await import("../features/organizers/OrganizerSearchPage")).OrganizerSearchPage,
}), "../features/organizers/OrganizerSearchPage", "OrganizerSearchPage");
const LegalPage = route(async () => ({
  default: (await import("../features/legal/LegalPage")).LegalPage,
}), "../features/legal/LegalPage", "LegalPage");

function App() {
  return (
    <BrowserRouter>
      <PendingRequestProvider>
        <CustomFormDomainGate>
          <PublicEventListingsProvider>
            <MarketingRouteShell />
          </PublicEventListingsProvider>
        </CustomFormDomainGate>
      </PendingRequestProvider>
    </BrowserRouter>
  );
}

function MarketingRouteShell() {
  const location = useLocation();
  const destination = retiredMarketingDestination(location);
  return destination ? <Navigate replace to={destination} /> : <CanonicalMarketingRouteShell />;
}

function CanonicalMarketingRouteShell() {
  const location = useLocation();
  const {listings, phase: eventFeedPhase} = usePublicHostListings();
  const events = useMemo(() => buildPublicEventDetailRecords(listings), [listings]);
  const event = getEventDetailForPath(location.pathname, events);
  const listingRoute = getHostListingRouteForPath(location.pathname, listings);
  const listing = listingRoute?.listing ?? null;
  const fallbackPage = pageKeyForCurrentRoute(
    location.pathname,
    Boolean(listing),
    Boolean(event)
  );
  const page: PageKey = event
    ? "event_detail"
    : listing
      ? "listing"
      : fallbackPage;
  const navigate = useNavigate();
  const exploreRouteState = exploreRouteStateForSearch(location.search);
  const homeRouteState = homeRouteStateForSearch(location.search);
  const homeRouteKey = `${homeRouteState.city}:${homeRouteState.category}`;
  const routeKey = page === "sales_demo" || page === "event_assistance" || page === "event_offer" || page === "event_booking" ||
      page === "household_rsvp" ? page :
    `${location.pathname}${location.search}${location.hash}`;
  const meta = event
    ? pageMetaForEvent(event)
    : listingRoute ?
    pageMetaForListing(listingRoute.listing, {
      noindexOverride: listingRoute.isLegacyPath,
    }) :
    pageMetaForHostPath(location.pathname) ?? pageMeta[fallbackPage];

  useMarketingAnalytics(page, routeKey);
  useDocumentMeta(meta);

  return (
    <PageShell pageClassName={pageClassFor(page)}>
      <RouteChunkRecovery>
      <Suspense fallback={<RouteLoadingState />}>
        <RouteLifecycleEffects
          page={page}
          routeKey={routeKey}
          hash={page === "sales_demo" || page === "event_assistance" || page === "event_offer" || page === "event_booking" || page === "household_rsvp" ?
            "" : location.hash}
        />
        <Routes>
          <Route path={marketingRoutePaths.host_apply} element={<HostApplicationPage />} />
          <Route path={marketingRoutePaths.sales_demo}
            element={<SalesDemoPage api={salesDemoApi} />} />
          <Route path={marketingRoutePaths.visitor_discovery}
            element={<VisitorDiscoveryPage captures={captures} routeState={exploreRouteState} onFiltersChange={filters => navigate(exploreDiscoveryHref(filters))} />} />
          <Route
            path={marketingRoutePaths.home}
            element={<HomePage key={homeRouteKey} captures={captures} routeState={homeRouteState} />}
          />
          <Route
            path={marketingRoutePaths.host}
            element={<HostPage captures={captures} />}
          />
          <Route
            path={marketingRoutePaths.organizer_search}
            element={<OrganizerSearchPage />}
          />
          <Route
            path={marketingRoutePaths.organizer_listing}
            element={listing ? (
              <HostListingPage listing={listing} />
            ) : (
              <NotFoundPage />
            )}
          />
          <Route
            path={marketingRoutePaths.event_detail}
            element={event ? (
              <EventDetailPage event={event} />
            ) : eventFeedPhase === "loading" ? (
              <RouteLoadingState />
            ) : (
              <NotFoundPage />
            )}
          />
          <Route
            path={marketingRoutePaths.event_runtime}
            element={<EventRuntimePage />}
          />
          <Route path={marketingRoutePaths.event_booking} element={<PublicBookingPage />} />
          <Route path={marketingRoutePaths.event_offer} element={<EventOfferRoute />} />
          <Route
            path={marketingRoutePaths.event_assistance}
            element={<EventAssistanceRoute />}
          />
          <Route
            path={marketingRoutePaths.event_rehearsal}
            element={<EventRehearsalPage />}
          />
          <Route
            path={marketingRoutePaths.event_invite}
            element={<EventInvitePage />}
          />
          <Route
            path={marketingRoutePaths.household_rsvp}
            element={<HouseholdRsvpRoute />}
          />
          <Route
            path={marketingRoutePaths.public_form}
            element={<PublicFormPage />}
          />
          <Route
            path={marketingRoutePaths.claim}
            element={<ClaimRoute />}
          />
          <Route
            path={marketingRoutePaths.claim_lookup}
            element={<ClaimRoute />}
          />
          <Route
            path={marketingRoutePaths.privacy}
            element={(
              <LegalPage
                page={publishedLegalContent.pages.privacy}
                effectiveDate={publishedLegalContent.effectiveDate}
              />
            )}
          />
          <Route
            path={marketingRoutePaths.terms}
            element={(
              <LegalPage
                page={publishedLegalContent.pages.terms}
                effectiveDate={publishedLegalContent.effectiveDate}
              />
            )}
          />
          <Route
            path={marketingRoutePaths.help}
            element={(
              <LegalPage
                page={publishedLegalContent.pages.help}
                effectiveDate={publishedLegalContent.effectiveDate}
              />
            )}
          />
          <Route
            path={marketingRoutePaths.account_deletion}
            element={(
              <LegalPage
                page={publishedLegalContent.pages.account_deletion}
                effectiveDate={publishedLegalContent.effectiveDate}
              />
            )}
          />
          <Route
            path={marketingRoutePaths.not_found}
            element={<NotFoundPage />}
          />
        </Routes>
      </Suspense>
      </RouteChunkRecovery>
      {page === "event_runtime" || page === "event_rehearsal" ||
       page === "sales_demo" || page === "event_assistance" || page === "event_offer" || page === "event_booking" ||
       page === "event_invite" ||
       page === "household_rsvp" ||
       page === "public_form" ?
        null : <MarketingConsentBanner />}
    </PageShell>
  );
}

function EventOfferRoute() {
  const location = useLocation();
  const credential = captureOfferCredential(location,
    (path) => window.history.replaceState({...window.history.state, catchOfferPaymentId: null, catchOfferGrantId: null}, "", path),
    window.history.state);
  return <EventOfferPage key={credential?.instance ?? "missing"} credential={credential} />;
}

function pageKeyForCurrentRoute(
  pathname: string,
  hasListing: boolean,
  hasEvent: boolean
): Exclude<PageKey, "listing" | "event_detail"> {
  if (!hasEvent && isEventDetailPath(pathname)) {
    return "not_found";
  }
  if (!hasListing && pathname.startsWith("/organizers/") && !isOrganizerSearchPath(pathname)) {
    return "not_found";
  }
  return getPageKey(pathname);
}

function EventAssistanceRoute() {
  const location = useLocation();
  const {linkId = ""} = useParams<{linkId: string}>();
  return <EventAssistancePage key={location.key}
    credential={assistanceCredential(linkId, location.hash)} />;
}

function HouseholdRsvpRoute() {
  const location = useLocation();
  const {householdToken = ""} = useParams<{householdToken: string}>();
  return <HouseholdRsvpPage key={location.key}
    credential={householdRsvpCredential(householdToken)} />;
}

function ClaimRoute() {
  const location = useLocation();
  const {listing} = useParams<{listing?: string}>();
  const routeState = claimRouteStateForLocation(location, listing);
  return (
    <ClaimPage
      key={`${location.pathname}${location.search}`}
      routeState={routeState}
    />
  );
}

function RouteLifecycleEffects({
  page,
  routeKey,
  hash,
}: {
  page: PageKey;
  routeKey: string;
  hash: string;
}) {
  useRevealAnimations(page, routeKey);
  useHashScroll(page, hash);
  return null;
}

export default App;
