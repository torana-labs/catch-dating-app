import {onDocumentWritten} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import type {
  EventDocument,
} from "../shared/generated/firestoreAdminTypes";
import {isEventPubliclyAccessible} from "../events/eventPublicationAccess";

interface SyncOrganizerNextEventDeps {
  firestore: () => FirebaseFirestore.Firestore;
  nowTimestamp: () => FirebaseFirestore.Timestamp;
}

const defaultDeps: SyncOrganizerNextEventDeps = {
  firestore: () => admin.firestore(),
  nowTimestamp: () => admin.firestore.Timestamp.now(),
};

/**
 * Recomputes the next upcoming active event projection for one organizer.
 * @param {string} organizerId Organizer id.
 * @param {SyncOrganizerNextEventDeps} deps Injectable Firebase dependencies.
 * @return {Promise<void>}
 */
export async function refreshOrganizerNextEvent(
  organizerId: string,
  deps: SyncOrganizerNextEventDeps = defaultDeps
): Promise<void> {
  const db = deps.firestore();
  const organizerRef = db.collection("organizers").doc(organizerId);
  const now = deps.nowTimestamp();
  await db.runTransaction(async (tx) => {
    const organizerSnap = await tx.get(organizerRef);
    if (!organizerSnap.exists) return;
    /* firestore-index: events (
      organizerId:ASCENDING, status:ASCENDING,
      startTime:ASCENDING, __name__:ASCENDING
    ) */
    const query = db.collection("events")
      .where("organizerId", "==", organizerId)
      .where("status", "==", "active")
      .where("startTime", ">=", now)
      .orderBy("startTime", "asc")
      .orderBy(admin.firestore.FieldPath.documentId(), "asc");
    // The usual case reads one row. When private drafts
    // precede it, continue in bounded pages rather than clearing the public
    // projection. Document cursors preserve ordering even at tied start times.
    // All pages share this transaction snapshot with the final projection.
    let page = await tx.get(query.limit(1));
    let visible: EventDocument | undefined;
    while (page.docs.length > 0) {
      visible = page.docs.map((doc) => doc.data() as EventDocument)
        .find((event) => isEventPubliclyAccessible(event) &&
          event.organizerId === organizerId && event.status === "active");
      if (visible) break;
      page = await tx.get(query.startAfter(page.docs[page.docs.length - 1])
        .limit(50));
    }
    tx.set(organizerRef, {
      nextEventAt: visible?.startTime ?? null,
      nextEventLabel: visible ?
        visible.meetingLocation?.name ?? visible.meetingPoint ?? null : null,
    }, {merge: true});
  });
}

/**
 * Recomputes organizer next-event projections affected by an event write.
 * @param {EventDocument | undefined} before Event before state.
 * @param {EventDocument | undefined} after Event after state.
 * @param {SyncOrganizerNextEventDeps} deps Injectable Firebase dependencies.
 * @return {Promise<void>}
 */
export async function syncOrganizerNextEventHandler(
  before: EventDocument | undefined,
  after: EventDocument | undefined,
  deps: SyncOrganizerNextEventDeps = defaultDeps
): Promise<void> {
  const organizerIds = new Set<string>();

  if (before?.organizerId) {
    organizerIds.add(before.organizerId);
  }
  if (after?.organizerId) {
    organizerIds.add(after.organizerId);
  }

  await Promise.all(
    Array.from(organizerIds).map(
      (organizerId) => refreshOrganizerNextEvent(organizerId, deps)
    )
  );
}

export const syncOrganizerNextEvent = onDocumentWritten(
  {document: "events/{eventId}", retry: true},
  async (event) => {
    const before = event.data?.before.data() as EventDocument | undefined;
    const after = event.data?.after.data() as EventDocument | undefined;
    await syncOrganizerNextEventHandler(before, after);
  }
);
