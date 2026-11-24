import * as admin from "firebase-admin";
import {canonicalJson} from "../domain/formats/eventSetupPreferences/resolve";
import type {EventDocument} from "../shared/generated/firestoreAdminTypes";
import {guestEventCard, savedEvents} from "./guestEventCard";

const pageSize = 300;

const sameCard = (current: unknown, card: object) =>
  current !== undefined && canonicalJson(current) === canonicalJson(card);

/**
 * Writes one saved-event edge's card from its current event. An event that
 * cannot be listed leaves the edge as it is; an unchanged card is not
 * rewritten.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} savedEventId The edge, `{uid}_{eventId}`.
 * @return {Promise<"written" | "unchanged" | "skipped">} What happened.
 */
export async function refreshSavedEventCard(
  db: FirebaseFirestore.Firestore,
  savedEventId: string,
): Promise<"written" | "unchanged" | "skipped"> {
  const ref = db.collection(savedEvents).doc(savedEventId);
  return db.runTransaction(async (tx) => {
    const saved = await tx.get(ref);
    const eventId = saved.get("eventId");
    if (!saved.exists || typeof eventId !== "string" || eventId.length === 0 ||
        eventId.includes("/")) {
      return "skipped" as const;
    }
    const event = await tx.get(db.collection("events").doc(eventId));
    const card = guestEventCard(eventId, event.data() as EventDocument);
    if (card === null) return "skipped" as const;
    if (sameCard(saved.get("eventCard"), card)) return "unchanged" as const;
    tx.update(ref, {eventCard: card});
    return "written" as const;
  });
}

/**
 * Rewrites the card on every saved-event edge of one event whose card no
 * longer matches the event, a page at a time.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} eventId The event.
 * @return {Promise<number>} Edges written.
 */
export async function refreshSavedEventCardsForEvent(
  db: FirebaseFirestore.Firestore,
  eventId: string,
): Promise<number> {
  const event = await db.collection("events").doc(eventId).get();
  const card = guestEventCard(eventId, event.data() as EventDocument);
  if (card === null) return 0;
  let written = 0;
  let after: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  for (;;) {
    let query = db.collection(savedEvents)
      .where("eventId", "==", eventId)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(pageSize);
    if (after) query = query.startAfter(after);
    const page = await query.get();
    const batch = db.batch();
    let changes = 0;
    for (const saved of page.docs) {
      if (sameCard(saved.get("eventCard"), card)) continue;
      // The edge may be removed meanwhile; an update never recreates it.
      batch.update(saved.ref, {eventCard: card},
        {lastUpdateTime: saved.updateTime});
      changes++;
    }
    if (changes > 0) {
      await batch.commit();
      written += changes;
    }
    if (page.docs.length < pageSize) return written;
    after = page.docs.at(-1);
  }
}
