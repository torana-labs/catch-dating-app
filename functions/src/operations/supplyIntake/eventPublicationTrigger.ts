/* eslint-disable max-len */
import {logger} from "firebase-functions";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import {
  defaultListingEventPublicationDeps,
  publishListingEvents,
  type ListingEventPublicationDeps,
  type ListingEventResult,
} from "./eventPublication";
import {supplyIntakeCollections} from "./worker";

/**
 * When a request is first both completed and approved (staff approve a built
 * listing, or a request for an organizer Catch already lists finishes), its
 * imported events go through the event publication policy: under
 * auto-publish, each one that passes every automated check and the import
 * plan publishes; the rest wait for staff in Admin. Receipts are keyed on the
 * request, so a redelivered event replays rather than publishing twice.
 * Returns null for any other update.
 */
export async function publishApprovedListingEvents(
  requestId: string,
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
  deps: ListingEventPublicationDeps = defaultListingEventPublicationDeps
): Promise<ListingEventResult[] | null> {
  const ready = (state: Record<string, unknown> | undefined) => state?.status === "completed" && Boolean(state.approval);
  if (!after || !ready(after) || ready(before)) return null;
  const result = after.result as {eventWorkItemIds?: unknown} | undefined;
  const eventWorkItemIds = Array.isArray(result?.eventWorkItemIds) ?
    result.eventWorkItemIds.filter((id): id is string => typeof id === "string") : [];
  if (eventWorkItemIds.length === 0) return [];
  const {results} = await publishListingEvents({intakeRequestId: requestId, eventWorkItemIds,
    actor: {kind: "policy"}, executionMode: "apply", idempotencyKey: `auto-publish:${requestId}`}, deps);
  return results;
}

export const onSupplyIntakeListingApproved = onDocumentUpdated({
  document: `${supplyIntakeCollections.requests}/{requestId}`,
  retry: true, timeoutSeconds: 300, maxInstances: 3,
}, async (event) => {
  const results = await publishApprovedListingEvents(event.params.requestId,
    event.data?.before.data(), event.data?.after.data());
  if (!results) return;
  const counts: Record<string, number> = {};
  for (const entry of results) counts[entry.outcome] = (counts[entry.outcome] ?? 0) + 1;
  logger.info("Approved listing events went through the publication policy.",
    {requestId: event.params.requestId, counts});
});
