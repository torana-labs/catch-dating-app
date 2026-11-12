import {describe, expect, it} from "vitest";
import {websiteCities} from "./index";
import {approximatePoint, citySnapRadiusKm, distanceKm, nearestCity} from "./nearestCity";

const city = (slug: string) => websiteCities.find((item) => item.slug === slug)!;

describe("nearestCity", () => {
  it("snaps a point in a metro's suburbs to that city", () => {
    const mumbai = city("mumbai");
    // About 20 km north-east of the city centre.
    expect(nearestCity(websiteCities, {latitude: mumbai.latitude + 0.13, longitude: mumbai.longitude + 0.1})?.slug).toBe("mumbai");
  });

  it("picks the closer of two listed cities", () => {
    const pune = city("pune");
    expect(nearestCity(websiteCities, {latitude: pune.latitude + 0.05, longitude: pune.longitude})?.slug).toBe("pune");
  });

  it("answers null (Other) beyond the radius of every listed city", () => {
    // The middle of the Arabian Sea.
    expect(nearestCity(websiteCities, {latitude: 15, longitude: 65})).toBeNull();
  });

  it("keeps listed cities further apart than the radius, so a point never sits between two", () => {
    for (const from of websiteCities) {
      for (const to of websiteCities) {
        if (from !== to) expect(distanceKm(from, to)).toBeGreaterThan(citySnapRadiusKm);
      }
    }
  });

  it("reads only finite, in-range coordinates", () => {
    expect(approximatePoint("19.07", "72.87")).toEqual({latitude: 19.07, longitude: 72.87});
    expect(approximatePoint("", "72.87")).toBeNull();
    expect(approximatePoint(91, 0)).toBeNull();
    expect(approximatePoint(undefined, undefined)).toBeNull();
  });
});
