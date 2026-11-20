import {isDeepStrictEqual} from "node:util";
import * as logger from "firebase-functions/logger";
import type {
  EventDocument,
  HostOrganizerJourneyViewDocument,
  OrganizerDocument,
  OrganizerGrowthFactsDocument,
  SupplyIntakeRequestsDocument,
} from "../shared/generated/firestoreAdminTypes";
import {organizerManagerUserIds} from "../shared/organizerHosts";
import {
  type Claim,
  organizerJourneyFromSources,
  organizerJourneySourceRefs,
} from "../organizers/organizerJourney";

export const hostOrganizerJourneyViewsCollection = "hostOrganizerJourneyViews";

/**
 * The most views one organizer keeps: its managers and the people waiting on
 * a claim among the claims its journey reads.
 */
export const maxJourneyViewsPerOrganizer = 50;

/**
 * The view id of one person's journey for one organizer.
 * @param {string} organizerId The organizer.
 * @param {string} uid The reader.
 * @return {string} The hostOrganizerJourneyViews document id.
 */
export function journeyViewId(organizerId: string, uid: string): string {
  return `${organizerId}_${uid}`;
}

const nonEmpty = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

/**
 * Who has a journey view of an organizer: its current managers, and anyone
 * whose own claim on it is still being checked. Both are exactly the callers
 * listMyOrganizerJourneys answers for this organizer.
 * @param {Partial<OrganizerDocument>} organizer The organizer.
 * @param {Claim[]} claims Its claim requests, as the journey reads them.
 * @return {string[]} The readers, managers first.
 */
export function journeyReaders(organizer: Partial<OrganizerDocument>,
  claims: Claim[]): string[] {
  return [...new Set([
    ...organizerManagerUserIds(organizer as OrganizerDocument),
    ...claims.filter((claim) => claim.status === "pending")
      .map((claim) => claim.requesterUid),
  ])].filter(nonEmpty).slice(0, maxJourneyViewsPerOrganizer);
}

/**
 * Reads every journey view one organizer should have from current sources
 * inside a transaction, without writing: one per manager and per waiting
 * claimant, keyed by view id. Each holds only what the callable returns to
 * that person: someone else's claim never shows. A missing organizer has
 * none.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {FirebaseFirestore.Transaction} tx The read transaction.
 * @param {string} organizerId The organizer.
 * @return {Promise<Map<string, HostOrganizerJourneyViewDocument>>} Views.
 */
export async function readOrganizerJourneyViews(
  db: FirebaseFirestore.Firestore, tx: FirebaseFirestore.Transaction,
  organizerId: string):
  Promise<Map<string, HostOrganizerJourneyViewDocument>> {
  const refs = organizerJourneySourceRefs(db, organizerId);
  const [organizerSnap, claimSnap, intakeSnap, eventSnap, growthSnap] =
    await Promise.all([
      tx.get(db.collection("organizers").doc(organizerId)),
      tx.get(refs.claims), tx.get(refs.intake), tx.get(refs.firstEvent),
      tx.get(refs.growth),
    ]);
  const views = new Map<string, HostOrganizerJourneyViewDocument>();
  const organizer = organizerSnap.data() as
    Partial<OrganizerDocument> | undefined;
  if (!organizer) return views;
  const claims = claimSnap.docs.map((doc) => doc.data() as Claim);
  const sources = {
    claims,
    intake: intakeSnap.docs.map((doc) =>
      doc.data() as Partial<SupplyIntakeRequestsDocument>),
    firstEvent: eventSnap.docs[0]?.data() as Partial<EventDocument> |
      undefined,
    growth: growthSnap.data() as
      Partial<OrganizerGrowthFactsDocument> | undefined,
  };
  for (const uid of journeyReaders(organizer, claims)) {
    const journey = organizerJourneyFromSources(organizerId, organizer,
      sources, uid);
    views.set(journeyViewId(organizerId, uid), {organizerId, uid,
      waitingClaim: journey.waitingClaim, journey, version: 1});
  }
  return views;
}

/**
 * Rewrites every journey view of one organizer from current sources in one
 * transaction, writing only views that changed and deleting views of people
 * who are no longer managers or claimants. Sources that fail their contract
 * are logged and keep the previous views rather than blocking a trigger
 * retry loop.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} organizerId The organizer.
 * @return {Promise<void>} Resolves once the views match their sources.
 */
export async function reconcileOrganizerJourneyViews(
  db: FirebaseFirestore.Firestore, organizerId: string): Promise<void> {
  await db.runTransaction(async (tx) => {
    const views = db.collection(hostOrganizerJourneyViewsCollection);
    const existing = await tx.get(views.where("organizerId", "==", organizerId)
      .limit(maxJourneyViewsPerOrganizer * 2));
    let next: Map<string, HostOrganizerJourneyViewDocument>;
    try {
      next = await readOrganizerJourneyViews(db, tx, organizerId);
    } catch (error) {
      logger.warn("Journey views kept sources that fail their contract.",
        {organizerId, reason: error instanceof Error ? error.message :
          String(error)});
      return;
    }
    const old = new Map(existing.docs.map((doc) => [doc.id, doc.data()]));
    for (const [id, view] of next) {
      if (!isDeepStrictEqual(old.get(id) ?? null, view)) {
        tx.set(views.doc(id), view);
      }
    }
    for (const id of old.keys()) {
      if (!next.has(id)) tx.delete(views.doc(id));
    }
  });
}
