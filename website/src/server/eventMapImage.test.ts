// @vitest-environment node
import {createHmac} from "node:crypto";
import {afterEach, describe, expect, it, vi} from "vitest";
const mocks = vi.hoisted(() => ({route: vi.fn()}));
vi.mock("server-only", () => ({}));
vi.mock("./publicRoute", () => ({resolvePublicRoute: mocks.route}));
import {
  defaultMeetingPoint,
  eventMapResponse,
  forgetEventMaps,
  signedStaticMapUrl,
  type EventMapDependencies,
} from "./eventMapImage";
import {eventMapImagePath, eventMapsAvailable, eventMapVersion} from "./eventMapLink";

afterEach(() => {forgetEventMaps(); vi.clearAllMocks();});

const steps = {latitude: 19.0668, longitude: 72.8231};
// A fake signing secret in Google's URL-safe base64.
const signingSecret = Buffer.from("fake-signing-secret").toString("base64").replace(/\+/g, "-").replace(/\//g, "_");
const secrets: Record<string, string> = {CATCH_WEBSITE_MAPS_STATIC_KEY: "fake-api-key", CATCH_WEBSITE_MAPS_SIGNING_SECRET: signingSecret};
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const segments = ["events", "salt-air-15k-training", "map.png"];
const request = (query = "") => new Request(`https://catchdates.com/maps/events/salt-air-15k-training/map.png${query}`);

/** The fake provider: records each Static API call and answers with a PNG. */
function fakes(overrides: Partial<EventMapDependencies> = {}) {
  const fetchMap = vi.fn(async (_url: string) => new Response(png, {headers: {"Content-Type": "image/png"}}));
  const dependencies: EventMapDependencies = {
    meetingPoint: async (eventId) => (eventId === "salt-air-15k-training" ? steps : null),
    readSecret: async (name) => secrets[name] ?? null,
    fetchMap,
    now: () => 0,
    ...overrides,
  };
  return {dependencies, fetchMap};
}

describe("signedStaticMapUrl", () => {
  it("signs the path and query with the URL signing secret, as Google's own example does", () => {
    // https://developers.google.com/maps/documentation/maps-static/digital-signature
    const signature = createHmac("sha1", Buffer.from("vNIXE0xscrmjlyV+12Nj/BvUPaw=", "base64"))
      .update("/maps/api/geocode/json?address=New+York&client=clientID").digest("base64");
    expect(signature.replace(/\+/g, "-").replace(/\//g, "_")).toBe("chaRF2hTJKOScPr-RQCEhZbSzIE=");
    const url = new URL(signedStaticMapUrl(steps, "fake-api-key", signingSecret));
    expect(url.origin + url.pathname).toBe("https://maps.googleapis.com/maps/api/staticmap");
    expect(Object.fromEntries([...url.searchParams].filter(([key]) => key !== "style"))).toEqual({
      center: "19.066800,72.823100", zoom: "15", size: "640x256", scale: "2", format: "png",
      markers: "color:0xF07A55|19.066800,72.823100", key: "fake-api-key", signature: expect.any(String),
    });
    const signed = url.pathname + url.search.replace(/&signature=[^&]+$/u, "");
    const expected = createHmac("sha1", Buffer.from("fake-signing-secret")).update(signed).digest("base64")
      .replace(/\+/g, "-").replace(/\//g, "_");
    expect(url.searchParams.get("signature")).toBe(expected);
  });
});

describe("event map paths", () => {
  it("version the map by its meeting point", () => {
    expect(eventMapImagePath("salt-air-15k-training", steps))
      .toBe(`/maps/events/salt-air-15k-training/map.png?v=${eventMapVersion(steps)}`);
    expect(eventMapVersion({...steps, latitude: 19.07})).not.toBe(eventMapVersion(steps));
  });

  it("are available only when both secrets are readable", async () => {
    expect(await eventMapsAvailable(async (name) => secrets[name] ?? null)).toBe(true);
    expect(await eventMapsAvailable(async (name) => (name.endsWith("_STATIC_KEY") ? "fake-api-key" : null))).toBe(false);
  });
});

describe("eventMapResponse", () => {
  it("draws a published event's map once and caches the linked version for an hour", async () => {
    const {dependencies, fetchMap} = fakes();
    const linked = await eventMapResponse(request(`?v=${eventMapVersion(steps)}`), segments, dependencies);
    expect(linked.status).toBe(200);
    expect(linked.headers.get("content-type")).toBe("image/png");
    expect(linked.headers.get("cache-control")).toBe("public, max-age=3600, s-maxage=3600");
    expect(new Uint8Array(await linked.arrayBuffer())).toEqual(png);
    const stale = await eventMapResponse(request("?v=old"), segments, dependencies);
    expect(stale.headers.get("cache-control")).toBe("public, max-age=300, s-maxage=300");
    expect(fetchMap).toHaveBeenCalledOnce();
    expect(fetchMap.mock.calls[0][0]).toMatch(/^https:\/\/maps\.googleapis\.com\/maps\/api\/staticmap\?center=19\.066800%2C72\.823100&/u);
  });

  it("never calls the provider for an unpublished event, a malformed path or a request's own point", async () => {
    const {dependencies, fetchMap} = fakes();
    for (const path of [["events", "not-published", "map.png"], ["events", "salt-air-15k-training", "card.png"],
      ["organizers", "salt-air-15k-training", "map.png"], ["events", "../secret", "map.png"]]) {
      expect((await eventMapResponse(request("?center=0,0"), path, dependencies)).status).toBe(404);
    }
    expect(fetchMap).not.toHaveBeenCalled();
  });

  it("keeps the page's text when the secrets are missing or the provider fails", async () => {
    const noSecrets = fakes({readSecret: async () => null});
    const missing = await eventMapResponse(request(), segments, noSecrets.dependencies);
    expect([missing.status, missing.headers.get("cache-control")]).toEqual([404, "no-store"]);
    expect(noSecrets.fetchMap).not.toHaveBeenCalled();
    for (const failure of [
      new Response("denied", {status: 403, headers: {"Content-Type": "text/plain"}}),
      new Response("<html>", {headers: {"Content-Type": "text/html"}}),
    ]) {
      const failing = fakes({fetchMap: async () => failure});
      expect((await eventMapResponse(request(), segments, failing.dependencies)).status).toBe(404);
    }
    const throwing = fakes({fetchMap: async () => {throw new Error("timeout");}});
    expect((await eventMapResponse(request(), segments, throwing.dependencies)).headers.get("cache-control")).toBe("no-store");
  });

  it("draws again after a day", async () => {
    let now = 0;
    const {dependencies, fetchMap} = fakes({now: () => now});
    await eventMapResponse(request(), segments, dependencies);
    now = 24 * 60 * 60_000 + 1;
    await eventMapResponse(request(), segments, dependencies);
    expect(fetchMap).toHaveBeenCalledTimes(2);
  });

  it("reads the meeting point from the published event route, never from the request", async () => {
    mocks.route.mockResolvedValue({event: {meetingLocation: {name: "Seaface Steps", ...steps}}});
    expect(await defaultMeetingPoint("salt-air-15k-training")).toEqual(steps);
    expect(mocks.route).toHaveBeenCalledWith("/events/salt-air-15k-training/");
    mocks.route.mockResolvedValue({event: {meetingLocation: {name: "Nowhere", latitude: 200, longitude: 0}}});
    expect(await defaultMeetingPoint("salt-air-15k-training")).toBeNull();
    mocks.route.mockResolvedValue({event: null});
    expect(await defaultMeetingPoint("not-published")).toBeNull();
  });
});
