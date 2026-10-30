import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {brand} from "@catch/brand";

installBrowserFixture();

const analytics = await import("../src/analytics.ts");

test("marketing events carry the immutable website copy content version", () => {
  window.dataLayer = [];

  analytics.trackMarketingEvent("contract_probe", {
    content_version: "caller_override",
    probe: true,
  });
  analytics.trackPageView("contract_page");

  assert.deepEqual(window.dataLayer[0], {
    event: "contract_probe",
    content_version: "website_copy_v2",
    probe: true,
  });
  assert.deepEqual(window.dataLayer[1], {
    event: "page_view",
    content_version: "website_copy_v2",
    page_name: "contract_page",
    page_path: "/host/",
    page_location: "https://catchdates.test/host/",
    page_title: "Catch contract fixture",
  });
});

test("analytics URL parameters omit query strings and attribution requires consent", () => {
  window.localStorage.clear();
  window.dataLayer = [];

  analytics.initializeMarketingAnalytics();
  analytics.trackMarketingEvent("contract_url_probe", {
    page_location: "https://catchdates.test/host/?email=private%40example.com",
    page_path: "/host/?email=private%40example.com",
  });
  const payload = analytics.waitlistAnalyticsPayload("waitlist_event-1", "member");

  assert.deepEqual(latestEvent("contract_url_probe"), {
    event: "contract_url_probe",
    content_version: "website_copy_v2",
    page_location: "https://catchdates.test/host/",
    page_path: "/host/",
  });
  assert.equal(payload.analytics.pagePath, "/host/");
  assert.equal(payload.attribution, null);
  analytics.setMarketingConsent("analytics");
  const consented = analytics.waitlistAnalyticsPayload("waitlist_event-2", "member");
  assert.equal(consented.attribution?.firstTouch.landingPath, "/host/");
  assert.equal(consented.attribution?.firstTouch.landingUrl, `${brand.web.origin}/host/`);
  assert.equal(consented.attribution?.firstTouch.referrer, null);
  assert.deepEqual(consented.attribution?.firstTouch.values, {});
});

test("the host application attempt emits a GA4-safe event name", () => {
  window.dataLayer = [];

  analytics.trackMarketingEvent("host_application_submit_attempt", {
    city: "Indore",
  });

  assert.deepEqual(window.dataLayer, [
    {
      event: "host_application_submit_attempt",
      city: "Indore",
      content_version: "website_copy_v2",
    },
  ]);
  assert.ok(window.dataLayer[0].event.length <= 40);
});

test("CTA payloads preserve the cta_label and cta_href transport contract", () => {
  window.dataLayer = [];

  analytics.trackMarketingEvent(
    "cta_click",
    analytics.marketingCtaClickParameters("home_hero_get_app", "/download")
  );
  analytics.trackMarketingEvent(
    "cta_click",
    analytics.marketingCtaClickParameters("footer_for_hosts", "/host/")
  );

  assert.deepEqual(window.dataLayer, [
    {
      event: "cta_click",
      content_version: "website_copy_v2",
      cta_href: "/download",
      cta_label: "home_hero_get_app",
      page_path: "/host/",
    },
    {
      event: "cta_click",
      content_version: "website_copy_v2",
      cta_href: "/host/",
      cta_label: "footer_for_hosts",
      page_path: "/host/",
    },
  ]);
  assert.equal("cta_id" in window.dataLayer[0], false);
  assert.equal("cta_id" in window.dataLayer[1], false);
});

test("consent banner state covers unset, essential-only, and accepted choices", () => {
  window.localStorage.clear();
  window.dataLayer = [];

  assert.equal(analytics.getMarketingConsent(), null);
  assert.equal(analytics.shouldShowMarketingConsentBanner(), true);

  const essential = analytics.setMarketingConsent("essential");
  assert.equal(essential.choice, "essential");
  assert.equal(essential.analytics, false);
  assert.equal(essential.marketing, false);
  assert.equal(analytics.shouldShowMarketingConsentBanner(), false);
  assert.equal(latestEvent("consent_updated").content_version, "website_copy_v2");

  window.localStorage.clear();
  const accepted = analytics.setMarketingConsent("accepted");
  assert.equal(accepted.choice, "accepted");
  assert.equal(accepted.analytics, true);
  assert.equal(accepted.marketing, true);
  assert.equal(analytics.shouldShowMarketingConsentBanner(), false);
  assert.equal(latestEvent("consent_updated").content_version, "website_copy_v2");
});

