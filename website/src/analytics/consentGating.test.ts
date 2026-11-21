import {beforeEach, describe, expect, it} from "vitest";
import {brand} from "@catch/brand";
import {createAdTags} from "./adTags";

/**
 * The consent gate end to end on Catch's own transport: what each banner
 * choice loads and sends. Essential sends nothing; analytics loads Google
 * Analytics and Microsoft Clarity only; analytics and marketing adds the
 * Google Ads tag and the Meta Pixel.
 */
type Globals = {
  catchTagLayer?: ArrayLike<unknown>[];
  fbq?: {queue: ArrayLike<unknown>[]};
  _fbq?: unknown;
  clarity?: {q?: unknown[][]};
};
const globals = () => window as unknown as Globals;
const consent = (choice: "accepted" | "analytics" | "essential", updatedAt = "2026-11-21T10:00:00.000Z") => ({
  version: 7, choice, analytics: choice !== "essential", marketing: choice === "accepted", updatedAt,
});
const google = () => (globals().catchTagLayer ?? []).map((entry) => Array.from(entry));
const meta = () => (globals().fbq?.queue ?? []).map((entry) => Array.from(entry));
const clarity = () => globals().clarity?.q ?? [];
const scripts = () => Array.from(document.querySelectorAll("script")).map((script) => script.src);
const googleEvents = () => google().filter(([command]) => command === "event");
const destinations = {googleAnalytics: "G-SYNTHETIC1", googleAds: "AW-1000000001", hostLeadConversion: "AW-1000000001/SyntheticLabel",
  metaPixel: "1000000000000001", clarityProject: "synthclar1"};
const googleAnalyticsScript = "https://www.googletagmanager.com/gtag/js?id=G-SYNTHETIC1&l=catchTagLayer";
const clarityScript = "https://www.clarity.ms/tag/synthclar1";
const metaScript = "https://connect.facebook.net/en_US/fbevents.js";
let ids = 0;
const tags = () => createAdTags({hostAllowed: () => true, destinations, newId: () => `catch_1800000000000_generated${++ids}`});

/** Everything a page visit with one lead can send. */
function visit(controller: ReturnType<typeof createAdTags>) {
  return {
    pageView: controller.pageView(),
    click: controller.analyticsEvent("cta_click", {cta_label: "host_hero_start", cta_target: "/host/"}),
    hostLead: controller.hostLead({kind: "demo", leadId: "lead_receipt_1", phone: "+919800000000"}),
    memberLead: controller.siteLead({kind: "member_waitlist", leadId: "waitlist_receipt_1"}),
    referralLead: controller.siteLead({kind: "referral", leadId: "referral_receipt_1"}),
  };
}

beforeEach(() => {
  delete globals().catchTagLayer;
  delete globals().fbq;
  delete globals()._fbq;
  delete globals().clarity;
  document.querySelectorAll("script").forEach((script) => script.remove());
  document.title = "For hosts | Catch";
  sessionStorage.clear();
  window.history.replaceState(null, "", "/host/");
});

