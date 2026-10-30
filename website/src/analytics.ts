import {acquisitionRoute, approvedCampaignLabels, createCatchMeasurementController,
  type CatchAcquisitionEvent, type AcquisitionForm, type MeasurementConsent} from "./analytics/catchMeasurement.ts";
import {browserAttribution, catchAttributionKey} from "./analytics/catchMeasurement.ts";
import {catchMeasurementMode, type CatchMeasurementMode, configuredCatchTransport} from "./analytics/catchLiveTransport.ts";
import {createHostServerConsent, postHostServerConsent} from "./analytics/hostServerConsent.ts";
import type {JoinWaitlistHTTPRequest} from "./shared/contracts/generated/joinWaitlistHttpRequest";
import {brand} from "@catch/brand";

export type {CatchProviderSession, SafeAcquisitionEvent} from "./analytics/catchMeasurement.ts";

type ConsentChoice = "accepted" | "analytics" | "essential";
type FormVariant = "member" | "host";

export const marketingContentVersion = "website_copy_v2" as const;

export interface MarketingConsent extends MeasurementConsent {
  version: 1 | 2 | 3 | 4;
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
  hostMeasurement?: JoinWaitlistHTTPRequest["hostMeasurement"];
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
const legacyConsentStorageKey = "catch_marketing_consent_v1";
const previousConsentStorageKey = "catch_marketing_consent_v2";
const consentStorageKey = "catch_marketing_consent_v4";
const measurement = createCatchMeasurementController(configuredCatchTransport);
let lastPageKey: string | null = null;
let consentRevisionMs = 0;
let clientErrorMonitoringInstalled = false;
let serverConsent: ReturnType<typeof createHostServerConsent> | null = null;
let attributionContext: ReturnType<typeof browserAttribution> = null;

function serverConsentOwner() {
  if (!serverConsent) serverConsent = createHostServerConsent({
    storage: window.localStorage, request: postHostServerConsent, now: Date.now,
    withLock: run => navigator.locks.request("catch-host-server-consent-v1", run),
    isCurrentChoice: choice => {
      const current = getMarketingConsent();
      return current?.version === choice?.version &&
        current?.updatedAt === choice?.updatedAt && current?.analytics === choice?.analytics &&
        current?.marketing === choice?.marketing;
    },
    randomCapability: () => Array.from(crypto.getRandomValues(new Uint8Array(32)),
      byte => byte.toString(16).padStart(2, "0")).join(""),
  });
  return serverConsent;
}

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
    if (stored.version !== 4 || !validConsent(stored)) { clearAttribution(); return null; }
    if (stored.measurementMode !== catchMeasurementMode()) {
      clearAttribution();
      return {...stored, version: 2, choice: stored.analytics ? "analytics" : "essential", marketing: false};
    }
    if (!stored.analytics) clearAttribution();
    return stored;
  }
  const previous = readJson<MarketingConsent>("catch_marketing_consent_v3") ?? readJson<MarketingConsent>(previousConsentStorageKey);
  if (previous) {
    clearAttribution();
    if (![2, 3].includes(previous.version) || !validConsent(previous)) return null;
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
  return consent?.version !== 4;
}

