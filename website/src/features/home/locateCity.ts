import {nearestCity} from "@content/markets/nearestCity";

export type LocateResult<City> =
  | {readonly kind: "city"; readonly city: City}
  | {readonly kind: "other"}
  | {readonly kind: "denied"}
  | {readonly kind: "unavailable"};

/**
 * "Use my location": asks the browser for its location once, when the
 * visitor taps the button, and snaps it to the nearest listed city here in
 * the browser. The coordinates never leave this function: they are not
 * stored, logged or sent, and only the city comes back.
 */
export function locateCity<City extends {latitude: number; longitude: number}>(
  cities: readonly City[],
  geolocation: Geolocation | undefined = typeof navigator === "undefined" ? undefined : navigator.geolocation,
): Promise<LocateResult<City>> {
  if (!geolocation) return Promise.resolve({kind: "unavailable"});
  return new Promise((resolve) => {
    geolocation.getCurrentPosition(
      (position) => {
        const city = nearestCity(cities, {latitude: position.coords.latitude, longitude: position.coords.longitude});
        resolve(city ? {kind: "city", city} : {kind: "other"});
      },
      (error) => resolve({kind: error.code === error.PERMISSION_DENIED ? "denied" : "unavailable"}),
      // A city needs no precision, and a recent fix is good enough.
      {enableHighAccuracy: false, maximumAge: 10 * 60_000, timeout: 10_000},
    );
  });
}
