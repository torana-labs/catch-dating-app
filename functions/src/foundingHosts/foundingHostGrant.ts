import {createHash} from "node:crypto";
import * as logger from "firebase-functions/logger";
import {effectiveCommercialTerms, readCommercialTerms} from
  "../commercialTerms/resolver";
import {
  commercialTermsCollection,
  commercialTermsRevisionId,
  commercialTermsRevisionsCollection,
  mergeCommercialTerms,
  organizerCommercialTermsId,
  type CommercialTerms,
  type CommercialTermsOverride,
} from "../commercialTerms/terms";
import {growthFactsCollection} from "../growth/organizerGrowthFacts";
import {marketForIdOrAlias} from "../locations/marketConfig";
import type {CommercialTermsDocument} from
  "../shared/generated/commercialTermsDocument";
import type {CommercialTermsRevisionDocument} from
  "../shared/generated/commercialTermsRevisionDocument";
import type {FoundingHostPlaceDocument} from
  "../shared/generated/foundingHostPlaceDocument";
import {validateCommercialTermsDocument} from
  "../shared/generated/validators/commercialTermsDocument";
import {validateFoundingHostOfferDocument} from
  "../shared/generated/validators/foundingHostOfferDocument";
import {validateFoundingHostPlaceDocument} from
  "../shared/generated/validators/foundingHostPlaceDocument";
import {validatePublicFoundingHostOfferDocument} from
  "../shared/generated/validators/publicFoundingHostOfferDocument";
import {
  decideFoundingPlace,
  foundingHostOffersCollection,
  foundingHostPlacesCollection,
  foundingHostTermsActor,
  organizerHasOwner,
  organizerMarketValue,
  publicFoundingHostOffersCollection,
  publicFoundingOffer,
  type FoundingHostOffer,
  type FoundingPlaceDecision,
} from "./foundingHostOffer";

type Db = FirebaseFirestore.Firestore;

export interface FoundingGrantDeps {
  db: Db;
  now: () => number;
}

export interface FoundingGrantInput {
  organizerId: string;
  /** When the organizer gained its owner. */
  ownedAtMillis: number;
  source: FoundingHostPlaceDocument["source"];
}

export type FoundingGrantResult = FoundingPlaceDecision & {
  marketId: string | null;
};

/**
 * Takes the next founding place in the organizer's city, if one is left,
 * and writes the founding trial into its commercial terms override, in one
 * transaction. The offer's counter is read and incremented in that
 * transaction, so two organizers never take the same place and the cap is
 * never exceeded; the place record, keyed by organizer, makes a retry a
 * no-op. The public counter is rewritten in the same commit.
 *
 * The trial goes through the existing per-organizer override
 * (`commercialTerms/org_<sha256(organizerId)>`, `trial.days`), as a new
 * revision with an immutable revision record, so bills, billing status and
 * new payment snapshots read it like any staff override. An override that
 * already gives at least the founding days is left alone.
 * @param {FoundingGrantDeps} deps Firestore and clock.
 * @param {FoundingGrantInput} input Organizer and when it gained its owner.
 * @return {Promise<FoundingGrantResult>} The place taken, or why not.
 */
