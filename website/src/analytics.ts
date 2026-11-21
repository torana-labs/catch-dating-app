import {acquisitionRoute, approvedCampaignLabels, createCatchMeasurementController,
  type CatchAcquisitionEvent, type AcquisitionForm, type MeasurementConsent} from "./analytics/catchMeasurement.ts";
import {browserAttribution, catchAttributionKey, catchMeasurementMode, currentConsentVersion, publicAdPage,
  type CatchMeasurementMode} from "./analytics/catchMeasurement.ts";
import {adTags, type AdBooking, type AdEventPageFacts, type AdHostLead, type OrganizerAdDestinations} from "./analytics/adTags.ts";
import {isPrivateEventUpdatePath} from "./analytics/privateRoutes.ts";
import {startEngagementTracking} from "./analytics/engagement.ts";
import type {JoinWaitlistHTTPRequest} from "./shared/contracts/generated/joinWaitlistHttpRequest";
import {brand} from "@catch/brand";

type ConsentChoice = "accepted" | "analytics" | "essential";
type FormVariant = "member" | "host";

export const marketingContentVersion = "website_copy_v2" as const;

export interface MarketingConsent extends MeasurementConsent {
  version: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  measurementMode?: CatchMeasurementMode;
  choice: ConsentChoice;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
}

interface AttributionTouch {
  capturedAt: string;
  landingPath: string;
  landingUrl: string;
  referrer: string | null;
  values: Record<string, string>;
}

interface StoredAttribution {
  firstTouch: AttributionTouch;
  lastTouch: AttributionTouch;
}

export interface WaitlistAnalyticsPayload {
  attribution: StoredAttribution | null;
  analytics: {
    consent: Omit<MarketingConsent, "version"> | null;
    eventId: string;
    formVariant: FormVariant;
    pagePath: string;
    pageTitle: string;
    submittedAt: string;
  };
}

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
  }
}

const legacyAttributionStorageKey = "catch_marketing_attribution_v1";
const attributionStorageKey = "catch_marketing_attribution_v3";
const attributionMaxAgeMs = 30 * 24 * 60 * 60 * 1000;
export const marketingConsentChangedEvent = "catch:marketing-consent-changed";
/** Asks the consent banner to reopen with every choice (the footer's "Privacy choices"). */
export const marketingConsentOpenEvent = "catch:marketing-consent-open";

export function openMarketingConsentPreferences() {
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new Event(marketingConsentOpenEvent));
  }
}
const legacyConsentStorageKey = "catch_marketing_consent_v1";
// Earlier receipts: versions 2 to 4 predate the first-party tags, version 5
// predates the banner naming organisers' own tags (#2063), and version 6
// predates the banner naming Microsoft Clarity. They are read for display
// only, never grant marketing, load nothing, and the banner asks again.
const previousConsentStorageKeys = ["catch_marketing_consent_v6", "catch_marketing_consent_v5", "catch_marketing_consent_v4",
  "catch_marketing_consent_v3", "catch_marketing_consent_v2"];
const consentStorageKey = "catch_marketing_consent_v7";
// The host-only acquisition contract has no transport; the first-party tags
// are `adTags`, called directly below.
const measurement = createCatchMeasurementController();
let lastPageKey: string | null = null;
let consentRevisionMs = 0;
let clientErrorMonitoringInstalled = false;

const attributionKeys = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
];

function dataLayer() {
  window.dataLayer = window.dataLayer ?? [];
  return window.dataLayer;
}

function gtag(...args: unknown[]) {
  dataLayer().push(args as unknown as Record<string, unknown>);
}

export function initializeMarketingAnalytics() {
  clearLegacyAttribution();
  captureAttribution();
  refreshMeasurementContext();
  if (isPrivateEventUpdate()) return;
  installConsentDefaults();
  installClientErrorMonitoring();
  // Arbitrary GTM and live Catch transports stay disabled; this bus is local only.
}

export function trackClientErrorSignal(errorSource: "window_error" | "unhandled_rejection") {
  if (isPrivateEventUpdate() || !getMarketingConsent()?.analytics) return false;
  trackMarketingEvent("client_error", {
    error_source: errorSource,
    page_path: window.location.pathname,
  });
  return true;
}

