import {describe, expect, it, vi} from "vitest";
import {websiteCities} from "@content/markets";
import {locateCity} from "./locateCity";

const pune = websiteCities.find((city) => city.slug === "pune")!;
function geolocation(answer: {coords?: {latitude: number; longitude: number}; error?: number}) {
  return {
    getCurrentPosition: vi.fn((success: PositionCallback, failure?: PositionErrorCallback | null) => {
      if (answer.coords) success({coords: answer.coords} as GeolocationPosition);
      else failure?.({code: answer.error, PERMISSION_DENIED: 1} as GeolocationPositionError);
    }),
  } as unknown as Geolocation;
}

describe("locateCity", () => {
  it("snaps the browser's location to the nearest listed city and returns only the city", async () => {
    const result = await locateCity(websiteCities, geolocation({coords: {latitude: pune.latitude + 0.02, longitude: pune.longitude}}));
    expect(result).toEqual({kind: "city", city: pune});
  });

  it("answers Other far from every listed city", async () => {
    expect(await locateCity(websiteCities, geolocation({coords: {latitude: 51.5, longitude: -0.12}}))).toEqual({kind: "other"});
  });

  it("tells a refused permission apart from a location the browser could not find", async () => {
    expect(await locateCity(websiteCities, geolocation({error: 1}))).toEqual({kind: "denied"});
    expect(await locateCity(websiteCities, geolocation({error: 3}))).toEqual({kind: "unavailable"});
    expect(await locateCity(websiteCities, undefined)).toEqual({kind: "unavailable"});
  });
});
