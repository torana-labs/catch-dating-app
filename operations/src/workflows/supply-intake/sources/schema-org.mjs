import {hashValue} from "../../../platform/canonical-json.mjs";

// schema.org JSON-LD helpers shared by the platform adapters. Every normalized
// value is copied from the page; nothing is inferred.
const ORGANIZER_TYPES = Object.freeze(["Organization", "LocalBusiness", "SportsClub", "SportsOrganization",
  "NGO", "EducationalOrganization", "PerformingGroup", "MusicGroup", "TheaterGroup"]);

/** Every node whose `@type` includes one of `types`, from blocks, `@graph` and item lists. */
export function collectNodes(value, types, output = [], depth = 0) {
  if (depth > 12 || value === null || typeof value !== "object") return output;
  if (Array.isArray(value)) {
    for (const item of value) collectNodes(item, types, output, depth + 1);
    return output;
  }
  if (typesOf(value).some((type) => types.includes(type))) output.push(value);
  for (const nested of Object.values(value)) collectNodes(nested, types, output, depth + 1);
  return output;
}

export function typesOf(node) {
  const value = node?.["@type"];
  return (Array.isArray(value) ? value : [value]).filter((type) => typeof type === "string");
}

export function eventNodes(jsonLd) {
  return collectNodes(jsonLd, ["Event", "SocialEvent", "MusicEvent", "SportsEvent", "ComedyEvent",
    "EducationEvent", "ExhibitionEvent", "Festival", "FoodEvent", "LiteraryEvent", "TheaterEvent",
    "DanceEvent", "BusinessEvent", "VisualArtsEvent", "ScreeningEvent", "ChildrensEvent"]);
}

/** Top-level organizer nodes; organizers nested inside events are read per event. */
export function organizerNodes(jsonLd) {
  const blocks = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
  const output = [];
  for (const block of blocks) {
    const roots = Array.isArray(block?.["@graph"]) ? block["@graph"] : [block];
    for (const node of roots) {
      if (typesOf(node).some((type) => ORGANIZER_TYPES.includes(type))) output.push(node);
    }
  }
  return output;
}

export function normalizeSchemaEvent(node, {platform, timezone, index, occurrenceKey = false, sourceId = null}) {
  const location = firstObject(node.location);
  const address = location.address;
  const url = text(node.url) ?? text(node["@id"]);
  const startAt = text(node.startDate);
  const baseId = sourceId ?? text(node.identifier) ?? stripFragment(text(node["@id"])) ?? url ?? `event-${index + 1}`;
  const organizer = firstObject(node.organizer);
  const geo = geoOf(location);
  const event = {
    sourceEntityId: occurrenceKey && startAt ? `${baseId}@${startAt}` : baseId,
    platform,
    title: text(node.name) ?? null,
    description: text(node.description),
    startAt,
    endAt: text(node.endDate),
    timezone,
    venue: text(location.name),
    address: addressText(address),
    locality: text(address?.addressLocality),
    region: text(address?.addressRegion),
    country: text(address?.addressCountry),
    latitude: geo?.latitude ?? null,
    longitude: geo?.longitude ?? null,
    sourceUrl: url,
    imageUrl: imageOf(node.image),
    organizerName: text(organizer.name),
    organizerUrl: text(organizer.url),
    price: priceOf(node.offers),
    status: eventStatus(node.eventStatus),
    attendanceMode: attendanceMode(node.eventAttendanceMode),
  };
  return {...event, evidenceFields: evidenceFieldsOf(event)};
}

export function normalizeSchemaOrganizer(node, {platform, sourceUrl}) {
  const location = firstObject(node.location);
  const address = location.address ?? node.address;
  const geo = geoOf(location);
  const url = text(node.url) ?? sourceUrl ?? null;
  const organizer = {
    sourceEntityId: url ?? text(node["@id"]) ?? text(node.name),
    platform,
    name: text(node.name),
    description: text(node.description),
    url,
    imageUrl: imageOf(node.logo) ?? imageOf(node.image),
    locality: text(address?.addressLocality),
    region: text(address?.addressRegion),
    country: text(address?.addressCountry),
    latitude: geo?.latitude ?? null,
    longitude: geo?.longitude ?? null,
    sameAs: urlsOf(node.sameAs),
  };
  return {...organizer, evidenceFields: evidenceFieldsOf(organizer)};
}