export function setMarketingConsent(choice: ConsentChoice) {
  const previous = getMarketingConsent();
  // A new revision cancels in-flight conversion permission, including same-ms revoke/accept.
  consentRevisionMs = Math.max(Date.now(), consentRevisionMs + 1);
  const consent: MarketingConsent = {
    version: 4, choice,
    measurementMode: catchMeasurementMode(),
    analytics: choice === "analytics" || choice === "accepted",
    marketing: choice === "accepted",
    updatedAt: new Date(consentRevisionMs).toISOString(),
  };
  writeJson(consentStorageKey, consent);
  try { window.localStorage.removeItem(legacyConsentStorageKey); window.localStorage.removeItem(previousConsentStorageKey); window.localStorage.removeItem("catch_marketing_consent_v3"); } catch { /* Optional storage. */ }
  updateConsentMode(consent);
  captureAttribution();
  refreshMeasurementContext();
  // Begin a current-page visit after first permission; never replay earlier pages
  // or produce another view for an analytics-to-marketing upgrade.
  if (consent.analytics && (previous?.version !== 4 || !previous.analytics)) {
    measurement.track({name: "page_view", visitId: createMarketingEventId("catch")});
  }
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
  attributionContext = attribution;
  try {
    void serverConsentOwner().sync({enabled: catchMeasurementMode() === "host-server-live-v1",
      path: window.location.pathname, consent: getMarketingConsent()});
  } catch { /* Optional permission storage must not block the application. */ }
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
  if (!eventId || submissionConsent?.version !== 4 || !submissionConsent.analytics ||
      current?.version !== 4 || current.updatedAt !== submissionConsent.updatedAt || alreadyJoined) return false;
  return trackCatchAcquisitionEvent({name: "lead_accepted", eventId, form,
    receipt: {ok: true, alreadyJoined: false}});
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
  const hostMeasurement = formVariant === "host" ? hostMeasurementPayload() : undefined;
  return {
    ...(hostMeasurement ? {hostMeasurement} : {}),
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

function hostMeasurementPayload(): JoinWaitlistHTTPRequest["hostMeasurement"] | undefined {
  if (catchMeasurementMode() !== "host-server-live-v1") return undefined;
  refreshMeasurementContext();
  const consent = getMarketingConsent();
  if (consent?.version !== 4 || !consent.analytics || !consent.marketing || !attributionContext) return undefined;
  const capability = serverConsent?.snapshot(consent.updatedAt);
  if (!capability) return undefined;
  const {clientId, fbclid, fbclidCapturedAt} = attributionContext;
  return {capability, clientId,
    ...(fbclid && fbclidCapturedAt && fbclidCapturedAt <= Date.now() ?
      {fbclid, clickCapturedAt: fbclidCapturedAt} : {})};
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
    if (event.key === consentStorageKey || event.key === legacyConsentStorageKey || event.key === previousConsentStorageKey || event.key === "catch_marketing_consent_v3" || event.key === null) {
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

function canCaptureAttribution() {
  const consent = getMarketingConsent();
  return window.location.pathname !== "/" && acquisitionRoute(window.location.pathname) !== null && consent?.version === 4 && consent.analytics === true;
}

function clearLegacyAttribution() {
  try { window.localStorage.removeItem(legacyAttributionStorageKey); } catch { /* Optional storage. */ }
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

function captureAttribution() {
  clearLegacyAttribution();
  if (!canCaptureAttribution()) { clearAttribution(); return; }
  const current = currentAttributionTouch();
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
  if (!canCaptureAttribution()) { clearAttribution(); return null; }
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
  if (!touch || typeof touch.capturedAt !== "string" || !acquisitionRoute(touch.landingPath) ||
    !touch.values || typeof touch.values !== "object" || Array.isArray(touch.values)) return null;
  const age = Date.now() - Date.parse(touch.capturedAt);
  if (!Number.isFinite(age) || age < 0 || age > attributionMaxAgeMs) return null;
  return attributionTouch(touch.capturedAt, touch.landingPath, approvedCampaignLabels(touch.values));
}

function currentAttributionTouch(): AttributionTouch {
  const params = new URLSearchParams(window.location.search);
  const values: Record<string, string> = {};
  for (const key of attributionKeys) {
    const value = params.get(key);
    if (value !== null) values[key] = value;
  }
  return attributionTouch(new Date().toISOString(), acquisitionRoute(window.location.pathname)!, approvedCampaignLabels(values));
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
  return window.location.pathname.startsWith("/demo/") ||
    window.location.pathname.startsWith("/event-update/") ||
    window.location.pathname.startsWith("/booking/") ||
    window.location.pathname === "/offer" || window.location.pathname === "/offer/";
}
