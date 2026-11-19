import {beforeEach, expect, test, vi} from "vitest";
import {initializeMarketingAnalytics, setMarketingConsent, createMarketingEventId, shouldShowMarketingConsentBanner, trackAcceptedMarketingLead,
  getMarketingConsent, trackClientErrorSignal, trackMarketingEvent, trackPageView, trackWebsiteLeadFormEvent, waitlistAnalyticsPayload} from "./analytics";
import {currentCheckoutAdContext} from "./analytics/adContext";
import {catchAttributionKey} from "./analytics/catchMeasurement";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.dataLayer = [];
  window.history.replaceState(null, "", "/");
});

test("private demo direct entry neither stores attribution nor emits events", () => {
  window.history.replaceState(null, "", "/demo/synthetic-invite/#grant=synthetic");
  initializeMarketingAnalytics();
  trackPageView("sales_demo");
  trackMarketingEvent("synthetic-event");
  expect(window.dataLayer).toEqual([]);
  expect(localStorage.getItem("catch_marketing_attribution_v1")).toBeNull();
});

test("marketing listeners stop emitting after navigation to a private demo", () => {
  setMarketingConsent("accepted");
  initializeMarketingAnalytics();
  const before = localStorage.getItem("catch_marketing_attribution_v1");
  window.dataLayer = [];
  window.history.replaceState(null, "", "/demo/synthetic-invite/#grant=synthetic");
  initializeMarketingAnalytics();
  expect(trackClientErrorSignal("window_error")).toBe(false);
  window.dispatchEvent(new ErrorEvent("error", {message: new Error("Synthetic error").message}));
  trackPageView("sales_demo");
  expect(window.dataLayer).toEqual([]);
  expect(localStorage.getItem("catch_marketing_attribution_v1")).toEqual(before);
});

test("lead form events stay out of private pages even with analytics consent", () => {
  setMarketingConsent("analytics");
  window.history.replaceState(null, "", "/demo/synthetic-invite/#grant=synthetic");
  window.dataLayer = [];
  expect(trackWebsiteLeadFormEvent("viewed", {kind: "guide", formId: "rc-wa"})).toBe(false);
  window.history.replaceState(null, "", "/run-clubs/?utm_source=ig#form");
  expect(trackWebsiteLeadFormEvent("viewed", {kind: "guide", formId: "rc-wa"})).toBe(true);
  expect(window.dataLayer).toEqual([{event: "lead_form_viewed", content_version: "website_copy_v2", lead_kind: "guide", form_id: "rc-wa",
    page_path: "/run-clubs/"}]);
});

const legacyKey = "catch_marketing_attribution_v1";
const ephemeralKey = "catch_marketing_attribution_v3";

function attribution() { return waitlistAnalyticsPayload("test", "host").attribution; }

test("unset and essential consent clear obsolete raw attribution without storing a touch", () => {
  window.history.replaceState(null, "", "/host/?utm_campaign=launch&email=person@example.com#private");
  localStorage.setItem(legacyKey, JSON.stringify({firstTouch: {landingUrl: location.href}}));
  initializeMarketingAnalytics();
  expect(localStorage.getItem(legacyKey)).toBeNull();
  expect(localStorage.getItem(ephemeralKey)).toBeNull();
  expect(attribution()).toBeNull();
  setMarketingConsent("essential");
  expect(attribution()).toBeNull();
});

