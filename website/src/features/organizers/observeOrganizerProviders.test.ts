import {beforeEach, describe, expect, it, vi} from "vitest";
import {waitFor} from "@testing-library/react";

const transport = vi.hoisted(() => ({set: vi.fn(), pageView: vi.fn()}));
vi.mock("../../analytics", async (importActual) => ({
  ...(await importActual<typeof import("../../analytics")>()),
  setOrganizerAdDestinations: transport.set,
  trackOrganizerPageViewed: transport.pageView,
}));
import {setMarketingConsent} from "../../analytics";
import {hostListings} from "./data";
import {observeOrganizerProviders, type OrganizerTrackingSettings} from "./observeOrganizerProviders";

const listing = {...hostListings[0], publicApi: {...hostListings[0].publicApi, state: "enabled" as const}};
let sequence = 0;
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); sequence++;
  transport.set.mockClear(); transport.pageView.mockClear();
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
});
