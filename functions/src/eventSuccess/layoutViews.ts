import {isDeepStrictEqual} from "node:util";
import * as logger from "firebase-functions/logger";
import type {
  EventDocument,
  EventSuccessLayoutViewDocument,
  EventSuccessPlanDocument,
  OrganizerEventSuccessLayoutDocument,
} from "../shared/generated/firestoreAdminTypes";
import {organizerEventSuccessLayoutDocumentId} from
  "../domain/formats/layoutDocumentId";
import {publicEventSuccessLayout} from "./spatialLayout";

export const eventSuccessLayoutViewsCollection = "eventSuccessLayoutViews";

type Db = FirebaseFirestore.Firestore;
type Tx = FirebaseFirestore.Transaction;

/**
 * One event's room layout view, read only: exactly what
 * getEventSuccessSpatialLayout returns, the selected layout's id, label and
 * units, or a null layout when the plan selects none or seats the whole
 * group. Room geometry only, never a guest or an assignment. Null when the
 * event, its organizer or its plan is gone, or the selected layout belongs
 * to another organizer.
 * @param {Db} db Firestore.
 * @param {Tx} tx The transaction to read in.
 * @param {string} eventId The event.
 * @return {Promise<EventSuccessLayoutViewDocument|null>} The view, or null.
 */
export async function readEventSuccessLayoutView(db: Db, tx: Tx,
  eventId: string): Promise<EventSuccessLayoutViewDocument | null> {
  const [eventSnap, planSnap] = await Promise.all([
    tx.get(db.collection("events").doc(eventId)),
    tx.get(db.collection("eventSuccessPlans").doc(eventId))]);
  const event = eventSnap.data() as EventDocument | undefined;
  const plan = planSnap.data() as EventSuccessPlanDocument | undefined;
  const organizerId = event?.organizerId;
  if (!event || !plan || typeof organizerId !== "string" || !organizerId ||
      plan.eventId !== eventId) return null;
  if (!plan.layoutId || plan.structureConfig?.unitKind === "wholeGroup") {
    return {eventId, organizerId, layout: null, version: 1};
  }
  const layoutSnap = await tx.get(db.collection("organizerEventSuccessLayouts")
    .doc(organizerEventSuccessLayoutDocumentId(organizerId, plan.layoutId)));
  const layout = layoutSnap.data() as OrganizerEventSuccessLayoutDocument |
    undefined;
  if (!layout || layout.organizerId !== organizerId ||
      layout.layoutId !== plan.layoutId) return null;
  return {eventId, organizerId, layout: publicEventSuccessLayout(layout),
    version: 1};
}

/**
 * Rewrites one event's layout view in a transaction, writing only on change
 * and deleting it when its sources are gone. A source that fails to read is
 * logged and keeps the previous view.
 * @param {Db} db Firestore.
 * @param {string} eventId The event.
 * @return {Promise<void>} Resolves once the view matches its sources.
 */
export async function reconcileEventSuccessLayoutView(db: Db,
  eventId: string): Promise<void> {
  await db.runTransaction(async (tx) => {
    const ref = db.collection(eventSuccessLayoutViewsCollection).doc(eventId);
    const old = await tx.get(ref);
    let next: EventSuccessLayoutViewDocument | null;
    try {
      next = await readEventSuccessLayoutView(db, tx, eventId);
    } catch (error) {
      logger.warn("Event layout view kept a source that fails its contract.",
        {eventId,
          reason: error instanceof Error ? error.message : String(error)});
      return;
    }
    if (isDeepStrictEqual(old.data() ?? null, next)) return;
    if (next) tx.set(ref, next);
    else if (old.exists) tx.delete(ref);
  });
}

/** The most events one layout edit rewrites, a page at a time. */
const layoutFanoutPage = 200;

/**
 * Rewrites the layout view of every event whose plan selects one organizer
 * layout, after that layout is saved or removed.
 * @param {Db} db Firestore.
 * @param {string} organizerId The layout's organizer.
 * @param {string} layoutId The layout.
 * @return {Promise<number>} How many events were evaluated.
 */
export async function reconcileLayoutViewsForLayout(db: Db,
  organizerId: string, layoutId: string): Promise<number> {
  let count = 0;
  let after: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  for (;;) {
    let query = db.collection("eventSuccessPlans")
      .where("layoutId", "==", layoutId).orderBy("__name__")
      .limit(layoutFanoutPage);
    if (after) query = query.startAfter(after);
    const page = await query.get();
    for (const doc of page.docs) {
      if (doc.get("organizerId") !== organizerId) continue;
      await reconcileEventSuccessLayoutView(db, doc.id);
      count += 1;
    }
    if (page.size < layoutFanoutPage) return count;
    after = page.docs[page.size - 1];
  }
}

/**
 * Whether a plan write moved anything the layout view reads: the event, the
 * owner, the selected layout or the unit kind.
 * @param {FirebaseFirestore.DocumentData|undefined} before The old plan.
 * @param {FirebaseFirestore.DocumentData|undefined} after The new plan.
 * @return {boolean} True when the view must be rebuilt.
 */
export function layoutViewInputsChanged(
  before: FirebaseFirestore.DocumentData | undefined,
  after: FirebaseFirestore.DocumentData | undefined): boolean {
  const inputs = (data: FirebaseFirestore.DocumentData | undefined) =>
    JSON.stringify(data === undefined ? null : [data.eventId ?? null,
      data.organizerId ?? null, data.layoutId ?? null,
      data.structureConfig?.unitKind ?? null]);
  return inputs(before) !== inputs(after);
}
