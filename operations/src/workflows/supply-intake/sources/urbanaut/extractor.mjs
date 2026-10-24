import {evidenceFieldsOf, shapeFingerprint, text} from "../schema-org.mjs";

// Urbanaut (urbanaut.app) experience pages carry no schema.org Event. The page
// embeds its Angular state as JSON (`ng-state`) with a `spot_detail_<slug>`
// object: the experience, its city and timing, and the host's public account
// data. Booking and on-ground contacts in that state are never read.
const BASE_URL = "https://urbanaut.app";

export const urbanautAdapter = Object.freeze({
  adapterId: "urbanaut",
  platform: "urbanaut",
  sourceProfileId: "urbanaut",
  extractionMethod: "urbanaut_ng_state_spot_v1",
  pageKinds: Object.freeze(["event_page"]),
  extract(snapshot, {timezone}) {
    const state = snapshot.embeddedJson.find((block) => block.id === "ng-state")?.value;
    const key = state && typeof state === "object" ?
      Object.keys(state).find((candidate) => candidate.startsWith("spot_detail_")) :
      null;
    const spot = key ? state[key] : null;
    const startAt = isoFromSeconds(spot?.start_timestamp);
    if (!spot || !text(spot.name) || !startAt) {
      return {abstained: true, abstainReason: "template_drift", templateFingerprint: shapeFingerprint("urbanaut-ng-state", spot ?? state ?? null)};
    }
    const account = spot.account_data && typeof spot.account_data === "object" ? spot.account_data : {};
    const city = spot.city_data && typeof spot.city_data === "object" ? spot.city_data : {};
    const hostSlug = text(account.slug);
    const organizerName = text(account.company_name);
    const sourceUrl = text(snapshot.canonicalUrl) ?? (text(spot.slug) ? `${BASE_URL}/spot/${spot.slug}` : text(snapshot.finalUrl));
    const latitude = finiteNumber(spot.lat);
    const longitude = finiteNumber(spot.lng);
    const price = finiteNumber(spot.price_starts_at);
    const event = {
      sourceEntityId: `urbanaut:spot:${text(spot.id) ?? text(spot.slug)}`,
      platform: "urbanaut",
      title: text(spot.name),
      description: text(spot.short_description_plain_text) ?? text(snapshot.meta["og:description"]),
      startAt,
      endAt: spot.has_end_timestamp === false ? null : isoFromSeconds(spot.end_timestamp),
      timezone,
      venue: null,
      address: text(spot.address),
      locality: text(city.name),
      region: null,
      country: null,
      latitude,
      longitude,
      sourceUrl,
      imageUrl: text(snapshot.meta["og:image"]),
      organizerName,
      organizerUrl: hostSlug ? `${BASE_URL}/${hostSlug}` : null,
      price: price === null ? null : {min: price, max: null, currency: text(spot.price_starts_at_currency)},
      status: spot.permanently_closed === true || spot.is_unpublished === true ? "cancelled" : "scheduled",
      attendanceMode: null,
    };
    const organizer = organizerName ? {
      sourceEntityId: `urbanaut:profile:${hostSlug ?? text(account.id)}`,
      platform: "urbanaut",
      name: organizerName,
      description: text(account.company_description),
      url: event.organizerUrl,
      imageUrl: text(account.logo_path_url),
      locality: text(city.name),
      region: null,
      country: null,
      latitude: null,
      longitude: null,
      sameAs: [],
    } : null;
    return {
      abstained: false,
      abstainReason: null,
      pageKind: "event_page",
      templateFingerprint: shapeFingerprint("urbanaut-ng-state", spot),
      organizers: organizer ? [{...organizer, evidenceFields: evidenceFieldsOf(organizer)}] : [],
      events: [{...event, evidenceFields: evidenceFieldsOf(event)}],
    };
  },
});

function isoFromSeconds(value) {
  const seconds = Number(value);
  if (!Number.isSafeInteger(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000).toISOString();
}

function finiteNumber(value) {
  const number = Number(value);
  return value !== null && value !== undefined && value !== "" && Number.isFinite(number) ? number : null;
}