describe("consent gating", () => {
  it("essential only loads and sends nothing", () => {
    const controller = tags();
    controller.sync(consent("essential"));
    expect(visit(controller)).toEqual({pageView: false, click: false, hostLead: false, memberLead: false, referralLead: false});
    expect(scripts()).toEqual([]);
    expect(globals().catchTagLayer).toBeUndefined();
    expect(globals().fbq).toBeUndefined();
    expect(globals().clarity).toBeUndefined();
  });

  it("no choice yet loads and sends nothing", () => {
    const controller = tags();
    controller.sync(null);
    expect(Object.values(visit(controller)).every((sent) => sent === false)).toBe(true);
    expect(scripts()).toEqual([]);
  });

  it("analytics only loads Google Analytics and Clarity: no Ads tag, no Pixel, no contact data", () => {
    const controller = tags();
    controller.sync(consent("analytics"));
    expect(scripts()).toEqual([googleAnalyticsScript, clarityScript]);
    expect(clarity()).toEqual([["consentv2", {ad_Storage: "denied", analytics_Storage: "granted"}]]);
    expect(visit(controller)).toEqual({pageView: true, click: true, hostLead: true, memberLead: true, referralLead: true});
    // Every Google event goes to Google Analytics, and only there.
    expect(googleEvents().map(([, name, parameters]) => [name, (parameters as {send_to: string}).send_to])).toEqual([
      ["page_view", "G-SYNTHETIC1"], ["cta_click", "G-SYNTHETIC1"], ["generate_lead", "G-SYNTHETIC1"],
      ["generate_lead", "G-SYNTHETIC1"], ["generate_lead", "G-SYNTHETIC1"],
    ]);
    expect(google().filter(([command]) => command === "config").map(([, id]) => id)).toEqual(["G-SYNTHETIC1"]);
    expect(google().some(([command, kind]) => command === "set" && kind === "user_data")).toBe(false);
    expect(JSON.stringify(google())).not.toContain("9800000000");
    expect(globals().fbq).toBeUndefined();
    expect(scripts()).not.toContain(metaScript);
  });

  it("analytics and marketing adds the Google Ads tag and the Meta Pixel", () => {
    const controller = tags();
    controller.sync(consent("accepted"));
    expect(scripts()).toEqual([googleAnalyticsScript, clarityScript, metaScript]);
    expect(google().filter(([command]) => command === "config").map(([, id]) => id)).toEqual(["G-SYNTHETIC1", "AW-1000000001"]);
    expect(visit(controller)).toEqual({pageView: true, click: true, hostLead: true, memberLead: true, referralLead: true});
    // Ads: only the host-lead conversion. Meta: page view, the host Lead, and custom member and referral leads.
    expect(googleEvents().filter(([, name]) => name === "conversion")).toEqual([
      ["event", "conversion", {send_to: "AW-1000000001/SyntheticLabel", transaction_id: "lead_receipt_1", event_id: "lead_receipt_1"}],
    ]);
    const metaEvents = meta().filter(([command]) => String(command).startsWith("track")).map(([command, , name]) => [command, name]);
    expect(metaEvents).toEqual([["trackSingle", "PageView"], ["trackSingle", "Lead"],
      ["trackSingleCustom", "MemberLead"], ["trackSingleCustom", "ReferralLead"]]);
    // Click events stay with Google Analytics; member and referral leads carry no contact data.
    expect(meta().some(([, , name]) => name === "cta_click")).toBe(false);
    const memberLead = meta().find(([, , name]) => name === "MemberLead");
    expect(memberLead).toEqual(["trackSingleCustom", destinations.metaPixel, "MemberLead",
      {content_category: "member", lead_kind: "member_waitlist"}, {eventID: "waitlist_receipt_1"}]);
  });

  it("withdrawing the choice revokes Clarity with the Google tag and removes its cookies", () => {
    const controller = tags();
    controller.sync(consent("analytics"));
    document.cookie = "_clck=synthetic; path=/";
    document.cookie = "_clsk=synthetic; path=/";
    controller.sync(consent("essential", "2026-11-21T11:00:00.000Z"));
    expect(clarity().slice(-2)).toEqual([["consentv2", {ad_Storage: "denied", analytics_Storage: "denied"}], ["consent", false]]);
    expect(document.cookie).not.toMatch(/_clck|_clsk/u);
    expect(visit(controller).pageView).toBe(false);
    // Choosing analytics again grants Clarity again, without a second script.
    controller.sync(consent("analytics", "2026-11-21T12:00:00.000Z"));
    expect(clarity().at(-1)).toEqual(["consentv2", {ad_Storage: "denied", analytics_Storage: "granted"}]);
    expect(scripts().filter((source) => source === clarityScript)).toHaveLength(1);
  });

  it("pauses Clarity while a private surface is open on a public page", () => {
    const controller = tags();
    controller.sync(consent("analytics"));
    const release = controller.holdForPrivateSurface();
    controller.sync(consent("analytics"));
    expect(clarity().at(-1)).toEqual(["pause"]);
    release();
    controller.sync(consent("analytics"));
    expect(clarity().at(-1)).toEqual(["resume"]);
  });

  it("loads no Clarity without a project, whatever the choice", () => {
    const controller = createAdTags({hostAllowed: () => true, destinations: {...destinations, clarityProject: null}});
    controller.sync(consent("accepted"));
    expect(scripts()).toEqual([googleAnalyticsScript, metaScript]);
    expect(globals().clarity).toBeUndefined();
  });
});

describe("page titles and locations", () => {
  const lastSet = () => google().filter(([command]) => command === "set").at(-1);

  it("reports each page's own title", () => {
    const controller = tags();
    controller.sync(consent("analytics"));
    controller.pageView();
    expect(lastSet()).toEqual(["set", {page_location: `${brand.web.origin}/host/`, page_title: "For hosts | Catch"}]);
  });

  it("reports a fixed title on event pages, so no event name leaves the page", () => {
    window.history.replaceState(null, "", "/events/synthetic-run/");
    document.title = "Synthetic Sunday run | Catch";
    const controller = tags();
    controller.sync(consent("analytics"));
    controller.pageView();
    expect(lastSet()).toEqual(["set", {page_location: `${brand.web.origin}/events/synthetic-run/`, page_title: `Event page | ${brand.name}`}]);
  });

  it("measures Explore with filters, keeping reviewed values and never the search words", () => {
    window.history.replaceState(null, "", "/explore/?q=private+words&format=run&when=weekend&show=organisers&city=mumbai&utm_source=meta");
    const controller = tags();
    controller.sync(consent("analytics"));
    expect(controller.pageView()).toBe(true);
    expect(lastSet()).toEqual(["set", {page_title: "For hosts | Catch",
      page_location: `${brand.web.origin}/explore/?city=mumbai&format=run&when=weekend&show=organisers&utm_source=meta`}]);
    expect(JSON.stringify(google())).not.toContain("private");
  });

  it("keeps Explore's filters on a city page, drops values outside the vocabulary, and stays silent for unknown keys", () => {
    window.history.replaceState(null, "", "/mumbai/?format=run&when=someday");
    const controller = tags();
    controller.sync(consent("analytics"));
    controller.pageView();
    expect(lastSet()).toEqual(["set", {page_location: `${brand.web.origin}/mumbai/?format=run`, page_title: "For hosts | Catch"}]);
    window.history.replaceState(null, "", "/explore/?email=private%40example.com");
    expect(controller.pageView()).toBe(false);
  });

  it("refuses GA4 events outside the closed shape", () => {
    const controller = tags();
    controller.sync(consent("analytics"));
    expect(controller.analyticsEvent("cta_click", {cta_label: "has spaces and @"})).toBe(false);
    expect(controller.analyticsEvent("Bad-Name", {})).toBe(false);
    expect(controller.analyticsEvent("cta_click", {send_to: "AW-1"})).toBe(false);
    expect(googleEvents()).toEqual([]);
  });
});
