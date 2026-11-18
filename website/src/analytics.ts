import {acquisitionRoute, approvedCampaignLabels, createCatchMeasurementController,
  type CatchAcquisitionEvent, type AcquisitionForm, type MeasurementConsent} from "./analytics/catchMeasurement.ts";
import {browserAttribution, catchAttributionKey, catchMeasurementMode, currentConsentVersion, publicAdPage,
  type CatchMeasurementMode} from "./analytics/catchMeasurement.ts";
import {adTags, type AdBooking, type AdEventPageFacts, type AdHostLead} from "./analytics/adTags.ts";
import {isPrivateEventUpdatePath} from "./analytics/privateRoutes.ts";
import type {JoinWaitlistHTTPRequest} from "./shared/contracts/generated/joinWaitlistHttpRequest";
import {brand} from "@catch/brand";

type ConsentChoice = "accepted" | "analytics" | "essential";
type FormVariant = "member" | "host";

export const marketingContentVersion = "website_copy_v2" as const;

export interface MarketingConsent extends MeasurementConsent {
  version: 1 | 2 | 3 | 4 | 5;
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
// Receipts from before the first-party tags (versions 2 to 4). They keep
// analytics but never marketing, and the banner asks again.
const previousConsentStorageKeys = ["catch_marketing_consent_v4", "catch_marketing_consent_v3", "catch_marketing_consent_v2"];
const consentStorageKey = "catch_marketing_consent_v5";
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
    if (![2, 3, 4].includes(previous.version) || !validConsent(previous)) return null;
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

/**
 * A host enquiry from a website lead form was accepted. It reaches the ad
 * tags only under the marketing choice the submission started with, still
 * unchanged, and only for host lead kinds (`adTags.hostLead`).
 */
export function trackHostLeadAccepted(lead: AdHostLead, submissionConsent: MarketingConsent | null) {
  refreshMeasurementContext();
  const current = getMarketingConsent();
  if (submissionConsent?.version !== currentConsentVersion || !submissionConsent.marketing ||
      current?.version !== currentConsentVersion || current.updatedAt !== submissionConsent.updatedAt) return false;
  return adTags.hostLead(lead);
}

/** A public event page was shown (`adTags.viewItem`). */
export function trackEventPageViewed(facts: AdEventPageFacts) {
  refreshMeasurementContext();
  return adTags.viewItem(facts);
}

/** A live paid checkout opened (`adTags.beginCheckout`). */
export function trackCheckoutOpened(booking: AdBooking) {
  refreshMeasurementContext();
  return adTags.beginCheckout(booking);
}

/** A booking this browser checked out was confirmed (`adTags.purchase`). */
export function trackBookingConfirmed(booking: AdBooking) {
  refreshMeasurementContext();
  return adTags.purchase(booking);
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
  const current = getMarketingConsent();
  if (!eventId || submissionConsent?.version !== currentConsentVersion || !submissionConsent.analytics ||
      current?.version !== currentConsentVersion || current.updatedAt !== submissionConsent.updatedAt || alreadyJoined) return false;
  return trackCatchAcquisitionEvent({name: "lead_accepted", eventId, form,
    receipt: {ok: true, alreadyJoined: false}});
}

/**
 * The website lead forms' event names, one per step of a form's life: shown,
 * sent, accepted, refused. The forms are the short WhatsApp lead forms that
 * post a typed lead to /api/join-waitlist (city alerts, "Know a host"
 * referrals and the playbook pages' forms). See "Primary web events" in
 * website/README.md; `npm run check:analytics-contract` pins the payloads.
 */
const websiteLeadFormEvents = {
  viewed: "lead_form_viewed",
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
