import {brand} from "@catch/brand";
import {approvedCampaignLabels, currentConsentVersion, publicAdPage, type MeasurementConsent} from "./catchMeasurement.ts";

/**
 * Catch's first-party Google tag and Meta Pixel (docs/ads_conversion_spec.md,
 * "First-party browser transport"). This module is the only code that loads
 * gtag.js or fbevents.js or calls either tag. `analytics.ts` owns consent and
 * the page lifecycle and calls it; nothing else reads the diagnostic
 * `dataLayer` bus, and there is no tag manager.
 *
 * - Both tags load only under a current marketing choice, on a public page
 *   (`publicAdPage`) of the production site. Essential and analytics-only
 *   choices load nothing.
 * - Google Consent Mode grants ad storage, analytics storage and ad user data
 *   under that choice; ad personalisation stays denied. Meta gets
 *   `fbq('consent', 'grant')`.
 * - A withdrawn or downgraded choice revokes both (Consent Mode denied,
 *   `fbq('consent', 'revoke')`), stops every send and removes the tags'
 *   first-party cookies. Requests already sent cannot be recalled.
 * - Every event carries an `event_id` the server delivery can share. Events
 *   carry only the closed parameters below: never answers, gender, age,
 *   orientation, matching or dating data, or who someone met.
 */

/** Catch's own advertising destinations: account configuration, not secrets. */
export const catchAdDestinations = Object.freeze({
  /** GA4 property 559735544. */
  googleAnalytics: "G-HZFG0DL2DK",
  /** Google Ads tag for customer 1016806229. */
  googleAds: "AW-18526407471",
  /** Host website-lead conversion (action 7908216651, secondary). */
  hostLeadConversion: "AW-18526407471/WgIECMue97odEK-WioJF",
  /** Meta Pixel / dataset. */
  metaPixel: "1844810253539672",
});

/** gtag.js reads its own data layer, never the site's diagnostic `dataLayer`. */
const tagLayerName = "catchTagLayer";
const googleTagSource = `https://www.googletagmanager.com/gtag/js?id=${catchAdDestinations.googleAnalytics}&l=${tagLayerName}`;
const metaPixelSource = "https://connect.facebook.net/en_US/fbevents.js";
/** The banner promises cookies for up to 30 days. */
const googleCookieOptions = {cookie_expires: 30 * 24 * 60 * 60, cookie_flags: "SameSite=Lax;Secure"};
const checkoutsKey = "catch_ad_checkouts_v1";

/** Website lead kinds that are a host enquiry (city alerts and referrals are not). */
export const hostLeadKinds: ReadonlySet<string> = new Set(["guide", "walkthrough", "demo", "venue", "story", "org_contact"]);

const deniedConsent = {ad_storage: "denied", analytics_storage: "denied", ad_user_data: "denied", ad_personalization: "denied"};
const grantedConsent = {ad_storage: "granted", analytics_storage: "granted", ad_user_data: "granted", ad_personalization: "denied"};
/** The only query keys a page may carry while a tag sends: the ad platforms' own. */
const adQueryKey = /^(?:utm_(?:source|medium|campaign|content|term|id)|gclid|gbraid|wbraid|fbclid|gad_source|gad_campaignid)$/u;
const googleClick = /^[A-Za-z0-9_-]{10,512}$/u;
const eventIdPattern = /^[A-Za-z0-9_:-]{1,180}$/u;
const paymentIdPattern = /^pp_[a-f0-9]{32}$/u;
const receiptPattern = /^[A-Za-z0-9_-]{8,128}$/u;

interface Fbq {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: Fbq;
  loaded: boolean;
  version: string;
  /** Stops the Pixel's own page view on every history change. */
  disablePushState?: boolean;
}
interface TagGlobals {
  catchTagLayer?: unknown[];
  fbq?: Fbq;
  _fbq?: Fbq;
}

/** A public event page's facts for `view_item` / `ViewContent`. */
export interface AdEventPageFacts {
  eventId: string;
  activityKind: string;
  city: string;
  /** The ticket price, or null when the page shows no Catch price. */
  amountPaise: number | null;
}

