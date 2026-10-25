import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {logger} from "firebase-functions";
import * as admin from "firebase-admin";
import {
  externalEventAppVisibilityFor,
} from "../admin/externalEventPublicationPolicy";

interface ExternalEventVisibilityDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
}

const defaultDeps: ExternalEventVisibilityDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
};

// One page of an organizer's external events; a write batch holds 500.
const pageSize = 200;

/**
 * Keeps each external event's app visibility equal to its organizer's, so
 * app discovery never lists an event whose organizer is hidden in the app,
 * and an organizer made discoverable brings its events with it. A deleted
 * organizer hides them. Writes only the rows that differ.
 * @param {string} organizerId Organizer id.
 * @param {Record<string, unknown> | undefined} before Organizer before.
 * @param {Record<string, unknown> | undefined} after Organizer after.
 * @param {ExternalEventVisibilityDeps} deps Injectable dependencies.
 * @return {Promise<number>} Events updated.
 */
export async function syncExternalEventAppVisibility(
  organizerId: string,
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
  deps: ExternalEventVisibilityDeps = defaultDeps
): Promise<number> {
  const next = externalEventAppVisibilityFor(after ?? {});
  if (before && after && externalEventAppVisibilityFor(before) === next) {
    return 0;
  }
  const db = deps.firestore();
  /* firestore-index: externalEvents (
    canonicalHostId:ASCENDING, __name__:ASCENDING
  ) */
  const query = db.collection("externalEvents")
    .where("canonicalHostId", "==", organizerId)
    .orderBy(admin.firestore.FieldPath.documentId())
    .limit(pageSize);
  let updated = 0;
  let page = await query.get();
  while (page.docs.length > 0) {
    const stale = page.docs.filter((doc) =>
      doc.get("discovery.appVisibility") !== next);
    if (stale.length > 0) {
      const batch = db.batch();
      for (const doc of stale) {
        batch.update(doc.ref, {
          "discovery.appVisibility": next,
          "updatedAt": deps.serverTimestamp(),
        });
      }
      await batch.commit();
      updated += stale.length;
    }
    if (page.docs.length < pageSize) break;
    page = await query.startAfter(page.docs[page.docs.length - 1]).get();
  }
  return updated;
}

export const syncExternalEventVisibility = onDocumentWritten(
  {document: "organizers/{organizerId}", retry: true},
  async (event) => {
    const organizerId = event.params.organizerId;
    const updated = await syncExternalEventAppVisibility(
      organizerId,
      event.data?.before.data(),
      event.data?.after.data()
    );
    if (updated > 0) {
      logger.info("External event app visibility synced.",
        {organizerId, updated});
    }
  }
);