export async function takeFoundingHostPlace(deps: FoundingGrantDeps,
  input: FoundingGrantInput): Promise<FoundingGrantResult> {
  const {db} = deps;
  const {organizerId} = input;
  const organizerRef = db.collection("organizers").doc(organizerId);
  const placeRef = db.collection(foundingHostPlacesCollection).doc(organizerId);
  const factsRef = db.collection(growthFactsCollection).doc(organizerId);
  const termsId = organizerCommercialTermsId(organizerId);
  const termsRef = db.collection(commercialTermsCollection).doc(termsId);

  return db.runTransaction(async (tx) => {
    const [organizerSnap, placeSnap, factsSnap] = await Promise.all([
      tx.get(organizerRef), tx.get(placeRef), tx.get(factsRef)]);
    const organizer = organizerSnap.data();
    const marketValue = organizer ? organizerMarketValue(organizer) : null;
    const market = marketForIdOrAlias(marketValue);
    const marketId = market?.marketId ?? null;
    const offerRef = marketId === null ? null :
      db.collection(foundingHostOffersCollection).doc(marketId);
    const offerSnap = offerRef ? await tx.get(offerRef) : null;
    let offer: FoundingHostOffer | null = null;
    if (offerSnap?.exists) {
      const data = offerSnap.data();
      if (!validateFoundingHostOfferDocument(data) ||
          data.marketId !== marketId) {
        throw new Error(`Invalid founding host offer ${offerSnap.ref.path}.`);
      }
      offer = data;
    }
    const milestones = factsSnap.data()?.milestones as
      Record<string, unknown> | undefined;
    const decision = decideFoundingPlace({
      placeExists: placeSnap.exists,
      owned: organizerHasOwner(organizer),
      // Demo Ops worlds create owned organizers marked synthetic.
      synthetic: organizer?.synthetic === true,
      marketKnown: market !== null,
      offer,
      ownedAtMillis: input.ownedAtMillis,
      trialStarted: Boolean(milestones?.firstEventAt ||
        milestones?.firstPaidBookingAt),
    });
    if (decision.kind === "skip" || !offer || !market || !offerRef) {
      return {...decision, marketId};
    }

    // Every read happens before the first write.
    const stored = await readCommercialTerms({db, tx, organizerId});
    const nowMillis = deps.now();
    const trialDays = offer.trialDays;
    const effective = effectiveCommercialTerms(stored);
    const override = (stored.organizer?.terms ?? {}) as
      CommercialTermsOverride;
    const effectiveDays = effective?.trial.days ?? override.trial?.days ?? null;
    let termsChange: FoundingHostPlaceDocument["commercialTerms"] = null;
    if (effectiveDays === null || effectiveDays < trialDays) {
      const terms: CommercialTermsOverride = {...override,
        trial: {...(override.trial ?? {}), days: trialDays}};
      if (stored.platform && !mergeCommercialTerms(
        stored.platform.terms as CommercialTerms, terms)) {
        throw new Error(`Founding trial does not merge for ${organizerId}.`);
      }
      const revision = (stored.organizer?.revision ?? 0) + 1;
      const reason = `Founding host offer: place ${decision.placeNumber} ` +
        `of ${offer.cap} in ${market.cityLabel}, ${trialDays} free days.`;
      const next: CommercialTermsDocument = {
        schemaVersion: 1, scope: "organizer", organizerId, revision, terms,
        reason, updatedByUid: foundingHostTermsActor,
        updatedAtMillis: nowMillis,
        lastMutationHash: createHash("sha256").update(JSON.stringify([
          "foundingHostPlace", organizerId, offer.marketId,
          decision.placeNumber])).digest("hex"),
      };
      if (!validateCommercialTermsDocument(next)) {
        throw new Error(`Invalid founding trial terms for ${organizerId}.`);
      }
      const history: CommercialTermsRevisionDocument = {
        schemaVersion: 1, termsId, scope: "organizer", organizerId, revision,
        terms, reason, actorUid: foundingHostTermsActor,
        createdAtMillis: nowMillis,
      };
      tx.set(termsRef, next);
      tx.create(db.collection(commercialTermsRevisionsCollection)
        .doc(commercialTermsRevisionId(termsId, revision)), history);
      termsChange = {termsId, revision,
        previousTrialDays: override.trial?.days ?? null};
    }

    const place: FoundingHostPlaceDocument = {
      schemaVersion: 1, organizerId, marketId: offer.marketId,
      placeNumber: decision.placeNumber, cap: offer.cap, trialDays,
      ownedAtMillis: input.ownedAtMillis, grantedAtMillis: nowMillis,
      source: input.source, commercialTerms: termsChange,
    };
    const counted: FoundingHostOffer = {...offer,
      takenCount: decision.placeNumber, lastPlaceAtMillis: nowMillis};
    const projection = publicFoundingOffer(counted, market.slug, nowMillis);
    if (!validateFoundingHostPlaceDocument(place) ||
        !validateFoundingHostOfferDocument(counted) ||
        !validatePublicFoundingHostOfferDocument(projection)) {
      throw new Error(`Invalid founding place for ${organizerId}.`);
    }
    tx.create(placeRef, place);
    tx.update(offerRef, {takenCount: counted.takenCount,
      lastPlaceAtMillis: counted.lastPlaceAtMillis});
    tx.set(db.collection(publicFoundingHostOffersCollection)
      .doc(offer.marketId), projection);
    return {...decision, marketId};
  });
}

/**
 * Takes a place and logs the outcome. Skips are expected (most cities have
 * no offer, most writes are not a new owner), so only grants log at info.
 * @param {FoundingGrantDeps} deps Firestore and clock.
 * @param {FoundingGrantInput} input Organizer and when it gained its owner.
 * @return {Promise<FoundingGrantResult>} The place taken, or why not.
 */
export async function takeFoundingHostPlaceLogged(deps: FoundingGrantDeps,
  input: FoundingGrantInput): Promise<FoundingGrantResult> {
  const result = await takeFoundingHostPlace(deps, input);
  if (result.kind === "grant") {
    logger.info("Founding host place taken", {organizerId: input.organizerId,
      marketId: result.marketId, placeNumber: result.placeNumber,
      source: input.source});
  } else if (result.reason === "soldOut" || result.reason === "closed" ||
      result.reason === "trialStarted") {
    logger.info("Founding host place not taken", {
      organizerId: input.organizerId, marketId: result.marketId,
      reason: result.reason, source: input.source});
  }
  return result;
}
