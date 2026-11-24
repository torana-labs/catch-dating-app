import {beforeEach, describe, expect, it, vi} from "vitest";
import {waitFor} from "@testing-library/react";

const transport = vi.hoisted(() => ({set: vi.fn(), pageView: vi.fn(), admit: vi.fn()}));
vi.mock("../../analytics", async (importActual) => ({
  ...(await importActual<typeof import("../../analytics")>()),
  setOrganizerAdDestinations: transport.set,
  trackOrganizerPageViewed: transport.pageView,
  admitCatchOrganizerProfile: transport.admit,
}));
import {setMarketingConsent} from "../../analytics";
import {hostListings} from "./data";
import {observeOrganizerProviders, type OrganizerTrackingSettings} from "./observeOrganizerProviders";

const listing = {...hostListings[0], publicApi: {...hostListings[0].publicApi, state: "enabled" as const}};
let sequence = 0;
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); sequence++;
  transport.set.mockClear(); transport.pageView.mockClear(); transport.admit.mockClear();
});
function setup(path?: string) {
  const eventId = `event-${sequence}`;
  window.history.replaceState(null, "", path ?? `/events/${eventId}/`);
  const settings: OrganizerTrackingSettings = {organizerId: listing.id, eventId, enabled: true,
    googleMeasurementId: "G-TEST123456", metaPixelId: "1234567890"};
  const readSettings = vi.fn().mockResolvedValue(settings);
  return {eventId, settings, readSettings};
}
const lastSet = () => transport.set.mock.calls.at(-1)?.[0];

