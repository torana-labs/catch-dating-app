// @vitest-environment node
import {NextRequest} from "next/server";
import {describe, expect, it, vi} from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("./publicEnvironment", () => ({validatePublicRuntimeEnvironment: () => undefined, productionIndexing: () => true}));
// A private family never reaches the public route resolver.
const resolvePublicRoute = vi.hoisted(() => vi.fn());
vi.mock("./publicRoute", () => ({resolvePublicRoute}));
import {proxy} from "../../proxy";

const paymentId = `pp_${"a".repeat(32)}`;

async function request(path: string) {
  return proxy(new NextRequest(`https://catchdates.com${path}`, {headers: {host: "catchdates.com"}}));
}

/**
 * CAT-252 keeps payment receipts and offers on private pages: a credential
 * or payment ID must never enter a shared cache, an index or a referrer.
 */
describe("private booking pages", () => {
  for (const path of [`/booking/salt-air-15k/?payment=${paymentId}`, "/booking/salt-air-15k/", "/offer/?grant=" + "b".repeat(64),
    "/offer/", "/invite/v2_private_token/"]) {
    it(`serves ${path} privately, unstored and unindexed`, async () => {
      const response = await request(path);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
      expect(response.headers.get("referrer-policy")).toBe("no-referrer");
      const shell = new URL(response.headers.get("x-middleware-rewrite") ?? "");
      expect(shell.pathname).toMatch(/^\/private-shell\/?$/u);
      // Only the family enters the rewrite, never the payment, grant or token.
      expect([...shell.searchParams.keys()]).toEqual(["surface"]);
      expect(resolvePublicRoute).not.toHaveBeenCalled();
    });
  }
});
