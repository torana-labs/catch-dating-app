import {getMarketingConsent, marketingConsentChangedEvent} from "../../analytics";
import type {RecordOrganizerAnalyticsEventPayload} from "../../firebase";
import {isPublicApiEnabled} from "./selectors";
import type {HostListing} from "./types";

type OrganizerAnalyticsEventName =
  | "listingView"
  | "searchAppearance"
  | "eventView"
  | "organizerSave"
  | "eventSave"
  | "contactClick"
  | "claimClick"
  | "outboundClick"
  | "linkClick";

/** contracts/callables/record_organizer_analytics_event_payload.schema.json trafficSource. */
export type OrganizerTrafficSource = NonNullable<RecordOrganizerAnalyticsEventPayload["trafficSource"]>;

const trackedOrganizerSearchAppearances = new Set<string>();
const sessionStorageKey = "catch_host_analytics_session_v1";
const viewStorageKey = "catch_host_analytics_views_v1";
const trafficSourceStorageKey = "catch_host_analytics_traffic_source_v1";
const pendingViews = new Map<string, symbol>();
let consentEpoch = 0;

export function trackOrganizerSearchAppearance(
  listing: HostListing,
  appearanceContext: string
) {
  if (!hasOrganizerAnalyticsConsent()) return;
  const key = `${listing.id}:${appearanceContext}`;
  if (trackedOrganizerSearchAppearances.has(key)) return;
  if (trackedOrganizerSearchAppearances.size > 2000) {
    trackedOrganizerSearchAppearances.clear();
  }
  trackedOrganizerSearchAppearances.add(key);
  trackOrganizerAnalytics(listing, "searchAppearance", "directory_result");
}

/**
 * Counts a visitor opening one of the organiser's own links (CAT-254), with
 * where the visit came from on the fixed traffic-source list.
 */
export function trackOrganizerLinkClick(listing: HostListing, linkId: string, source: string) {
  trackOrganizerAnalytics(listing, "linkClick", source, null, linkId);
}

export function trackOrganizerAnalytics(
  listing: HostListing,
  eventName: OrganizerAnalyticsEventName,
  source?: string,
  eventId?: string | null,
  linkId?: string
) {
  if (!hasOrganizerAnalyticsConsent()) return;
  if (!isPublicApiEnabled(listing)) return;
  const pagePath = window.location.pathname;
  const sessionId = hostAnalyticsSessionId();
  const link = eventName === "linkClick" && linkId ? {linkId, trafficSource: sessionTrafficSource()} : {};
  // Views describe rendered pages, once per consented tab session and UTC day.
  const viewKey = eventName === "listingView" || eventName === "eventView"
    ? JSON.stringify([new Date().toISOString().slice(0, 10), listing.id, eventName, eventId ?? null])
    : null;
  if (viewKey && (pendingViews.has(viewKey) || readViewedPages().includes(viewKey))) return;
  const requestEpoch = consentEpoch;
  const requestToken = Symbol();
  if (viewKey) pendingViews.set(viewKey, requestToken);
  void import("../../firebase")
    .then(({recordOrganizerAnalyticsEvent}) =>
      requestEpoch === consentEpoch && hasOrganizerAnalyticsConsent() ? recordOrganizerAnalyticsEvent({
        organizerId: listing.id,
        eventId: eventId ?? null,
        eventName,
        pagePath,
        source: source ?? null,
        sessionId,
        platform: "web",
        ...link,
      }) : {accepted: false}
    )
    .then((result) => {
      if (result.accepted && viewKey && requestEpoch === consentEpoch && hasOrganizerAnalyticsConsent()) {
        try {
          window.sessionStorage.setItem(viewStorageKey, JSON.stringify([...readViewedPages(), viewKey].slice(-1000)));
        } catch { /* Storage is optional; do not block the page. */ }
      }
    })
    .catch(() => undefined)
    .finally(() => {
      if (viewKey && pendingViews.get(viewKey) === requestToken) pendingViews.delete(viewKey);
    });
}

function hasOrganizerAnalyticsConsent() {
  const allowed = typeof window !== "undefined" && getMarketingConsent()?.analytics === true;
  if (!allowed) clearOrganizerAnalyticsState();
  return allowed;
}