/** A paid booking, as the checkout knows it. */
export interface AdBooking {
  eventId: string;
  paymentId: string;
  amountPaise: number;
  places: number;
  mode: "test" | "live";
}

/** A host enquiry the website lead intake accepted. */
export interface AdHostLead {
  kind: string;
  /** The accepted lead receipt id, when the response had one. */
  leadId: string | null;
  /** The number the person typed, as E.164. */
  phone: string | null;
  email?: string | null;
}

function productionHost(hostname: string) {
  return hostname === brand.web.domain || hostname === new URL(brand.web.wwwOrigin).hostname;
}

function globals(): TagGlobals {
  return window as unknown as TagGlobals;
}

/** gtag.js reads Arguments objects from its layer, exactly as Google's snippet pushes them. */
function gtag(..._args: unknown[]) {
  const layer = globals().catchTagLayer ?? (globals().catchTagLayer = []);
  // eslint-disable-next-line prefer-rest-params
  layer.push(arguments);
}

function fbq(...args: unknown[]) {
  globals().fbq?.(...args);
}

/** Meta's standard Pixel stub: calls queue until fbevents.js takes over. */
function installPixelStub(): Fbq {
  const existing = globals().fbq;
  if (existing) return existing;
  const stub = function () {
    // eslint-disable-next-line prefer-rest-params
    const args = arguments as unknown as unknown[];
    if (stub.callMethod) stub.callMethod(...args);
    else stub.queue.push(args);
  } as Fbq;
  stub.queue = [];
  stub.push = stub;
  stub.loaded = true;
  stub.version = "2.0";
  globals().fbq = stub;
  if (!globals()._fbq) globals()._fbq = stub;
  return stub;
}

function appendScript(source: string) {
  const script = document.createElement("script");
  script.async = true;
  script.src = source;
  document.head.appendChild(script);
}

/** The tags' own first-party cookies on this site. */
function clearTagCookies() {
  try {
    const names = String(document.cookie ?? "").split(";").map((part) => part.trim().split("=")[0])
      .filter((name) => /^(?:_fbp|_fbc|_ga(?:_[A-Z0-9]+)?|_gcl_[a-z]+)$/u.test(name));
    const domains = ["", window.location.hostname, `.${brand.web.domain}`];
    for (const name of names) {
      for (const domain of domains) document.cookie = `${name}=; Max-Age=0; Path=/${domain ? `; Domain=${domain}` : ""}`;
    }
  } catch { /* Cookies unavailable: there is nothing of the tags' to remove. */ }
}

function readCheckouts(): string[] {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(checkoutsKey) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string" && paymentIdPattern.test(id)) : [];
  } catch {
    return [];
  }
}

function writeCheckouts(ids: string[]) {
  try {
    if (ids.length) window.sessionStorage.setItem(checkoutsKey, JSON.stringify(ids.slice(-20)));
    else window.sessionStorage.removeItem(checkoutsKey);
  } catch { /* Optional storage: the purchase is then sent by the server only. */ }
}

/** The fixed Catch origin, the public path and only reviewed campaign labels and Google click ids. */
function pageLocation(path: string, search: string) {
  const params = new URLSearchParams(search);
  const kept = new URLSearchParams(approvedCampaignLabels(Object.fromEntries(params)));
  for (const key of ["gclid", "gbraid", "wbraid"]) {
    const value = params.get(key);
    if (value && googleClick.test(value)) kept.set(key, value);
  }
  const query = kept.toString();
  return `${brand.web.origin}${path}${query ? `?${query}` : ""}`;
}

const rupees = (paise: number) => Math.round(paise) / 100;
const validAmount = (paise: unknown, minimum: number): paise is number =>
  Number.isSafeInteger(paise) && (paise as number) >= minimum && (paise as number) <= 100_000_000;
const validBooking = (booking: AdBooking) => booking?.mode === "live" && eventIdPattern.test(booking.eventId) &&
  paymentIdPattern.test(booking.paymentId) && validAmount(booking.amountPaise, 100) &&
  Number.isSafeInteger(booking.places) && booking.places >= 1 && booking.places <= 20;

export interface AdTagOptions {
  /** Which hostnames may load the tags; the production site by default. */
  hostAllowed?: (hostname: string) => boolean;
  /** A new opaque event id. */
  newId?: () => string;
}

