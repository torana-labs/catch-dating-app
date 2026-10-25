import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {projectPublicOrganizer} from "./publicOrganizer";
import {
  liveMarkets,
  rebuildOrganizerScope,
  reconcilePublicPageScopes,
  refreshPublicPageFollowerCounts,
} from "./rebuild";
import {
  catchEventContribution,
  catchEventOrganizerIds,
  externalEventContribution,
  externalEventOrganizerIds,
  organizerContribution,
  reviewContribution,
  reviewOrganizerIds,
} from "./sourceProjections";

type Raw = Record<string, unknown> | undefined;
const options = {retry: true, memory: "512MiB" as const, timeoutSeconds: 300};

async function rebuildAll(ids: Iterable<string>, reason: string) {
  const db = admin.firestore();
  for (const organizerId of new Set(ids)) {
    const result = await rebuildOrganizerScope(db, organizerId);
    logger.info("Public pages rebuilt.", {organizerId, reason, ...result});
  }
}

/** Other organizers published at a path this organizer left or took. */
async function pathPeers(
  organizerId: string, paths: readonly string[]
): Promise<string[]> {
  const db = admin.firestore();
  const peers = await Promise.all(paths.map((path) =>
    db.collection("organizers")
      .where("publicPage.publishStatus", "==", "published")
      .where("publicPage.canonicalPath", "==", path)
      .limit(3).select().get()));
  return peers.flatMap((snapshot) => snapshot.docs.map((doc) => doc.id))
    .filter((id) => id !== organizerId);
}

export const onPublicPageOrganizerWritten = onDocumentWritten({
  ...options, document: "organizers/{organizerId}",
}, async (event) => {
  const organizerId = event.params.organizerId;
  const before = event.data?.before.data() as Raw;
  const after = event.data?.after.data() as Raw;
  if (organizerContribution(organizerId, before, liveMarkets) ===
      organizerContribution(organizerId, after, liveMarkets)) return;
  // A page withheld for sharing its path with this organizer may now be
  // unique again, and a page at the new path may now conflict.
  const paths = [before, after].flatMap((data) => {
    const listing = data &&
      projectPublicOrganizer(organizerId, data, liveMarkets);
    return listing ? [listing.path] : [];
  });
  await rebuildAll([organizerId, ...await pathPeers(organizerId, paths)],
    "organizer");
});

export const onPublicPageEventWritten = onDocumentWritten({
  ...options, document: "events/{eventId}",
}, async (event) => {
  const eventId = event.params.eventId;
  const before = event.data?.before.data() as Raw;
  const after = event.data?.after.data() as Raw;
  const now = Date.now();
  const previous = catchEventContribution(eventId, before, now);
  const next = catchEventContribution(eventId, after, now);
  if (previous === next) return;
  const ids = catchEventOrganizerIds(before, after);
  if ((previous === null) !== (next === null)) {
    // Publishing or withdrawing may make an imported twin ambiguous.
    const twin = await admin.firestore().collection("externalEvents")
      .doc(eventId).get();
    ids.push(...externalEventOrganizerIds(twin.data()));
  }
  await rebuildAll(ids, "event");
});

export const onPublicPageExternalEventWritten = onDocumentWritten({
  ...options, document: "externalEvents/{eventId}",
}, async (event) => {
  const eventId = event.params.eventId;
  const before = event.data?.before.data() as Raw;
  const after = event.data?.after.data() as Raw;
  const previous = externalEventContribution(eventId, before);
  const next = externalEventContribution(eventId, after);
  if (previous === next) return;
  const ids = externalEventOrganizerIds(before, after);
  if ((previous === null) !== (next === null)) {
    const twin = await admin.firestore().collection("events")
      .doc(eventId).get();
    ids.push(...catchEventOrganizerIds(twin.data()));
  }
  await rebuildAll(ids, "externalEvent");
});

export const onPublicPageReviewWritten = onDocumentWritten({
  ...options, document: "reviews/{reviewId}",
}, async (event) => {
  const reviewId = event.params.reviewId;
  const before = event.data?.before.data() as Raw;
  const after = event.data?.after.data() as Raw;
  if (reviewContribution(reviewId, before) ===
      reviewContribution(reviewId, after)) return;
  await rebuildAll(reviewOrganizerIds(before, after), "review");
});

/** Follower counts reach pages in batches rather than on every follow. */
export const refreshPublicPageFollowers = onSchedule({
  schedule: "every 30 minutes", region: "asia-south1", maxInstances: 1,
  timeoutSeconds: 540, memory: "512MiB",
}, async () => {
  const stale = await refreshPublicPageFollowerCounts(admin.firestore());
  if (stale.length) {
    logger.info("Public page follower counts refreshed.",
      {organizers: stale.length});
  }
});

/**
 * Rebuilds every public page daily, so pages also move ended events into
 * past moments and heal any change a trigger missed.
 */
export const reconcilePublicPages = onSchedule({
  schedule: "every day 03:30", timeZone: "Asia/Kolkata",
  region: "asia-south1", maxInstances: 1, timeoutSeconds: 540,
  memory: "1GiB",
}, async () => {
  const summary = await reconcilePublicPageScopes(admin.firestore());
  logger.info("Public pages reconciled.",
    {scopes: summary.scopes, failed: summary.failed});
  if (summary.failed.length) {
    throw new Error(`${summary.failed.length} public page scopes failed.`);
  }
});
