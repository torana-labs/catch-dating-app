import {dedupeBy, eventNodes, evidenceFieldsOf, normalizeSchemaEvent, shapeFingerprint, text} from "../schema-org.mjs";

// District (district.in) event pages publish one schema.org Event per session,
// each with the same @id and its own startDate, plus the organizer's name
// without a profile URL. Sessions become separate occurrences.
export const districtAdapter = Object.freeze({
  adapterId: "district",
  platform: "district",
  sourceProfileId: "district",
  extractionMethod: "district_json_ld_event_v1",
  pageKinds: Object.freeze(["event_page"]),
  extract(snapshot, {timezone}) {
    const nodes = eventNodes(snapshot.jsonLd);
    const events = dedupeBy(nodes.map((node, index) => normalizeSchemaEvent(node, {
      platform: "district",
      timezone,
      index,
      occurrenceKey: true,
    })), (event) => event.sourceEntityId).filter((event) => event.title && event.startAt);
    if (events.length === 0) {
      return {abstained: true, abstainReason: "template_drift", templateFingerprint: shapeFingerprint("district-jsonld", snapshot.jsonLd)};
    }
    const organizers = dedupeBy(events
      .filter((event) => event.organizerName)
      .map((event) => withEvidence({
        sourceEntityId: `district:organizer:${slug(event.organizerName)}`,
        platform: "district",
        name: event.organizerName,
        description: null,
        url: null,
        imageUrl: null,
        locality: event.locality ?? localityFromVenue(event.venue),
        region: event.region,
        country: event.country,
        latitude: null,
        longitude: null,
        sameAs: [],
      })), (organizer) => organizer.sourceEntityId);
    return {
      abstained: false,
      abstainReason: null,
      pageKind: "event_page",
      templateFingerprint: shapeFingerprint("district-jsonld", nodes[0]),
      organizers,
      events,
    };
  },
});

// "Hitchin | Hajipur, Noida" names the venue then its locality.
function localityFromVenue(venue) {
  const tail = text(venue)?.split(",").at(-1);
  return tail ? tail.trim() || null : null;
}

function withEvidence(record) {
  return {...record, evidenceFields: evidenceFieldsOf(record)};
}

function slug(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "").slice(0, 96);
}
