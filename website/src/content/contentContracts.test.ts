import {describe, expect, it} from "vitest";
import meta from "./meta.json";
import {interpolateContent} from "./interpolate";
import {activeEventLiveCities, activeFeaturedCity, activeMarketCopy} from "./markets";
import {validateWebsiteMeta, validatedWebsiteMeta} from "./metaContract";

describe("website content contracts", () => {
  it("interpolates exact token sets and rejects missing or extra values", () => {
    expect(interpolateContent("Events in {city}", {city: "Delhi"})).toBe("Events in Delhi");
    expect(() => interpolateContent("Events in {city}", {} as never)).toThrow(/missing: city/u);
    expect(() => interpolateContent("Events", {city: "Delhi"} as never)).toThrow(/extra: city/u);
  });

  it("accepts the committed metadata source and rejects unsupported route keys", () => {
    expect(validateWebsiteMeta(meta)).toEqual([]);
    expect(validatedWebsiteMeta(meta).routes.home.canonicalPath).toBe("/");
    expect(validateWebsiteMeta({...meta, routes: {...meta.routes, extra: meta.routes.home}})).toContain(
      "routes has unsupported key extra"
    );
  });

  it("derives featured and live-city copy from one market source", () => {
    expect(activeEventLiveCities.length).toBeGreaterThan(0);
    expect(activeMarketCopy.heroTicketLabel).toContain(
      activeFeaturedCity.label.toLocaleUpperCase("en-IN")
    );
  });
});
