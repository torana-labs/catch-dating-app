import "server-only";
import {createHash} from "node:crypto";
import {readWebsiteSecret} from "./websiteSecrets";

/**
 * How an event page links its map (CAT-272): the versioned image path and
 * whether maps are on. The route that draws the image is eventMapImage.ts;
 * this stays apart so the page's catalog can link a map without importing
 * the route resolver.
 */
export interface MapCoordinate {
  latitude: number;
  longitude: number;
}

// Secret Manager secrets in the website's project, read by its service account.
const apiKeySecret = "CATCH_WEBSITE_MAPS_STATIC_KEY";
const signingSecretName = "CATCH_WEBSITE_MAPS_SIGNING_SECRET";
// Bump when the map's look changes, so every page links a fresh image.
const lookVersion = "1";

/** "lat,lng" at six decimals, as the Static API and the map version read it. */
export function mapPoint({latitude, longitude}: MapCoordinate): string {
  return [latitude, longitude].map((value) => value.toFixed(6)).join(",");
}

/** A real point on the globe, or null. */
export function eventMapCoordinate(value: Partial<MapCoordinate> | null | undefined): MapCoordinate | null {
  const latitude = value?.latitude ?? Number.NaN;
  const longitude = value?.longitude ?? Number.NaN;
  return Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 ? {latitude, longitude} : null;
}

/** Changes when the meeting point or the map's look changes. */
export function eventMapVersion(coordinate: MapCoordinate): string {
  return createHash("sha256").update(`${lookVersion}:${mapPoint(coordinate)}`).digest("hex").slice(0, 12);
}

/** Where the event page loads its map from. */
export function eventMapImagePath(eventId: string, coordinate: MapCoordinate): string {
  return `/maps/events/${encodeURIComponent(eventId)}/map.png?v=${eventMapVersion(coordinate)}`;
}

/** The Static API key and URL signing secret, or nulls while either is missing. */
export async function eventMapSecrets(readSecret = readWebsiteSecret) {
  const [apiKey, signingSecret] = await Promise.all([readSecret(apiKeySecret), readSecret(signingSecretName)]);
  return apiKey && signingSecret ? {apiKey, signingSecret} : null;
}

/** Whether the page should draw maps: both secrets are readable. */
export async function eventMapsAvailable(readSecret = readWebsiteSecret): Promise<boolean> {
  return (await eventMapSecrets(readSecret)) !== null;
}

/** The map an event page links: only for a real meeting point while maps are on. */
export async function eventMapLink(eventId: string, meeting: Partial<MapCoordinate> | null | undefined,
  available: () => Promise<boolean> = () => eventMapsAvailable()): Promise<string | undefined> {
  const coordinate = eventMapCoordinate(meeting);
  return coordinate && await available() ? eventMapImagePath(eventId, coordinate) : undefined;
}
