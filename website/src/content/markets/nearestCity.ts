import type {MarketCity} from "./types";

/**
 * How far from a city centre an approximate location still counts as that
 * city. It takes in a metro's suburbs (Thane, Gurugram, Noida) and stays well
 * short of the next listed city (Mumbai to Pune is about 120 km).
 */
export const citySnapRadiusKm = 80;

export interface ApproximatePoint {
  readonly latitude: number;
  readonly longitude: number;
}

const earthRadiusKm = 6371;
const radians = (degrees: number) => degrees * Math.PI / 180;

/** Great-circle distance between two points, in kilometres. */
export function distanceKm(from: ApproximatePoint, to: ApproximatePoint): number {
  const dLat = radians(to.latitude - from.latitude);
  const dLng = radians(to.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** A finite latitude and longitude, or null. */
export function approximatePoint(latitude: unknown, longitude: unknown): ApproximatePoint | null {
  const lat = typeof latitude === "string" ? Number.parseFloat(latitude) : latitude;
  const lng = typeof longitude === "string" ? Number.parseFloat(longitude) : longitude;
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return {latitude: lat, longitude: lng};
}

/**
 * The listed city nearest a point, if one is within the radius; otherwise
 * null, which the site shows as "Other". The point is used here and dropped:
 * callers keep only the city.
 */
export function nearestCity<City extends Pick<MarketCity, "latitude" | "longitude">>(
  cities: readonly City[], point: ApproximatePoint, radiusKm = citySnapRadiusKm,
): City | null {
  let best: City | null = null;
  let bestDistance = radiusKm;
  for (const city of cities) {
    const distance = distanceKm(point, city);
    if (distance <= bestDistance) {
      best = city;
      bestDistance = distance;
    }
  }
  return best;
}
