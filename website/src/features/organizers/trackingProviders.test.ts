import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import {describe, expect, it, vi} from "vitest";
import {createOrganizerTrackingController, type OrganizerTrackingContext,
  type ProviderSessionConfiguration} from "./trackingProviders";
import {brand} from "@catch/brand";

const context = (overrides: Partial<OrganizerTrackingContext> = {}): OrganizerTrackingContext => ({
  organizerId: "organizer-a", eventId: "public-event", publicPath: "/events/public-event/",
  eligible: true, consent: {analytics: true, marketing: true}, settings: {
    organizerId: "organizer-a", eventId: "public-event", enabled: true,
    googleMeasurementId: "G-TEST123456", metaPixelId: "1234567890",
  }, ...overrides,
});

function fake() {
  const calls: {configuration: ProviderSessionConfiguration; send: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>}[] = [];
  const controller = createOrganizerTrackingController((configuration) => {
    const session = {configuration, send: vi.fn(), destroy: vi.fn()};
    calls.push(session); return session;
  }, new Set());
  return {controller, calls};
}

describe("consent-isolated organizer providers", () => {
  it("does not create tags without consent or server policy approval", () => {
    const {controller, calls} = fake();
    controller.update(context({consent: {analytics: false, marketing: false}}));
    controller.track("page_view");
    controller.update(context({settings: {...context().settings!, enabled: false}}));
    controller.track("page_view");
    expect(calls).toEqual([]);
  });

  it("gates Google by analytics and Meta by marketing independently", () => {
    const {controller, calls} = fake();
    controller.update(context({consent: {analytics: true, marketing: false}}));
    expect(calls.map((call) => call.configuration.provider)).toEqual(["ga4"]);
    controller.update(context({consent: {analytics: false, marketing: true}}));
    expect(calls[0].destroy).toHaveBeenCalledOnce();
    expect(calls[1].configuration.provider).toBe("meta");
    controller.update(context({consent: {analytics: false, marketing: false}}));
    expect(calls[1].destroy).toHaveBeenCalledOnce();
    controller.track("outbound_booking_click");
    expect(calls.every((call) => call.send.mock.calls.length === 0)).toBe(true);
  });

  it("deduplicates views across rerenders and revocation but keeps outbound clicks separate", () => {
    const {controller, calls} = fake();
    controller.update(context()); controller.track("page_view"); controller.track("page_view");
    controller.update(context()); controller.track("page_view");
    controller.track("outbound_booking_click"); controller.track("outbound_booking_click");
    expect(calls).toHaveLength(2);
    expect(calls[0].send.mock.calls.map(([event]) => event)).toEqual([
      "page_view", "outbound_booking_click", "outbound_booking_click",
    ]);
    controller.update(context({consent: {analytics: false, marketing: false}}));
    controller.update(context()); controller.track("page_view");
    expect(calls[2].send).not.toHaveBeenCalled();
    controller.destroy(); expect(calls[2].destroy).toHaveBeenCalledOnce();
  });

  it("destroys both previous providers before another organizer can collect", () => {
    const {controller, calls} = fake();
    controller.update(context()); controller.track("page_view");
    controller.update(context({organizerId: "organizer-b", settings: {
      ...context().settings!, organizerId: "organizer-b",
    }}));
    expect(calls[0].destroy).toHaveBeenCalledOnce(); expect(calls[1].destroy).toHaveBeenCalledOnce();
    controller.track("page_view");
    expect(calls[0].send).toHaveBeenCalledTimes(1); expect(calls[2].send).toHaveBeenCalledTimes(1);
  });

  it.each([
    context({eligible: false}), context({settings: null}),
    context({settings: {...context().settings!, organizerId: "other-tenant"}}),
    context({settings: {...context().settings!, eventId: "other-event"}}),
    context({settings: {...context().settings!, metaPixelId: "<script>", googleMeasurementId: "GTM-12345"}}),
    context({publicPath: "/booking/private/"}), context({publicPath: "/events/public-event/?token=private"}),
    context({publicPath: "/events/public-event/#private"}), context({publicPath: "https://evil.test/events/public/"}),
  ])("rejects private/sensitive/unclaimed policy, mismatched authority, unsafe IDs and URLs %#", (input) => {
    const {controller, calls} = fake(); controller.update(input); controller.track("page_view");
    expect(calls).toEqual([]);
  });

  it("accepts the backend minimum four-character GA4 ID", () => {
    const {controller, calls} = fake();
    controller.update(context({settings: {...context().settings!, googleMeasurementId: "G-AB12", metaPixelId: null}}));
    expect(calls).toHaveLength(1);
    expect(calls[0].configuration.id).toBe("G-AB12");
  });

  it("provides no purchase authority or arbitrary parameter surface", () => {
    const {controller, calls} = fake(); controller.update(context());
    controller.track("purchase" as "page_view");
    controller.track("registration_confirmed" as "page_view");
    expect(calls[0].send).not.toHaveBeenCalled();
  });

  it("queues only consented public events and destroys a pending real iframe before load", () => {
    const controller = createOrganizerTrackingController();
    controller.update(context({consent: {analytics: true, marketing: false}}));
    const frame = document.querySelector("iframe")!;
    const post = vi.spyOn(frame.contentWindow!, "postMessage");
    expect(frame.getAttribute("sandbox")).toBe("allow-scripts");
    expect(frame.referrerPolicy).toBe("no-referrer");
    controller.track("page_view");
    controller.update(context({eligible: false}));
    frame.dispatchEvent(new Event("load"));
    expect(post).not.toHaveBeenCalled(); expect(frame.isConnected).toBe(false);
  });
});

