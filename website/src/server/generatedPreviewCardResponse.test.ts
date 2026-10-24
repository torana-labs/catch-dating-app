// @vitest-environment node
import {beforeEach, expect, it, vi} from "vitest";
import previewCards from "../content/previewCards.json" with {type: "json"};
const mocks = vi.hoisted(() => ({route: vi.fn(), render: vi.fn()}));
vi.mock("./publicRoute", () => ({resolvePublicRoute: mocks.route}));
vi.mock("./generatedPreviewCardImage", () => ({renderGeneratedPreviewCard: mocks.render}));
import {generatedPreviewCardResponse} from "./generatedPreviewCardResponse";
import {generatedPreviewCardFor, generatedPreviewCardVersion} from "./generatedPreviewCards";

const organizerName = "Bandra Run Club";
const listing = {id: "o1", name: organizerName, city: "Mumbai", path: "/organizers/mumbai/bandra-run-club/", category: "Social run", formats: []};
const organizerRoute = {listingRoute: {listing, isLegacyPath: false}, event: null};
const brandCard = `/assets/og/default.png?v=${previewCards.cards.default.version}`;
const request = (query = "") => new Request(`http://localhost/og/organizers/mumbai/bandra-run-club/card.png${query}`);
const segments = ["organizers", "mumbai", "bandra-run-club", "card.png"];

beforeEach(() => {
  mocks.route.mockResolvedValue(organizerRoute);
  mocks.render.mockResolvedValue(new Uint8Array([137, 80, 78, 71]).buffer);
});

it("draws the page's own public record and caches the linked version for an hour", async () => {
  const version = generatedPreviewCardVersion(generatedPreviewCardFor(organizerRoute as never)!);
  const response = await generatedPreviewCardResponse(request(`?v=${version}`), segments);
  expect(mocks.route).toHaveBeenCalledWith("/organizers/mumbai/bandra-run-club/");
  expect(mocks.render).toHaveBeenCalledWith(expect.objectContaining({title: organizerName, lines: ["Mumbai"]}));
  expect(response.headers.get("content-type")).toBe("image/png");
  expect(response.headers.get("cache-control")).toBe("public, max-age=3600, s-maxage=3600");
});

it("draws today's record for an older version but caches it briefly", async () => {
  const response = await generatedPreviewCardResponse(request("?v=stale"), segments);
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("public, max-age=300, s-maxage=300");
});

it("sends unpublished, private and missing pages to the brand card without drawing anything", async () => {
  mocks.route.mockResolvedValue({listingRoute: null, event: null, page: "not_found"});
  const response = await generatedPreviewCardResponse(request(), ["events", "private-event", "card.png"]);
  expect(response.status).toBe(302);
  expect(response.headers.get("location")).toBe(brandCard);
  expect(mocks.render).not.toHaveBeenCalled();
});

it("never reads private routes", async () => {
  for (const path of [["booking", "event1", "card.png"], ["invite", "token", "card.png"], ["rsvp", "token", "card.png"]]) {
    expect((await generatedPreviewCardResponse(request(), path)).status).toBe(404);
  }
  expect(mocks.route).not.toHaveBeenCalled();
});

it("falls back to the brand card, uncached, when the read or the drawing fails", async () => {
  mocks.render.mockRejectedValue(new Error("font missing"));
  const failedDrawing = await generatedPreviewCardResponse(request(), segments);
  mocks.route.mockRejectedValue(new Error("unavailable"));
  const failedRead = await generatedPreviewCardResponse(request(), segments);
  for (const response of [failedDrawing, failedRead]) {
    expect(response.headers.get("location")).toBe(brandCard);
    expect(response.headers.get("cache-control")).toBe("no-store");
  }
});