export function getMarketingConsent(): MarketingConsent | null {
  const stored = readJson<MarketingConsent>(consentStorageKey);
  if (stored) {
    if (stored.version !== currentConsentVersion || !validConsent(stored)) { clearAttribution(); return null; }
    if (stored.measurementMode !== catchMeasurementMode()) {
      clearAttribution();
      return {...stored, version: 2, choice: stored.analytics ? "analytics" : "essential", marketing: false};
    }
    if (!stored.analytics) clearAttribution();
    return stored;
  }
  const previous = previousConsentStorageKeys.map((key) => readJson<MarketingConsent>(key)).find(Boolean);
  if (previous) {
    clearAttribution();
    if (![2, 3, 4, 5, 6].includes(previous.version) || !validConsent(previous)) return null;
    return {...previous, version: 2, choice: previous.analytics ? "analytics" : "essential", marketing: false};
  }
  const legacy = readJson<Omit<MarketingConsent, "version">>(legacyConsentStorageKey);
  if (!legacy || !validConsent(legacy)) { clearAttribution(); return null; }
  // Previous accept-all choices came from an analytics-only UI. Never escalate them.
  if (!legacy.analytics) clearAttribution();
  return {version: 1, choice: legacy.analytics ? "analytics" : "essential", analytics: legacy.analytics,
    marketing: false, updatedAt: legacy.updatedAt};
}

function validConsent(stored: Omit<MarketingConsent, "version">) {
  return ["accepted", "analytics", "essential"].includes(stored.choice) &&
    typeof stored.updatedAt === "string" && Number.isFinite(Date.parse(stored.updatedAt)) &&
    stored.analytics === (stored.choice !== "essential") &&
    stored.marketing === (stored.choice === "accepted");
}

export function shouldShowMarketingConsentBanner(consent = getMarketingConsent()) {
  return consent?.version !== currentConsentVersion;
}

export function setMarketingConsent(choice: ConsentChoice) {
  const previous = getMarketingConsent();
  // A new revision cancels in-flight conversion permission, including same-ms revoke/accept.
  consentRevisionMs = Math.max(Date.now(), consentRevisionMs + 1);
  const consent: MarketingConsent = {
    version: currentConsentVersion, choice,
    measurementMode: catchMeasurementMode(),
    analytics: choice === "analytics" || choice === "accepted",
    marketing: choice === "accepted",
    updatedAt: new Date(consentRevisionMs).toISOString(),
  };
  writeJson(consentStorageKey, consent);
  try {
    for (const key of [legacyConsentStorageKey, ...previousConsentStorageKeys]) window.localStorage.removeItem(key);
  } catch { /* Optional storage. */ }
  // Withdrawing marketing clears the stored ad clicks before anything else reads them.
  if (!consent.marketing) clearClickContext();
  updateConsentMode(consent);
  captureAttribution();
  refreshMeasurementContext();
  // Begin a current-page visit after first permission; never replay earlier pages
  // or produce another view for an analytics-to-marketing upgrade.
  if (consent.analytics && (previous?.version !== currentConsentVersion || !previous.analytics)) {
    measurement.track({name: "page_view", visitId: createMarketingEventId("catch")});
  }
  // The tags start with the current page; they never replay earlier ones. First
  // permission sends its view; an analytics-to-marketing upgrade adds only the
  // Pixel's view, because Google Analytics has already seen this page.
  const before = previous?.version === currentConsentVersion ? previous : null;
  if (consent.analytics && !before?.analytics) adTags.pageView();
  else if (consent.marketing && !before?.marketing) adTags.pageView("meta");
  trackMarketingEvent("consent_updated", {
    analytics_consent: consent.analytics, marketing_consent: consent.marketing,
  });
  if (typeof window.dispatchEvent === "function") window.dispatchEvent(new Event(marketingConsentChangedEvent));
  return consent;
}

/**
 * Scroll depth (25, 50, 75 and 90%) and per-section reading time for the
 * current page visit, recorded like any other site event: kept on the local
 * bus and, after the analytics choice, sent to Google Analytics. Returns the
 * stop, which reports the reading time gathered so far.
 */
export function startPageEngagementTracking(): () => void {
  if (typeof window === "undefined" || isPrivateEventUpdate()) return () => undefined;
  return startEngagementTracking((event) => {
    if (!isPrivateEventUpdate()) trackMarketingEvent(event.name, event.parameters);
  });
}

