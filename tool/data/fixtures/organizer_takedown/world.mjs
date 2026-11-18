// A fictional takedown world. Every organiser, handle and domain here is made
// up; domains use the reserved .example TLD. Case TD-0042 covers "Lantern
// Trail Runners" (two organiser copies, a pending nomination and an approved
// one). "Harbour Swim Collective" is unrelated and must survive untouched.

export const CASE_ID = "TD-0042";
export const CASE_ORGANIZER = "org-lantern-1";
export const COPY_ORGANIZER = "lantern-trail-runners-copy";
export const UNRELATED_ORGANIZER = "org-harbour-1";
export const PEER_ORGANIZER = "org-peer-1";
export const NAME_ONLY_ORGANIZER = "org-lantern-name-only";

/** Strings that must never appear in tool output. */
export const IDENTIFYING = ["lantern", "Lantern", CASE_ORGANIZER, COPY_ORGANIZER, "nom-lantern", "evt-lantern",
  "lantern-trail.example", "lanterntrailrunners"];

export const caseFile = {
  schemaVersion: 1,
  caseId: CASE_ID,
  requestType: "removeAndDoNotList",
  receivedAt: "2026-11-01T09:00:00.000Z",
  record: {requestedBy: "the organiser (fixture)", legalBasis: "fixture"},
  targets: {
    organizerIds: [CASE_ORGANIZER],
    names: ["Lantern Trail Runners"],
    handles: ["@lanterntrailrunners"],
    domains: ["lantern-trail.example"],
    urls: ["https://lu.ma/lantern-trail"],
    slugs: [],
  },
};

const page = (slug) => ({slug, citySlug: "mumbai", canonicalPath: `/organizers/${slug}/`, legacyPaths: [],
  publishStatus: "published", indexStatus: "noindex"});

