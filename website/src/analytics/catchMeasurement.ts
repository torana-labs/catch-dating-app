import {brand} from "@catch/brand";
import {isPrivateEventUpdatePath} from "./privateRoutes.ts";

/** Catch acquisition boundary. This module never reads the DOM or the local bus. */
export const catchMeasurementVersion = 1 as const;
export type AcquisitionForm = "member_waitlist" | "host_lead" | "host_application" | "claim";
export interface MeasurementConsent {
  version: number;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
}

/** The stored consent receipt version. Version 6 is the first under which the
 * banner names organisers' own Meta and Google tags (owner decision relayed
 * 19 Nov 2026, #2063); version 7 is the first under which it names Microsoft
 * Clarity with site analytics. Every earlier choice, version 6 included, asks
 * again and loads nothing until it is answered. */
export const currentConsentVersion = 7 as const;

/** The live transport a stored consent choice was made under. The first-party
 * Google tag and Meta Pixel (`adTags.ts`) are "first_party_tags"; a choice
 * made under another mode asks again. */
export type CatchMeasurementMode = "disabled" | "first_party_tags";
export function catchMeasurementMode(): CatchMeasurementMode {
  return "first_party_tags";
}

const routes = {
  "/": "home", "/host/": "host", "/host/overview/": "host_overview",
  "/host/platform/": "host_platform", "/host/planners/": "host_planners",
  "/host/clubs/": "host_clubs", "/host/directory/": "host_directory",
  "/claim/": "claim", "/host/claim/": "claim",
  "/host/stack/": "host_stack", "/host/workflows/": "host_workflows",
} as const;
export type AcquisitionRoute = keyof typeof routes;
export function acquisitionRoute(path: string): AcquisitionRoute | null {
  if (typeof path !== "string") return null;
  const normalized = path === "/" ? path : `${path.replace(/\/$/u, "")}/`;
  return Object.hasOwn(routes, normalized) ? normalized as AcquisitionRoute : null;
}

// Pages whose path carries a private token, an organiser's page or an
// organiser's form. They never load, capture for or send to an advertising
// tag through `publicAdPage`. Organiser profiles reach Catch's own tags only
// through `catchOrganizerProfilePage` plus a server classification (#2063).
const tokenAndFormPrefixes = ["/join/", "/rehearse/", "/invite/", "/rsvp/", "/f/", "/claim/"];
const nonPublicPrefixes = ["/organizers", ...tokenAndFormPrefixes];
const eventPagePattern = /^\/events\/[A-Za-z0-9_:-]{1,180}\/$/u;
const publicPagePattern = /^\/(?:[a-z0-9][a-z0-9-]{0,80}\/){0,4}$/u;

/**
 * The public page a path names, normalised with a trailing slash, or null.
 * Public pages are the static marketing, discovery, campaign and city pages
 * and public event pages (docs/ads_conversion_spec.md, Payload and
 * attribution). Private routes (`privateRoutes.ts`), organiser pages,
 * organiser forms, dynamic claim lookups and token links are never public.
 */
export function publicAdPage(path: string): string | null {
  if (typeof path !== "string" || isPrivateEventUpdatePath(path)) return null;
  const normalized = path === "/" ? path : `${path.replace(/\/+$/u, "")}/`;
  if (normalized === "/claim/") return normalized;
  if (isPrivateEventUpdatePath(normalized) || nonPublicPrefixes.some((prefix) => normalized.startsWith(prefix))) return null;
  return eventPagePattern.test(normalized) || publicPagePattern.test(normalized) ? normalized : null;
}

/** Where organiser-owned tags may run (#2063): its public page or a public event page. */
export interface OrganizerTagPage {
  kind: "organizer" | "event";
  /** The normalised path, with a trailing slash. */
  path: string;
}

// Organiser profile routes: /organizers/:slug/ and /organizers/:citySlug/:slug/.
const organizerPagePattern = /^\/organizers\/(?:[a-z0-9][a-z0-9-]{0,80}\/){1,2}$/u;
// Segments that name a flow rather than a profile. A profile path containing
// one fails closed even if a slug happens to spell it.
const organizerFlowSegments: ReadonlySet<string> = new Set(["claim", "f", "form", "forms", "offer", "offers", "otp",
  "verify", "booking", "receipt", "receipts", "account", "demo", "join", "invite", "rsvp", "rehearse", "owner",
  "manage", "edit", "settings", "admin", "token"]);