export function trackPageView(pageName: string, visitKey?: string) {
  refreshMeasurementContext();
  if (isPrivateEventUpdate()) { lastPageKey = null; return; }
  const pagePath = window.location.pathname;
  const pageKey = `${visitKey ?? ""}:${pageName}:${pagePath}`;
  if (lastPageKey === pageKey) return;
  lastPageKey = pageKey;
  measurement.track({name: "page_view", visitId: createMarketingEventId("catch")});
  adTags.pageView();
  trackMarketingEvent("page_view", {
    page_name: pageName, page_path: pagePath,
    page_location: window.location.href, page_title: document.title,
  });
}

function refreshMeasurementContext() {
  let attribution = null;
  try {
    attribution = browserAttribution({enabled: catchMeasurementMode() !== "disabled",
      path: window.location.pathname, search: window.location.search, consent: getMarketingConsent(),
      storage: window.localStorage, now: Date.now(), random: () => crypto.getRandomValues(new Uint32Array(1))[0]});
  } catch { /* Storage/crypto restrictions cannot block the application. */ }
  measurement.update({path: window.location.pathname, consent: getMarketingConsent(),
    campaign: readAttribution()?.lastTouch.values, attribution});
  adTags.sync(getMarketingConsent());
}

/** Whether the choice a submission started with is still the current one and allows analytics. */
function submissionChoiceCurrent(submissionConsent: MarketingConsent | null) {
  const current = getMarketingConsent();
  return submissionConsent?.version === currentConsentVersion && submissionConsent.analytics === true &&
    current?.version === currentConsentVersion && current.updatedAt === submissionConsent.updatedAt;
}

/**
 * A host enquiry from a website lead form was accepted. It reaches the tags
 * only under the choice the submission started with, still unchanged, and
 * only for host lead kinds (`adTags.hostLead`): Google Analytics under the
 * analytics choice, and the ad conversions with the number just typed only
 * under marketing.
 */
export function trackHostLeadAccepted(lead: AdHostLead, submissionConsent: MarketingConsent | null) {
  refreshMeasurementContext();
  if (!submissionChoiceCurrent(submissionConsent)) return false;
  return adTags.hostLead(lead);
}

/**
 * A member or referral lead was accepted (`adTags.siteLead`: a member
 * waitlist sign-up, a city alert or a "Know a host" referral), under the same
 * unchanged-choice rule as a host enquiry. It carries no contact data.
 */
export function trackSiteLeadAccepted(lead: {kind: string; leadId: string | null}, submissionConsent: MarketingConsent | null) {
  refreshMeasurementContext();
  if (!submissionChoiceCurrent(submissionConsent)) return false;
  return adTags.siteLead(lead);
}

/**
 * A public event page was shown (`adTags.viewItem`). The organiser set, when
 * one is published for this event, gets its own `view_item` / `ViewContent`;
 * the return value is Catch's alone.
 */
export function trackEventPageViewed(facts: AdEventPageFacts) {
  refreshMeasurementContext();
  const sent = adTags.viewItem(facts);
  adTags.organizerViewItem(facts);
  return sent;
}

/** A live paid checkout opened (`adTags.beginCheckout`, and the organiser set's twin). */
export function trackCheckoutOpened(booking: AdBooking) {
  refreshMeasurementContext();
  const sent = adTags.beginCheckout(booking);
  adTags.organizerBeginCheckout(booking);
  return sent;
}

/** A booking this browser checked out was confirmed (`adTags.purchase`, and the organiser set's twin). */
export function trackBookingConfirmed(booking: AdBooking) {
  refreshMeasurementContext();
  const sent = adTags.purchase(booking);
  adTags.organizerPurchase(booking);
  return sent;
}

/**
 * Sets or clears the organiser destination set for the current page (#2063).
 * Only `observeOrganizerProviders` calls it, with a set the public tracking
 * projection published; under publication policy v1 there is none.
 */
export function setOrganizerAdDestinations(set: OrganizerAdDestinations | null) {
  refreshMeasurementContext();
  adTags.setOrganizer(set);
}

/**
 * Admits the current organiser profile to Catch's own tags (owner condition
 * and classification decision, 19 Nov 2026, #2063), or clears it, and starts
 * the profile's Catch page view once admitted. Only
 * `observeOrganizerProviders` calls it, with the server's eligibility.
 */
