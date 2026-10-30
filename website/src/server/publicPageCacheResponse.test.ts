// @vitest-environment node
import {createServer} from "node:http";
import type {AddressInfo} from "node:net";
import {expect, it} from "vitest";
import {installPublicPageCachePromotion, markPublicPageUnavailable, promotePublicPageCache} from "./publicPageCacheResponse";

function response(headers: Record<string, string>) {
  const values = new Map(Object.entries(headers));
  return {values, hasHeader: (name: string) => values.has(name),
    removeHeader: (name: string) => {values.delete(name);}, setHeader: (name: string, value: string) => {values.set(name, value); return undefined as never;}};
}
const nextDefault = "private, no-cache, no-store, max-age=0, must-revalidate";

it("promotes a marked page to the shared cache only when it renders", () => {
  const rendered = response({"x-catch-public-page": "1", "Cache-Control": nextDefault});
  expect(promotePublicPageCache(rendered, 200)).toBe(200);
  expect(Object.fromEntries(rendered.values)).toEqual({"Cache-Control": "public, s-maxage=60"});
  for (const status of [500, 404, 307, 503]) {
    const failed = response({"x-catch-public-page": "1", "Cache-Control": nextDefault});
    expect(promotePublicPageCache(failed, status)).toBe(status);
    expect(Object.fromEntries(failed.values)).toEqual({"Cache-Control": nextDefault});
  }
  const unmarked = response({"Cache-Control": "private, no-store"});
  promotePublicPageCache(unmarked, 200);
  expect(Object.fromEntries(unmarked.values)).toEqual({"Cache-Control": "private, no-store"});
});

it("turns a page rendered without its data into an uncached 503, never a cached 200", () => {
  const degraded = response({"x-catch-public-page": "1", "x-catch-public-page-unavailable": "1", "Cache-Control": nextDefault});
  expect(promotePublicPageCache(degraded, 200)).toBe(503);
  expect(Object.fromEntries(degraded.values)).toEqual({"Cache-Control": "private, no-store", "Retry-After": "30"});
  // A later failure keeps its own status; neither mark leaves.
  const failed = response({"x-catch-public-page-unavailable": "1", "Cache-Control": nextDefault});
  expect(promotePublicPageCache(failed, 500)).toBe(500);
  expect(Object.fromEntries(failed.values)).toEqual({"Cache-Control": nextDefault});
});

it("fails the render when no response hook can carry the unavailable status", () => {
  expect(() => markPublicPageUnavailable()).toThrow("PUBLIC_PAGE_UNAVAILABLE");
});

it("carries the mark from an awaited render to the response head", async () => {
  installPublicPageCachePromotion();
  const server = createServer(async (request, reply) => {
    reply.setHeader("x-catch-public-page", "1");
    reply.setHeader("Cache-Control", nextDefault);
    // The render reads its data asynchronously before it decides.
    await new Promise((resolve) => setTimeout(resolve, 5));
    if (request.url === "/degraded/") markPublicPageUnavailable();
    reply.end("<h1>Page</h1>");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const degraded = await fetch(`${base}/degraded/`);
    expect(degraded.status).toBe(503);
    expect(degraded.headers.get("cache-control")).toBe("private, no-store");
    expect(degraded.headers.get("retry-after")).toBe("30");
    expect(await degraded.text()).toBe("<h1>Page</h1>");
    const healthy = await fetch(`${base}/healthy/`);
    expect(healthy.status).toBe(200);
    expect(healthy.headers.get("cache-control")).toBe("public, s-maxage=60");
    for (const reply of [degraded, healthy]) {
      expect(reply.headers.get("x-catch-public-page")).toBeNull();
      expect(reply.headers.get("x-catch-public-page-unavailable")).toBeNull();
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