/**
 * The page class organiser-owned tags may use, or null. It is the route side
 * of the eligibility rule only: the organiser's published public page
 * (`/organizers/:slug/`, `/organizers/:citySlug/:slug/`, not the directory)
 * and public event pages (`/events/:eventId/`). The server's public tracking
 * projection still decides whether that organiser and event are published,
 * active and non-dating. Private routes (`privateRoutes.ts`), claim, forms,
 * offers, OTP, booking receipts, account, demo and token links fail closed,
 * as does a non-anchor hash. A query may carry only the ad-click keys
 * `fbclid`, `gclid` and `utm_*` (owner decision, 19 Nov 2026, #2063), so
 * visits from the organiser's own ads are measured; any other key, or a
 * repeated key, fails closed.
 */
/** The only query keys an organiser-tag page may carry: the ad platforms' click keys. */
const organizerQueryKey = /^(?:fbclid|gclid|utm_(?:source|medium|campaign|content|term|id))$/u;

function organizerQueryAllowed(search: string) {
  if (search === "" || search === "?") return true;
  const keys = [...new URLSearchParams(search).keys()];
  return keys.length > 0 && new Set(keys).size === keys.length && keys.every((key) => organizerQueryKey.test(key));
}

/** A normalised organiser profile path, or null for the directory, a flow segment or anything else. */
function organizerProfilePath(normalized: string): string | null {
  if (!organizerPagePattern.test(normalized)) return null;
  const segments = normalized.split("/").filter(Boolean).slice(1);
  return segments.some((segment) => organizerFlowSegments.has(segment)) ? null : normalized;
}

/**
 * The route side of Catch's own tags on organiser profiles (owner decisions,
 * 19 Nov 2026, #2063): the same profile paths and flow exclusions as
 * `organizerAdPage`, or null. A route match alone never turns Catch's tags
 * on: the owner also ruled that dating-classified organisers (canonical
 * social, singles and mixer) and organisers with no classification are
 * skipped, failing closed. The website cannot classify an organiser (public
 * listings rewrite `singlesMixer`, CAT-247), so the tags need the server's
 * classification for the profile before this path may send. Until that is
 * wired, `publicAdPage` keeps every organiser page closed.
 */
export function catchOrganizerProfilePage(path: string): string | null {
  if (typeof path !== "string" || isPrivateEventUpdatePath(path)) return null;
  const normalized = `${path.replace(/\/+$/u, "")}/`;
  return isPrivateEventUpdatePath(normalized) ? null : organizerProfilePath(normalized);
}

