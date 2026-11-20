import {beforeEach, describe, expect, it} from "vitest";
import {brand} from "@catch/brand";
import {createAdTags, type AdBooking} from "./adTags";

type Globals = {catchTagLayer?: ArrayLike<unknown>[]; fbq?: {queue: ArrayLike<unknown>[]; disablePushState?: boolean}; _fbq?: unknown};
const globals = () => window as unknown as Globals;
const consent = (choice: "accepted" | "analytics" | "essential", version = 6, updatedAt = "2026-11-18T10:00:00.000Z") => ({
  version, choice, analytics: choice !== "essential", marketing: choice === "accepted", updatedAt,
});
/** gtag commands as arrays (gtag.js reads them as Arguments objects). */
const google = () => (globals().catchTagLayer ?? []).map((entry) => Array.from(entry));
const meta = () => (globals().fbq?.queue ?? []).map((entry) => Array.from(entry));
const scripts = () => Array.from(document.querySelectorAll("script")).map((script) => script.src);
const googleEvents = (name: string) => google().filter(([command, event]) => command === "event" && event === name);
const catchPixel = "1844810253539672";
/** Catch's Meta events: always `trackSingle` to Catch's own pixel. */
const metaEvents = (name: string) => meta().filter(([command, pixel, event]) => command === "trackSingle" && pixel === catchPixel &&
  event === name);
let ids = 0;
const tags = () => createAdTags({hostAllowed: () => true, newId: () => `catch_1800000000000_generated${++ids}`});
const booking: AdBooking = {eventId: "synthetic-run", paymentId: `pp_${"a".repeat(32)}`, amountPaise: 45000, places: 3, mode: "live"};

beforeEach(() => {
  delete globals().catchTagLayer;
  delete globals().fbq;
  delete globals()._fbq;
  document.querySelectorAll("script").forEach((script) => script.remove());
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
});

