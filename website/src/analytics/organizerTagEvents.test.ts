import {describe, expect, it} from "vitest";
import {brand} from "@catch/brand";
import type {AdBooking} from "./adTags";
import {organizerAdPage, publicAdPage} from "./catchMeasurement";
import {newOrganizerTagEventId, organizerBeginCheckout, organizerPageView, organizerPurchase,
  organizerViewContent} from "./organizerTagEvents";

const id = "org_synthetic00000001";
const eventPage = organizerAdPage("/events/synthetic-run/");
const profile = organizerAdPage("/organizers/harbour-line-run-club/");
const booking: AdBooking = {eventId: "synthetic-run", paymentId: `pp_${"a".repeat(32)}`, amountPaise: 45000, places: 3, mode: "live"};
const page = (path: string) => ({page_location: `${brand.web.origin}${path}`, page_title: brand.name, page_referrer: ""});

describe("organiser tag eligible routes", () => {
  it.each([
    ["/organizers/harbour-line-run-club/", "organizer"],
    ["/organizers/harbour-line-run-club", "organizer"],
    ["/organizers/mumbai/harbour-line-run-club/", "organizer"],
    ["/events/synthetic-run/", "event"],
  ])("allows %s", (path, kind) => {
    expect(organizerAdPage(path)?.kind).toBe(kind);
  });

  it.each([
    "/organizers/", "/organizers", "/organizers/a/b/c/", "/organizers/Harbour/", "/organizers/harbour-line-run-club/claim/",
    "/organizers/claim/", "/organizers/harbour-line-run-club/owner/", "/organizers/harbour-line-run-club/offer/",
    "/claim/", "/claim/harbour-line-run-club/", "/f/form-1/", "/offer/", "/offer", "/account/", "/demo/invite-1/",
    "/booking/synthetic-run/", "/event-update/link-1/", "/join/token/", "/invite/token/", "/rsvp/token/",
    "/rehearse/token/", "/events/", "/events/synthetic-run/book/", "/listings/request/", "/", "/host/", "/mumbai/",
  ])("refuses %s", (path) => {
    expect(organizerAdPage(path)).toBeNull();
  });

  it("refuses any query and non-anchor hash, so nothing from the address reaches a tag", () => {
    expect(organizerAdPage("/events/synthetic-run/", "?fbclid=abcdefghijkl")).toBeNull();
    expect(organizerAdPage("/events/synthetic-run/", "?utm_source=meta")).toBeNull();
    expect(organizerAdPage("/organizers/harbour-line-run-club/", "", "#a=b&c")).toBeNull();
    expect(organizerAdPage("/organizers/harbour-line-run-club/", "", "#events")?.kind).toBe("organizer");
  });

  it("keeps Catch's own route class unchanged: organiser pages stay non-public for Catch tags", () => {
    expect(publicAdPage("/organizers/harbour-line-run-club/")).toBeNull();
    expect(publicAdPage("/events/synthetic-run/")).toBe("/events/synthetic-run/");
  });
});

describe("organiser tag closed event map", () => {
  it("page_view / PageView carry only fixed page fields and the organiser event id", () => {
    expect(organizerPageView(profile, id)).toEqual({
      google: {name: "page_view", params: {...page("/organizers/harbour-line-run-club/"), event_id: id}},
      meta: {name: "PageView", params: {}, eventID: id},
    });
  });

  it("view_item / ViewContent: event id, activity kind, city and price only", () => {
    expect(organizerViewContent(eventPage, {eventId: "synthetic-run", activityKind: "running", city: " Mumbai ", amountPaise: 45000}, id))
      .toEqual({
        google: {name: "view_item", params: {...page("/events/synthetic-run/"), event_id: id, city: "Mumbai", value: 450,
          currency: "INR", items: [{item_id: "synthetic-run", item_category: "running"}]}},
        meta: {name: "ViewContent", params: {content_ids: ["synthetic-run"], content_type: "product", activity_kind: "running",
          city: "Mumbai", value: 450, currency: "INR"}, eventID: id},
      });
  });

  it("drops dating words and free text from parameters", () => {
    const command = organizerViewContent(eventPage, {eventId: "synthetic-run", activityKind: "singlesMixer",
      city: "Speed dating night", amountPaise: null}, id)!;
    expect(command.google.params).not.toHaveProperty("city");
    expect(command.meta.params).not.toHaveProperty("activity_kind");
    expect(JSON.stringify(command)).not.toMatch(/singl|mixer|dating|speed/iu);
  });

  it("booking events use the admitted booking, never the Catch payment id", () => {
    const started = organizerBeginCheckout(eventPage, booking, id)!;
    const completed = organizerPurchase(eventPage, booking, "org_synthetic00000002")!;
    expect(started.google).toEqual({name: "begin_checkout", params: {...page("/events/synthetic-run/"), event_id: id, value: 450,
      currency: "INR", items: [{item_id: "synthetic-run", quantity: 3}]}});
    expect(started.meta).toEqual({name: "InitiateCheckout", params: {content_ids: ["synthetic-run"], content_type: "product",
      num_items: 3, value: 450, currency: "INR"}, eventID: id});
    expect(completed.google.params.transaction_id).toBe("org_synthetic00000002");
    expect(completed.meta.name).toBe("Purchase");
    for (const command of [started, completed]) expect(JSON.stringify(command)).not.toContain(booking.paymentId);
  });

  it("refuses test bookings, other events' pages, profile pages and non-organiser ids", () => {
    expect(organizerPurchase(eventPage, {...booking, mode: "test"}, id)).toBeNull();
    expect(organizerPurchase(organizerAdPage("/events/other-run/"), booking, id)).toBeNull();
    expect(organizerPurchase(profile, booking, id)).toBeNull();
    expect(organizerViewContent(profile, {eventId: "synthetic-run", activityKind: "running", city: "Mumbai", amountPaise: 0}, id)).toBeNull();
    for (const bad of [booking.paymentId, "catch_1800000000000_x", "org_", "org_short", ""]) {
      expect(organizerPageView(profile, bad)).toBeNull();
    }
    expect(organizerPageView(null, id)).toBeNull();
  });

  it("returns frozen commands with no keys outside the map", () => {
    const command = organizerViewContent(eventPage, {eventId: "synthetic-run", activityKind: "running", city: "Mumbai", amountPaise: 100}, id)!;
    expect(Object.isFrozen(command.google.params)).toBe(true);
    expect(Object.keys(command.google.params).sort()).toEqual(
      ["city", "currency", "event_id", "items", "page_location", "page_referrer", "page_title", "value"]);
    expect(Object.keys(command.meta.params).sort()).toEqual(
      ["activity_kind", "city", "content_ids", "content_type", "currency", "value"]);
  });

  it("generates opaque organiser event ids", () => {
    expect(newOrganizerTagEventId(() => "1b4e28ba-2fa1-11d2-883f-0016d3cca427")).toMatch(/^org_[A-Za-z0-9_-]{8,120}$/u);
  });
});
