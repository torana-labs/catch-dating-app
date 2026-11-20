import {isDeepStrictEqual} from "node:util";
import * as logger from "firebase-functions/logger";
import type {
  EventDocument,
  HostContactDetailViewDocument,
  OrganizerContactDocument,
  OrganizerContactEventEdgeDocument,
  OrganizerContactTraitDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  contactDetailTraits,
  contactRevenue,
  eventDetailRow,
  maxDetailEvents,
  readActiveContactMerges,
} from "../organizers/organizerContacts";

export const hostContactDetailViewsCollection = "hostContactDetailViews";

/** The most contacts one payment or event write re-evaluates. */
export const maxContactDetailFanOut = 1000;

/**
 * Whether a contact is one the detail callable shows: present, not deleted,
 * hidden or merged, with a trait row of the same organizer.
 * @param {OrganizerContactDocument|undefined} contact The contact.
 * @param {OrganizerContactTraitDocument|undefined} traits Its trait row.
 * @return {boolean} Whether the contact has a detail view.
 */
export function contactDetailVisible(
  contact: OrganizerContactDocument | undefined,
  traits: OrganizerContactTraitDocument | undefined
): boolean {
  return Boolean(contact && traits &&
    typeof contact.organizerId === "string" && contact.organizerId &&
    contact.deletedAt == null && contact.hiddenAt == null &&
    contact.identityState !== "merged" &&
    traits.organizerId === contact.organizerId);
}

/**
 * Reads one contact's detail view from current sources inside a transaction,
 * without writing: the traits, revenue and newest 100 event rows exactly as
 * getOrganizerContactDetail returns them, and the active merges into it. The
 * contact, its trait row and its event edges are read in the transaction, so
 * a delayed trigger cannot bring back a removed contact; event titles, Catch
 * payments and the immutable merge receipts are read outside it, so event,
 * payment and merge writes never wait on a view.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {FirebaseFirestore.Transaction} tx The read transaction.
 * @param {string} contactId The contact document id.
 * @return {Promise<HostContactDetailViewDocument|null>} The view, or null
 *     when the contact has none.
 */
export async function readHostContactDetailView(
  db: FirebaseFirestore.Firestore, tx: FirebaseFirestore.Transaction,
  contactId: string
): Promise<HostContactDetailViewDocument | null> {
  const [contactSnap, traitSnap] = await tx.getAll(
    db.collection("organizerContacts").doc(contactId),
    db.collection("organizerContactTraits").doc(contactId));
  const contact = contactSnap.data() as OrganizerContactDocument | undefined;
  const traits = traitSnap.data() as OrganizerContactTraitDocument | undefined;
  if (!contact || !traits || !contactDetailVisible(contact, traits)) {
    return null;
  }
  const edgeSnap = await tx.get(db.collection("organizerContactEventEdges")
    .where("contactId", "==", contactId)
    .orderBy("eventStartAt", "desc")
    .limit(maxDetailEvents + 1)) as FirebaseFirestore.QuerySnapshot;
  const edges = edgeSnap.docs.slice(0, maxDetailEvents)
    .map((doc) => doc.data() as OrganizerContactEventEdgeDocument);
  const eventsTruncated = edgeSnap.size > maxDetailEvents;
  const eventIds = [...new Set(edges.map((edge) => edge.eventId))];
  const [eventSnaps, revenue, activeMerges] = await Promise.all([
    eventIds.length === 0 ? Promise.resolve([]) : db.getAll(
      ...eventIds.map((eventId) => db.collection("events").doc(eventId))),
    contactRevenue({db, contact, eventEdges: edges,
      eventHistoryTruncated: eventsTruncated}),
    readActiveContactMerges(db, contact.organizerId, contactId),
  ]);
  const events = new Map(eventSnaps
    .filter((snapshot) => snapshot.exists)
    .map((snapshot) => [snapshot.id, snapshot.data() as EventDocument]));
  return {
    organizerId: contact.organizerId,
    contactId,
    traits: contactDetailTraits(traits),
    revenue: revenue.revenue,
    events: edges.map((edge) => eventDetailRow(edge,
      revenue.byEvent.get(edge.eventId) ?? [], events.get(edge.eventId))),
    eventsTruncated,
    activeMerges,
    version: 1,
  };
}

/**
 * Rewrites one contact's detail view from current sources, writing only on
 * change and deleting it when the contact is gone, hidden or merged. A
 * source that fails its contract is logged and keeps the previous view
 * rather than blocking a trigger retry loop.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} contactId The contact document id.
 * @return {Promise<void>} Resolves once the view matches its sources.
 */
export async function reconcileHostContactDetailView(
  db: FirebaseFirestore.Firestore, contactId: string): Promise<void> {
  await db.runTransaction(async (tx) => {
    const ref = db.collection(hostContactDetailViewsCollection).doc(contactId);
    const old = await tx.get(ref);
    let next: HostContactDetailViewDocument | null;
    try {
      next = await readHostContactDetailView(db, tx, contactId);
    } catch (error) {
      logger.warn("Contact detail view kept a source that fails its " +
        "contract.", {contactId,
        reason: error instanceof Error ? error.message : String(error)});
      return;
    }
    if (isDeepStrictEqual(old.data() ?? null, next)) return;
    if (next) tx.set(ref, next);
    else if (old.exists) tx.delete(ref);
  });
}

/**
 * Re-evaluates every contact linked to one account: a Catch payment counts
 * towards the revenue of the verified contacts linked to its payer.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} uid The payer's account id.
 * @return {Promise<void>} Resolves once each view matches its sources.
 */
export async function reconcileHostContactDetailViewsForAccount(
  db: FirebaseFirestore.Firestore, uid: string): Promise<void> {
  const contacts = await db.collection("organizerContacts")
    .where("linkedUid", "==", uid)
    .limit(maxContactDetailFanOut)
    .get();
  for (const contact of contacts.docs) {
    await reconcileHostContactDetailView(db, contact.id);
  }
}

/**
 * Re-evaluates every contact with an edge to one event, whose rows show
 * the event's title and origin.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} eventId The event id.
 * @return {Promise<void>} Resolves once each view matches its sources.
 */
export async function reconcileHostContactDetailViewsForEvent(
  db: FirebaseFirestore.Firestore, eventId: string): Promise<void> {
  const edges = await db.collection("organizerContactEventEdges")
    .where("eventId", "==", eventId)
    .limit(maxContactDetailFanOut)
    .get();
  const contactIds = new Set(edges.docs
    .map((edge) => edge.data().contactId)
    .filter((id): id is string => typeof id === "string" && id.length > 0));
  for (const contactId of contactIds) {
    await reconcileHostContactDetailView(db, contactId);
  }
}