export function admitCatchOrganizerProfile(path: string | null) {
  const changed = adTags.admitOrganizerProfile(path);
  refreshMeasurementContext();
  // One Catch page view per admission; a repeated admission sends nothing.
  return changed && path !== null ? adTags.pageView() : false;
}

/**
 * Keeps every advertising tag silent while a private surface is open on a
 * public path (the owner view on an organiser profile). Returns the release.
 */
export function holdAdTagsForPrivateSurface(): () => void {
  const release = adTags.holdForPrivateSurface();
  refreshMeasurementContext();
  return () => {
    release();
    refreshMeasurementContext();
  };
}

/** The organiser set's `page_view` / `PageView` for the current eligible page. */
export function trackOrganizerPageViewed() {
  refreshMeasurementContext();
  return adTags.organizerPageView();
}

export function trackCatchAcquisitionEvent(event: CatchAcquisitionEvent) {
  refreshMeasurementContext();
  return measurement.track(event);
}

export function trackAcceptedMarketingLead(eventId: string | undefined,
  form: Exclude<AcquisitionForm, "claim">, alreadyJoined: boolean, submissionConsent: MarketingConsent | null,
  hostLead?: {eventId: string; isNew: boolean}) {
  // Host acquisition is a separate server outcome from an email joining Catch.
  if (form !== "member_waitlist") {
    if (!hostLead?.isNew) return false;
    eventId = hostLead.eventId;
    alreadyJoined = false;
  }
  if (!eventId || !submissionChoiceCurrent(submissionConsent) || alreadyJoined) return false;
  // A new member sign-up reaches Google Analytics (and, under marketing, Meta) as a member lead.
  const tagged = form === "member_waitlist" ?
    trackSiteLeadAccepted({kind: "member_waitlist", leadId: eventId}, submissionConsent) : false;
  const measured = trackCatchAcquisitionEvent({name: "lead_accepted", eventId, form,
    receipt: {ok: true, alreadyJoined: false}});
  return tagged || measured;
}

/**
 * The website lead forms' event names, one per step of a form's life: shown,
 * first answered, sent, accepted, refused. The forms are the short WhatsApp lead forms that
 * post a typed lead to /api/join-waitlist (city alerts, "Know a host"
 * referrals and the playbook pages' forms). See "Primary web events" in
 * website/README.md; `npm run check:analytics-contract` pins the payloads.
 */
const websiteLeadFormEvents = {
  viewed: "lead_form_viewed",
  started: "lead_form_started",
  submitted: "lead_form_submitted",
  succeeded: "lead_form_succeeded",
  failed: "lead_form_failed",
} as const;
type WebsiteLeadFormStage = keyof typeof websiteLeadFormEvents;
type WebsiteLeadFormKind = NonNullable<JoinWaitlistHTTPRequest["requestKind"]>;
// Exactly the contract's kinds: a kind added to or dropped from the contract fails typecheck here.
const websiteLeadFormKinds: ReadonlySet<string> = new Set(Object.keys({
  guide: true, walkthrough: true, demo: true, venue: true, story: true, referral: true, org_contact: true, city_alerts: true,
} satisfies Record<WebsiteLeadFormKind, true>));
/** Why a lead was not accepted, as the lead client names it; never the server's words. */
type WebsiteLeadFormProblem = "invalid_phone" | "invalid" | "refresh" | "changed" | "busy" | "failed";
const websiteLeadFormProblems: readonly WebsiteLeadFormProblem[] = ["invalid_phone", "invalid", "refresh", "changed", "busy", "failed"];
/** The lead contract's form id (`lead.entry`), such as rc-wa or home-refer. */
const websiteLeadFormIdPattern = /^[a-z0-9][a-z0-9_-]{0,39}$/u;

export interface WebsiteLeadFormIdentity {
  /** The lead kind the form sends. */
  kind: WebsiteLeadFormKind;
  /** Which form on the page: the lead's `entry`. */
  formId: string;
}

/**
 * Records one step of a website lead form after analytics consent, as a
 * closed payload: the lead kind, the form id, the page path without its query
 * and, for a refusal, the lead client's problem. Answers, names, numbers,
 * hosts and request ids never enter it; anything outside the vocabulary
 * records nothing. Returns whether the event was recorded.
 */
