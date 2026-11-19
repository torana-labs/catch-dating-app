import {beforeEach, describe, expect, it} from "vitest";
import {brand} from "@catch/brand";
import {createAdTags, type AdBooking, type OrganizerAdDestinations} from "./adTags";

type Globals = {catchTagLayer?: ArrayLike<unknown>[]; catchOrganizerTagLayer?: ArrayLike<unknown>[];
  fbq?: {queue: ArrayLike<unknown>[]}; _fbq?: unknown};
const globals = () => window as unknown as Globals;
const consent = (choice: "accepted" | "analytics" | "essential", version = 5) => ({version, choice,
  analytics: choice !== "essential", marketing: choice === "accepted", updatedAt: "2026-11-19T19:00:00.000Z"});
const catchPixel = "1844810253539672";
const organizerPixel = "700000000000007";
const organizerGa = "G-ORGANISER7";
const eventSet: OrganizerAdDestinations = {organizerId: "harbour-line-run-club", eventId: "synthetic-run",
  metaPixelId: organizerPixel, googleMeasurementId: organizerGa};
const profileSet: OrganizerAdDestinations = {...eventSet, eventId: null};
const booking: AdBooking = {eventId: "synthetic-run", paymentId: `pp_${"c".repeat(32)}`, amountPaise: 45000, places: 2,
  mode: "live"};
const facts = {eventId: "synthetic-run", activityKind: "running", city: "Mumbai", amountPaise: 45000};

const organizerLayer = () => (globals().catchOrganizerTagLayer ?? []).map((entry) => Array.from(entry));
const catchLayer = () => (globals().catchTagLayer ?? []).map((entry) => Array.from(entry));
const meta = () => (globals().fbq?.queue ?? []).map((entry) => Array.from(entry));
const organizerMeta = () => meta().filter(([command, pixel]) => command === "trackSingle" && pixel === organizerPixel);
const organizerEvents = () => organizerLayer().filter(([command]) => command === "event");
let ids = 0;
const tags = () => createAdTags({hostAllowed: () => true, newId: () => `catch_1800000000000_organiser${++ids}`});

function reset(path = "/events/synthetic-run/") {
  delete globals().catchTagLayer;
  delete globals().catchOrganizerTagLayer;
  delete globals().fbq;
  delete globals()._fbq;
  document.querySelectorAll("script").forEach((script) => script.remove());
  sessionStorage.clear();
  window.history.replaceState(null, "", path);
}
beforeEach(() => reset());

