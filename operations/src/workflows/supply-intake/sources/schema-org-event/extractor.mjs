import {
  dedupeBy,
  eventNodes,
  normalizeSchemaEvent,
  normalizeSchemaOrganizer,
  organizerNodes,
  shapeFingerprint,
  text,
} from "../schema-org.mjs";

// Any site that publishes schema.org Event or Organization JSON-LD: organizer
// websites, ticketing platforms without a dedicated adapter, venue pages.
export const schemaOrgEventAdapter = Object.freeze({
  adapterId: "schema-org-event",
  platform: null,
  sourceProfileId: "schema-org-event",
  extractionMethod: "schema_org_json_ld_v1",
  pageKinds: Object.freeze(["event_page", "organizer_page"]),
  extract(snapshot, {timezone, platform}) {
    const pageUrl = text(snapshot.canonicalUrl) ?? text(snapshot.finalUrl);
    const events = dedupeBy(eventNodes(snapshot.jsonLd).map((node, index) => normalizeSchemaEvent(node, {
      platform,
      timezone,
      index,
      occurrenceKey: true,
    })), (event) => event.sourceEntityId).filter((event) => event.title && event.startAt);
    const organizers = organizerNodes(snapshot.jsonLd)
      .map((node) => normalizeSchemaOrganizer(node, {platform, sourceUrl: pageUrl}))
      .filter((organizer) => organizer.name);
    if (events.length === 0 && organizers.length === 0) {
      return {abstained: true, abstainReason: "no_structured_data", templateFingerprint: null};
    }
    return {
      abstained: false,
      abstainReason: null,
      pageKind: events.length > 0 ? "event_page" : "organizer_page",
      templateFingerprint: shapeFingerprint("schema-org", snapshot.jsonLd),
      organizers,
      events,
    };
  },
});
