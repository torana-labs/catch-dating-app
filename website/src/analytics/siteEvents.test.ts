import {beforeEach, describe, expect, it, vi} from "vitest";

/** The site's events on their way to Google Analytics, with the tag controller replaced by a recorder. */
const recorded = vi.hoisted(() => ({
  analyticsEvent: vi.fn((..._args: unknown[]) => true),
  siteLead: vi.fn((..._args: unknown[]) => true),
  hostLead: vi.fn((..._args: unknown[]) => true),
}));
vi.mock("./adTags", async (importOriginal) => {
  const original = await importOriginal<typeof import("./adTags")>();
  const real = original.createAdTags({hostAllowed: () => false});
  return {...original, adTags: {...real, ...recorded}};
});

const {getMarketingConsent, setMarketingConsent, trackAcceptedMarketingLead, trackHostLeadAccepted, trackMarketingEvent,
  trackSiteLeadAccepted, trackWebsiteLeadFormEvent, startPageEngagementTracking} = await import("../analytics");

beforeEach(() => {
  localStorage.clear();
  window.dataLayer = [];
  window.history.replaceState(null, "", "/host/");
  recorded.analyticsEvent.mockClear();
  recorded.siteLead.mockClear();
  recorded.hostLead.mockClear();
});

describe("site events reach Google Analytics only after the analytics choice", () => {
  it("sends nothing without a choice or with essential only, and keeps the local record", () => {
    trackMarketingEvent("cta_click", {cta_label: "host_hero_start", cta_href: "/host/"});
    setMarketingConsent("essential");
    trackMarketingEvent("store_cta_click", {platform: "ios", placement: "host_start", app: "host"});
    expect(trackWebsiteLeadFormEvent("viewed", {kind: "referral", formId: "home-refer"})).toBe(false);
    expect(recorded.analyticsEvent).not.toHaveBeenCalled();
    expect(window.dataLayer?.some((entry) => (entry as {event?: string}).event === "cta_click")).toBe(true);
  });

  it("sends button, store, lead-form, city-alert, Explore and engagement events as closed GA4 events", () => {
    setMarketingConsent("analytics");
    trackMarketingEvent("cta_click", {cta_label: "Nav For Hosts", cta_href: "/host/?utm_source=meta", page_path: "/host/"});
    trackMarketingEvent("cta_click", {cta_label: "store_host_start_ios", cta_href: "https://apps.apple.com/in/app/id1"});
    trackMarketingEvent("store_cta_click", {platform: "ios", placement: "host_start", app: "host", store_href: "https://apps.apple.com/x"});
    trackWebsiteLeadFormEvent("started", {kind: "demo", formId: "host-demo"});
    trackMarketingEvent("city_alerts_submitted", {city: "mumbai", entry: "ex-wa", interests: "run,dinner"});
    trackMarketingEvent("explore_filters_applied", {format: "run", when: "weekend", view: "plans", has_query: true, city: "mumbai"});
    trackMarketingEvent("scroll_depth", {percent_scrolled: 50});
    trackMarketingEvent("section_read", {section_id: "compare", engaged_seconds: 12});
    expect(recorded.analyticsEvent.mock.calls).toEqual([
      ["cta_click", {cta_label: "nav_for_hosts", cta_target: "/host/"}],
      ["cta_click", {cta_label: "store_host_start_ios", cta_target: "app_store"}],
      ["store_cta_click", {platform: "ios", placement: "host_start", app: "host"}],
      ["lead_form_started", {lead_kind: "demo", form_id: "host-demo"}],
      ["city_alerts_submitted", {city: "mumbai", interests: "run,dinner"}],
      ["explore_filters_applied", {format: "run", when: "weekend", view: "plans", has_query: "yes", city: "mumbai"}],
      ["scroll_depth", {percent_scrolled: 50}],
      ["section_read", {section_id: "compare", engaged_seconds: 12}],
    ]);
  });

  it("never forwards free text, ids or an unreviewed event", () => {
    setMarketingConsent("accepted");
    trackMarketingEvent("organizer_search_submitted", {query: "private words"});
    trackMarketingEvent("listing_share_completed", {club_id: "synthetic-club"});
    trackMarketingEvent("claim_flow_submitted", {club_id: "synthetic-club"});
    trackMarketingEvent("cta_click", {cta_label: "organiser", cta_href: "/organizers/synthetic-club/"});
    trackMarketingEvent("scroll_depth", {percent_scrolled: 33});
    trackMarketingEvent("section_read", {section_id: "Has Spaces", engaged_seconds: 5});
    expect(recorded.analyticsEvent.mock.calls).toEqual([["cta_click", {cta_label: "organiser", cta_target: "organiser_page"}]]);
    expect(JSON.stringify(recorded.analyticsEvent.mock.calls)).not.toMatch(/synthetic-club|private/u);
  });
});

describe("member, referral and host leads", () => {
  it("sends a new member sign-up as a member lead under the choice it started with", () => {
    setMarketingConsent("analytics");
    const consent = getMarketingConsent();
    expect(trackAcceptedMarketingLead("waitlist_1800000000000_abcdefgh", "member_waitlist", false, consent)).toBe(true);
    expect(recorded.siteLead).toHaveBeenCalledExactlyOnceWith({kind: "member_waitlist", leadId: "waitlist_1800000000000_abcdefgh"});
  });

  it("does not count a member already on the list, or a lead whose choice changed meanwhile", () => {
    setMarketingConsent("analytics");
    const consent = getMarketingConsent();
    trackAcceptedMarketingLead("waitlist_1800000000000_abcdefgh", "member_waitlist", true, consent);
    setMarketingConsent("accepted");
    trackAcceptedMarketingLead("waitlist_1800000000000_bcdefghi", "member_waitlist", false, consent);
    expect(trackSiteLeadAccepted({kind: "referral", leadId: "referral_receipt"}, consent)).toBe(false);
    expect(recorded.siteLead).not.toHaveBeenCalled();
  });

  it("sends referral leads, and host leads under analytics alone (the tags keep contact data to marketing)", () => {
    setMarketingConsent("analytics");
    const consent = getMarketingConsent();
    expect(trackSiteLeadAccepted({kind: "referral", leadId: "referral_receipt"}, consent)).toBe(true);
    expect(trackHostLeadAccepted({kind: "demo", leadId: "lead_receipt", phone: "+919800000000"}, consent)).toBe(true);
    expect(recorded.siteLead).toHaveBeenCalledWith({kind: "referral", leadId: "referral_receipt"});
    expect(recorded.hostLead).toHaveBeenCalledTimes(1);
  });

  it("sends no lead without analytics consent", () => {
    setMarketingConsent("essential");
    const consent = getMarketingConsent();
    expect(trackSiteLeadAccepted({kind: "referral", leadId: "referral_receipt"}, consent)).toBe(false);
    expect(trackHostLeadAccepted({kind: "demo", leadId: "lead_receipt", phone: null}, consent)).toBe(false);
    expect(recorded.siteLead).not.toHaveBeenCalled();
    expect(recorded.hostLead).not.toHaveBeenCalled();
  });
});

describe("page engagement", () => {
  it("records nothing on a private page", () => {
    setMarketingConsent("analytics");
    window.history.replaceState(null, "", "/demo/synthetic-invite/");
    const stop = startPageEngagementTracking();
    stop();
    expect(recorded.analyticsEvent).not.toHaveBeenCalled();
  });
});