test("analytics consent captures only campaign labels in 30-day public marketing touches", () => {
  window.history.replaceState(null, "", "/host/?utm_source=newsletter&utm_medium=email&utm_campaign=launch_2026&utm_content=person%40example.com&utm_term=private%20answer&gclid=ad-secret&fbclid=ad-secret&email=private%40example.com#private-token");
  setMarketingConsent("analytics");
  expect(attribution()?.firstTouch).toMatchObject({landingPath: "/host/", referrer: null,
    values: {utm_source: "newsletter", utm_medium: "email", utm_campaign: "launch_2026"}});
  const stored = localStorage.getItem(ephemeralKey)!;
  expect(stored).not.toMatch(/private|person|gclid|fbclid|ad-secret|[?#]/u);
  expect(localStorage.getItem(legacyKey)).toBeNull();
  window.history.replaceState(null, "", "/host/planners/?utm_campaign=planner_launch");
  initializeMarketingAnalytics();
  expect(attribution()?.firstTouch.landingPath).toBe("/host/");
  expect(attribution()?.lastTouch.values).toEqual({utm_campaign: "planner_launch"});
  setMarketingConsent("essential");
  expect(localStorage.getItem(ephemeralKey)).toBeNull();
  expect(attribution()).toBeNull();
});

test.each(["/organizers/dating-host/", "/f/private-form/", "/offer/", "/booking/private-booking/", "/demo/private-demo/",
  "/invite/private-token/", "/rsvp/private-token/", "/join/private-runtime/", "/claim/private-listing/"])(
  "never captures campaign or click attribution on %s even after accepted consent", (path) => {
    window.history.replaceState(null, "", "/demo/start/");
    setMarketingConsent("accepted");
    window.history.replaceState(null, "", `${path}?utm_campaign=launch&gclid=SyntheticGoogle123#secret`);
    initializeMarketingAnalytics();
    expect(attribution()).toBeNull();
    expect(localStorage.getItem(ephemeralKey)).toBeNull();
    expect(localStorage.getItem(catchAttributionKey)).toBeNull();
  });

test("public event pages capture approved labels like any other public page", () => {
  window.history.replaceState(null, "", "/events/social-event/?utm_source=meta&utm_medium=paid_social&utm_term=private");
  setMarketingConsent("analytics");
  expect(attribution()?.firstTouch).toMatchObject({landingPath: "/events/social-event/",
    values: {utm_source: "meta", utm_medium: "paid_social"}});
});

test("ad click identifiers survive navigation to checkout, private pages included", () => {
  window.history.replaceState(null, "", "/?gclid=SyntheticGoogle123&fbclid=SyntheticMeta123&utm_source=google");
  setMarketingConsent("accepted");
  initializeMarketingAnalytics();
  for (const path of ["/explore/", "/organizers/synthetic-club/", "/booking/synthetic-event/", "/account/", "/events/synthetic-run/"]) {
    window.history.replaceState(null, "", path);
    initializeMarketingAnalytics();
    trackPageView("event_detail", path);
  }
  expect(currentCheckoutAdContext()).toMatchObject({gclid: "SyntheticGoogle123", fbclid: "SyntheticMeta123"});
  expect(attribution()?.lastTouch.values).toEqual({utm_source: "google"});
});

test.each(["analytics", "essential"] as const)("downgrading to %s clears the stored ad clicks", (choice) => {
  window.history.replaceState(null, "", "/host/?gclid=SyntheticGoogle123&fbclid=SyntheticMeta123");
  setMarketingConsent("accepted");
  expect(currentCheckoutAdContext()).toMatchObject({gclid: "SyntheticGoogle123"});
  setMarketingConsent(choice);
  expect(localStorage.getItem(catchAttributionKey) ?? "").not.toMatch(/Synthetic/u);
  window.history.replaceState(null, "", "/host/");
  setMarketingConsent("accepted");
  expect(currentCheckoutAdContext()).toBeUndefined();
});

test("ad clicks expire 30 days after the latest click", () => {
  vi.useFakeTimers({toFake: ["Date"]});
  try {
    vi.setSystemTime(new Date("2026-11-18T10:00:00Z"));
    window.history.replaceState(null, "", "/host/?gclid=SyntheticGoogle123");
    setMarketingConsent("accepted");
    vi.setSystemTime(new Date("2026-12-17T09:00:00Z"));
    window.history.replaceState(null, "", "/events/synthetic-run/");
    initializeMarketingAnalytics();
    expect(currentCheckoutAdContext()).toMatchObject({gclid: "SyntheticGoogle123"});
    vi.setSystemTime(new Date("2026-12-18T11:00:00Z"));
    initializeMarketingAnalytics();
    expect(currentCheckoutAdContext()).toBeUndefined();
  } finally {
    vi.useRealTimers();
  }
});

test("invalid consent flags fail closed and delete previous attribution", () => {
  setMarketingConsent("analytics");
  localStorage.setItem("catch_marketing_consent_v5", JSON.stringify({version: 5, choice: "essential", analytics: true, marketing: true, updatedAt: new Date().toISOString()}));
  expect(getMarketingConsent()).toBeNull();
  expect(localStorage.getItem(ephemeralKey)).toBeNull();
  localStorage.setItem("catch_marketing_consent_v5", JSON.stringify({version: 5, choice: "unknown", analytics: true, marketing: true, updatedAt: "bad"}));
  expect(getMarketingConsent()).toBeNull();
});

test("legacy raw attribution is discarded, expired touches are not reused", () => {
  window.history.replaceState(null, "", "/host/?utm_campaign=synthetic_launch");
  setMarketingConsent("accepted");
  localStorage.setItem(legacyKey, JSON.stringify({firstTouch: {landingUrl: "https://private.test/?email=secret#token"}}));
  expect(attribution()?.firstTouch.values).toEqual({utm_campaign: "synthetic_launch"});
  expect(localStorage.getItem(legacyKey)).toBeNull();
  const touch = {...attribution()!.firstTouch, capturedAt: "2020-01-01T00:00:00Z"};
  localStorage.setItem(ephemeralKey, JSON.stringify({firstTouch: touch, lastTouch: touch}));
  expect(attribution()).toBeNull();
  expect(localStorage.getItem(ephemeralKey)).toBeNull();
});

test("outside the production site no tag loads, even after the marketing choice, and no external gtag is called", () => {
  const external = vi.fn();
  window.gtag = external;
  const append = vi.spyOn(document.head, "appendChild");
  setMarketingConsent("accepted"); initializeMarketingAnalytics();
  window.history.replaceState(null, "", "/events/social-event/");
  initializeMarketingAnalytics();
  expect(external).not.toHaveBeenCalled();
  expect(append).not.toHaveBeenCalled();
  expect(window.dataLayer?.some((entry) => entry.event === "gtm.js")).toBe(false);
  delete window.gtag;
});


test("legacy analytics-only UI choices cannot authorize marketing and request a fresh versioned choice", () => {
  localStorage.setItem("catch_marketing_consent_v1", JSON.stringify({choice: "accepted", analytics: true,
    marketing: true, version: 4, updatedAt: new Date().toISOString()}));
  expect(getMarketingConsent()).toMatchObject({version: 1, choice: "analytics", analytics: true, marketing: false});
  expect(shouldShowMarketingConsentBanner()).toBe(true);
  setMarketingConsent("accepted");
  expect(getMarketingConsent()).toMatchObject({version: 5, analytics: true, marketing: true});
  expect(shouldShowMarketingConsentBanner()).toBe(false);
  expect(localStorage.getItem("catch_marketing_consent_v1")).toBeNull();
});

test("a version 4 choice, made while advertising was disabled, keeps analytics but asks again before any tag", () => {
  window.history.replaceState(null, "", "/host/?gclid=SyntheticGoogle123");
  localStorage.setItem("catch_marketing_consent_v4", JSON.stringify({version: 4, measurementMode: "disabled",
    choice: "accepted", analytics: true, marketing: true, updatedAt: new Date().toISOString()}));
  localStorage.setItem(catchAttributionKey, JSON.stringify({clientId: "1.1800000000", sessionId: 1800000000, gclid: "OldGoogleClick123"}));
  expect(getMarketingConsent()).toMatchObject({choice: "analytics", analytics: true, marketing: false});
  expect(shouldShowMarketingConsentBanner()).toBe(true);
  expect(localStorage.getItem(catchAttributionKey)).toBeNull();
  expect(currentCheckoutAdContext()).toBeUndefined();
  setMarketingConsent("accepted");
  expect(getMarketingConsent()).toMatchObject({version: 5, measurementMode: "first_party_tags", marketing: true});
  expect(localStorage.getItem("catch_marketing_consent_v4")).toBeNull();
  expect(shouldShowMarketingConsentBanner()).toBe(false);
});

test.each(["/claim", "/claim/"])("approved labels survive host to actual CTA %s", (claimPath) => {
  window.history.replaceState(null, "", "/host/?utm_source=google&utm_medium=cpc&utm_campaign=launch_2026");
  setMarketingConsent("analytics");
  initializeMarketingAnalytics();
  window.history.replaceState(null, "", claimPath + "?organizerId=private&email=private@example.test#grant=secret");
  initializeMarketingAnalytics();
  const payload = waitlistAnalyticsPayload("test", "host");
  expect(payload.attribution?.firstTouch.values).toEqual({utm_source: "google", utm_medium: "cpc", utm_campaign: "launch_2026"});
  expect(payload.analytics.pagePath).toBe("/claim/");
  expect(payload.analytics.pageTitle).toBe("Catch");
  expect(JSON.stringify(payload)).not.toMatch(/private|secret|grant|organizerId/u);
});

test("lead success requires submission-time permission with no mid-request accept/revoke replay", () => {
  window.history.replaceState(null, "", "/host/");
  const id = createMarketingEventId("host_lead");
  expect(trackAcceptedMarketingLead(id, "host_application", false, null)).toBe(false);
  const permission = setMarketingConsent("accepted");
  expect(trackAcceptedMarketingLead(id, "host_application", true, permission)).toBe(false);
  setMarketingConsent("essential");
  setMarketingConsent("accepted");
  expect(trackAcceptedMarketingLead(id, "host_application", false, permission)).toBe(false);
  const current = getMarketingConsent();
  expect(trackAcceptedMarketingLead(id, "host_application", false, current)).toBe(false);
  expect(trackAcceptedMarketingLead(id, "host_application", true, current, {eventId: id, isNew: false})).toBe(false);
  expect(trackAcceptedMarketingLead(id, "host_application", true, current, {eventId: id, isNew: true})).toBe(true);
  expect(trackAcceptedMarketingLead(id, "host_lead", false, current, {eventId: id, isNew: true})).toBe(false);
});

test("closed HTTP consent stays analytics-only until a versioned server handoff exists", () => {
  setMarketingConsent("accepted");
  expect(waitlistAnalyticsPayload("test", "host").analytics.consent).toMatchObject({
    choice: "analytics", analytics: true, marketing: false,
  });
  expect(waitlistAnalyticsPayload("test", "host").analytics.consent).not.toHaveProperty("version");
});

test("SPA views deduplicate a lifecycle render and count a real return visit without replay on accept", () => {
  initializeMarketingAnalytics();
  trackPageView("home", "visit-a");
  trackPageView("home", "visit-a");
  expect(window.dataLayer?.filter((entry) => entry.event === "page_view")).toHaveLength(1);
  setMarketingConsent("accepted");
  expect(window.dataLayer?.filter((entry) => entry.event === "page_view")).toHaveLength(1);
  window.history.replaceState(null, "", "/host/"); initializeMarketingAnalytics(); trackPageView("host", "visit-b");
  window.history.replaceState(null, "", "/"); initializeMarketingAnalytics(); trackPageView("home", "visit-c");
  expect(window.dataLayer?.filter((entry) => entry.event === "page_view")).toHaveLength(3);
});


test("a choice made under another measurement mode cannot authorise the tags", () => {
  localStorage.setItem("catch_marketing_consent_v5", JSON.stringify({version: 5,
    measurementMode: "google-live-v1", choice: "accepted", analytics: true, marketing: true,
    updatedAt: new Date().toISOString()}));
  expect(getMarketingConsent()).toMatchObject({version: 2, marketing: false});
  expect(shouldShowMarketingConsentBanner()).toBe(true);
});

test("version two choices require fresh consent and cannot inherit marketing permission", () => {
  localStorage.setItem("catch_marketing_consent_v2", JSON.stringify({version: 2,
    choice: "accepted", analytics: true, marketing: true, updatedAt: new Date().toISOString()}));
  expect(getMarketingConsent()).toMatchObject({version: 2, choice: "analytics", marketing: false});
  expect(shouldShowMarketingConsentBanner()).toBe(true);
  setMarketingConsent("accepted");
  expect(localStorage.getItem("catch_marketing_consent_v2")).toBeNull();
  expect(getMarketingConsent()).toMatchObject({version: 5, measurementMode: "first_party_tags"});
});


test("previous 24-hour consent cannot authorise 30-day retention", () => {
  window.history.replaceState(null, "", "/host/?utm_campaign=host_acquisition_2026");
  localStorage.setItem("catch_marketing_consent_v3", JSON.stringify({version: 3,
    measurementMode: "disabled", choice: "accepted", analytics: true,
    marketing: true, updatedAt: new Date().toISOString()}));
  initializeMarketingAnalytics();
  expect(shouldShowMarketingConsentBanner()).toBe(true);
  expect(attribution()).toBeNull();
  expect(localStorage.getItem(ephemeralKey)).toBeNull();
});
