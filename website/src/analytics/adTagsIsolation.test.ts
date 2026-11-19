import {beforeEach, describe, expect, it} from "vitest";
import {createAdTags, type AdBooking} from "./adTags";

/** Catch's production destinations, as `adTags.ts` holds them. */
const catchAdDestinations = {googleAnalytics: "G-HZFG0DL2DK", hostLeadConversion: "AW-18526407471/WgIECMue97odEK-WioJF",
  metaPixel: "1844810253539672"};

/**
 * Owner decision on #2063 (19 Nov 2026): organiser destinations are additive
 * and must never reduce or change what Catch's own tags receive. These tests
 * pin that Catch's commands are identical whether or not another pixel and
 * another Google tag layer share the page, and that Catch never broadcasts.
 */

type Queue = {queue: ArrayLike<unknown>[]};
type Globals = {catchTagLayer?: ArrayLike<unknown>[]; catchOrganizerTagLayer?: unknown[]; fbq?: Queue & ((...args: unknown[]) => void);
  _fbq?: unknown};
const globals = () => window as unknown as Globals;
const consent = {version: 5, choice: "accepted", analytics: true, marketing: true, updatedAt: "2026-11-19T08:00:00.000Z"};
const booking: AdBooking = {eventId: "synthetic-run", paymentId: `pp_${"b".repeat(32)}`, amountPaise: 45000, places: 2, mode: "live"};
const otherPixel = "999000111222333";

function reset() {
  delete globals().catchTagLayer;
  delete globals().catchOrganizerTagLayer;
  delete globals().fbq;
  delete globals()._fbq;
  document.querySelectorAll("script").forEach((script) => script.remove());
  sessionStorage.clear();
}

/** A second pixel and a second Google layer already on the page, as an organiser set would add. */
function installOtherDestinations() {
  const stub = function (...args: unknown[]) { stub.queue.push(args); } as Queue & ((...args: unknown[]) => void);
  stub.queue = [];
  globals().fbq = stub;
  globals()._fbq = stub;
  stub("init", otherPixel);
  globals().catchOrganizerTagLayer = [["config", "G-ORGANISER1"]];
}

/** One full Catch flow: consent, page views on a public page and an event page, checkout, purchase and a host lead. */
function runCatchFlow() {
  let ids = 0;
  const tags = createAdTags({hostAllowed: () => true, newId: () => `catch_1800000000000_isolation${++ids}`});
  window.history.replaceState(null, "", "/host/");
  tags.sync(consent);
  tags.pageView();
  tags.hostLead({kind: "guide", leadId: "lead_receipt_0001", phone: "+919800000001", email: "host@example.com"});
  window.history.replaceState(null, "", "/events/synthetic-run/");
  tags.pageView();
  tags.viewItem({eventId: "synthetic-run", activityKind: "running", city: "Mumbai", amountPaise: 45000});
  tags.beginCheckout(booking);
  tags.purchase(booking);
}

/** Each command as JSON; gtag's `js` start time is masked because two runs never share a clock tick. */
const plain = (entries: ArrayLike<unknown>[] | undefined) => (entries ?? []).map((entry) => JSON.stringify(
  Array.from(entry).map((part) => part instanceof Date ? "<date>" : part)));

function capture(withOthers: boolean) {
  reset();
  if (withOthers) installOtherDestinations();
  const foreign = globals().fbq?.queue.length ?? 0;
  runCatchFlow();
  return {
    google: plain(globals().catchTagLayer),
    meta: plain(globals().fbq?.queue).slice(foreign),
    otherLayer: plain(globals().catchOrganizerTagLayer as ArrayLike<unknown>[] | undefined),
  };
}

beforeEach(reset);

describe("Catch's tags with other destinations on the page", () => {
  it("send Catch's Google and Meta commands unchanged, byte for byte", () => {
    const alone = capture(false);
    const shared = capture(true);
    expect(alone.meta.length).toBeGreaterThan(5);
    expect(shared.google).toEqual(alone.google);
    expect(shared.meta).toEqual(alone.meta);
  });

  it("never broadcast a Meta event and never address another pixel", () => {
    const {meta} = capture(true);
    const commands = meta.map((entry) => JSON.parse(entry) as unknown[]);
    expect(commands.filter(([command]) => command === "track" || command === "trackCustom")).toEqual([]);
    for (const [command, pixel] of commands) {
      if (command === "trackSingle" || command === "init") expect(pixel).toBe(catchAdDestinations.metaPixel);
    }
    expect(commands.filter(([command]) => command === "trackSingle").map(([, , event]) => event))
      .toEqual(["PageView", "Lead", "PageView", "ViewContent", "InitiateCheckout", "Purchase"]);
  });

  it("never write to another Google layer", () => {
    expect(capture(true).otherLayer).toEqual([JSON.stringify(["config", "G-ORGANISER1"])]);
  });

  it("address every Google event to a Catch destination", () => {
    const events = capture(true).google.map((entry) => JSON.parse(entry) as unknown[]).filter(([command]) => command === "event");
    const catchIds = [catchAdDestinations.googleAnalytics, catchAdDestinations.hostLeadConversion];
    for (const [, , parameters] of events) expect(catchIds).toContain((parameters as {send_to: string}).send_to);
  });
});

describe("destination sets", () => {
  it("use the destination set they are given, frozen", () => {
    const set = {googleAnalytics: "G-SYNTHETIC1", googleAds: "AW-1000000001", hostLeadConversion: "AW-1000000001/synthetic",
      metaPixel: "100000000000001"};
    const tags = createAdTags({destinations: set, hostAllowed: () => true, newId: () => "catch_1800000000000_set1"});
    window.history.replaceState(null, "", "/host/");
    tags.sync(consent);
    set.metaPixel = "200000000000002";
    tags.pageView();
    const meta = (globals().fbq?.queue ?? []).map((entry) => Array.from(entry));
    expect(meta).toContainEqual(["trackSingle", "100000000000001", "PageView", {}, {eventID: "catch_1800000000000_set1"}]);
    expect(Array.from(document.querySelectorAll("script")).map((script) => script.src))
      .toContain("https://www.googletagmanager.com/gtag/js?id=G-SYNTHETIC1&l=catchTagLayer");
  });
});