/** A structural fingerprint: changes when the page template changes, not when values do. */
export function shapeFingerprint(prefix, value) {
  const paths = [];
  collectShape(value, "$", paths, 0);
  return `${prefix}-${hashValue([...new Set(paths)].sort()).slice(0, 16)}`;
}

export function dedupeBy(items, key) {
  const seen = new Set();
  return items.filter((item) => {
    const value = key(item);
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

export function text(value) {
  if (typeof value === "string") return value.trim() ? value.trim() : null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (Array.isArray(value)) return text(value[0]);
  if (value && typeof value === "object" && typeof value["@value"] === "string") return text(value["@value"]);
  return null;
}

function collectShape(value, path, output, depth) {
  if (depth > 8 || value === null || value === undefined) return;
  if (Array.isArray(value)) {
    output.push(`${path}[]`);
    if (value[0] !== undefined) collectShape(value[0], `${path}[]`, output, depth + 1);
    return;
  }
  if (typeof value === "object") {
    for (const key of Object.keys(value).sort()) {
      output.push(`${path}.${key}`);
      collectShape(value[key], `${path}.${key}`, output, depth + 1);
    }
  }
}

function firstObject(value) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && typeof candidate === "object" ? candidate : {};
}

function addressText(address) {
  if (typeof address === "string") return text(address);
  if (!address || typeof address !== "object") return null;
  return [address.streetAddress, address.addressLocality, address.addressRegion, address.addressCountry]
    .map(text)
    .filter(Boolean)
    .join(", ") || null;
}

function geoOf(location) {
  const geo = firstObject(location.geo);
  const latitude = Number(geo.latitude ?? location.latitude);
  const longitude = Number(geo.longitude ?? location.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return {latitude, longitude};
}

function imageOf(value) {
  if (typeof value === "string") return httpUrl(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const url = imageOf(item);
      if (url) return url;
    }
    return null;
  }
  if (value && typeof value === "object") return httpUrl(value.url) ?? httpUrl(value.contentUrl);
  return null;
}

function urlsOf(value) {
  const values = Array.isArray(value) ? value : [value];
  return [...new Set(values.map(httpUrl).filter(Boolean))].slice(0, 20);
}

function priceOf(offers) {
  const offer = firstObject(offers);
  const currency = text(offer.priceCurrency);
  const low = Number(offer.lowPrice ?? offer.price);
  const high = Number(offer.highPrice ?? offer.price);
  if (!Number.isFinite(low) && !Number.isFinite(high)) return null;
  return {
    min: Number.isFinite(low) ? low : null,
    max: Number.isFinite(high) ? high : null,
    currency,
  };
}

function eventStatus(value) {
  const normalized = String(text(value) ?? "").toLowerCase();
  if (normalized.includes("cancel")) return "cancelled";
  if (normalized.includes("postpon")) return "postponed";
  if (normalized.includes("reschedul")) return "rescheduled";
  return "scheduled";
}

function attendanceMode(value) {
  const normalized = String(text(value) ?? "").toLowerCase();
  if (normalized.includes("online")) return "online";
  if (normalized.includes("mixed")) return "mixed";
  if (normalized.includes("offline")) return "offline";
  return null;
}

function stripFragment(value) {
  return value ? value.replace(/#.*$/u, "") || null : null;
}

function httpUrl(value) {
  const candidate = text(value);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** The populated fields a reviewer can check against the source page. */
export function evidenceFieldsOf(record) {
  return Object.entries(record)
    .filter(([key, value]) => !["sourceEntityId", "platform", "timezone"].includes(key) &&
      value !== null && value !== undefined && !(Array.isArray(value) && value.length === 0))
    .map(([key]) => key)
    .sort();
}
