import {describe, expect, it, vi} from "vitest";
import {createCatchMeasurementController, safeAcquisitionEvent, catchProviderDefaults,
  type CatchAcquisitionEvent, type MeasurementContext} from "../../analytics/catchMeasurement";
import {createGoogleAcquisitionAdapter, createMetaAcquisitionAdapter} from "./catchProviders";
import {brand} from "@catch/brand";

const id = (n = 1) => `catch_1790899200000_00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const context = (marketing = true): MeasurementContext => ({path: "/host/", consent: {
  version: 4, analytics: true, marketing, updatedAt: "2026-10-02T00:00:00Z",
}});
const lead: CatchAcquisitionEvent = {name: "lead_accepted", eventId: id(), form: "host_application",
  receipt: {ok: true, alreadyJoined: false}};

function fixture() {
  const destination = vi.fn();
  const destroyed = vi.fn();
  const created = vi.fn((provider: "google" | "meta") => {
    const adapter = provider === "google" ? createGoogleAcquisitionAdapter(destination) : createMetaAcquisitionAdapter(destination);
    return {...adapter, destroy() {destroyed(provider); adapter.destroy();}};
  });
  return {destination, destroyed, created, controller: createCatchMeasurementController(created)};
}

describe("Catch acquisition boundary", () => {
  it("defaults to no destinations, script stack or globals", () => {
    expect(catchProviderDefaults).toEqual({google: false, meta: false});
    const controller = createCatchMeasurementController();
    controller.update(context());
    expect(controller.track(lead)).toBe(true);
  });

  it.each([null, {...context().consent!, analytics: false, marketing: false},
    {...context().consent!, version: 1}])("drops unconsented/legacy events with no backlog", (consent) => {
    const f = fixture();
    f.controller.update({...context(), consent});
    expect(f.controller.track(lead)).toBe(false);
    expect(f.created).not.toHaveBeenCalled();
    f.controller.update(context());
    expect(f.destination).not.toHaveBeenCalled();
  });

  it("analytics alone opens Google analysis; explicit marketing opens Meta and selected Ads", () => {
    const f = fixture();
    f.controller.update(context(false));
    f.controller.track({name: "page_view", visitId: id(9)});
    expect(f.created.mock.calls.map(([provider]) => provider)).toEqual(["google"]);
    expect(f.destination.mock.calls.map(([event]) => event.destination)).toEqual(["ga4_synthetic"]);
    f.controller.track({...lead, eventId: id(8)});
    expect(f.destination.mock.calls.every(([event]) => event.destination === "ga4_synthetic")).toBe(true);
    f.controller.update(context());
    f.controller.track(lead);
    expect(f.destination.mock.calls.map(([event]) => event.name)).toContain("Lead");
  });

  it("destroys sessions on deny, downgrade, private navigation and explicit teardown", () => {
    const f = fixture();
    f.controller.update(context());
    f.controller.update({...context(), consent: {...context().consent!, analytics: false, marketing: false}});
    expect(f.destroyed).toHaveBeenCalledTimes(2);
    f.controller.track(lead);
    expect(f.destination).not.toHaveBeenCalled();
    f.controller.update(context());
    f.controller.update({path: "/f/private-form/", consent: context().consent});
    expect(f.controller.track(lead)).toBe(false);
    expect(f.destroyed).toHaveBeenCalledTimes(4);
    f.controller.update(context());
    f.controller.destroy();
    f.controller.track(lead);
    expect(f.destination).not.toHaveBeenCalled();
  });

  it.each(["/", "/events/singles/", "/organizers/private/", "/f/private/", "/claim/private-id/",
    "/host/work/private/", "/join/private/", "/booking/private/", "/offer/", "/demo/private/"])(
    "allows no acquisition event on %s", (path) => {
      expect(safeAcquisitionEvent(lead, {...context(), path})).toBeNull();
    });

  it("rebuilds every property and never sends raw URLs, titles, identifiers or form answers", () => {
    const event = safeAcquisitionEvent({...lead, name: "lead_accepted", email: "private@example.test",
      city: "Private city", guestList: ["Person"], review: "Private review", proofUrl: "https://private.test",
      page_title: "Private profile", request_id: "private-request"} as CatchAcquisitionEvent,
    {...context(), campaign: {utm_campaign: "launch_2026", utm_source: "private_name", utm_content: "private@example.test",
      utm_term: "singles", gclid: "private-click-id", page_location: "https://private.test?email=secret"}})!;
    expect(event.parameters).toEqual({contract_version: 1, page_path: "/host/", page_location: `${brand.web.origin}/host/`,
      page_title: "Catch", page_name: "host", audience: "organizer", utm_campaign: "launch_2026",
      event_id: id(), form: "host_application"});
    expect(JSON.stringify(event)).not.toMatch(/private|singles|Person/u);
    expect(safeAcquisitionEvent({...lead, eventId: "host_lead_Person"}, context())).toBeNull();
  });

  it("counts one lead per stable receipt across form variants and one purchase per receipt", () => {
    const f = fixture(); f.controller.update(context());
    expect(f.controller.track(lead)).toBe(true);
    expect(f.controller.track({...lead, form: "host_lead"})).toBe(false);
    expect(f.controller.track({...lead, name: "lead_accepted", receipt: {ok: true, alreadyJoined: true}} as never)).toBe(false);
    for (const destination of ["ga4_synthetic", "google_ads_synthetic", "meta_synthetic"]) {
      expect(f.destination.mock.calls.filter(([event]) => event.destination === destination)).toHaveLength(1);
    }
    expect(f.controller.track({name: "purchase", eventId: id(2), transactionId: id(3), value: 100, currency: "INR",
      receipt: {authority: "catch_payment_settlement", status: "settled", audience: "organizer"}})).toBe(true);
  });

  it("keeps attendee lead requests out of organizer advertising", () => {
    const f = fixture(); f.controller.update(context());
    f.controller.track({...lead, form: "member_waitlist"});
    expect(f.destination).not.toHaveBeenCalled();
  });

  it("requires a new organizer account, approved claim, first meaningful activation and settled purchase", () => {
    const inputs = [
      {name: "organizer_signup", eventId: id(), receipt: {authority: "organizer_account_created", isNewAccount: true}},
      {name: "claim_approved", eventId: id(), receipt: {authority: "claim_decision", status: "approved"}},
      {name: "organizer_activated", eventId: id(), receipt: {authority: "first_real_event_checkin", firstActivation: true}},
      {name: "purchase", eventId: id(), transactionId: id(2), value: 100, currency: "INR",
        receipt: {authority: "catch_payment_settlement", status: "settled", audience: "organizer"}},
    ] as const;
    for (const input of inputs) expect(safeAcquisitionEvent(input, context())).not.toBeNull();
    expect(safeAcquisitionEvent({...inputs[0], receipt: {authority: "sign_in", isNewAccount: true}} as never, context())).toBeNull();
    expect(safeAcquisitionEvent({...inputs[0], receipt: {...inputs[0].receipt, isNewAccount: false}} as never, context())).toBeNull();
    expect(safeAcquisitionEvent({...inputs[1], receipt: {...inputs[1].receipt, status: "pending"}} as never, context())).toBeNull();
    expect(safeAcquisitionEvent({...inputs[2], receipt: {authority: "draft_event_created", firstActivation: true}} as never, context())).toBeNull();
    expect(safeAcquisitionEvent({...inputs[3], receipt: {...inputs[3].receipt, status: "pending"}} as never, context())).toBeNull();
    expect(safeAcquisitionEvent({name: "generate_lead"} as never, context())).toBeNull();
  });

  it("drops provider failures without retrying, replaying or breaking navigation", () => {
    const send = vi.fn(() => {throw new Error("synthetic failure");});
    const controller = createCatchMeasurementController(() => ({send, destroy() {throw new Error("synthetic teardown");}}));
    controller.update(context());
    expect(() => controller.track(lead)).not.toThrow();
    expect(controller.track(lead)).toBe(false);
    expect(send).toHaveBeenCalledTimes(2);
    expect(() => controller.destroy()).not.toThrow();
    const failing = createCatchMeasurementController(() => {throw new Error("synthetic setup");});
    expect(() => failing.update(context())).not.toThrow();
  });
});