export function trackWebsiteLeadFormEvent(stage: WebsiteLeadFormStage, form: WebsiteLeadFormIdentity,
  problem?: WebsiteLeadFormProblem): boolean {
  if (isPrivateEventUpdate() || getMarketingConsent()?.analytics !== true) return false;
  if (!Object.hasOwn(websiteLeadFormEvents, stage) || !websiteLeadFormKinds.has(form?.kind) ||
      typeof form.formId !== "string" || !websiteLeadFormIdPattern.test(form.formId)) return false;
  const parameters: Record<string, string> = {lead_kind: form.kind, form_id: form.formId, page_path: window.location.pathname};
  if (stage === "failed") {
    if (!problem || !websiteLeadFormProblems.includes(problem)) return false;
    parameters.problem = problem;
  }
  trackMarketingEvent(websiteLeadFormEvents[stage], parameters);
  return true;
}

export function trackMarketingEvent(
  eventName: string,
  parameters: Record<string, unknown> = {}
) {
  if (isPrivateEventUpdate()) return;
  // Diagnostics have a deliberately small projection. Successes use explicit receipt seams.
  if (eventName === "cta_click" && typeof parameters.cta_href === "string") {
    try {
      const target = new URL(parameters.cta_href, window.location.href);
      const route = target.origin === window.location.origin ? acquisitionRoute(target.pathname) : null;
      if (route) trackCatchAcquisitionEvent({name: "cta_click", target: route});
    } catch { /* Unknown CTA targets remain local. */ }
  }
  const starts: Record<string, AcquisitionForm> = {
    waitlist_started: "member_waitlist", host_lead_started: "host_lead",
    host_operating_application_started: "host_application",
  };
  if (starts[eventName]) trackCatchAcquisitionEvent({name: "acquisition_start", form: starts[eventName]});
  const sanitizedParameters = {...parameters};
  sanitizeAnalyticsUrlParameter(sanitizedParameters, "page_path");
  sanitizeAnalyticsUrlParameter(sanitizedParameters, "page_location");

  dataLayer().push({
    event: eventName,
    ...sanitizedParameters,
    content_version: marketingContentVersion,
  });
  forwardToGoogleAnalytics(eventName, parameters);
}

/**
 * Sends one diagnostic event on to Google Analytics after the analytics
 * choice, through its closed projection (`googleAnalyticsProjection`); an
 * event with no projection stays local. Returns whether it was sent.
 */
function forwardToGoogleAnalytics(eventName: string, parameters: Record<string, unknown>) {
  if (getMarketingConsent()?.analytics !== true) return false;
  const projected = googleAnalyticsProjection(eventName, parameters);
  return projected ? adTags.analyticsEvent(eventName, projected) : false;
}

const analyticsSlug = /^[a-z0-9][a-z0-9_-]{0,79}$/u;
const formatValue = /^[A-Za-z]{2,20}$/u;
const slugOrNull = (value: unknown) => typeof value === "string" && analyticsSlug.test(value) ? value : null;
const leadFormEventNames: ReadonlySet<string> = new Set(Object.values(websiteLeadFormEvents));
/** Outbound hosts a CTA class names, matched exactly: a look-alike host is "external". */
const outboundHostClasses: Readonly<Record<string, string>> = {
  "apps.apple.com": "app_store", "play.google.com": "play_store",
  "wa.me": "whatsapp", "whatsapp.com": "whatsapp", "www.whatsapp.com": "whatsapp", "api.whatsapp.com": "whatsapp",
  "web.whatsapp.com": "whatsapp",
};

/** Where a CTA leads, as a class or a public path; never a query, a token or another site's address. */
function ctaTarget(href: unknown): string | null {
  if (typeof href !== "string") return null;
  try {
    const target = new URL(href, window.location.href);
    if (target.protocol === "mailto:" || target.protocol === "tel:") return "contact";
    if (target.origin === window.location.origin) {
      if (target.pathname.startsWith("/organizers/")) return "organiser_page";
      return publicAdPage(target.pathname) ?? "private_page";
    }
    return Object.hasOwn(outboundHostClasses, target.hostname) ? outboundHostClasses[target.hostname] : "external";
  } catch {
    return null;
  }
}

/**
 * The GA4 parameters each forwarded event may carry: fixed vocabularies and
 * slugs only. No answers, names, numbers, free-text searches, organiser or
 * club ids, and never gender, age, orientation or dating data. Anything that
 * does not fit records nothing in Google Analytics.
 */