export function takedownWorld() {
  return {
    // The case organiser, its post and a June-scraper copy that shares its Instagram.
    [`organizers/${CASE_ORGANIZER}`]: {name: "Lantern Trail Runners", instagramHandle: "lanterntrailrunners",
      locationMarketId: "in-mh-mumbai", publicPage: page("lantern-trail-runners"),
      publicSources: [{href: "https://lantern-trail.example"}]},
    [`organizers/${CASE_ORGANIZER}/posts/post-1`]: {body: "Sunday route"},
    [`organizers/${COPY_ORGANIZER}`]: {name: "Lantern Trail Run Club", instagramHandle: null,
      publicPage: page("lantern-trail-run-club-mumbai"),
      publicSources: [{href: "https://www.instagram.com/lanterntrailrunners/"}]},
    [`organizers/${NAME_ONLY_ORGANIZER}`]: {name: "Lantern Trail Runners", instagramHandle: null,
      publicPage: page("lantern-trail-runners-pune"), publicSources: []},
    [`organizers/${UNRELATED_ORGANIZER}`]: {name: "Harbour Swim Collective", instagramHandle: "harbourswim",
      publicPage: page("harbour-swim-collective"), publicSources: [{href: "https://harbour-swim.example"}]},
    [`organizers/${PEER_ORGANIZER}`]: {name: "Morning Tide Walkers", publicPage: page("morning-tide-walkers")},

    // Imported events, linked by canonicalHostId, with their receipts and pages.
    "externalEvents/evt-lantern-1": {canonicalHostId: CASE_ORGANIZER, title: "Night trail"},
    "externalEvents/evt-harbour-1": {canonicalHostId: UNRELATED_ORGANIZER, title: "Harbour swim"},
    "externalEventPublicationReceipts/rcpt-1": {eventId: "evt-lantern-1", action: "publish"},
    "eventPublicPage/evt-lantern-1": {organizerId: CASE_ORGANIZER, path: "/events/night-trail-lantern/"},
    "eventPublicPage/evt-harbour-1": {organizerId: UNRELATED_ORGANIZER, path: "/events/harbour-swim/"},

    // A pending nomination by name, and the approved request behind the organiser.
    "supplyIntakeRequests/nom-lantern-pending": {request: {kind: "nomination",
      seed: {name: "Lantern Trail Runners", urls: [], notes: null, categories: []}, origin: null},
    status: "completed", approval: null, result: {runId: "run-lantern-1", listingWorkItemId: "wi-lantern-1",
      eventWorkItemIds: ["wi-lantern-2"]}},
    "supplyIntakeRequests/nom-lantern-approved": {request: {kind: "nomination",
      seed: {name: "Night runners", urls: ["https://night-runners.example"], notes: null, categories: []},
      origin: {kind: "sales_inbound_intent", id: "intent-lantern-1"}},
    status: "completed", approval: {organizerId: CASE_ORGANIZER}, result: null},
    "supplyIntakeRequests/nom-harbour": {request: {kind: "nomination",
      seed: {name: "Harbour Swim Collective", urls: ["https://harbour-swim.example"], notes: null, categories: []},
      origin: null}, status: "completed", approval: {organizerId: UNRELATED_ORGANIZER}, result: null},
    "salesInboundIntents/intent-lantern-1": {hostApplication: {organizationName: "Lantern Trail Runners"}},
    "operationRuns/run-lantern-1": {runId: "run-lantern-1"},
    "operationWorkItems/wi-lantern-1": {runId: "run-lantern-1"},
    "operationWorkItems/wi-lantern-2": {runId: "run-lantern-1"},
    "operationActionReceipts/act-1": {runId: "run-lantern-1"},
    "operationLeases/lease-1": {resourceId: "wi-lantern-1"},
    "organizerIntakeCurationDecisions/listing-1": {sourceWorkItemId: "wi-lantern-1", entityId: CASE_ORGANIZER},
    [`organizerIntakeReviewDecisions/${CASE_ORGANIZER}`]: {decision: "approve_public"},

    // Records keyed by or carrying the organiser id.
    [`publicRouteReservations/organizers--lantern-trail-runners`]: {ownerId: CASE_ORGANIZER},
    [`publicRouteReservations/organizers--harbour-swim-collective`]: {ownerId: UNRELATED_ORGANIZER},
    [`organizerGrowthFacts/${CASE_ORGANIZER}`]: {organizerId: CASE_ORGANIZER},
    "organizerClaimRequests/claim-1": {organizerId: CASE_ORGANIZER, requesterName: "Fixture Person"},
    [`organizerSalesAccounts/${CASE_ORGANIZER}`]: {organizerId: CASE_ORGANIZER, name: "Lantern Trail Runners"},
    [`organizerSalesAccounts/${CASE_ORGANIZER}/customValues/sales.language`]: {value: "en"},
    "salesOpportunities/opp-1": {organizerId: CASE_ORGANIZER},
    "salesOpportunities/opp-harbour": {organizerId: UNRELATED_ORGANIZER},
    [`publicPageBuilds/${CASE_ORGANIZER}`]: {organizerId: CASE_ORGANIZER},
    [`organizerPublicPage/${CASE_ORGANIZER}`]: {organizerId: CASE_ORGANIZER, path: "/organizers/lantern-trail-runners/"},
    [`organizerPublicPage/${PEER_ORGANIZER}`]: {organizerId: PEER_ORGANIZER, path: "/organizers/morning-tide-walkers/",
      recommendedOrganizers: [{organizerId: CASE_ORGANIZER, name: "Lantern Trail Runners"},
        {organizerId: UNRELATED_ORGANIZER, name: "Harbour Swim Collective"}]},
    [`publicOrganizers/${CASE_ORGANIZER}`]: {name: "Lantern Trail Runners"},
    "adminInboxItems/item-1": {sourceId: "nom-lantern-pending", title: "Lantern Trail Runners"},
    "adminAuditLogs/log-1": {actorUid: "admin-1", roles: ["admin"], action: "adminApproveOrganizerListing",
      targetPath: `organizers/${CASE_ORGANIZER}`, before: {}, after: {publicSlug: "lantern-trail-runners"},
      note: "Checked the Lantern listing.", requestId: "approve-lantern-1"},
    "adminAuditLogs/log-harbour": {actorUid: "admin-1", roles: ["admin"], action: "adminApproveOrganizerListing",
      targetPath: `organizers/${UNRELATED_ORGANIZER}`, before: {}, after: {}, note: "ok"},
    // Kept: the request's legal record and a money record.
    "supportConversations/conv-1": {organizerId: CASE_ORGANIZER, subject: "Removal request"},
    "guestPayments/pay-1": {organizerId: CASE_ORGANIZER, amountPaise: 1000},
    "cityPlans/mumbai": {organizers: [{organizerId: UNRELATED_ORGANIZER}]},
  };
}

export function appObjects() {
  return {
    "supply-intake/snapshots/nom-lantern-pending/aaa.json": "{\"captured\":\"fixture page\"}",
    [`organizers/${CASE_ORGANIZER}/photos/cover.jpg`]: "jpeg-bytes",
    [`organizers/${UNRELATED_ORGANIZER}/photos/cover.jpg`]: "other-jpeg-bytes",
  };
}
