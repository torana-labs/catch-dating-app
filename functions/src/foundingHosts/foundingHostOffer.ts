import type {FoundingHostOfferDocument} from
  "../shared/generated/foundingHostOfferDocument";
import type {PublicFoundingHostOfferDocument} from
  "../shared/generated/publicFoundingHostOfferDocument";

/**
 * The founding-host offer (owner decision, 16 Nov 2026): in each city the
 * first 50 organizers that gain an owner after the offer opens get 90 free
 * days instead of the standard trial, with no staff step. The owner can set
 * each city's cap and an optional deadline. When places run out or the
 * deadline passes, new organizers get the standard trial; places already
 * taken never change.
 *
 * This module is pure: the grant transaction and the Admin callable read
 * the documents and write what it returns.
 */
export const foundingHostOffersCollection = "foundingHostOffers";
export const foundingHostPlacesCollection = "foundingHostPlaces";
export const publicFoundingHostOffersCollection = "publicFoundingHostOffers";

/** The cap the owner decided for every city. */
export const foundingHostDefaultCap = 50;
/** Free days a founding place grants. */
export const foundingHostTrialDays = 90;
/** Actor recorded on the commercial terms revisions a place writes. */
export const foundingHostTermsActor = "system:foundingHostOffer";

export type FoundingHostOffer = FoundingHostOfferDocument;
export type FoundingHostOfferStatus = PublicFoundingHostOfferDocument["status"];

/**
 * The ownership states in which an organizer has an owner. Matches the
 * growth facts' `claimedAt` step (growth/organizerGrowthTriggers.ts).
 * @param {Record<string, unknown>|undefined} organizer Organizer document.
 * @return {boolean} Whether it has an owner.
 */
export function organizerHasOwner(
  organizer: Record<string, unknown> | undefined): boolean {
  const ownership = organizer?.ownership;
  const state = ownership && typeof ownership === "object" ?
    (ownership as Record<string, unknown>).state : undefined;
  return state === "claimed" || state === "transferred" ||
    state === "userCreated";
}

/**
 * The organizer's market as stored, the same field growth facts read.
 * @param {Record<string, unknown>} organizer Organizer document.
 * @return {string|null} Market id or alias.
 */
export function organizerMarketValue(
  organizer: Record<string, unknown>): string | null {
  const market = organizer.locationMarketId ?? organizer.location;
  return typeof market === "string" ? market : null;
}

/**
 * Whether places are left before the deadline at an instant.
 * @param {object} offer Cap, places taken and deadline.
 * @param {number} atMillis The instant to judge.
 * @return {FoundingHostOfferStatus} open, soldOut or closed.
 */
export function foundingOfferStatus(
  offer: Pick<FoundingHostOffer, "cap" | "takenCount" | "endsAtMillis">,
  atMillis: number): FoundingHostOfferStatus {
  if (offer.endsAtMillis !== null && atMillis >= offer.endsAtMillis) {
    return "closed";
  }
  return offer.takenCount >= offer.cap ? "soldOut" : "open";
}

/**
 * Places left, never below zero.
 * @param {object} offer Cap and places taken.
 * @return {number} Places left.
 */
export function placesLeft(
  offer: Pick<FoundingHostOffer, "cap" | "takenCount">): number {
  return Math.max(0, offer.cap - offer.takenCount);
}

/**
 * The public projection of one offer: counts only, no identities.
 * @param {FoundingHostOffer} offer Offer config and counter.
 * @param {string} citySlug The market's website slug.
 * @param {number} nowMillis Write time.
 * @return {PublicFoundingHostOfferDocument} Public document.
 */
export function publicFoundingOffer(offer: FoundingHostOffer,
  citySlug: string, nowMillis: number): PublicFoundingHostOfferDocument {
  return {schemaVersion: 1, marketId: offer.marketId, citySlug,
    status: foundingOfferStatus(offer, nowMillis), cap: offer.cap,
    placesLeft: placesLeft(offer), trialDays: offer.trialDays,
    endsAtMillis: offer.endsAtMillis, updatedAtMillis: nowMillis};
}

export type FoundingPlaceSkip =
  /** The organizer already holds a place (a retry or a later trigger). */
  "alreadyHeld" |
  /** The organizer was deleted or has no owner now. */
  "notOwned" |
  /** Its market is not in the catalog. */
  "unknownMarket" |
  /** Its city has no founding offer. */
  "noOffer" |
  /** It gained its owner before the offer opened. */
  "ownedBeforeOffer" |
  /** It gained its owner at or after the deadline. */
  "closed" |
  /** Every place in the city is taken. */
  "soldOut" |
  /** Its trial has already started: it is not a new host. */
  "trialStarted";

export type FoundingPlaceDecision =
  {kind: "grant"; placeNumber: number} |
  {kind: "skip"; reason: FoundingPlaceSkip};

/**
 * Whether an organizer takes the next founding place in its city. The
 * deadline is judged at the moment it gained its owner, so a late trigger
 * or the daily reconcile never turns away a host who signed up in time;
 * places left are judged now, inside the transaction that takes one.
 * @param {object} input What the grant transaction read.
 * @return {FoundingPlaceDecision} The next place, or why not.
 */
export function decideFoundingPlace(input: {
  placeExists: boolean;
  owned: boolean;
  marketKnown: boolean;
  offer: FoundingHostOffer | null;
  ownedAtMillis: number;
  trialStarted: boolean;
}): FoundingPlaceDecision {
  const skip = (reason: FoundingPlaceSkip): FoundingPlaceDecision =>
    ({kind: "skip", reason});
  if (input.placeExists) return skip("alreadyHeld");
  if (!input.owned) return skip("notOwned");
  if (!input.marketKnown) return skip("unknownMarket");
  const offer = input.offer;
  if (!offer) return skip("noOffer");
  if (input.ownedAtMillis < offer.openedAtMillis) {
    return skip("ownedBeforeOffer");
  }
  if (offer.endsAtMillis !== null &&
      input.ownedAtMillis >= offer.endsAtMillis) {
    return skip("closed");
  }
  if (offer.takenCount >= offer.cap) return skip("soldOut");
  if (input.trialStarted) return skip("trialStarted");
  return {kind: "grant", placeNumber: offer.takenCount + 1};
}