export function organizerAdPage(path: string, search = "", hash = ""): OrganizerTagPage | null {
  if (typeof path !== "string" || typeof search !== "string" || typeof hash !== "string") return null;
  if (!organizerQueryAllowed(search)) return null;
  if (!/^(?:#[A-Za-z0-9_-]*)?$/u.test(hash)) return null;
  if (isPrivateEventUpdatePath(path)) return null;
  const normalized = `${path.replace(/\/+$/u, "")}/`;
  if (isPrivateEventUpdatePath(normalized) || tokenAndFormPrefixes.some((prefix) => normalized.startsWith(prefix))) return null;
  if (eventPagePattern.test(normalized)) return {kind: "event", path: normalized};
  const profile = organizerProfilePath(normalized);
  return profile ? {kind: "organizer", path: profile} : null;
}

// Closed campaign vocabulary; expand only with a reviewed campaign, never query text.
const campaignLabels: Record<string, readonly string[]> = {
  utm_source: ["google", "meta", "newsletter", "catch", "partner"],
  utm_medium: ["cpc", "paid_social", "email", "organic", "referral"],
  utm_campaign: ["launch", "launch_2026", "planner_launch", "host_acquisition_2026", "synthetic_launch"],
  utm_content: ["host_hero", "host_footer", "claim_cta", "application_cta"],
};
export function approvedCampaignLabels(values: Record<string, unknown>) {
  const safe: Record<string, string> = {};
  for (const [key, labels] of Object.entries(campaignLabels)) {
    const value = values[key];
    if (typeof value === "string" && labels.includes(value)) safe[key] = value;
  }
  return safe;
}

export type CatchAcquisitionEvent =
  | {name: "page_view"; visitId: string}
  | {name: "cta_click"; target: AcquisitionRoute}
  | {name: "acquisition_start"; form: AcquisitionForm}
  | {name: "lead_accepted"; form: Exclude<AcquisitionForm, "claim">;
      eventId: string; receipt: {ok: true; alreadyJoined: false}}
  | {name: "organizer_signup"; eventId: string;
      receipt: {authority: "organizer_account_created"; isNewAccount: true}}
  | {name: "claim_approved"; eventId: string;
      receipt: {authority: "claim_decision"; status: "approved"}}
  | {name: "organizer_activated"; eventId: string;
      receipt: {authority: "first_real_event_checkin"; firstActivation: true}}
  | {name: "purchase"; eventId: string; transactionId: string; value: number; currency: "INR";
      receipt: {authority: "catch_payment_settlement"; status: "settled"; audience: "organizer"}};

export interface SafeAcquisitionEvent {
  name: CatchAcquisitionEvent["name"];
  consent: Readonly<{analytics: true; marketing: boolean}>;
  parameters: Readonly<Record<string, string | number>>;
  attribution?: Readonly<CatchBrowserAttribution>;
}
export interface MeasurementContext {
  path: string;
  consent: MeasurementConsent | null;
  campaign?: Record<string, unknown>;
  attribution?: CatchBrowserAttribution | null;
}
const forms: readonly AcquisitionForm[] = ["member_waitlist", "host_lead", "host_application", "claim"];
const opaqueId = (id: unknown): id is string =>
  typeof id === "string" && /^(?:waitlist|host_lead|catch)_[0-9]{13}_(?:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|[a-z0-9]{8,24})$/u.test(id);

/** Rebuild every property, including for untyped JS callers. Unknown fields disappear. */
export function safeAcquisitionEvent(input: CatchAcquisitionEvent, context: MeasurementContext): SafeAcquisitionEvent | null {
  if (!input || typeof input !== "object") return null;
  const path = acquisitionRoute(context.path);
  if (!path || path === "/" || context.consent?.version !== currentConsentVersion || context.consent.analytics !== true) return null;
  const parameters: Record<string, string | number> = {
    contract_version: catchMeasurementVersion,
    page_path: path,
    // Fixed origin/title; never document.title, referrer, search, hash, or arbitrary host.
    page_location: `${brand.web.origin}${path}`,
    page_title: "Catch",
    page_name: routes[path],
    audience: "organizer",
    ...approvedCampaignLabels(context.campaign ?? {}),
  };
  switch (input.name) {
    case "page_view":
      if (!opaqueId(input.visitId)) return null;
      break;
    case "cta_click":
      if (!acquisitionRoute(input.target)) return null;
      parameters.cta_target = acquisitionRoute(input.target)!;
      break;
    case "acquisition_start":
      if (!forms.includes(input.form) || input.form === "member_waitlist") return null;
      parameters.form = input.form;
      parameters.audience = "organizer";
      break;
    case "lead_accepted":
      if (!opaqueId(input.eventId) || !forms.includes(input.form) || input.form === "member_waitlist" || (input.form as string) === "claim" ||
          input.receipt?.ok !== true || input.receipt.alreadyJoined !== false) return null;
      parameters.event_id = input.eventId;
      parameters.form = input.form;
      parameters.audience = "organizer";
      break;
    case "organizer_signup":
      if (!opaqueId(input.eventId) || input.receipt?.authority !== "organizer_account_created" ||
          input.receipt.isNewAccount !== true) return null;
      parameters.event_id = input.eventId;
      parameters.audience = "organizer";
      break;
    case "claim_approved":
      if (!opaqueId(input.eventId) || input.receipt?.authority !== "claim_decision" ||
          input.receipt.status !== "approved") return null;
      parameters.event_id = input.eventId;
      parameters.audience = "organizer";
      break;
    case "organizer_activated":
      if (!opaqueId(input.eventId) || input.receipt?.authority !== "first_real_event_checkin" ||
          input.receipt.firstActivation !== true) return null;
      parameters.event_id = input.eventId;
      parameters.audience = "organizer";
      break;
    case "purchase":
      if (!opaqueId(input.eventId) || !opaqueId(input.transactionId) || input.currency !== "INR" ||
          !Number.isFinite(input.value) || input.value <= 0 || input.value > 10_000_000 ||
          input.receipt?.authority !== "catch_payment_settlement" || input.receipt.status !== "settled" ||
          input.receipt.audience !== "organizer") return null;
      parameters.event_id = input.eventId;
      parameters.transaction_id = input.transactionId;
      parameters.value = input.value;
      parameters.currency = input.currency;
      parameters.audience = "organizer";
      break;
    default: return null;
  }
  return {name: input.name, consent: Object.freeze({analytics: true, marketing: context.consent.marketing === true}),
    parameters: Object.freeze(parameters),
    ...(safeBrowserAttribution(context.attribution, context.consent.marketing) ?
      {attribution: Object.freeze(safeBrowserAttribution(context.attribution, context.consent.marketing)!)} : {})};
}

export interface CatchProviderSession {
  send(event: SafeAcquisitionEvent): void;
  destroy(): void;
}
export type CatchProviderTransport = (provider: "google" | "meta") => CatchProviderSession;
export const catchProviderDefaults = Object.freeze({google: false, meta: false});

/** Only injected controlled transports can run. No diagnostic bus, arbitrary globals or replay queue. */
export function createCatchMeasurementController(transport?: CatchProviderTransport) {
  const sessions = new Map<"google" | "meta", CatchProviderSession>();
  const observed = new Set<string>();
  let context: MeasurementContext = {path: "", consent: null};
  function destroy() {
    for (const session of sessions.values()) {
      try { session.destroy(); } catch { /* Optional telemetry cannot block the page. */ }
    }
    sessions.clear();
  }
  function update(next: MeasurementContext) {
    const previous = context;
    context = next;
    if (previous.path !== next.path || previous.consent?.updatedAt !== next.consent?.updatedAt) destroy();
    const allowed = acquisitionRoute(next.path) && next.path !== "/" && next.consent?.version === currentConsentVersion;
    for (const provider of ["google", "meta"] as const) {
      const permitted = allowed && next.consent?.analytics === true &&
        (provider === "google" || next.consent.marketing === true);
      if (!permitted && sessions.has(provider)) {
        try { sessions.get(provider)!.destroy(); } catch { /* Optional telemetry. */ }
        sessions.delete(provider);
      }
      if (permitted && transport && !sessions.has(provider)) {
        try { sessions.set(provider, transport(provider)); } catch { /* No retry backlog. */ }
      }
    }
  }
  function track(input: CatchAcquisitionEvent) {
    const event = safeAcquisitionEvent(input, context);
    if (!event) return false;
    const id = input.name === "page_view" ? input.visitId : event.parameters.event_id;
    // One business receipt can never become two separately named outcomes.
    const keys = id ? [String(id)] : [];
    if (input.name === "purchase") keys.push(`transaction:${input.transactionId}`);
    if (keys.some((key) => observed.has(key)) || observed.size + keys.length > 4096) return false;
    for (const key of keys) observed.add(key);
    for (const session of sessions.values()) {
      try { session.send(event); } catch { /* Failed delivery is dropped, never replayed. */ }
    }
    return true;
  }
  return {update, track, destroy};
}


/** Closed browser context. The consented server intake uses a separate explicit
 * projection; this object never belongs in the diagnostic bus. */
export interface CatchBrowserAttribution {
  clientId: string;
  sessionId: number;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  /** When the current Google click identifier was first seen (epoch ms). */
  googleClickCapturedAt?: number;
  fbclid?: string;
  fbclidCapturedAt?: number;
}
interface StoredContext extends CatchBrowserAttribution {
  createdAt: number;
  consentRevision: string;
  lastSeenAt: number;
}
export const catchAttributionKey = "catch_acquisition_context_v2";
export const catchAttributionMaxAgeMs = 30 * 24 * 60 * 60 * 1000;
const clickKeys = ["gclid", "gbraid", "wbraid", "fbclid"] as const;
const googleClickKeys = ["gclid", "gbraid", "wbraid"] as const;
const clickId = (value: unknown): value is string => typeof value === "string" &&
  /^[A-Za-z0-9_-]{10,512}$/u.test(value);
const capturedAt = (value: unknown) => Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : undefined;

/** Rebuild stored/message values; no arbitrary query keys, URLs or identifiers. */
export function safeBrowserAttribution(value: unknown, marketing: boolean): CatchBrowserAttribution | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if (typeof input.clientId !== "string" || !/^\d{1,10}\.\d{10}$/u.test(input.clientId) ||
      !Number.isSafeInteger(input.sessionId) || Number(input.sessionId) < 1_000_000_000 ||
      Number(input.sessionId) > 9_999_999_999) return null;
  const result: CatchBrowserAttribution = {clientId: input.clientId, sessionId: Number(input.sessionId)};
  if (marketing) for (const key of clickKeys) if (clickId(input[key])) result[key] = input[key];
  const googleAt = capturedAt(input.googleClickCapturedAt);
  if (googleAt && googleClickKeys.some((key) => result[key])) result.googleClickCapturedAt = googleAt;
  const metaAt = capturedAt(input.fbclidCapturedAt);
  if (result.fbclid && metaAt) result.fbclidCapturedAt = metaAt;
  return result;
}

/** Only the click identifiers (and when each was first seen) of a context. */
function clickFields(context: CatchBrowserAttribution | null): Partial<CatchBrowserAttribution> {
  const clicks: Partial<CatchBrowserAttribution> = {};
  for (const key of clickKeys) if (context?.[key]) clicks[key] = context[key];
  if (context?.googleClickCapturedAt) clicks.googleClickCapturedAt = context.googleClickCapturedAt;
  if (context?.fbclidCapturedAt) clicks.fbclidCapturedAt = context.fbclidCapturedAt;
  return clicks;
}

/**
 * The browser's acquisition context under a current choice. Click identifiers
 * (gclid, gbraid, wbraid, fbclid) and when each was first seen are read only
 * under an explicit marketing choice, on public pages (`publicAdPage`). The
 * context lives for 30 days from the latest ad click, survives navigation,
 * including private pages (which neither read nor clear it), and is cleared
 * when the choice is withdrawn or analytics is refused.
 */
export function browserAttribution(input: {
  enabled: boolean; path: string; search: string; consent: MeasurementConsent | null;
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  now: number; random: () => number;
}): CatchBrowserAttribution | null {
  const {storage, consent, now} = input;
  const clear = () => { try { storage.removeItem(catchAttributionKey); } catch { /* Optional storage. */ } };
  // No collection before the reviewed transport is activated, or under old copy.
  if (!input.enabled || consent?.version !== currentConsentVersion || !consent.analytics) {
    clear(); return null;
  }
  // Private and organiser pages never read the address or touch stored context.
  if (!publicAdPage(input.path)) return null;
  try {
    const stored = JSON.parse(storage.getItem(catchAttributionKey) ?? "null") as StoredContext | null;
    const age = stored ? now - stored.createdAt : NaN;
    const valid = stored && Number.isFinite(age) && age >= 0 && age < catchAttributionMaxAgeMs ?
      safeBrowserAttribution(stored, consent.marketing) : null;
    // A changed choice starts a new analytics identity; click identifiers carry
    // over only while marketing is still allowed (withdrawal clears them first).
    const context: StoredContext = valid && stored!.consentRevision === consent.updatedAt ? {...valid,
      createdAt: stored!.createdAt, consentRevision: consent.updatedAt, lastSeenAt: now,
      sessionId: Number.isFinite(stored!.lastSeenAt) && now - stored!.lastSeenAt < 30 * 60 * 1000 ?
        valid.sessionId : Math.floor(now / 1000)} : {
      ...clickFields(valid),
      clientId: `${input.random() >>> 0}.${Math.floor(now / 1000)}`,
      sessionId: Math.floor(now / 1000), createdAt: valid ? stored!.createdAt : now, lastSeenAt: now,
      consentRevision: consent.updatedAt,
    };
    // Read identifiers only after explicit marketing permission. New Google ad
    // touches replace the previous Google touch; Meta is retained independently.
    // Each new ad click restarts the 30-day lifetime.
    if (consent.marketing) {
      const params = new URLSearchParams(input.search);
      const google = googleClickKeys.filter(key => clickId(params.get(key)));
      if (google.length && google.some((key) => params.get(key) !== context[key])) {
        delete context.gclid; delete context.gbraid; delete context.wbraid;
        for (const key of google) context[key] = params.get(key)!;
        context.googleClickCapturedAt = now;
        context.createdAt = now;
      }
      const metaClick = params.get("fbclid");
      if (clickId(metaClick) && metaClick !== context.fbclid) {
        context.fbclid = metaClick;
        context.fbclidCapturedAt = now;
        context.createdAt = now;
      }
    }
    storage.setItem(catchAttributionKey, JSON.stringify(context));
    return safeBrowserAttribution(context, consent.marketing);
  } catch { clear(); return null; }
}
