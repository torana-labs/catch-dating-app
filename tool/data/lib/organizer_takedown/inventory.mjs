import fs from "node:fs";
import path from "node:path";

// Which Firestore stores an organiser can live in, and what a takedown does
// with each. The contract schemas (contracts/firestore/*.schema.json) are the
// complete inventory: every top-level collection whose documents carry an
// organizerId field is scanned by that field, every collection keyed by
// {organizerId} is read by id, and the stores the investigation found that
// link by another field (externalEvents.canonicalHostId, Supply Intake runs,
// route reservations, audit logs) are resolved explicitly in plan.mjs.

/** Collections whose matching records are kept, never deleted, with the reason the plan reports. */
export const RETAINED = Object.freeze({
  // The legal record of the request and of any user safety report.
  supportConversations: "legal_record",
  eventSafetyReports: "safety_record",
  reports: "safety_record",
  // The Sales reintroduction fence is itself a suppression record.
  salesPrivacyRestrictions: "suppression_record",
});

/** Money records are kept for accounting and refunds; staff review them by hand. */
const FINANCE = /(payment|payout|bill|charge|checkout|refund|invoice|ledger|settlement|credit|entitlement)/iu;

/** Audit records keep the action and lose the target's identity. */
export const REDACTED = Object.freeze(new Set(["adminAuditLogs"]));

export function dispositionFor(collection) {
  if (REDACTED.has(collection)) return "redact";
  if (RETAINED[collection]) return `retain_${RETAINED[collection]}`;
  if (FINANCE.test(collection)) return "retain_finance";
  return "delete";
}

/** Firestore collections the BigQuery export extensions mirror, and their changelog table. */
export const BIGQUERY_CHANGELOGS = Object.freeze({
  organizers: "catch_analytics.organizers_raw_changelog",
  events: "catch_analytics.events_raw_changelog",
  reviews: "catch_analytics.reviews_raw_changelog",
  savedEvents: "catch_analytics.saved_events_raw_changelog",
  eventBookings: "catch_analytics.event_bookings_raw_changelog",
  // The export moved to eventBookings on 22 Nov 2026; the old table keeps
  // the changelog rows written before then, so a takedown clears both.
  eventParticipations: "catch_analytics.event_participations_raw_changelog",
  eventInviteLinks: "catch_analytics.event_invite_links_raw_changelog",
  eventSuccessScorecards: "catch_marketplace_metrics.event_success_scorecards_raw_changelog",
});

/** Tables Functions stream rows into, keyed by organizer_id. */
export const BIGQUERY_STREAMED = Object.freeze([
  "catch_analytics.organizer_growth_events",
  "catch_analytics.host_analytics_events",
]);

/**
 * Reads the schema inventory: top-level collections scanned by organizerId
 * and collections keyed by organizer id.
 */
export function readSchemaInventory(schemaDir) {
  const byField = new Set();
  const byId = new Set();
  for (const file of fs.readdirSync(schemaDir).filter((name) => name.endsWith(".schema.json")).sort()) {
    const schema = JSON.parse(fs.readFileSync(path.join(schemaDir, file), "utf8"));
    const firestorePath = schema["x-firestore-path"];
    if (typeof firestorePath !== "string") continue;
    const segments = firestorePath.split("/");
    if (segments.length !== 2) continue;
    if (segments[1] === "{organizerId}") byId.add(segments[0]);
    else if (schema.properties && Object.hasOwn(schema.properties, "organizerId")) byField.add(segments[0]);
  }
  // organizerIntakeReviewDecisions is keyed {entityId}, which is the organizer id.
  byId.add("organizerIntakeReviewDecisions");
  // TRANSITIONAL: eventParticipations has no schema of its own while it is
  // the legacy mirror of eventBookings (phase 1 of the rename). Scan it too,
  // so a takedown also finds mirror rows whose booking was never copied.
  byField.add("eventParticipations");
  return {byField: [...byField].sort(), byId: [...byId].sort()};
}
