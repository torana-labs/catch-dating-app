import {beforeEach, describe, expect, it, vi} from "vitest";
import {waitFor} from "@testing-library/react";
import {setMarketingConsent} from "../../analytics";
import {hostListings} from "./data";
import {observeOrganizerPageView, trackOrganizerAnalytics, trackOrganizerLinkClick, trafficSourceOf} from "./analytics";
import {brand} from "@catch/brand";

const record = vi.hoisted(() => vi.fn());
vi.mock("../../firebase", () => ({recordOrganizerAnalyticsEvent: record}));
const listing = {...hostListings[0], publicApi: {...hostListings[0].publicApi, state: "enabled" as const, reason: "Test"}};

beforeEach(async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  localStorage.clear(); sessionStorage.clear(); window.dataLayer = [];
  window.history.replaceState(null, "", "/events/external-test/?token=secret#private");
  record.mockResolvedValue({accepted: true});
});

describe("first-party organizer presence", () => {
  it("creates no session or mirror without analytics consent, then observes acceptance", async () => {
    const stop = observeOrganizerPageView(listing, "eventView", "event_detail_page", "external-test");
    expect(sessionStorage.length).toBe(0);
    expect(record).not.toHaveBeenCalled();
    setMarketingConsent("essential");
    expect(sessionStorage.length).toBe(0);
    setMarketingConsent("accepted");
    await waitFor(() => expect(record).toHaveBeenCalledTimes(1));
    expect(record.mock.calls[0][0]).toMatchObject({pagePath: "/events/external-test/", eventName: "eventView", eventId: "external-test"});
    expect(window.dataLayer?.some((event) => String(event.event).startsWith("organizer_"))).toBe(false);
    expect(localStorage.getItem("catch_host_analytics_session_v1")).toBeNull();
    stop();
    await waitFor(() => expect(sessionStorage.getItem("catch_host_analytics_views_v1")).toContain("external-test"));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it("deduplicates pending and completed mounts across module reloads but counts clicks separately", async () => {
    setMarketingConsent("accepted");
    trackOrganizerAnalytics(listing, "eventView", "event_detail_page", "external-test");
    trackOrganizerAnalytics(listing, "eventView", "event_detail_page", "external-test");
    await waitFor(() => expect(sessionStorage.getItem("catch_host_analytics_views_v1")).toContain("external-test"));
    expect(record).toHaveBeenCalledTimes(1);
    record.mockClear();
    vi.resetModules();
    const reloaded = await import("./analytics");
    reloaded.trackOrganizerAnalytics(listing, "eventView", "event_detail_page", "external-test");
    reloaded.trackOrganizerAnalytics(listing, "outboundClick", "external_event_booking", "external-test");
    await waitFor(() => expect(record).toHaveBeenCalledTimes(1));
    reloaded.trackOrganizerAnalytics(listing, "outboundClick", "external_event_booking", "external-test");
    await waitFor(() => expect(record).toHaveBeenCalledTimes(2));
    expect(record.mock.calls.every(([payload]) => payload.eventName === "outboundClick")).toBe(true);
    expect(new Set(record.mock.calls.map(([payload]) => payload.sessionId)).size).toBe(1);
  });

  it("retries unaccepted views without changing the session identity", async () => {
    setMarketingConsent("accepted"); record.mockResolvedValueOnce({accepted: false});
    trackOrganizerAnalytics(listing, "listingView", "listing_page");
    await waitFor(() => expect(record).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(sessionStorage.getItem("catch_host_analytics_views_v1")).toBeNull();
    trackOrganizerAnalytics(listing, "listingView", "listing_page");
    await waitFor(() => expect(record).toHaveBeenCalledTimes(2));
    expect(record.mock.calls[0][0].sessionId).toBe(record.mock.calls[1][0].sessionId);
  });

  it("clears old identifiers and accepted view caches on revoked or unset consent", async () => {
    setMarketingConsent("analytics");
    trackOrganizerAnalytics(listing, "eventView", "event_detail_page", "external-test");
    await waitFor(() => expect(sessionStorage.getItem("catch_host_analytics_views_v1")).toContain("external-test"));
    localStorage.setItem("catch_host_analytics_session_v1", "obsolete-persistent-session");
    setMarketingConsent("essential");
    expect(sessionStorage.getItem("catch_host_analytics_session_v1")).toBeNull();
    expect(sessionStorage.getItem("catch_host_analytics_views_v1")).toBeNull();
    expect(localStorage.getItem("catch_host_analytics_session_v1")).toBeNull();
    sessionStorage.setItem("catch_host_analytics_session_v1", "stale");
    localStorage.clear();
    window.dispatchEvent(new Event("catch:marketing-consent-changed"));
    expect(sessionStorage.getItem("catch_host_analytics_session_v1")).toBeNull();
  });

  it("fences pending acceptance across revocation and regrant without deleting the new pending view", async () => {
    let finishOld!: (value: {accepted: boolean}) => void;
    let finishNew!: (value: {accepted: boolean}) => void;
    record.mockImplementationOnce(() => new Promise((resolve) => {finishOld = resolve;}));
    setMarketingConsent("analytics");
    trackOrganizerAnalytics(listing, "eventView", "event_detail_page", "external-test");
    await waitFor(() => expect(record).toHaveBeenCalledTimes(1));
    const oldId = record.mock.calls[0][0].sessionId;
    setMarketingConsent("essential");
    finishOld({accepted: true});
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(sessionStorage.getItem("catch_host_analytics_views_v1")).toBeNull();
    expect(sessionStorage.getItem("catch_host_analytics_session_v1")).toBeNull();

    // A second old call completes after consent is granted and a new call starts.
    record.mockImplementationOnce(() => new Promise((resolve) => {finishOld = resolve;}));
    setMarketingConsent("analytics");
    trackOrganizerAnalytics(listing, "eventView", "event_detail_page", "external-test");
    await waitFor(() => expect(record).toHaveBeenCalledTimes(2));
    setMarketingConsent("essential");
    setMarketingConsent("analytics");
    record.mockImplementationOnce(() => new Promise((resolve) => {finishNew = resolve;}));
    trackOrganizerAnalytics(listing, "eventView", "event_detail_page", "external-test");
    await waitFor(() => expect(record).toHaveBeenCalledTimes(3));
    expect(record.mock.calls[2][0].sessionId).not.toBe(oldId);
    finishOld({accepted: true});
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(sessionStorage.getItem("catch_host_analytics_views_v1")).toBeNull();
    trackOrganizerAnalytics(listing, "eventView", "event_detail_page", "external-test");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(record).toHaveBeenCalledTimes(3);
    finishNew({accepted: true});
    await waitFor(() => expect(sessionStorage.getItem("catch_host_analytics_views_v1")).toContain("external-test"));
  });

});

describe("owner link clicks", () => {
  it("maps ?via= and the referrer host to the fixed traffic sources", () => {
    const origin = brand.web.origin;
    expect([
      trafficSourceOf("https://l.instagram.com/?u=x", "", origin),
      trafficSourceOf("", "?via=QR", origin),
      trafficSourceOf("https://www.google.co.in/", "?via=ig", origin),
      trafficSourceOf("https://wa.me/", "", origin),
      trafficSourceOf("https://m.facebook.com/", "", origin),
      trafficSourceOf("https://mail.google.com/mail/u/0/", "", origin),
      trafficSourceOf("https://www.google.com/", "", origin),
      trafficSourceOf("", "", origin),
      trafficSourceOf(`${brand.web.origin}/explore/`, "", origin),
      trafficSourceOf("https://blog.example.org/post", "", origin),
      trafficSourceOf("", "?via=summer_sale_utm", origin),
      trafficSourceOf("not a url", "", origin),
    ]).toEqual(["instagram", "qr", "instagram", "whatsapp", "facebook", "email", "google", "direct", "other", "other",
      "other", "other"]);
  });

  it("sends the link and the visit's source only with analytics consent", async () => {
    window.history.replaceState(null, "", "/organizers/lantern/?via=qr");
    trackOrganizerLinkClick(listing, "tickets", "organizer_page");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(record).not.toHaveBeenCalled();
    expect(sessionStorage.length).toBe(0);
    setMarketingConsent("analytics");
    trackOrganizerLinkClick(listing, "tickets", "organizer_page");
    await waitFor(() => expect(record).toHaveBeenCalledTimes(1));
    expect(record.mock.calls[0][0]).toMatchObject({eventName: "linkClick", linkId: "tickets", trafficSource: "qr",
      source: "organizer_page", pagePath: "/organizers/lantern/"});
    // The landing source holds for the tab session, then leaves with consent.
    window.history.replaceState(null, "", "/organizers/lantern/");
    trackOrganizerLinkClick(listing, "tickets", "organizer_page");
    await waitFor(() => expect(record).toHaveBeenCalledTimes(2));
    expect(record.mock.calls[1][0].trafficSource).toBe("qr");
    setMarketingConsent("essential");
    expect(sessionStorage.getItem("catch_host_analytics_traffic_source_v1")).toBeNull();
  });

  it("keeps link fields off every other event", async () => {
    setMarketingConsent("analytics");
    trackOrganizerAnalytics(listing, "outboundClick", "source_website");
    await waitFor(() => expect(record).toHaveBeenCalledTimes(1));
    expect(record.mock.calls[0][0]).not.toHaveProperty("linkId");
    expect(record.mock.calls[0][0]).not.toHaveProperty("trafficSource");
  });
});