function googleAnalyticsProjection(eventName: string, p: Record<string, unknown>): Record<string, string | number> | null {
  if (leadFormEventNames.has(eventName)) {
    const kind = slugOrNull(p.lead_kind);
    const formId = slugOrNull(p.form_id);
    if (!kind || !formId) return null;
    const problem = slugOrNull(p.problem);
    return {lead_kind: kind, form_id: formId, ...(problem ? {problem} : {})};
  }
  switch (eventName) {
    case "cta_click": {
      const label = typeof p.cta_label === "string" ? p.cta_label.toLowerCase().replace(/[^a-z0-9]+/gu, "_")
        .replace(/^_+|_+$/gu, "").slice(0, 80) : "";
      const target = ctaTarget(p.cta_href);
      return label && target ? {cta_label: label, cta_target: target} : null;
    }
    case "store_cta_click":
    case "store_cta_pending": {
      const placement = slugOrNull(p.placement);
      if ((p.platform !== "ios" && p.platform !== "android") || !placement) return null;
      return {platform: p.platform, placement, app: p.app === "host" ? "host" : "guest"};
    }
    case "city_alerts_submitted": {
      const city = slugOrNull(p.city);
      const interests = typeof p.interests === "string" ?
        p.interests.split(",").filter((item) => formatValue.test(item)).slice(0, 8).join(",") : "";
      return city ? {city, ...(interests ? {interests} : {})} : null;
    }
    case "weddings_apply_step":
      return (p.step === 1 || p.step === 2) && (p.surface === "landing" || p.surface === "application") ?
        {step: p.step, surface: p.surface} : null;
    case "explore_filters_applied": {
      const format = typeof p.format === "string" && formatValue.test(p.format) ? p.format : null;
      const when = slugOrNull(p.when);
      const city = slugOrNull(p.city);
      if (!format || !when) return null;
      return {format, when, view: p.view === "organisers" ? "organisers" : "plans",
        has_query: p.has_query === true ? "yes" : "no", ...(city ? {city} : {})};
    }
    case "scroll_depth":
      return [25, 50, 75, 90].includes(p.percent_scrolled as number) ? {percent_scrolled: p.percent_scrolled as number} : null;
    case "section_read": {
      const section = slugOrNull(p.section_id);
      const seconds = Number(p.engaged_seconds);
      return section && Number.isInteger(seconds) && seconds >= 1 && seconds <= 1800 ?
        {section_id: section, engaged_seconds: seconds} : null;
    }
    default:
      return null;
  }
}

export function marketingCtaClickParameters(label: string, href: string) {
  return {
    cta_href: href,
    cta_label: label,
    page_path: window.location.pathname,
  };
}