test("client error signals are coarse and require analytics consent", () => {
  window.localStorage.clear();
  window.dataLayer = [];

  assert.equal(analytics.trackClientErrorSignal("window_error"), false);
  assert.equal(latestEvent("client_error"), undefined);

  analytics.setMarketingConsent("essential");
  assert.equal(analytics.trackClientErrorSignal("unhandled_rejection"), false);
  assert.equal(latestEvent("client_error"), undefined);

  analytics.setMarketingConsent("accepted");
  assert.equal(analytics.trackClientErrorSignal("window_error"), true);
  assert.deepEqual(latestEvent("client_error"), {
    event: "client_error",
    content_version: "website_copy_v2",
    error_source: "window_error",
    page_path: "/host/",
  });
});

test("private event updates do not enter analytics or attribution storage", () => {
  const previous = window.location;
  window.localStorage.clear();
  window.dataLayer = [];
  window.location = {pathname: "/event-update/private-link/", search: "",
    href: "https://catchdates.test/event-update/private-link/#private-secret"};
  try {
    analytics.initializeMarketingAnalytics();
    analytics.trackPageView("event_assistance");
    analytics.trackMarketingEvent("client_error", {page_location: window.location.href});
    assert.deepEqual(window.dataLayer, []);
    assert.equal(window.localStorage.getItem("catch_marketing_attribution_v1"), null);
  } finally {
    window.location = previous;
  }
});

test("private offer links never enter analytics or attribution storage", () => {
  const previous = window.location;
  for (const pathname of ["/offer", "/offer/", "/booking/event-id/"]) {
    window.localStorage.clear(); window.dataLayer = [];
    window.location = {pathname, search: "", href: `https://catchdates.test${pathname}#secret`};
    try {
      analytics.initializeMarketingAnalytics();
      analytics.trackPageView("event_offer");
      analytics.trackMarketingEvent("client_error", {page_location: window.location.href});
      assert.deepEqual(window.dataLayer, []);
      assert.equal(window.localStorage.getItem("catch_marketing_attribution_v1"), null);
    } finally {window.location = previous;}
  }
});

function latestEvent(eventName) {
  return [...window.dataLayer]
    .reverse()
    .find((entry) => !Array.isArray(entry) && entry.event === eventName);
}

function installBrowserFixture() {
  const values = new Map();
  const localStorage = {
    clear() {
      values.clear();
    },
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
  };

  globalThis.window = {
    addEventListener() {},
    dataLayer: [],
    location: {
      href: "https://catchdates.test/host/?source=contract",
      pathname: "/host/",
      search: "?source=contract",
    },
    localStorage,
    sessionStorage: {getItem: (key) => localStorage.getItem(`session:${key}`),
      setItem: (key, value) => localStorage.setItem(`session:${key}`, value),
      removeItem: (key) => localStorage.removeItem(`session:${key}`)},
  };
  globalThis.document = {
    createElement() {
      return {};
    },
    head: {
      appendChild() {},
    },
    referrer: "",
    title: "Catch contract fixture",
  };
}

test("event detail rendered views use the backend source vocabulary and shared public chrome", () => {
  const page = readFileSync(new URL("../src/features/events/EventDetailPage.tsx", import.meta.url), "utf8");
  const ingestion = readFileSync(new URL("../../functions/src/analytics/organizerAnalyticsEvents.ts", import.meta.url), "utf8");
  const source = page.match(/observeOrganizerPageView\(listing,\s*"eventView",\s*"([^"]+)"/u)?.[1];
  assert.equal(source, "event_detail");
  const allowedSources = ingestion.match(/const publicSources = new Set\(\[([\s\S]*?)\]\);/u)?.[1];
  assert.ok(allowedSources?.includes(`"${source}"`), "rendered view source must survive backend normalization");
  assert.match(page, /<PublicSiteHeader\b/u);
  assert.match(page, /<PublicSiteFooter\b/u);
  assert.doesNotMatch(page, /<Site(?:Header|Footer)\b/u);
});