describe("organiser destination set", () => {
  it.each([null, consent("essential"), consent("analytics"), consent("accepted", 4)])(
    "loads and sends nothing without a current marketing choice (%#)", (choice) => {
      const ad = tags();
      ad.setOrganizer(eventSet);
      ad.sync(choice);
      expect(ad.organizerPageView()).toBe(false);
      expect(organizerLayer()).toEqual([]);
      expect(organizerMeta()).toEqual([]);
    });

  it("loads nothing without a published set, and clears a set with invalid IDs", () => {
    const ad = tags();
    ad.sync(consent("accepted"));
    expect(ad.organizerPageView()).toBe(false);
    ad.setOrganizer({...eventSet, metaPixelId: "<script>", googleMeasurementId: "GTM-1234"});
    expect(ad.organizerPageView()).toBe(false);
    expect(organizerLayer()).toEqual([]);
  });

  it("uses its own Google layer, cookie prefix and pixel, under the marketing choice", () => {
    const ad = tags();
    ad.sync(consent("accepted"));
    ad.setOrganizer(eventSet);
    expect(organizerLayer().filter(([command]) => command === "config")).toEqual([[ "config", organizerGa,
      {send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
        cookie_prefix: "catch_org", cookie_expires: 2592000, cookie_flags: "SameSite=Lax;Secure"}]]);
    expect(organizerLayer()).toContainEqual(["consent", "update", {ad_storage: "denied", analytics_storage: "granted",
      ad_user_data: "denied", ad_personalization: "denied"}]);
    expect(meta()).toContainEqual(["set", "autoConfig", false, organizerPixel]);
    expect(meta()).toContainEqual(["init", organizerPixel]);
    expect(Array.from(document.querySelectorAll("script")).map((script) => script.src)).toContain(
      "https://www.googletagmanager.com/gtag/js?id=G-ORGANISER7&l=catchOrganizerTagLayer");
    expect(ad.organizerPageView()).toBe(true);
    const [[, name, params]] = organizerEvents();
    expect(name).toBe("page_view");
    expect(params).toMatchObject({send_to: organizerGa, page_location: `${brand.web.origin}/events/synthetic-run/`,
      page_title: brand.name, page_referrer: ""});
    expect(organizerMeta()).toEqual([["trackSingle", organizerPixel, "PageView", {},
      {eventID: expect.stringMatching(/^org_/u)}]]);
  });

  it("never touches Catch's layer and never addresses Catch's pixel", () => {
    const ad = tags();
    ad.sync(consent("accepted"));
    const before = JSON.stringify(catchLayer());
    ad.setOrganizer(eventSet);
    ad.organizerPageView();
    ad.organizerViewItem(facts);
    ad.organizerBeginCheckout(booking);
    ad.organizerPurchase(booking);
    expect(JSON.stringify(catchLayer())).toBe(before);
    const organizerCommands = meta().filter(([command, pixel]) => command === "trackSingle" && pixel !== catchPixel);
    expect(organizerCommands.every(([, pixel]) => pixel === organizerPixel)).toBe(true);
    expect(meta().filter(([command, pixel]) => command === "trackSingle" && pixel === catchPixel)).toEqual([]);
  });

  it("sends the closed event map, without the Catch payment id", () => {
    const ad = tags();
    ad.sync(consent("accepted"));
    ad.setOrganizer(eventSet);
    expect(ad.organizerViewItem(facts)).toBe(true);
    expect(ad.organizerPurchase(booking)).toBe(false);
    expect(ad.organizerBeginCheckout(booking)).toBe(true);
    expect(ad.organizerBeginCheckout(booking)).toBe(false);
    expect(ad.organizerPurchase(booking)).toBe(true);
    expect(ad.organizerPurchase(booking)).toBe(false);
    expect(organizerMeta().map(([, , name]) => name)).toEqual(["ViewContent", "InitiateCheckout", "Purchase"]);
    expect(organizerEvents().map(([, name]) => name)).toEqual(["view_item", "begin_checkout", "purchase"]);
    expect(JSON.stringify([organizerLayer(), organizerMeta()])).not.toContain(booking.paymentId);
  });

  it("stops in the same page view when the choice is withdrawn or downgraded", () => {
    for (const next of [consent("essential"), consent("analytics")]) {
      reset();
      const ad = tags();
      ad.sync(consent("accepted"));
      ad.setOrganizer(eventSet);
      expect(ad.organizerPageView()).toBe(true);
      document.cookie = "catch_org_ga=GA1.1.1; Path=/";
      ad.sync(next);
      expect(organizerLayer().at(-1)).toEqual(["consent", "update", {ad_storage: "denied", analytics_storage: "denied",
        ad_user_data: "denied", ad_personalization: "denied"}]);
      expect(meta()).toContainEqual(["consent", "revoke"]);
      expect(document.cookie).not.toContain("catch_org_ga");
      expect(ad.organizerPageView()).toBe(false);
    }
  });

  it("shuts off on navigation away and keeps to its own page scope", () => {
    const ad = tags();
    ad.sync(consent("accepted"));
    ad.setOrganizer(eventSet);
    for (const path of ["/claim/", "/events/other-run/", "/organizers/harbour-line-run-club/", "/f/form-1/", "/account/"]) {
      window.history.replaceState(null, "", path);
      expect(ad.organizerPageView()).toBe(false);
    }
    window.history.replaceState(null, "", "/organizers/harbour-line-run-club/");
    ad.setOrganizer(profileSet);
    expect(ad.organizerPageView()).toBe(true);
    expect(ad.organizerViewItem(facts)).toBe(false);
  });

  it("follows organizerAdPage's query rule: unknown keys fail closed", () => {
    const ad = tags();
    ad.sync(consent("accepted"));
    ad.setOrganizer(eventSet);
    window.history.replaceState(null, "", "/events/synthetic-run/?ref=partner");
    expect(ad.organizerPageView()).toBe(false);
  });

  it("does not repeat loading on every sync", () => {
    const ad = tags();
    ad.sync(consent("accepted"));
    ad.setOrganizer(eventSet);
    const count = organizerLayer().length + meta().length;
    ad.sync(consent("accepted"));
    ad.sync(consent("accepted"));
    expect(organizerLayer().length + meta().length).toBe(count);
  });
});