export function createMarketingEventId(prefix: string) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}_${Date.now()}_${random}`;
}

export function waitlistAnalyticsPayload(
  eventId: string,
  formVariant: FormVariant
): WaitlistAnalyticsPayload {
  return {
    attribution: readAttribution(),
    analytics: {
      consent: submissionWireConsent(),
      eventId,
      formVariant,
      pagePath: acquisitionRoute(window.location.pathname) ?? "/",
      pageTitle: "Catch",
      submittedAt: new Date().toISOString(),
    },
  };
}

function submissionWireConsent(): WaitlistAnalyticsPayload["analytics"]["consent"] {
  const consent = getMarketingConsent();
  return consent ? {choice: consent.analytics ? "analytics" : "essential", analytics: consent.analytics,
    marketing: false, updatedAt: consent.updatedAt} : null;
}

function installConsentDefaults() {
  // Keep consent compatibility events local; never call an externally supplied gtag.
  const consent = getMarketingConsent();
  if (consent) {
    updateConsentMode(consent);
    return;
  }

  gtag("consent", "default", {
    ad_personalization: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    analytics_storage: "denied",
  });
}

function updateConsentMode(consent: MarketingConsent) {
  // Keep consent compatibility events local; never call an externally supplied gtag.
  gtag("consent", "update", {
    ad_personalization: "denied",
    ad_storage: consent.marketing ? "granted" : "denied",
    ad_user_data: consent.marketing ? "granted" : "denied",
    analytics_storage: consent.analytics ? "granted" : "denied",
  });
}

function installClientErrorMonitoring() {
  if (clientErrorMonitoringInstalled) return;
  clientErrorMonitoringInstalled = true;
  window.addEventListener("storage", (event) => {
    if (event.key === consentStorageKey || event.key === legacyConsentStorageKey ||
        previousConsentStorageKeys.includes(event.key ?? "") || event.key === null) {
      captureAttribution(); refreshMeasurementContext();
      window.dispatchEvent(new Event(marketingConsentChangedEvent));
    }
  });
  window.addEventListener("error", () => {
    trackClientErrorSignal("window_error");
  });
  window.addEventListener("unhandledrejection", () => {
    trackClientErrorSignal("unhandled_rejection");
  });
}

/** Campaign labels need a current analytics choice; they persist across pages until it is withdrawn. */
function attributionAllowed() {
  const consent = getMarketingConsent();
  return consent?.version === currentConsentVersion && consent.analytics === true;
}

function clearLegacyAttribution() {
  try { window.localStorage.removeItem(legacyAttributionStorageKey); } catch { /* Optional storage. */ }
}

function clearClickContext() {
  try { window.localStorage.removeItem(catchAttributionKey); } catch { /* Optional storage. */ }
}

function clearAttribution() {
  clearLegacyAttribution();
  try {
    window.localStorage.removeItem(attributionStorageKey);
    window.localStorage.removeItem(catchAttributionKey);
    window.sessionStorage?.removeItem("catch_marketing_attribution_v2");
    window.sessionStorage?.removeItem("catch_acquisition_context_v1");
  } catch { /* Optional storage. */ }
}

/**
 * Records approved campaign labels on public pages (`publicAdPage`). Other
 * pages, private ones included, neither record nor clear: only a withdrawn
 * choice or the 30-day expiry removes a touch.
 */
function captureAttribution() {
  clearLegacyAttribution();
  if (!attributionAllowed()) { clearAttribution(); return; }
  const current = currentAttributionTouch();
  if (!current) return;
  const stored = readAttribution();
  if (stored && Object.keys(current.values).length === 0) return;
  try {
    window.localStorage.setItem(attributionStorageKey, JSON.stringify({
      firstTouch: stored?.firstTouch ?? current, lastTouch: current,
    }));
  } catch { /* Attribution must not block a submission. */ }
}

function readAttribution(): StoredAttribution | null {
  clearLegacyAttribution();
  if (!attributionAllowed()) { clearAttribution(); return null; }
  try {
    const stored = JSON.parse(window.localStorage.getItem(attributionStorageKey) ?? "null") as StoredAttribution | null;
    const firstTouch = safeStoredTouch(stored?.firstTouch);
    const lastTouch = safeStoredTouch(stored?.lastTouch);
    if (!firstTouch || !lastTouch) { clearAttribution(); return null; }
    return {firstTouch, lastTouch};
  } catch { clearAttribution(); return null; }
}

function attributionTouch(capturedAt: string, landingPath: string, values: Record<string, string>): AttributionTouch {
  return {capturedAt, landingPath, landingUrl: `${brand.web.origin}${landingPath}`, referrer: null, values};
}

function safeStoredTouch(touch?: AttributionTouch): AttributionTouch | null {
  if (!touch || typeof touch.capturedAt !== "string" || !publicAdPage(touch.landingPath) ||
    !touch.values || typeof touch.values !== "object" || Array.isArray(touch.values)) return null;
  const age = Date.now() - Date.parse(touch.capturedAt);
  if (!Number.isFinite(age) || age < 0 || age > attributionMaxAgeMs) return null;
  return attributionTouch(touch.capturedAt, touch.landingPath, approvedCampaignLabels(touch.values));
}

function currentAttributionTouch(): AttributionTouch | null {
  const landingPath = publicAdPage(window.location.pathname);
  if (!landingPath) return null;
  const params = new URLSearchParams(window.location.search);
  const values: Record<string, string> = {};
  for (const key of attributionKeys) {
    const value = params.get(key);
    if (value !== null) values[key] = value;
  }
  return attributionTouch(new Date().toISOString(), landingPath, approvedCampaignLabels(values));
}

function sanitizeAnalyticsUrlParameter(
  parameters: Record<string, unknown>,
  key: "page_path" | "page_location"
) {
  const value = parameters[key];
  if (typeof value !== "string") return;
  parameters[key] = value.split(/[?#]/u, 1)[0];
}

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Attribution and consent storage should not block form submission.
  }
}

function isPrivateEventUpdate(): boolean {
  return isPrivateEventUpdatePath(window.location.pathname);
}