describe("organiser tags through the first-party transport", () => {
  it("reads nothing before a marketing choice, then sets the published destination set and sends a page view", async () => {
    const state = setup();
    const stop = observeOrganizerProviders(listing, state.eventId, state);
    setMarketingConsent("essential");
    setMarketingConsent("analytics");
    expect(state.readSettings).not.toHaveBeenCalled();
    setMarketingConsent("accepted");
    await waitFor(() => expect(transport.pageView).toHaveBeenCalledOnce());
    expect(state.readSettings).toHaveBeenCalledWith({organizerId: listing.id, eventId: state.eventId});
    expect(lastSet()).toEqual({organizerId: listing.id, eventId: state.eventId, metaPixelId: "1234567890",
      googleMeasurementId: "G-TEST123456"});
    stop();
    expect(lastSet()).toBeNull();
  });

  it("uses nothing the projection did not publish", async () => {
    const state = setup();
    setMarketingConsent("accepted");
    for (const settings of [{...state.settings, enabled: false}, {...state.settings, organizerId: "other-organizer"},
      {...state.settings, eventId: "other-event"}]) {
      state.readSettings.mockResolvedValue(settings);
      const stop = observeOrganizerProviders(listing, state.eventId, state);
      await Promise.resolve(); await Promise.resolve();
      expect(transport.set.mock.calls.every(([set]) => set === null)).toBe(true);
      stop();
    }
    state.readSettings.mockRejectedValue(new Error("permission-denied"));
    const stop = observeOrganizerProviders(listing, state.eventId, state);
    await Promise.resolve(); await Promise.resolve();
    expect(transport.pageView).not.toHaveBeenCalled();
    stop();
  });

  it("clears the set when the choice is withdrawn and ignores an in-flight response", async () => {
    const state = setup();
    let resolve: (settings: OrganizerTrackingSettings) => void = () => {};
    state.readSettings.mockImplementation(() => new Promise<OrganizerTrackingSettings>((done) => {resolve = done;}));
    setMarketingConsent("accepted");
    const stop = observeOrganizerProviders(listing, state.eventId, state);
    setMarketingConsent("essential");
    resolve(state.settings);
    await Promise.resolve(); await Promise.resolve();
    expect(lastSet()).toBeNull();
    expect(transport.pageView).not.toHaveBeenCalled();
    stop();
  });

  it("ignores a late response after navigation, and reads nothing on an ineligible page", async () => {
    const state = setup();
    let resolve: (settings: OrganizerTrackingSettings) => void = () => {};
    state.readSettings.mockImplementation(() => new Promise<OrganizerTrackingSettings>((done) => {resolve = done;}));
    setMarketingConsent("accepted");
    const stop = observeOrganizerProviders(listing, state.eventId, state);
    window.history.replaceState(null, "", "/events/next-event/");
    resolve(state.settings);
    await Promise.resolve(); await Promise.resolve();
    expect(transport.pageView).not.toHaveBeenCalled();
    stop();
    for (const path of ["/booking/private-token/", "/claim/private/", `/events/${state.eventId}/?secret=never`]) {
      state.readSettings.mockClear();
      window.history.replaceState(null, "", path);
      const stopPrivate = observeOrganizerProviders(listing, state.eventId, state);
      expect(state.readSettings).not.toHaveBeenCalled();
      stopPrivate();
    }
  });

  it("admits a server-eligible profile to Catch's tags under analytics alone, and clears it on leaving", async () => {
    const state = setup(listing.path);
    state.readSettings.mockResolvedValue({...state.settings, eventId: null, enabled: false, metaPixelId: null,
      googleMeasurementId: null, profileTagsEligible: true});
    setMarketingConsent("analytics");
    const stop = observeOrganizerProviders(listing, null, state);
    await waitFor(() => expect(transport.admit).toHaveBeenCalledWith(listing.path));
    expect(state.readSettings).toHaveBeenCalledWith({organizerId: listing.id, eventId: null});
    expect(transport.set.mock.calls.every(([set]) => set === null)).toBe(true);
    stop();
    expect(transport.admit).toHaveBeenLastCalledWith(null);
  });

  it("reads the page read model's own projection, and a page without one has no tags", async () => {
    const state = setup(listing.path);
    setMarketingConsent("accepted");
    const tracking = {enabled: false as const, metaPixelId: null, googleMeasurementId: null,
      policyReason: "policyReviewRequired" as const, profileTagsEligible: true};
    let stop = observeOrganizerProviders(listing, null, {tracking});
    await waitFor(() => expect(transport.admit).toHaveBeenCalledWith(listing.path));
    expect(transport.set.mock.calls.every(([set]) => set === null)).toBe(true);
    stop();
    transport.admit.mockClear();
    stop = observeOrganizerProviders(listing, null, {tracking: null});
    await Promise.resolve(); await Promise.resolve();
    expect(transport.admit.mock.calls.every(([path]) => path === null)).toBe(true);
    stop();
  });

  it("keeps the profile closed when the server says no, the read fails or consent is essential", async () => {
    const state = setup(listing.path);
    setMarketingConsent("accepted");
    state.readSettings.mockResolvedValue({...state.settings, eventId: null, enabled: false, profileTagsEligible: false});
    let stop = observeOrganizerProviders(listing, null, state);
    await waitFor(() => expect(transport.admit).toHaveBeenCalled());
    expect(transport.admit.mock.calls.every(([path]) => path === null)).toBe(true);
    stop();
    state.readSettings.mockRejectedValue(new Error("unavailable"));
    stop = observeOrganizerProviders(listing, null, state);
    await Promise.resolve(); await Promise.resolve();
    expect(transport.admit.mock.calls.every(([path]) => path === null)).toBe(true);
    stop();
    setMarketingConsent("essential");
    state.readSettings.mockClear();
    stop = observeOrganizerProviders(listing, null, state);
    expect(state.readSettings).not.toHaveBeenCalled();
    stop();
  });

  it("never admits a profile from an event page read", async () => {
    const state = setup();
    state.readSettings.mockResolvedValue({...state.settings, profileTagsEligible: true});
    setMarketingConsent("accepted");
    const stop = observeOrganizerProviders(listing, state.eventId, state);
    await waitFor(() => expect(transport.pageView).toHaveBeenCalled());
    expect(transport.admit).not.toHaveBeenCalled();
    stop();
  });
});