/** The tag controller. The site uses one (`adTags`); tests make their own. */
export function createAdTags(options: AdTagOptions = {}) {
  const hostAllowed = options.hostAllowed ?? productionHost;
  const newId = options.newId ?? (() => `catch_${Date.now()}_${crypto.randomUUID()}`);
  let consent: MeasurementConsent | null = null;
  let loaded = false;
  let granted = false;
  const sent = new Set<string>();

  const marketing = (value: MeasurementConsent | null) =>
    value?.version === currentConsentVersion && value.analytics === true && value.marketing === true;

  /** The current page when it may load or send: production host, public path, only ad query keys. */
  function currentPage(): {location: string} | null {
    if (typeof window === "undefined" || typeof document === "undefined") return null;
    const {hostname, pathname, search, hash} = window.location;
    if (!hostAllowed(hostname)) return null;
    const path = publicAdPage(pathname);
    if (!path || !/^(?:#[A-Za-z0-9_-]*)?$/u.test(hash)) return null;
    for (const key of new URLSearchParams(search).keys()) if (!adQueryKey.test(key)) return null;
    return {location: pageLocation(path, search)};
  }

  function load() {
    gtag("consent", "default", deniedConsent);
    gtag("consent", "update", grantedConsent);
    gtag("js", new Date());
    gtag("config", catchAdDestinations.googleAnalytics, {send_page_view: false, allow_google_signals: false,
      allow_ad_personalization_signals: false, ...googleCookieOptions});
    gtag("config", catchAdDestinations.googleAds, {send_page_view: false, allow_enhanced_conversions: true,
      ...googleCookieOptions});
    const pixel = installPixelStub();
    pixel.disablePushState = true;
    fbq("set", "autoConfig", false, catchAdDestinations.metaPixel);
    fbq("consent", "grant");
    fbq("init", catchAdDestinations.metaPixel);
    appendScript(googleTagSource);
    appendScript(metaPixelSource);
    loaded = true;
  }

  function revoke() {
    if (loaded && granted) {
      gtag("consent", "update", deniedConsent);
      fbq("consent", "revoke");
    }
    granted = false;
    sent.clear();
    writeCheckouts([]);
    clearTagCookies();
  }

  /**
   * Applies the current choice. Marketing loads (once) and grants both tags on
   * a public page; anything else revokes them. Private pages leave loaded
   * tags idle: nothing sends there.
   */
  function sync(next: MeasurementConsent | null) {
    consent = next;
    if (typeof window === "undefined") return;
    if (!marketing(next)) {
      revoke();
      return;
    }
    if (granted || !currentPage()) return;
    if (!loaded) load();
    else {
      gtag("consent", "update", grantedConsent);
      fbq("consent", "grant");
    }
    granted = true;
  }

  /** The page to send from, when both tags may send now. */
  function sending() {
    if (!loaded || !granted || !marketing(consent)) return null;
    const page = currentPage();
    if (page) gtag("set", {page_location: page.location, page_title: brand.name});
    return page;
  }

  function once(key: string) {
    if (sent.has(key) || sent.size >= 1000) return false;
    sent.add(key);
    return true;
  }

  return {
    sync,

    /** `page_view` / `PageView` for the current public page. */
    pageView(): boolean {
      if (!sending()) return false;
      const id = newId();
      gtag("event", "page_view", {send_to: catchAdDestinations.googleAnalytics, event_id: id});
      fbq("track", "PageView", {}, {eventID: id});
      return true;
    },

    /** `view_item` / `ViewContent` on a public event page. */
    viewItem(facts: AdEventPageFacts): boolean {
      if (!eventIdPattern.test(facts?.eventId ?? "") || !sending()) return false;
      const id = newId();
      const activity = /^[A-Za-z][A-Za-z0-9_]{0,40}$/u.test(facts.activityKind) ? facts.activityKind : undefined;
      const city = typeof facts.city === "string" && facts.city.trim() ? facts.city.trim().slice(0, 80) : undefined;
      const value = validAmount(facts.amountPaise, 0) ? {value: rupees(facts.amountPaise), currency: "INR"} : {};
      gtag("event", "view_item", {send_to: catchAdDestinations.googleAnalytics, event_id: id,
        content_category: "guest", ...(city ? {city} : {}), ...value,
        items: [{item_id: facts.eventId, ...(activity ? {item_category: activity} : {})}]});
      fbq("track", "ViewContent", {content_ids: [facts.eventId], content_type: "product", content_category: "guest",
        ...(activity ? {activity_kind: activity} : {}), ...(city ? {city} : {}), ...value}, {eventID: id});
      return true;
    },

    /** `begin_checkout` / `InitiateCheckout` when a live paid checkout opens: price times places. */
    beginCheckout(booking: AdBooking): boolean {
      if (!validBooking(booking) || !sending()) return false;
      const id = `checkout_${booking.paymentId}`;
      if (!once(`begin_checkout:${id}`)) return false;
      const value = rupees(booking.amountPaise);
      gtag("event", "begin_checkout", {send_to: catchAdDestinations.googleAnalytics, event_id: id,
        content_category: "guest", value, currency: "INR", items: [{item_id: booking.eventId, quantity: booking.places}]});
      fbq("track", "InitiateCheckout", {content_ids: [booking.eventId], content_type: "product", content_category: "guest",
        num_items: booking.places, value, currency: "INR"}, {eventID: id});
      writeCheckouts([...readCheckouts().filter((paymentId) => paymentId !== booking.paymentId), booking.paymentId]);
      return true;
    },

    /**
     * `purchase` / `Purchase` once the checkout this browser opened is
     * confirmed: the amount paid in INR, with the payment record id as event
     * and transaction id, so the later server event deduplicates against it.
     */
    purchase(booking: AdBooking): boolean {
      if (!validBooking(booking) || !readCheckouts().includes(booking.paymentId) || !sending() ||
          !once(`purchase:${booking.paymentId}`)) return false;
      const value = rupees(booking.amountPaise);
      gtag("event", "purchase", {send_to: catchAdDestinations.googleAnalytics, event_id: booking.paymentId,
        transaction_id: booking.paymentId, content_category: "guest", value, currency: "INR",
        items: [{item_id: booking.eventId, quantity: booking.places}]});
      fbq("track", "Purchase", {content_ids: [booking.eventId], content_type: "product", content_category: "guest",
        num_items: booking.places, value, currency: "INR"}, {eventID: booking.paymentId});
      writeCheckouts(readCheckouts().filter((paymentId) => paymentId !== booking.paymentId));
      return true;
    },

    /**
     * A host enquiry the intake accepted: Meta `Lead` and the Google Ads host
     * website-lead conversion, with the number (and email, when the form asked
     * for one) the person just typed for matching. The tags hash them before
     * they leave the browser. GA4 gets `generate_lead` for the organiser
     * audience. The event id is the accepted lead receipt, or a new id.
     */
    hostLead(lead: AdHostLead): boolean {
      if (!hostLeadKinds.has(lead?.kind) || !sending()) return false;
      const id = lead.leadId && receiptPattern.test(lead.leadId) ? lead.leadId : newId();
      if (!once(`lead:${id}`)) return false;
      const phone = lead.phone && /^\+[1-9][0-9]{7,14}$/u.test(lead.phone) ? lead.phone : null;
      const email = lead.email && /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/u.test(lead.email.trim()) ?
        lead.email.trim().toLowerCase() : null;
      const googleUser = {...(phone ? {phone_number: phone} : {}), ...(email ? {email} : {})};
      if (phone || email) gtag("set", "user_data", googleUser);
      gtag("event", "conversion", {send_to: catchAdDestinations.hostLeadConversion, transaction_id: id, event_id: id});
      gtag("event", "generate_lead", {send_to: catchAdDestinations.googleAnalytics, event_id: id,
        content_category: "host", audience: "organizer", lead_kind: lead.kind});
      if (phone || email) {
        fbq("init", catchAdDestinations.metaPixel, {...(phone ? {ph: phone.slice(1)} : {}), ...(email ? {em: email} : {})});
      }
      fbq("track", "Lead", {content_category: "host", lead_kind: lead.kind}, {eventID: id});
      return true;
    },
  };
}

/** The site's tag controller. */
export const adTags = createAdTags();