function hostAnalyticsSessionId(): string | null {
  try {
    const existing = window.sessionStorage.getItem(sessionStorageKey);
    if (existing) return existing;
    const next =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    window.sessionStorage.setItem(sessionStorageKey, next);
    return next;
  } catch {
    return null;
  }
}

function clearOrganizerAnalyticsState() {
  ++consentEpoch;
  pendingViews.clear();
  trackedOrganizerSearchAppearances.clear();
  if (typeof window === "undefined") return;
  for (const key of [sessionStorageKey, viewStorageKey, trafficSourceStorageKey]) {
    try { window.sessionStorage.removeItem(key); } catch { /* Optional storage. */ }
    try { window.localStorage.removeItem(key); } catch { /* Remove obsolete persistent IDs too. */ }
  }
}

if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  // Fence even revoke/regrant cycles while a callable is still outstanding.
  window.addEventListener(marketingConsentChangedEvent, () => {
    ++consentEpoch;
    pendingViews.clear();
    hasOrganizerAnalyticsConsent();
  });
  hasOrganizerAnalyticsConsent();
}

const trafficSources: readonly OrganizerTrafficSource[] =
  ["instagram", "whatsapp", "facebook", "google", "qr", "email", "direct", "other"];

const viaSources: Record<string, OrganizerTrafficSource> = {
  instagram: "instagram", ig: "instagram",
  whatsapp: "whatsapp", wa: "whatsapp",
  facebook: "facebook", fb: "facebook",
  google: "google",
  qr: "qr",
  email: "email", mail: "email", newsletter: "email",
};

const referrerSources: Array<[RegExp, OrganizerTrafficSource]> = [
  [/(?:^|\.)instagram\.com$/u, "instagram"],
  [/(?:^|\.)(?:whatsapp\.com|whatsapp\.net|wa\.me)$/u, "whatsapp"],
  [/(?:^|\.)(?:facebook\.com|fb\.com|fb\.me|messenger\.com)$/u, "facebook"],
  [/^(?:mail\.google\.com|outlook\.(?:live|office)\.com|mail\.yahoo\.com)$/u, "email"],
  [/(?:^|\.)google\.[a-z.]+$/u, "google"],
];

/**
 * Maps where a visit came from to the contract's fixed traffic-source list:
 * `?via=` first (QR codes and shared links set it), then the referrer's host.
 * Unknown values become "other", so no raw referrer or campaign text leaves
 * the page.
 */
export function trafficSourceOf(referrer: string, search: string, origin: string): OrganizerTrafficSource {
  const via = new URLSearchParams(search).get("via")?.trim().toLowerCase();
  if (via) return viaSources[via] ?? "other";
  if (!referrer) return "direct";
  let url: URL;
  try { url = new URL(referrer); } catch { return "other"; }
  if (url.origin === origin) return "other";
  const host = url.hostname.toLowerCase();
  return referrerSources.find(([pattern]) => pattern.test(host))?.[1] ?? "other";
}

/** The source of the visit's landing page, kept for the consented tab session. */
function sessionTrafficSource(): OrganizerTrafficSource {
  try {
    const stored = window.sessionStorage.getItem(trafficSourceStorageKey);
    const known = trafficSources.find((source) => source === stored);
    if (known) return known;
  } catch { /* Storage is optional; fall back to this page's source. */ }
  const source = trafficSourceOf(document.referrer, window.location.search, window.location.origin);
  try { window.sessionStorage.setItem(trafficSourceStorageKey, source); } catch { /* Optional storage. */ }
  return source;
}

function readViewedPages(): string[] {
  try {
    const value: unknown = JSON.parse(window.sessionStorage.getItem(viewStorageKey) ?? "[]");
    return Array.isArray(value) ? value.filter((key): key is string => typeof key === "string").slice(-1000) : [];
  } catch { return []; }
}

// First-party only: this seam never forwards organizer identifiers to ad adapters.
export function observeOrganizerPageView(
  listing: HostListing,
  eventName: "listingView" | "eventView",
  source: string,
  eventId?: string
): () => void {
  const recordView = () => trackOrganizerAnalytics(listing, eventName, source, eventId);
  recordView();
  window.addEventListener(marketingConsentChangedEvent, recordView);
  return () => window.removeEventListener(marketingConsentChangedEvent, recordView);
}
