import {beforeEach, expect, it, vi} from "vitest";
const mocks = vi.hoisted(() => ({catalog: vi.fn(), probe: vi.fn(), route: vi.fn()}));
vi.mock("./publicCatalog", () => ({readPublicCatalog: mocks.catalog, readPublicCatalogForProbe: mocks.probe}));
vi.mock("./publicRoute", () => ({resolvePublicRoute: mocks.route}));
import {publicCatalogResponse as GET} from "./publicCatalogResponse";
beforeEach(() => {
  mocks.catalog.mockResolvedValue({listings: [], readAt: 1});
  mocks.probe.mockResolvedValue({listings: [], readAt: 1});
  mocks.route.mockResolvedValue({catalog: {listings: [{reviews: [{comment: "Published"}]}], readAt: 2}});
});
it("refreshes resolved detail data with the same server publication and review gates", async () => {
  const response = await GET(new Request("http://localhost/api/public-catalog?path=%2Fevents%2Fdinner%2F"));
  expect(mocks.route).toHaveBeenCalledWith("/events/dinner/");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect((await response.json()).listings[0].reviews[0].comment).toBe("Published");
});
it.each(["/private/account", "/events/../../users", "/organizers/", "/explore/"])("does not use arbitrary paths as detail reads: %s", async path => {
  await GET(new Request(`http://localhost/api/public-catalog?path=${encodeURIComponent(path)}`));
  expect(mocks.route).not.toHaveBeenCalled();
  expect(mocks.catalog).toHaveBeenCalledOnce();
});
it("fails unavailable without a stale catalogue when the live read fails", async () => {
  mocks.route.mockRejectedValue(new Error("unavailable"));
  const response = await GET(new Request("http://localhost/api/public-catalog?path=%2Fevents%2Fdinner%2F"));
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({listings: [], unavailable: true});
});
it("serves the uptime checker from the shared minute read and every other caller live", async () => {
  const probe = await GET(new Request("http://localhost/api/public-catalog", {headers: {"user-agent": "GoogleStackdriverMonitoring-UptimeChecks(https://cloud.google.com/monitoring)"}}));
  expect([probe.status, probe.headers.get("cache-control")]).toEqual([200, "private, no-store"]);
  expect(mocks.probe).toHaveBeenCalledOnce();
  expect(mocks.catalog).not.toHaveBeenCalled();
  await GET(new Request("http://localhost/api/public-catalog", {headers: {"user-agent": "Mozilla/5.0"}}));
  await GET(new Request("http://localhost/api/public-catalog"));
  expect(mocks.catalog).toHaveBeenCalledTimes(2);
  expect(mocks.probe).toHaveBeenCalledOnce();
});
it("answers an uptime probe 503 when its read fails", async () => {
  mocks.probe.mockRejectedValue(new Error("unavailable"));
  const response = await GET(new Request("http://localhost/api/public-catalog", {headers: {"user-agent": "GoogleStackdriverMonitoring-UptimeChecks(https://cloud.google.com/monitoring)"}}));
  expect(response.status).toBe(503);
});