function runtime() {
  let listener: (message: unknown) => void = () => {};
  const scripts: {src?: string}[] = [];
  const parent = {};
  const window: Record<string, any> = {addEventListener: (_: string, callback: typeof listener) => {listener = callback;}};
  const document = {head: {appendChild: (script: {src?: string}) => scripts.push(script)}, createElement: () => ({})};
  runInNewContext(readFileSync("public/organizer-tracking-runtime.js", "utf8"), {
    window, document, parent,
  });
  const message = (data: unknown, source = parent, origin = brand.web.origin) => listener({data, source, origin});
  return {window, scripts, message};
}

describe("controlled vendor runtime (fake scripts only, no network)", () => {
  const init = {type: "catch:provider-init", channel: "test-channel", publicPath: "/events/public-event/",
    publicOrigin: brand.web.origin};
  it("routes Google manual views only to the configured measurement ID with no private URL data", () => {
    const {window, scripts, message} = runtime();
    message({...init, provider: "ga4", id: "G-TEST123456"});
    expect(scripts.map((script) => script.src)).toEqual(["https://www.googletagmanager.com/gtag/js?id=G-TEST123456"]);
    message({type: "catch:provider-event", channel: "test-channel", event: "page_view"});
    const commands = window.dataLayer.map((command: IArguments) => Array.from(command));
    expect(commands[2]).toMatchObject(["config", "G-TEST123456", {send_page_view: false, page_referrer: ""}]);
    expect(commands[3]).toEqual(["event", "page_view", {send_to: "G-TEST123456",
      page_location: `${brand.web.origin}/events/public-event/`, page_referrer: "", page_title: "Catch public page"}]);
  });
  it("disables Meta automatic matching and emits only allowlisted single-pixel events", () => {
    const {window, scripts, message} = runtime();
    message({...init, provider: "meta", id: "1234567890"});
    message({type: "catch:provider-event", channel: "test-channel", event: "outbound_booking_click"});
    const commands = window.fbq.queue.map((command: IArguments) => Array.from(command));
    expect(commands[0]).toEqual(["set", "autoConfig", false, "1234567890"]);
    expect(commands[2]).toEqual(["init", "1234567890"]);
    expect(commands[3]).toEqual(["trackSingleCustom", "1234567890", "OutboundBookingClick", {public_path: "/events/public-event/"}]);
    expect(scripts.map((script) => script.src)).toEqual(["https://connect.facebook.net/en_US/fbevents.js"]);
  });
  it("rejects source/origin spoofing, custom scripts, private paths, stale channels and duplicate initialization", () => {
    const {window, scripts, message} = runtime();
    message({...init, provider: "ga4", id: "G-TEST123456"}, {});
    message({...init, provider: "ga4", id: "G-TEST123456"}, undefined, "https://evil.test");
    message({...init, provider: "ga4", id: "GTM-123456"});
    message({...init, provider: "ga4", id: "G-TEST123456", publicPath: "/events/public/?token=private"});
    expect(scripts).toEqual([]);
    message({...init, provider: "ga4", id: "G-TEST123456"});
    message({...init, provider: "meta", id: "1234567890"});
    message({type: "catch:provider-event", channel: "old-channel", event: "page_view"});
    message({type: "catch:provider-event", channel: "test-channel", event: "purchase"});
    expect(scripts).toHaveLength(1); expect(window.dataLayer).toHaveLength(3);
  });
});
