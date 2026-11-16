/* eslint-disable max-len */
import {logger} from "firebase-functions";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import {
  claimedBy,
  defaultListingEventPublicationDeps,
  publishListingEvents,
  type ListingEventPublicationDeps,
  type ListingEventResult,
} from "../operations/supplyIntake/eventPublication";
import {supplyIntakeCollections} from "../operations/supplyIntake/worker";
import {record, storedInstantDraft} from "./model";

// A website instant draft's imported events go live when its claimed owner
// publishes the page (owner decision, 16 Nov 2026). This follow-on trigger
// watches the organizer: when an instant draft organizer's page turns
// published while it is claimed, its events go through publishListingEvents,
// the path adminPublishListingEvents uses, with the claimed owner as the
// actor: the same import plan, organizer and contract checks, waivers and
// idempotency receipts, and every automated check (dating framing,
// attribution, price) must pass or the event waits for staff. Nothing
// publishes before the claim, an organizer that was never an instant draft
// is ignored, and a redelivered event replays its receipts.

/** The page is live: published, active and not archived. */
function pageLive(organizer: Record<string, unknown> | undefined): boolean {
  return record(organizer?.publicPage)?.publishStatus === "published" && organizer?.status === "active" &&
    organizer?.archived !== true;
}

/**
 * Publishes a claimed instant draft's events when its page has just gone
 * live. Returns null for any other organizer update.
 */
export async function publishClaimedDraftEvents(organizerId: string, before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
  deps: ListingEventPublicationDeps = defaultListingEventPublicationDeps): Promise<ListingEventResult[] | null> {
  if (!after || !pageLive(after) || pageLive(before)) return null;
  const ownerUid = typeof after.ownerUserId === "string" ? after.ownerUserId : null;
  if (!ownerUid || !claimedBy(after, ownerUid)) return null;
  const db = deps.firestore();
  const requests = await db.collection(supplyIntakeCollections.requests)
    .where("approval.organizerId", "==", organizerId).limit(5).get();
  const found = requests.docs.find((doc) => storedInstantDraft(doc.data().instantDraft) !== null);
  if (!found) return null;
  if (storedInstantDraft(found.data().instantDraft)?.outcome?.state === "expired") return null;
  const result = record(found.data().result);
  const eventWorkItemIds = Array.isArray(result?.eventWorkItemIds) ?
    result.eventWorkItemIds.filter((id): id is string => typeof id === "string") : [];
  if (eventWorkItemIds.length === 0) return [];
  const {results} = await publishListingEvents({intakeRequestId: found.id, eventWorkItemIds,
    actor: {kind: "owner", ownerUid}, executionMode: "apply", idempotencyKey: `owner-publish:${found.id}`}, deps);
  return results;
}

export const onInstantDraftOrganizerPublished = onDocumentUpdated({
  document: "organizers/{organizerId}", retry: true, timeoutSeconds: 300, maxInstances: 3,
}, async (event) => {
  const results = await publishClaimedDraftEvents(event.params.organizerId,
    event.data?.before.data(), event.data?.after.data());
  if (!results) return;
  const counts: Record<string, number> = {};
  for (const entry of results) counts[entry.outcome] = (counts[entry.outcome] ?? 0) + 1;
  logger.info("A claimed instant draft's events went live with its page.", {organizerId: event.params.organizerId, counts});
});
