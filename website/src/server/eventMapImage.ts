import "server-only";
import {createHash, createHmac} from "node:crypto";
import {publicDocumentId} from "./publicReadPolicy";
import {resolvePublicRoute} from "./publicRoute";
import {readWebsiteSecret} from "./websiteSecrets";

/**
 * The event page's map: a Google Maps Static API image of a published
 * event's meeting point, fetched and signed on the server so the key never
 * reaches the page (CAT-272). The page links /maps/events/<id>/map.png?v=<version>,
 * beside the link-preview cards' /og/events/<id>/card.png,
 * versioned by the point and the map's look, so each map is drawn about once
 * and a moved meeting point gets a new URL. Without both secrets, or when a
 * fetch fails, there is no map and the page keeps its place text and
 * "Open in Google Maps".
 */
// Secret Manager secrets in the website's project, read by its service account.
const apiKeySecret = "CATCH_WEBSITE_MAPS_STATIC_KEY";
const signingSecretName = "CATCH_WEBSITE_MAPS_SIGNING_SECRET";

export interface MapCoordinate {
  latitude: number;
  longitude: number;
}

// The framed MapPreview is 5:2 on a page at least 840px wide; scale 2 makes
// the 640px request a 1280px image, and a phone crops it to 2:1.
const look = {size: "640x256", scale: "2", zoom: "15", marker: "0xF07A55",
  styles: ["feature:poi|visibility:off", "feature:transit|visibility:off"]} as const;
const lookVersion = "1";

const point = ({latitude, longitude}: MapCoordinate) => `${latitude.toFixed(6)},${longitude.toFixed(6)}`;

function validCoordinate(value: Partial<MapCoordinate> | null | undefined): value is MapCoordinate {
  const latitude = value?.latitude ?? Number.NaN;
  const longitude = value?.longitude ?? Number.NaN;
  return Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}

/** Changes when the meeting point or the map's look changes. */
export function eventMapVersion(coordinate: MapCoordinate): string {
  return createHash("sha256").update(`${lookVersion}:${point(coordinate)}`).digest("hex").slice(0, 12);
}

/** Where the event page loads its map from. */
export function eventMapImagePath(eventId: string, coordinate: MapCoordinate): string {
  return `/maps/events/${encodeURIComponent(eventId)}/map.png?v=${eventMapVersion(coordinate)}`;
}

/** Whether the page should draw maps: both secrets are readable. */
export async function eventMapsAvailable(readSecret = readWebsiteSecret): Promise<boolean> {
  const [key, secret] = await Promise.all([readSecret(apiKeySecret), readSecret(signingSecretName)]);
  return Boolean(key && secret);
}

/** A Static API URL signed with the URL signing secret (HMAC-SHA1 over path and query). */
export function signedStaticMapUrl(coordinate: MapCoordinate, apiKey: string, signingSecret: string): string {
  const params = new URLSearchParams({center: point(coordinate), zoom: look.zoom, size: look.size, scale: look.scale,
    format: "png", markers: `color:${look.marker}|${point(coordinate)}`});
  for (const style of look.styles) params.append("style", style);
  params.set("key", apiKey);
  const pathAndQuery = `/maps/api/staticmap?${params.toString()}`;
  const signature = createHmac("sha1", Buffer.from(signingSecret.replace(/-/gu, "+").replace(/_/gu, "/"), "base64"))
    .update(pathAndQuery).digest("base64").replace(/\+/gu, "-").replace(/\//gu, "_");
  return `https://maps.googleapis.com${pathAndQuery}&signature=${signature}`;
}

export interface EventMapDependencies {
  /** The meeting point of a published event, or null; never a point the request supplied. */
  meetingPoint: (eventId: string) => Promise<MapCoordinate | null>;
  readSecret: (name: string) => Promise<string | null>;
  fetchMap: (url: string) => Promise<Response>;
  now: () => number;
}

const day = 24 * 60 * 60_000;
const maxBytes = 2 * 1024 * 1024;
const drawn = new Map<string, {png: Uint8Array; until: number}>();

/** The meeting point of the event the public route would render, under the same publication rules. */
export async function defaultMeetingPoint(eventId: string): Promise<MapCoordinate | null> {
  const location = (await resolvePublicRoute(`/events/${encodeURIComponent(eventId)}/`)).event?.meetingLocation;
  return validCoordinate(location) ? {latitude: location.latitude, longitude: location.longitude} : null;
}

const defaultDependencies = (): EventMapDependencies => ({
  meetingPoint: defaultMeetingPoint,
  readSecret: readWebsiteSecret,
  fetchMap: (url) => fetch(url, {signal: AbortSignal.timeout(5_000)}),
  now: Date.now,
});

const missing = (cacheControl: string) => new Response(null, {status: 404, headers: {"Cache-Control": cacheControl}});

/** /maps/events/<id>/map.png: the published event's map image, or a 404 the page never links. */
export async function eventMapResponse(
  request: Request, segments: readonly string[], dependencies: EventMapDependencies = defaultDependencies(),
): Promise<Response> {
  const [family, eventId, file, ...rest] = segments;
  if (family !== "events" || file !== "map.png" || rest.length || !publicDocumentId(eventId)) {
    return missing("public, max-age=300");
  }
  try {
    const coordinate = await dependencies.meetingPoint(eventId);
    if (!coordinate) return missing("public, max-age=300, s-maxage=300");
    const [apiKey, signingSecret] = await Promise.all([
      dependencies.readSecret(apiKeySecret), dependencies.readSecret(signingSecretName)]);
    if (!apiKey || !signingSecret) return missing("no-store");
    const version = eventMapVersion(coordinate);
    let png = drawn.get(version);
    if (!png || png.until <= dependencies.now()) {
      const map = await dependencies.fetchMap(signedStaticMapUrl(coordinate, apiKey, signingSecret));
      const bytes = new Uint8Array(await map.arrayBuffer());
      if (!map.ok || !map.headers.get("content-type")?.startsWith("image/png") || bytes.length === 0 || bytes.length > maxBytes) {
        return missing("no-store");
      }
      png = {png: bytes, until: dependencies.now() + day};
      drawn.set(version, png);
      // A small instance cache: the CDN serves repeat views.
      if (drawn.size > 500) drawn.delete(drawn.keys().next().value!);
    }
    // As the link-preview cards do: the linked version caches for an hour, any other briefly.
    const current = new URL(request.url).searchParams.get("v") === version;
    return new Response(png.png.slice(), {headers: {"Content-Type": "image/png", "Cache-Control": current
      ? "public, max-age=3600, s-maxage=3600" : "public, max-age=300, s-maxage=300"}});
  } catch {
    return missing("no-store");
  }
}

/** Tests only: forget drawn maps. */
export function forgetEventMaps(): void {
  drawn.clear();
}
