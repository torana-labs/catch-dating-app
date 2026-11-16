import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {growthFactsCollection} from "../growth/organizerGrowthFacts";
import {marketForIdOrAlias} from "../locations/marketConfig";
import {dayMillis} from "../money/hostTrial";
import {validateFoundingHostOfferDocument} from
  "../shared/generated/validators/foundingHostOfferDocument";
import {
  foundingHostOffersCollection,
  foundingHostPlacesCollection,
  organizerHasOwner,
  type FoundingHostOffer,
} from "./foundingHostOffer";
import {
  type FoundingGrantDeps,
  takeFoundingHostPlaceLogged,
} from "./foundingHostGrant";

/** How far back the daily reconcile looks for organizers gaining owners. */
export const foundingReconcileWindowDays = 3;
/** Most growth facts one reconcile run reads. */
export const foundingReconcileLimit = 500;

/**
 * Whether one organizer write gave it an owner: created by its owner
 * (`createOrganizer`) or a listing claim approved. Later writes to an owned
 * organizer never take a place.
 * @param {Record<string, unknown>|undefined} before Organizer before.
 * @param {Record<string, unknown>|undefined} after Organizer after.
 * @return {boolean} Whether it gained an owner.
 */
export function gainedOwner(before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined): boolean {
  return organizerHasOwner(after) && !organizerHasOwner(before);
}

/**
 * A host starts on Catch when its organizer gains an owner, so that is when
 * it takes a founding place. Not retried on failure, like the growth
 * triggers; the daily reconcile takes any place this missed.
 */
export const onFoundingHostOrganizerWritten = onDocumentWritten({
  document: "organizers/{organizerId}",
}, async (event) => {
  if (!gainedOwner(event.data?.before.data(), event.data?.after.data())) {
    return;
  }
  await takeFoundingHostPlaceLogged({db: admin.firestore(), now: Date.now}, {
    organizerId: event.params.organizerId,
    ownedAtMillis: Date.parse(event.time),
    source: "ownershipTrigger",
  });
});

/**
 * Takes the places the trigger missed: organizers whose growth facts record
 * that they gained an owner in the last few days, in a city whose offer had
 * places left. The growth reconcile (03:40) records any `claimedAt` its
 * triggers missed first. Each grant is its own idempotent transaction,
 * taken oldest claim first, so when one person owns several missed pages in
 * a city the earliest takes their one place and the rest skip.
 * @param {FoundingGrantDeps} deps Firestore and clock.
 * @return {Promise<object>} Organizers checked and places taken.
 */
export async function reconcileFoundingHostPlaces(deps: FoundingGrantDeps):
  Promise<{checked: number; granted: number}> {
  const {db} = deps;
  const nowMillis = deps.now();
  const since = nowMillis - foundingReconcileWindowDays * dayMillis;
  const offers = (await db.collection(foundingHostOffersCollection)
    .limit(200).get()).docs.map((snap) => snap.data())
    .filter((data): data is FoundingHostOffer =>
      validateFoundingHostOfferDocument(data))
    // A city that sold out stays sold out; a deadline that passed before the
    // window began cannot cover anyone the window finds.
    .filter((offer) => offer.takenCount < offer.cap &&
      (offer.endsAtMillis === null || offer.endsAtMillis > since));
  if (offers.length === 0) return {checked: 0, granted: 0};
  const openedAt = new Map(offers.map((offer) =>
    [offer.marketId, offer.openedAtMillis]));
  const oldestOpening = Math.min(...offers.map((offer) =>
    offer.openedAtMillis));
  const facts = (await db.collection(growthFactsCollection)
    .where("milestones.claimedAt", ">=",
      Timestamp.fromMillis(Math.max(since, oldestOpening)))
    .orderBy("milestones.claimedAt")
    .limit(foundingReconcileLimit).get()).docs
    .map((snap) => ({organizerId: snap.id, data: snap.data()}))
    .flatMap(({organizerId, data}) => {
      const claimedAt = (data.milestones as Record<string, unknown>)
        ?.claimedAt;
      const marketId = typeof data.marketId === "string" ?
        marketForIdOrAlias(data.marketId)?.marketId ?? null : null;
      if (!(claimedAt instanceof Timestamp) || marketId === null) return [];
      const opened = openedAt.get(marketId);
      return opened !== undefined && claimedAt.toMillis() >= opened ?
        [{organizerId, ownedAtMillis: claimedAt.toMillis()}] : [];
    });
  if (facts.length === 0) return {checked: 0, granted: 0};
  const places = await db.getAll(...facts.map(({organizerId}) =>
    db.collection(foundingHostPlacesCollection).doc(organizerId)));
  let granted = 0;
  for (const [index, candidate] of facts.entries()) {
    if (places[index].exists) continue;
    // The grant re-reads the organizer, its market and the offer, so a
    // marketId recorded on the facts never decides the city on its own.
    const result = await takeFoundingHostPlaceLogged(deps, {
      ...candidate, source: "dailyReconcile"});
    if (result.kind === "grant") granted++;
  }
  return {checked: facts.length, granted};
}

export const reconcileFoundingHostPlacesDaily = onSchedule({
  schedule: "25 4 * * *", timeZone: "Asia/Kolkata", timeoutSeconds: 300,
  maxInstances: 1, concurrency: 1,
}, async () => {
  const result = await reconcileFoundingHostPlaces({db: admin.firestore(),
    now: Date.now});
  logger.info("Founding host places reconciled", result);
});
