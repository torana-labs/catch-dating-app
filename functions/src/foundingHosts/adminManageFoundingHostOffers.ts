import * as admin from "firebase-admin";
import {onCall, HttpsError, type CallableRequest} from
  "firebase-functions/v2/https";
import {requireAdminRole} from "../admin/adminAuth";
import {setAdminAuditLogInTransaction} from "../admin/adminAudit";
import {marketForIdOrAlias} from "../locations/marketConfig";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import type {AdminManageFoundingHostOffersCallablePayload as Payload} from
  "../shared/generated/adminManageFoundingHostOffersCallablePayload";
import type {AdminManageFoundingHostOffersCallableResponse as Result} from
  "../shared/generated/adminManageFoundingHostOffersCallableResponse";
import {validateAdminManageFoundingHostOffersCallablePayload} from
  "../shared/generated/validators/adminManageFoundingHostOffersInput";
import {validateAdminManageFoundingHostOffersCallableResponse} from
  "../shared/generated/validators/adminManageFoundingHostOffersOutput";
import {validateFoundingHostOfferDocument} from
  "../shared/generated/validators/foundingHostOfferDocument";
import {validatePublicFoundingHostOfferDocument} from
  "../shared/generated/validators/publicFoundingHostOfferDocument";
import {
  foundingHostDefaultCap,
  foundingHostOffersCollection,
  foundingHostTrialDays,
  foundingOfferStatus,
  placesLeft,
  publicFoundingHostOffersCollection,
  publicFoundingOffer,
  type FoundingHostOffer,
} from "./foundingHostOffer";

type Db = FirebaseFirestore.Firestore;

interface Dependencies {
  db: () => Db;
  rateLimit: typeof checkRateLimit;
  now: () => number;
}
const defaults: Dependencies = {db: () => admin.firestore(),
  rateLimit: checkRateLimit, now: Date.now};

function invalid(message: string): never {
  throw new HttpsError("invalid-argument", message);
}

function storedOffer(snap: FirebaseFirestore.DocumentSnapshot):
  FoundingHostOffer | null {
  if (!snap.exists) return null;
  const data = snap.data();
  if (!validateFoundingHostOfferDocument(data) || data.marketId !== snap.id) {
    throw new HttpsError("failed-precondition",
      "This city's founding offer is not valid. Ask engineering to repair it.");
  }
  return data;
}

/**
 * The Admin Owner reads every city's founding-host offer, or opens one city
 * and sets its cap and optional deadline against the revision they reviewed.
 * The cap never falls below the places already taken, and a change never
 * touches a place already taken or its trial. The public counter is
 * rewritten in the same transaction.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {Dependencies} deps Injectable dependencies.
 * @return {Promise<Result>} Offers in force.
 */
export async function adminManageFoundingHostOffersHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults):
  Promise<Result> {
  const actor = requireAdminRole(request, ["adminOwner"]);
  const data = validateCallableWithAjv<Payload>(request,
    validateAdminManageFoundingHostOffersCallablePayload);
  if (data.action === "read" ?
    data.expectedRevision !== null || data.cap !== null ||
      data.endsAtMillis !== null || data.reason !== null :
    data.marketId === null || data.expectedRevision === null ||
      data.cap === null || data.reason === null ||
      data.reason.trim().length < 3) {
    invalid("Invalid founding offer action.");
  }
  const market = data.marketId === null ? null :
    marketForIdOrAlias(data.marketId);
  if (data.marketId !== null && market?.marketId !== data.marketId) {
    invalid("Name the city by its market id.");
  }
  const db = deps.db();
  await deps.rateLimit(db, actor.uid, "adminManageFoundingHostOffers", {
    maxRequests: 20, windowMs: 60 * 1000});
  const collection = db.collection(foundingHostOffersCollection);

  if (data.action === "read") {
    const snaps = data.marketId !== null ?
      [await collection.doc(data.marketId).get()] :
      (await collection.limit(200).get()).docs;
    const offers = snaps.map(storedOffer)
      .filter((offer): offer is FoundingHostOffer => offer !== null)
      .sort((a, b) => a.marketId < b.marketId ? -1 : 1);
    return project(offers, deps.now());
  }

  const ref = collection.doc(data.marketId!);
  return db.runTransaction(async (tx) => {
    const before = storedOffer(await tx.get(ref));
    if ((before?.revision ?? 0) !== data.expectedRevision) {
      throw new HttpsError("aborted",
        "This city's founding offer changed. Review it again.");
    }
    const takenCount = before?.takenCount ?? 0;
    if (data.cap! < takenCount) {
      throw new HttpsError("failed-precondition",
        `${takenCount} founding places are already taken in this city; ` +
        "the cap cannot be lower.");
    }
    const nowMillis = deps.now();
    const next: FoundingHostOffer = {
      schemaVersion: 1, marketId: data.marketId!,
      revision: (before?.revision ?? 0) + 1, cap: data.cap!,
      endsAtMillis: data.endsAtMillis,
      trialDays: before?.trialDays ?? foundingHostTrialDays, takenCount,
      openedAtMillis: before?.openedAtMillis ?? nowMillis,
      lastPlaceAtMillis: before?.lastPlaceAtMillis ?? null,
      reason: data.reason!.trim(), updatedByUid: actor.uid,
      updatedAtMillis: nowMillis,
    };
    const projection = publicFoundingOffer(next, market!.slug, nowMillis);
    if (!validateFoundingHostOfferDocument(next) ||
        !validatePublicFoundingHostOfferDocument(projection)) {
      invalid("This founding offer is not valid.");
    }
    tx.set(ref, next);
    tx.set(db.collection(publicFoundingHostOffersCollection)
      .doc(next.marketId), projection);
    setAdminAuditLogInTransaction(tx, db, actor, {
      action: "adminManageFoundingHostOffers", targetPath: ref.path, request,
      before: {revision: before?.revision ?? 0, cap: before?.cap ?? null,
        endsAtMillis: before?.endsAtMillis ?? null, takenCount},
      after: {revision: next.revision, cap: next.cap,
        endsAtMillis: next.endsAtMillis, takenCount},
      note: next.reason,
      serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
    });
    return project([next], nowMillis);
  });
}

function project(offers: FoundingHostOffer[], nowMillis: number): Result {
  const result: Result = {
    defaultCap: foundingHostDefaultCap, trialDays: foundingHostTrialDays,
    offers: offers.map((offer) => ({
      marketId: offer.marketId,
      citySlug: marketForIdOrAlias(offer.marketId)?.slug ?? offer.marketId,
      revision: offer.revision,
      status: foundingOfferStatus(offer, nowMillis),
      cap: offer.cap, takenCount: offer.takenCount,
      placesLeft: placesLeft(offer), trialDays: offer.trialDays,
      endsAtMillis: offer.endsAtMillis, openedAtMillis: offer.openedAtMillis,
      lastPlaceAtMillis: offer.lastPlaceAtMillis, reason: offer.reason,
      updatedByUid: offer.updatedByUid, updatedAtMillis: offer.updatedAtMillis,
    })),
  };
  if (!validateAdminManageFoundingHostOffersCallableResponse(result)) {
    throw new HttpsError("internal", "Invalid founding offers.");
  }
  return result;
}

export const adminManageFoundingHostOffers = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 30, maxInstances: 10}),
  (request) => adminManageFoundingHostOffersHandler(request));
