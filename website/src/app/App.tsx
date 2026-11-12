import {websiteCities} from "@content/markets";
import {cityPlansFromListings} from "../features/home/cityPlansFromListings";
import {homeCatalogFromPlans, requestedHomeCity} from "../features/home/homeCatalog";
import {organizerDirectoryDestination, retiredMarketingDestination} from "./retiredMarketingRoutes";
import {salesDemoApiFromCallable} from "../features/salesDemo/salesDemoModel";
import {invokeSalesDemoCallable} from "../firebase";
import {captureOfferCredential} from "../features/eventOffers/offerCredential";
import {Suspense, useMemo, type ComponentType} from "react";
import {PublicEventListingsProvider} from "./PublicEventListingsProvider";
import {usePublicHostListings} from "../features/organizers/usePublicEventListingsController";
import {BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams} from "react-router";
import {
  cityForPath,
  getPageKey,
  pageClassFor,
  pageMeta,
  pageMetaForEvent,
  pageMetaForWeddingsPath,
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
import {MarketingConsentBanner} from "../features/marketing/MarketingConsentBanner";
import {publishedLegalContent} from "../content/legal";
import {assistanceCredential} from "../features/eventAssistance/eventAssistanceModel";
import {householdRsvpCredential} from "../features/householdRsvp/householdRsvpModel";
import {programmeLinkCredential, type ProgrammeLinkCredential} from "../features/programmes/programmeLinkModel";
import {claimRouteStateForLocation} from "../features/claims/claimRouting";
import {
  buildPublicEventDetailRecords,
  getEventDetailForPath,
  isEventDetailPath,
} from "../features/events/eventDetailModel";
import {eventPageFromListing} from "../features/events/eventPageFromListing";
import {
  getHostListingRouteForPath,
} from "../features/organizers/routing";
import {PageShell} from "../shared/site";
import {SiteAccountProvider} from "../features/account/SignInSheet";
import {PendingRequestProvider} from "../shared/pendingRequest";
import {RouteLoadingState} from "../shared/ui/primitives";
import {CustomFormDomainGate} from "./CustomFormDomainGate";
import {marketingCaptures} from "./marketingCaptures";
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
  "../features/account/AccountPage.tsx",
  "../features/hostBilling/HostBillingPage.tsx",
  "../features/eventAssistance/EventAssistancePage.tsx",
  "../features/eventRehearsal/EventRehearsalPage.tsx",
  "../features/events/EventInvitePage.tsx",
  "../features/householdRsvp/HouseholdRsvpPage.tsx",
  "../features/programmes/ProgrammeItineraryPage.tsx",
  "../features/programmes/ProgrammeGuestIdsPage.tsx",
  "../features/programmes/ProgrammeHotelHandoverPage.tsx",
  "../features/programmes/ProgrammeDriverTripPage.tsx",
  "../features/programmes/ProgrammeRunSheetPage.tsx",
  "../features/programmes/ProgrammeHampersPage.tsx",
  "../features/programmes/ProgrammeFamilyPage.tsx",
  "../features/forms/PublicFormPage.tsx",
  "../features/organizers/HostListingPage.tsx",
  "../features/host/HostPage.tsx",
  "../features/weddings/WeddingsPage.tsx",
  "../features/weddings/WeddingsApplicationPage.tsx",
  "../features/notFound/NotFoundPage.tsx",
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
const ExplorePage = route(async () => ({
  default: (await import("../features/home/ExplorePage")).ExplorePage,
}), "../features/home/ExplorePage", "ExplorePage");
const CitiesPage = route(async () => ({
  default: (await import("../features/home/CitiesPage")).CitiesPage,
}), "../features/home/CitiesPage", "CitiesPage");
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
const AccountPage = route(async () => ({
  default: (await import("../features/account/AccountPage")).AccountPage,
}), "../features/account/AccountPage", "AccountPage");
const HostBillingPage = route(async () => ({
  default: (await import("../features/hostBilling/HostBillingPage")).HostBillingPage,
}), "../features/hostBilling/HostBillingPage", "HostBillingPage");
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
const ProgrammeItineraryPage = route(async () => ({
  default: (await import("../features/programmes/ProgrammeItineraryPage")).ProgrammeItineraryPage,
}), "../features/programmes/ProgrammeItineraryPage", "ProgrammeItineraryPage");
const ProgrammeGuestIdsPage = route(async () => ({
  default: (await import("../features/programmes/ProgrammeGuestIdsPage")).ProgrammeGuestIdsPage,
}), "../features/programmes/ProgrammeGuestIdsPage", "ProgrammeGuestIdsPage");
const ProgrammeHotelHandoverPage = route(async () => ({
  default: (await import("../features/programmes/ProgrammeHotelHandoverPage")).ProgrammeHotelHandoverPage,
}), "../features/programmes/ProgrammeHotelHandoverPage", "ProgrammeHotelHandoverPage");
const ProgrammeDriverTripPage = route(async () => ({
  default: (await import("../features/programmes/ProgrammeDriverTripPage")).ProgrammeDriverTripPage,
}), "../features/programmes/ProgrammeDriverTripPage", "ProgrammeDriverTripPage");
const ProgrammeRunSheetPage = route(async () => ({
  default: (await import("../features/programmes/ProgrammeRunSheetPage")).ProgrammeRunSheetPage,
}), "../features/programmes/ProgrammeRunSheetPage", "ProgrammeRunSheetPage");
const ProgrammeHampersPage = route(async () => ({
  default: (await import("../features/programmes/ProgrammeHampersPage")).ProgrammeHampersPage,
}), "../features/programmes/ProgrammeHampersPage", "ProgrammeHampersPage");
const ProgrammeFamilyPage = route(async () => ({
  default: (await import("../features/programmes/ProgrammeFamilyPage")).ProgrammeFamilyPage,
}), "../features/programmes/ProgrammeFamilyPage", "ProgrammeFamilyPage");
const PublicFormPage = route(async () => ({
  default: (await import("../features/forms/PublicFormPage")).PublicFormPage,
}), "../features/forms/PublicFormPage", "PublicFormPage");
const HostListingPage = route(async () => ({
  default: (await import("../features/organizers/HostListingPage")).HostListingPage,
}), "../features/organizers/HostListingPage", "HostListingPage");
const HostPage = route(async () => ({
  default: (await import("../features/host/HostPage")).HostPage,
}), "../features/host/HostPage", "HostPage");
const WeddingsPage = route(async () => ({
  default: (await import("../features/weddings/WeddingsPage")).WeddingsPage,
}), "../features/weddings/WeddingsPage", "WeddingsPage");
const WeddingsApplicationPage = route(async () => ({
  default: (await import("../features/weddings/WeddingsApplicationPage")).WeddingsApplicationPage,
}), "../features/weddings/WeddingsApplicationPage", "WeddingsApplicationPage");
const NotFoundPage = route(async () => ({
  default: (await import("../features/notFound/NotFoundPage")).NotFoundPage,
}), "../features/notFound/NotFoundPage", "NotFoundPage");
const LegalPage = route(async () => ({
  default: (await import("../features/legal/LegalPage")).LegalPage,
}), "../features/legal/LegalPage", "LegalPage");

function App() {
  return (
    <BrowserRouter>
      <PendingRequestProvider>
        <CustomFormDomainGate>
          <PublicEventListingsProvider>
            <SiteAccountProvider>
              <MarketingRouteShell />
            </SiteAccountProvider>
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
  const eventPage = useMemo(() => event ? eventPageFromListing(event.listing, event.eventId) : null, [event]);
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
  // The static build has no server, so the homepage builds its cities from the live catalog.
  const homeCatalog = useMemo(() => {
    const now = Date.now();
    return homeCatalogFromPlans(websiteCities, websiteCities.map((city) =>
      cityPlansFromListings(listings, city, websiteCities, now)), cityForPath(location.pathname)?.slug ?? requestedHomeCity(location.search), now);
  }, [listings, location.search]);
  const routeKey = page === "sales_demo" || page === "event_assistance" || page === "event_offer" || page === "event_booking" ||
      page === "household_rsvp" || page === "programme_link" ? page :
    `${location.pathname}${location.search}${location.hash}`;
  const meta = event
    ? pageMetaForEvent(event)
    : listingRoute ?
    pageMetaForListing(listingRoute.listing, {
      noindexOverride: listingRoute.isLegacyPath,
    }) :
    pageMetaForWeddingsPath(location.pathname) ?? pageMeta[fallbackPage];

  useMarketingAnalytics(page, routeKey);
  useDocumentMeta(meta);

  return (
    <PageShell pageClassName={pageClassFor(page)}>
      <RouteChunkRecovery>
      <Suspense fallback={<RouteLoadingState />}>
        <RouteLifecycleEffects
          page={page}
          routeKey={routeKey}
          hash={page === "sales_demo" || page === "event_assistance" || page === "event_offer" || page === "event_booking" || page === "household_rsvp" ||
            page === "programme_link" ? "" : location.hash}
        />
        <Routes>
          <Route path={marketingRoutePaths.weddings_apply} element={<WeddingsApplicationPage />} />
          <Route path={marketingRoutePaths.weddings} element={<WeddingsPage captures={marketingCaptures} />} />
          <Route path={marketingRoutePaths.sales_demo}
            element={<SalesDemoPage api={salesDemoApi} />} />
          <Route path={marketingRoutePaths.visitor_discovery}
            element={<ExplorePage catalog={homeCatalog} />} />
          <Route path={marketingRoutePaths.cities} element={<CitiesPage catalog={homeCatalog} />} />
          <Route
            path={marketingRoutePaths.home}
            element={<HomePage captures={marketingCaptures} catalog={homeCatalog} />}
          />
          <Route
            path={marketingRoutePaths.host}
            element={<HostPage captures={marketingCaptures} />}
          />
          <Route
            path={marketingRoutePaths.organizer_search}
            element={<Navigate replace to={organizerDirectoryDestination(new URLSearchParams(location.search))} />}
          />
          {websiteCities.map((city) => (
            <Route key={city.slug} path={`/${city.slug}/`} element={<ExplorePage catalog={homeCatalog} />} />
          ))}
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
            element={event && eventPage ? (
              <EventDetailPage listing={event.listing} page={eventPage} />
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
          <Route path={marketingRoutePaths.account} element={<AccountPage />} />
          <Route path={marketingRoutePaths.host_billing} element={<HostBillingPage />} />
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
            path={marketingRoutePaths.programme_itinerary}
            element={<ProgrammeLinkRoute page={ProgrammeItineraryPage} param="householdToken" />}
          />
          <Route
            path={marketingRoutePaths.programme_ids}
            element={<ProgrammeLinkRoute page={ProgrammeGuestIdsPage} param="householdToken" />}
          />
          <Route
            path={marketingRoutePaths.programme_hotel}
            element={<ProgrammeLinkRoute page={ProgrammeHotelHandoverPage} param="linkToken" />}
          />
          <Route
            path={marketingRoutePaths.programme_trip}
            element={<ProgrammeLinkRoute page={ProgrammeDriverTripPage} param="linkToken" />}
          />
          <Route
            path={marketingRoutePaths.programme_runsheet}
            element={<ProgrammeLinkRoute page={ProgrammeRunSheetPage} param="linkToken" />}
          />
          <Route
            path={marketingRoutePaths.programme_hampers}
            element={<ProgrammeLinkRoute page={ProgrammeHampersPage} param="linkToken" />}
          />
          <Route
            path={marketingRoutePaths.programme_family}
            element={<ProgrammeLinkRoute page={ProgrammeFamilyPage} param="linkToken" />}
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
            path={marketingRoutePaths.refunds}
            element={(
              <LegalPage
                page={publishedLegalContent.pages.refunds}
                effectiveDate={publishedLegalContent.effectiveDate}
              />
            )}
          />
          <Route
            path={marketingRoutePaths.contact}
            element={(
              <LegalPage
                page={publishedLegalContent.pages.contact}
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
       page === "household_rsvp" || page === "programme_link" || page === "account" ||
       page === "host_billing" ||
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

/** A programme link: the token comes from the path only, and each visit is its own page instance. */
function ProgrammeLinkRoute({page: Page, param}: {
  page: ComponentType<{credential: ProgrammeLinkCredential | null}>;
  param: "householdToken" | "linkToken";
}) {
  const location = useLocation();
  const params = useParams();
  return <Page credential={programmeLinkCredential(params[param])} key={location.key} />;
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
