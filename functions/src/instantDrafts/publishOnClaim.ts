/* eslint-disable max-len */
import {logger} from "firebase-functions";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import {
  appliedTryItOrganizerId,
  claimedBy,
  defaultListingEventPublicationDeps,
  publishListingEvents,
  type ListingEventPublicationDeps,
  type ListingEventResult,
} from "../operations/supplyIntake/eventPublication";
import {supplyIntakeCollections} from "../operations/supplyIntake/worker";

// A try-it workspace whose owner applied an import from a link
// (organizer.import-from-link; owner decision, 18 Nov 2026) publishes the
// imported events when the owner publishes the page. This follow-on trigger
// watches the organizer: when the page turns published while the owner holds
// it, its events go through publishListingEvents, the path
// adminPublishListingEvents uses, with the owner as the actor: the same
// import plan, organizer and contract checks, waivers and idempotency
// receipts, and every automated check (dating framing, attribution, price)
// must pass or the event waits for staff. An identity imported from a third
// party's page must be verified first, an organizer with no applied import is
// ignored, and a redelivered event replays its receipts.
//
// The website instant-draft tool this trigger was built for was retired in
// Nov 2026; the export keeps its deployed name, because renaming a deployed
// Function deletes it.

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

/** The page is live: published, active and not archived. */
function pageLive(organizer: Record<string, unknown> | undefined): boolean {
  return record(organizer?.publicPage)?.publishStatus === "published" && organizer?.status === "active" &&
    organizer?.archived !== true;
}

/**
 * Publishes an applied try-it import's events when its owner's page has just
 * gone live. Returns null for any other organizer update.
 */
export async function publishImportedEventsOnOwnerPublish(organizerId: string, before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
  deps: ListingEventPublicationDeps = defaultListingEventPublicationDeps): Promise<ListingEventResult[] | null> {
  if (!after || !pageLive(after) || pageLive(before)) return null;
  const ownerUid = typeof after.ownerUserId === "string" ? after.ownerUserId : null;
  if (!ownerUid || !claimedBy(after, ownerUid)) return null;
  const found = await ownerPublishableRequest(deps.firestore(), organizerId, after);
  if (!found) return null;
  const result = record(found.data()?.result);
  const eventWorkItemIds = Array.isArray(result?.eventWorkItemIds) ?
    result.eventWorkItemIds.filter((id): id is string => typeof id === "string") : [];
  if (eventWorkItemIds.length === 0) return [];
  const {results} = await publishListingEvents({intakeRequestId: found.id, eventWorkItemIds,
    actor: {kind: "owner", ownerUid}, executionMode: "apply", idempotencyKey: `owner-publish:${found.id}`}, deps);
  return results;
}

/**
 * The intake request whose events the owner's publish takes live: the try-it
 * import (organizer.import-from-link) its owner applied to it, as its
 * provenance names. Null for any other organizer.
 */
async function ownerPublishableRequest(db: FirebaseFirestore.Firestore, organizerId: string,
  organizer: Record<string, unknown>): Promise<FirebaseFirestore.DocumentSnapshot | null> {
  const requestId = record(organizer.importProvenance)?.requestId;
  if (typeof requestId !== "string" || !requestId.startsWith("tryit-")) return null;
  const imported = await db.collection(supplyIntakeCollections.requests).doc(requestId).get();
  return imported.exists && appliedTryItOrganizerId(imported.data() ?? null) === organizerId ? imported : null;
}

export const onInstantDraftOrganizerPublished = onDocumentUpdated({
  document: "organizers/{organizerId}", retry: true, timeoutSeconds: 300, maxInstances: 3,
}, async (event) => {
  const results = await publishImportedEventsOnOwnerPublish(event.params.organizerId,
    event.data?.before.data(), event.data?.after.data());
  if (!results) return;
  const counts: Record<string, number> = {};
  for (const entry of results) counts[entry.outcome] = (counts[entry.outcome] ?? 0) + 1;
  logger.info("An applied try-it import's events went live with its page.", {organizerId: event.params.organizerId, counts});
});