describe("first-party Google tag and Meta Pixel", () => {
  it.each([null, consent("essential"), consent("analytics", 5), consent("accepted", 5)])(
    "loads no tag without a current analytics or marketing choice (%o)", (choice) => {
      const controller = tags();
      controller.sync(choice);
      expect(scripts()).toEqual([]);
      expect(globals().fbq).toBeUndefined();
      expect(globals().catchTagLayer).toBeUndefined();
      expect(controller.pageView()).toBe(false);
    });

  it("loads nothing outside the production site or on a private page", () => {
    const offSite = createAdTags();
    offSite.sync(consent("accepted"));
    expect(scripts()).toEqual([]);
    const controller = tags();
    window.history.replaceState(null, "", "/booking/synthetic-event/");
    controller.sync(consent("accepted"));
    expect(scripts()).toEqual([]);
    window.history.replaceState(null, "", "/events/synthetic-run/");
    controller.sync(consent("accepted"));
    expect(scripts()).toHaveLength(2);
  });

  it("loads both tags after the marketing choice with Consent Mode set first and no automatic sends", () => {
    window.history.replaceState(null, "", "/host/?utm_source=google&utm_campaign=private&gclid=SyntheticGoogle123");
    const controller = tags();
    controller.sync(consent("accepted"));
    expect(scripts()).toEqual([
      "https://www.googletagmanager.com/gtag/js?id=G-HZFG0DL2DK&l=catchTagLayer",
      "https://connect.facebook.net/en_US/fbevents.js",
    ]);
    const commands = google();
    expect(commands.slice(0, 2)).toEqual([
      ["consent", "default", {ad_storage: "denied", analytics_storage: "denied", ad_user_data: "denied", ad_personalization: "denied"}],
      ["consent", "update", {ad_storage: "granted", analytics_storage: "granted", ad_user_data: "granted", ad_personalization: "denied"}],
    ]);
    expect(commands.filter(([command]) => command === "config")).toEqual([
      ["config", "G-HZFG0DL2DK", expect.objectContaining({send_page_view: false, allow_ad_personalization_signals: false})],
      ["config", "AW-18526407471", expect.objectContaining({send_page_view: false, allow_enhanced_conversions: true})],
    ]);
    expect(globals().fbq?.disablePushState).toBe(true);
    expect(meta()).toEqual([["set", "autoConfig", false, "1844810253539672"], ["consent", "grant"], ["init", "1844810253539672"]]);
    // Loading sends nothing; the page view is explicit, with a fixed origin, title and reviewed labels only.
    expect(controller.pageView()).toBe(true);
    expect(google()).toContainEqual(["set", {page_location: `${brand.web.origin}/host/?utm_source=google&gclid=SyntheticGoogle123`,
      page_title: brand.name}]);
    expect(googleEvents("page_view")).toEqual([["event", "page_view", {send_to: "G-HZFG0DL2DK", event_id: "catch_1800000000000_generated1"}]]);
    expect(metaEvents("PageView")).toEqual([["trackSingle", catchPixel, "PageView", {}, {eventID: "catch_1800000000000_generated1"}]]);
  });

  it("loads Google Analytics alone for an analytics-only choice: no Ads tag, no Pixel, no contact data", () => {
    window.history.replaceState(null, "", "/host/");
    const controller = tags();
    controller.sync(consent("analytics"));
    expect(scripts()).toEqual(["https://www.googletagmanager.com/gtag/js?id=G-HZFG0DL2DK&l=catchTagLayer"]);
    expect(globals().fbq).toBeUndefined();
    expect(google().slice(0, 2)).toEqual([
      ["consent", "default", {ad_storage: "denied", analytics_storage: "denied", ad_user_data: "denied", ad_personalization: "denied"}],
      ["consent", "update", {ad_storage: "denied", analytics_storage: "granted", ad_user_data: "denied", ad_personalization: "denied"}],
    ]);
    expect(google().filter(([command]) => command === "config").map(([, id]) => id)).toEqual(["G-HZFG0DL2DK"]);
    expect(controller.pageView()).toBe(true);
    expect(googleEvents("page_view")).toHaveLength(1);
    expect(controller.pageView("meta")).toBe(false);
    expect(controller.hostLead({kind: "demo", leadId: "lead_synthetic_1", phone: "+919800000000"})).toBe(true);
    expect(googleEvents("generate_lead")).toHaveLength(1);
    expect(googleEvents("conversion")).toEqual([]);
    expect(google().filter(([command, key]) => command === "set" && key === "user_data")).toEqual([]);
    expect(globals().fbq).toBeUndefined();
  });

  it("an upgrade to marketing adds the ad tags and only the Pixel's view of the current page", () => {
    window.history.replaceState(null, "", "/host/");
    const controller = tags();
    controller.sync(consent("analytics"));
    controller.pageView();
    controller.sync(consent("accepted", 6, "2026-11-18T11:00:00.000Z"));
    expect(scripts()).toEqual([
      "https://www.googletagmanager.com/gtag/js?id=G-HZFG0DL2DK&l=catchTagLayer",
      "https://connect.facebook.net/en_US/fbevents.js",
    ]);
    expect(google().filter(([command]) => command === "config").map(([, id]) => id)).toEqual(["G-HZFG0DL2DK", "AW-18526407471"]);
    expect(controller.pageView("meta")).toBe(true);
    expect(googleEvents("page_view")).toHaveLength(1);
    expect(metaEvents("PageView")).toHaveLength(1);
  });

  it("downgrading to analytics revokes only the ad tags; withdrawing revokes everything", () => {
    window.history.replaceState(null, "", "/events/synthetic-run/");
    const controller = tags();
    controller.sync(consent("accepted"));
    document.cookie = "_fbp=fb.1.1800000000000.1234567890; path=/";
    document.cookie = "_ga=GA1.1.123.456; path=/";
    document.cookie = "keep=1; path=/";
    controller.sync(consent("analytics", 6, "2026-11-18T11:00:00.000Z"));
    expect(google().at(-1)).toEqual(["consent", "update",
      {ad_storage: "denied", analytics_storage: "granted", ad_user_data: "denied", ad_personalization: "denied"}]);
    expect(meta().at(-1)).toEqual(["consent", "revoke"]);
    expect(document.cookie).not.toMatch(/_fbp/u);
    expect(document.cookie).toMatch(/_ga=/u);
    const metaBefore = meta().length;
    expect(controller.pageView()).toBe(true);
    expect(controller.viewItem({eventId: "synthetic-run", activityKind: "socialRun", city: "Pune", amountPaise: 45000})).toBe(true);
    expect(meta().length).toBe(metaBefore);
    controller.sync(consent("essential", 6, "2026-11-18T11:30:00.000Z"));
    expect(google().at(-1)).toEqual(["consent", "update",
      {ad_storage: "denied", analytics_storage: "denied", ad_user_data: "denied", ad_personalization: "denied"}]);
    expect(document.cookie).not.toMatch(/_fbp|_ga/u);
    expect(document.cookie).toContain("keep=1");
    const before = [google().length, meta().length];
    expect(controller.pageView()).toBe(false);
    expect(controller.viewItem({eventId: "synthetic-run", activityKind: "socialRun", city: "Pune", amountPaise: 45000})).toBe(false);
    expect(controller.beginCheckout(booking)).toBe(false);
    expect([google().length, meta().length]).toEqual(before);
    // A new marketing choice grants again without loading the scripts twice.
    controller.sync(consent("accepted", 6, "2026-11-18T12:00:00.000Z"));
    expect(scripts()).toHaveLength(2);
    expect(google().at(-1)?.[2]).toMatchObject({ad_storage: "granted"});
    expect(meta().at(-1)).toEqual(["consent", "grant"]);
    document.cookie = "keep=; Max-Age=0; path=/";
  });

  it("sends nothing from a page whose address carries a key the ad platforms do not own", () => {
    window.history.replaceState(null, "", "/events/synthetic-run/?il=private-invite-token");
    const controller = tags();
    controller.sync(consent("accepted"));
    expect(scripts()).toEqual([]);
    window.history.replaceState(null, "", "/events/synthetic-run/");
    controller.sync(consent("accepted"));
    window.history.replaceState(null, "", "/events/synthetic-run/?il=private-invite-token");
    expect(controller.pageView()).toBe(false);
    window.history.replaceState(null, "", "/rsvp/private-household-token/");
    expect(controller.pageView()).toBe(false);
  });

  it("describes a public event page with its id, activity, city and ticket price", () => {
    window.history.replaceState(null, "", "/events/synthetic-run/");
    const controller = tags();
    controller.sync(consent("accepted"));
    expect(controller.viewItem({eventId: "synthetic-run", activityKind: "socialRun", city: "Pune", amountPaise: 45000})).toBe(true);
    expect(googleEvents("view_item")).toEqual([["event", "view_item", {send_to: "G-HZFG0DL2DK", event_id: "catch_1800000000000_generated" + ids,
      content_category: "guest", city: "Pune", value: 450, currency: "INR", items: [{item_id: "synthetic-run", item_category: "socialRun"}]}]]);
    expect(metaEvents("ViewContent")[0]?.[3]).toEqual({content_ids: ["synthetic-run"], content_type: "product",
      content_category: "guest", activity_kind: "socialRun", city: "Pune", value: 450, currency: "INR"});
  });

  it("counts a purchase once, only for a live checkout this browser opened, keyed by the payment record", () => {
    window.history.replaceState(null, "", "/events/synthetic-run/");
    const controller = tags();
    controller.sync(consent("accepted"));
    expect(controller.purchase(booking)).toBe(false);
    expect(controller.beginCheckout({...booking, mode: "test"})).toBe(false);
    expect(controller.beginCheckout(booking)).toBe(true);
    expect(controller.beginCheckout(booking)).toBe(false);
    expect(googleEvents("begin_checkout")[0]?.[2]).toMatchObject({event_id: `checkout_${booking.paymentId}`, value: 450, currency: "INR",
      items: [{item_id: "synthetic-run", quantity: 3}]});
    expect(metaEvents("InitiateCheckout")[0]?.[4]).toEqual({eventID: `checkout_${booking.paymentId}`});
    expect(controller.purchase(booking)).toBe(true);
    expect(controller.purchase(booking)).toBe(false);
    expect(googleEvents("purchase")).toEqual([["event", "purchase", {send_to: "G-HZFG0DL2DK", event_id: booking.paymentId,
      transaction_id: booking.paymentId, content_category: "guest", value: 450, currency: "INR",
      items: [{item_id: "synthetic-run", quantity: 3}]}]]);
    expect(metaEvents("Purchase")).toEqual([["trackSingle", catchPixel, "Purchase", {content_ids: ["synthetic-run"], content_type: "product",
      content_category: "guest", num_items: 3, value: 450, currency: "INR"}, {eventID: booking.paymentId}]]);
    expect(sessionStorage.getItem("catch_ad_checkouts_v1")).toBeNull();
    assertNoForbiddenFields();
  });

  it("sends a host lead to Meta and the Google Ads conversion with the receipt id and the typed number for matching", () => {
    window.history.replaceState(null, "", "/host/run-clubs/");
    const controller = tags();
    controller.sync(consent("accepted"));
    const leadId = "f".repeat(64);
    expect(controller.hostLead({kind: "city_alerts", leadId, phone: "+919812345678"})).toBe(false);
    expect(controller.hostLead({kind: "referral", leadId, phone: "+919812345678"})).toBe(false);
    expect(controller.hostLead({kind: "guide", leadId, phone: "+919812345678", email: " Host@Example.Test "})).toBe(true);
    expect(controller.hostLead({kind: "guide", leadId, phone: "+919812345678"})).toBe(false);
    expect(google()).toContainEqual(["set", "user_data", {phone_number: "+919812345678", email: "host@example.test"}]);
    expect(googleEvents("conversion")).toEqual([["event", "conversion",
      {send_to: "AW-18526407471/WgIECMue97odEK-WioJF", transaction_id: leadId, event_id: leadId}]]);
    expect(googleEvents("generate_lead")[0]?.[2]).toEqual({send_to: "G-HZFG0DL2DK", event_id: leadId,
      content_category: "host", audience: "organizer", lead_kind: "guide"});
    expect(meta()).toContainEqual(["init", "1844810253539672", {ph: "919812345678", em: "host@example.test"}]);
    expect(metaEvents("Lead")).toEqual([["trackSingle", catchPixel, "Lead", {content_category: "host", lead_kind: "guide"}, {eventID: leadId}]]);
    // No receipt: a generated id still deduplicates.
    expect(controller.hostLead({kind: "demo", leadId: null, phone: null})).toBe(true);
    expect(metaEvents("Lead")[1]?.[4]).toEqual({eventID: expect.stringMatching(/^catch_1800000000000_generated\d+$/u)});
    assertNoForbiddenFields();
  });
});

/** Nothing about answers, identity traits, matching or dating ever reaches either tag. */
function assertNoForbiddenFields() {
  const sent = JSON.stringify([google(), meta()]);
  expect(sent).not.toMatch(/"(?:gender|age|age_band|orientation|answers?|questions?|matching|matches|dating|cross_paths|met|full_name|name)"/u);
}
