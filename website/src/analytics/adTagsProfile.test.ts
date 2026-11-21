import {beforeEach, describe, expect, it} from "vitest";
import {brand} from "@catch/brand";
import {createAdTags, type OrganizerAdDestinations} from "./adTags";

type Globals = {catchTagLayer?: ArrayLike<unknown>[]; catchOrganizerTagLayer?: ArrayLike<unknown>[];
  fbq?: {queue: ArrayLike<unknown>[]}; _fbq?: unknown};
const globals = () => window as unknown as Globals;
const consent = (choice: "accepted" | "analytics") => ({version: 7, choice, analytics: true,
  marketing: choice === "accepted", updatedAt: "2026-11-19T21:00:00.000Z"});
const profile = "/organizers/harbour-line-run-club/";
const catchEvents = (name: string) => (globals().catchTagLayer ?? []).map((entry) => Array.from(entry))
  .filter(([command, event]) => command === "event" && event === name);
const organizerEvents = () => (globals().catchOrganizerTagLayer ?? []).map((entry) => Array.from(entry))
  .filter(([command]) => command === "event");
let ids = 0;
const tags = () => createAdTags({hostAllowed: () => true, newId: () => `catch_1800000000000_profile${++ids}`});

beforeEach(() => {
  delete globals().catchTagLayer;
  delete globals().catchOrganizerTagLayer;
  delete globals().fbq;
  delete globals()._fbq;
  document.querySelectorAll("script").forEach((script) => script.remove());
  window.history.replaceState(null, "", profile);
});

describe("Catch's own tags on organiser profiles", () => {
  it("stay closed on a profile until the server-eligible profile is admitted", () => {
    const ad = tags();
    ad.sync(consent("analytics"));
    expect(ad.pageView()).toBe(false);
    expect(globals().catchTagLayer).toBeUndefined();
    expect(ad.admitOrganizerProfile(profile)).toBe(true);
    ad.sync(consent("analytics"));
    expect(ad.pageView()).toBe(true);
    expect((globals().catchTagLayer ?? []).map((entry) => Array.from(entry))).toContainEqual(
      ["set", {page_location: `${brand.web.origin}${profile}`, page_title: `Organiser page | ${brand.name}`}]);
    expect(catchEvents("page_view")).toHaveLength(1);
  });

  it("cover only the admitted profile, never its flows, another profile or after clearing", () => {
    const ad = tags();
    ad.admitOrganizerProfile(profile);
    ad.sync(consent("accepted"));
    for (const path of [`${profile}claim/`, `${profile}owner/`, "/organizers/other-club/", "/organizers/"]) {
      window.history.replaceState(null, "", path);
      expect(ad.pageView()).toBe(false);
    }
    window.history.replaceState(null, "", profile);
    expect(ad.pageView()).toBe(true);
    expect(ad.admitOrganizerProfile(profile)).toBe(false);
    ad.admitOrganizerProfile(null);
    expect(ad.pageView()).toBe(false);
    expect(ad.admitOrganizerProfile("/claim/harbour-line-run-club/")).toBe(false);
    expect(ad.pageView()).toBe(false);
  });

  it("send nothing, Catch's or the organiser's, while a private surface is open", () => {
    const ad = tags();
    const set: OrganizerAdDestinations = {organizerId: "harbour-line-run-club", eventId: null,
      metaPixelId: "700000000000007", googleMeasurementId: "G-ORGANISER7"};
    ad.admitOrganizerProfile(profile);
    ad.sync(consent("accepted"));
    ad.setOrganizer(set);
    const release = ad.holdForPrivateSurface();
    const nested = ad.holdForPrivateSurface();
    expect(ad.pageView()).toBe(false);
    expect(ad.organizerPageView()).toBe(false);
    release();
    release();
    expect(ad.pageView()).toBe(false);
    nested();
    expect(ad.pageView()).toBe(true);
    expect(ad.organizerPageView()).toBe(true);
    expect(organizerEvents()).toHaveLength(1);
  });

  it("leave other public pages unchanged while a profile is admitted", () => {
    const ad = tags();
    ad.admitOrganizerProfile(profile);
    window.history.replaceState(null, "", "/events/synthetic-run/");
    ad.sync(consent("analytics"));
    expect(ad.pageView()).toBe(true);
  });
});
