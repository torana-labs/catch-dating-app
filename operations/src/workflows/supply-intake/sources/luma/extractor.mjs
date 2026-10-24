import {hashValue} from "../../../../platform/canonical-json.mjs";
import {
  dedupeBy,
  eventNodes,
  normalizeSchemaEvent,
  normalizeSchemaOrganizer,
  organizerNodes,
  shapeFingerprint,
  text as schemaText,
} from "../schema-org.mjs";

export function extractLumaEvents(raw, {artifactRef = null, observedAt = null, timezone = "Asia/Kolkata"} = {}) {
  const nodes = [];
  collectEvents(raw?.jsonLd ?? raw?.jsonld ?? raw?.ldJson ?? raw, nodes);
  return {
    schemaVersion: 1,
    sourceProfileId: "luma",
    templateFingerprint: fingerprint(raw),
    extractionMethod: "deterministic_json_ld_event_v1",
    artifactRef,
    observedAt,
    events: nodes.map((event, index) => normalizeEvent(event, {index, timezone})),
  };
}

function collectEvents(value, output) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectEvents(item, output));
    return;
  }
  if (!value || typeof value !== "object") return;
  const types = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]];
  if (types.includes("Event")) output.push(value);
  for (const nested of Object.values(value)) collectEvents(nested, output);
}

function normalizeEvent(event, {index, timezone}) {
  const location = objectOrEmpty(event.location);
  const address = objectOrEmpty(location.address);
  const url = text(event.url) ?? text(event["@id"]);
  return {
    sourceEntityId: text(event.identifier) ?? lumaId(url) ?? `event-${index + 1}`,
    title: text(event.name) ?? "Untitled Luma event",
    description: text(event.description),
    startAt: text(event.startDate),
    endAt: text(event.endDate),
    timezone,
    venue: text(location.name),
    address: [address.streetAddress, address.addressLocality, address.addressRegion, address.addressCountry]
      .map(text)
      .filter(Boolean)
      .join(", ") || null,
    sourceUrl: url,
    status: eventStatus(event.eventStatus),
    evidenceFields: ["title", "startAt", "endAt", "venue", "sourceUrl"].filter((key) => {
      const mapped = {title: event.name, startAt: event.startDate, endAt: event.endDate, venue: location.name, sourceUrl: url};
      return Boolean(mapped[key]);
    }),
  };
}

function fingerprint(raw) {
  const paths = [];
  collectShape(raw, "$", paths, 0);
  return `luma-jsonld-${hashValue(paths.sort()).slice(0, 16)}`;
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

function lumaId(value) {
  try {
    const url = new URL(value);
    return url.pathname.split("/").filter(Boolean).at(-1) ?? null;
  } catch {
    return null;
  }
}

function text(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function objectOrEmpty(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function eventStatus(value) {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("cancel")) return "cancelled";
  if (normalized.includes("postpon")) return "postponed";
  return "scheduled";
}

// Whole Luma pages (event, organizer calendar, city discovery) through the
// shared schema.org normalizer. extractLumaEvents above stays the frozen
// `luma-json-ld-event-v1` learner implementation.
export const lumaAdapter = Object.freeze({
  adapterId: "luma",
  platform: "luma",
  sourceProfileId: "luma",
  extractionMethod: "luma_json_ld_page_v1",
  pageKinds: Object.freeze(["event_page", "organizer_page"]),
  extract(snapshot, {timezone}) {
    const events = dedupeBy(eventNodes(snapshot.jsonLd).map((node, index) => normalizeSchemaEvent(node, {
      platform: "luma",
      timezone,
      index,
      sourceId: lumaId(schemaText(node.url) ?? schemaText(node["@id"])),
    })), (event) => event.sourceEntityId).filter((event) => event.title && event.startAt);
    const pageUrl = schemaText(snapshot.canonicalUrl) ?? schemaText(snapshot.finalUrl);
    const organizers = organizerNodes(snapshot.jsonLd)
      .filter((node) => lumaHosted(schemaText(node.url) ?? pageUrl))
      .map((node) => normalizeSchemaOrganizer(node, {platform: "luma", sourceUrl: pageUrl}));
    if (events.length === 0 && organizers.length === 0) {
      return {abstained: true, abstainReason: "template_drift", templateFingerprint: shapeFingerprint("luma-page", snapshot.jsonLd)};
    }
    return {
      abstained: false,
      abstainReason: null,
      pageKind: organizers.length > 0 ? "organizer_page" : "event_page",
      templateFingerprint: shapeFingerprint("luma-page", snapshot.jsonLd),
      organizers,
      events,
    };
  },
});

function lumaHosted(value) {
  try {
    return ["luma.com", "lu.ma"].includes(new URL(value).hostname.replace(/^www\./u, ""));
  } catch {
    return false;
  }
}
