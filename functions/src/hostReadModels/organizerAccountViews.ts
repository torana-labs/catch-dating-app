import {isDeepStrictEqual} from "node:util";
import {FieldPath} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import type {
  HostOrganizerBillingViewDocument,
  HostOrganizerEntitlementViewDocument,
  OrganizerBillingPlanDocument,
  OrganizerGrowthFactsDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {OrganizerEntitlementsDocument} from
  "../shared/generated/organizerEntitlementsDocument";
import {validateOrganizerEntitlementsDocument} from
  "../shared/generated/validators/organizerEntitlementsDocument";
import {organizerEntitlementSkuCatalog} from
  "../shared/generated/catalogs/organizerEntitlementSkuCatalog";
import {effectiveCommercialTerms, readCommercialTerms} from
  "../commercialTerms/resolver";
import {growthFactsCollection} from "../growth/organizerGrowthFacts";
import {trialAnchorsFromFacts, trialWindow} from "../money/hostTrial";
import {organizerBillingPlansCollection, planStatusView} from
  "../money/organizerBillingPlan";
import {grantRemaining} from "../entitlements/entitlementPolicy";

export const hostOrganizerBillingViewsCollection = "hostOrganizerBillingViews";
export const hostOrganizerEntitlementViewsCollection =
  "hostOrganizerEntitlementViews";

type Db = FirebaseFirestore.Firestore;
type Tx = FirebaseFirestore.Transaction;
type Trial = HostOrganizerBillingViewDocument["trial"];

/**
 * The trial's facts without the clock: its length from the effective terms
 * (null while Catch's terms are unset or unreadable), and the anchor, start
 * and end from the growth facts, as computeTrialStatus derives them. The
 * phone and the website work out the state and days left from these and
 * their own clock.
 * @param {Db} db Firestore.
 * @param {Tx} tx The transaction to read in.
 * @param {string} organizerId The organizer.
 * @return {Promise<Trial>} The trial facts.
 */
async function readTrial(db: Db, tx: Tx, organizerId: string):
  Promise<Trial> {
  let days: number | null = null;
  try {
    const terms = effectiveCommercialTerms(
      await readCommercialTerms({db, tx, organizerId}));
    days = terms ? terms.trial.days : null;
  } catch {
    days = null;
  }
  const facts = await tx.get(db.collection(growthFactsCollection)
    .doc(organizerId));
  const window = days === null ? null : trialWindow(trialAnchorsFromFacts(
    facts.data() as OrganizerGrowthFactsDocument | undefined), days);
  return {days, anchor: window?.anchor ?? null,
    startsAtMillis: window?.startsAtMillis ?? null,
    endsAtMillis: window?.endsAtMillis ?? null};
}

/**
 * One organizer's billing view, read only: what getOrganizerBillingStatus
 * returned its owner, with the trial's facts instead of its clock-dependent
 * state and days left. No prices, payment links or provider ids: those stay
 * on manageOrganizerBillingPlan and the plan document.
 * @param {Db} db Firestore.
 * @param {Tx} tx The transaction to read in.
 * @param {string} organizerId The organizer.
 * @return {Promise<HostOrganizerBillingViewDocument|null>} The view, or null
 *   when the organizer is gone.
 */
export async function readOrganizerBillingView(db: Db, tx: Tx,
  organizerId: string): Promise<HostOrganizerBillingViewDocument | null> {
  const organizer = await tx.get(db.collection("organizers").doc(organizerId));
  if (!organizer.exists) return null;
  const trial = await readTrial(db, tx, organizerId);
  const plan = await tx.get(db.collection(organizerBillingPlansCollection)
    .doc(organizerId));
  return {organizerId, trial,
    plan: planStatusView(plan.data() as OrganizerBillingPlanDocument |
      undefined), version: 1};
}

/**
 * One organizer's entitlement view, read only: the grants, meters and
 * catalog version getOrganizerEntitlement returned its managers, with each
 * grant's validity window and revocation instead of the clock-dependent
 * active flag. Admin internals (granted by, receipt reference, note) and the
 * static SKU catalog never reach it. Null when the organizer holds no
 * entitlements document, which reads as no grants.
 * @param {Db} db Firestore.
 * @param {Tx} tx The transaction to read in.
 * @param {string} organizerId The organizer.
 * @return {Promise<HostOrganizerEntitlementViewDocument|null>} The view.
 */
export async function readOrganizerEntitlementView(db: Db, tx: Tx,
  organizerId: string): Promise<HostOrganizerEntitlementViewDocument | null> {
  const snap = await tx.get(db.collection("organizerEntitlements")
    .doc(organizerId));
  if (!snap.exists) return null;
  const data = snap.data();
  if (!validateOrganizerEntitlementsDocument(data)) {
    throw new Error("The stored organizer entitlements document is invalid.");
  }
  const doc = data as OrganizerEntitlementsDocument;
  return {
    organizerId,
    catalogVersion: organizerEntitlementSkuCatalog.catalogVersion,
    revision: doc.revision,
    grants: doc.grants.map((grant) => {
      const like = {grantId: grant.grantId, sku: grant.sku, unit: grant.unit,
        quantityTotal: grant.quantityTotal,
        quantityConsumed: grant.quantityConsumed,
        validFromMillis: millis(grant.validFrom),
        validUntilMillis: grant.validUntil === null ? null :
          millis(grant.validUntil),
        grantedAtMillis: millis(grant.grantedAt),
        revokedAtMillis: grant.revokedAt === null ? null :
          millis(grant.revokedAt)};
      return {grantId: grant.grantId, sku: grant.sku,
        skuLabel: organizerEntitlementSkuCatalog.skus[grant.sku]?.label ??
          grant.sku,
        unit: grant.unit, quantityTotal: grant.quantityTotal,
        quantityConsumed: grant.quantityConsumed,
        quantityRemaining: grantRemaining(like),
        validFromMillis: like.validFromMillis,
        validUntilMillis: like.validUntilMillis, source: grant.source,
        revokedAtMillis: like.revokedAtMillis};
    }),
    meters: {flightDaysUsed: doc.meters.flightDaysUsed,
      waConversationsUsed: doc.meters.waConversationsUsed},
    version: 1,
  };
}

function millis(value: {_seconds: number; _nanoseconds: number} |
  {toMillis(): number}): number {
  if ("toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis();
  }
  const stamp = value as {_seconds: number; _nanoseconds: number};
  return stamp._seconds * 1000 + Math.floor(stamp._nanoseconds / 1_000_000);
}

/**
 * Rewrites one view from current sources inside a transaction, writing only
 * on change and deleting it when its source is gone. A source that fails its
 * contract is logged and keeps the previous view, so a retry cannot loop.
 * @param {Db} db Firestore.
 * @param {string} collection The view collection.
 * @param {string} organizerId The organizer, the view's id.
 * @param {Function} build Reads the next view, or null for none.
 * @return {Promise<void>} Resolves once the view matches its sources.
 */
export async function reconcileOrganizerView<T>(db: Db, collection: string,
  organizerId: string, build: (tx: Tx) => Promise<T | null>):
  Promise<void> {
  await db.runTransaction(async (tx) => {
    const ref = db.collection(collection).doc(organizerId);
    const old = await tx.get(ref);
    let next: T | null;
    try {
      next = await build(tx);
    } catch (error) {
      logger.warn("Organizer account view kept a source that fails its " +
        "contract.", {collection, organizerId,
        reason: error instanceof Error ? error.message : String(error)});
      return;
    }
    if (isDeepStrictEqual(old.data() ?? null, next)) return;
    if (next) tx.set(ref, next);
    else if (old.exists) tx.delete(ref);
  });
}

/** Rewrites one organizer's billing view, writing only on change. */
export function reconcileOrganizerBillingView(db: Db, organizerId: string):
  Promise<void> {
  return reconcileOrganizerView(db, hostOrganizerBillingViewsCollection,
    organizerId, (tx) => readOrganizerBillingView(db, tx, organizerId));
}

/** Rewrites one organizer's entitlement view, writing only on change. */
export function reconcileOrganizerEntitlementView(db: Db,
  organizerId: string): Promise<void> {
  return reconcileOrganizerView(db, hostOrganizerEntitlementViewsCollection,
    organizerId, (tx) => readOrganizerEntitlementView(db, tx, organizerId));
}

/** Organizers rewritten per page when Catch's platform terms change. */
export const billingFanoutPage = 200;

/**
 * Rewrites every organizer's billing view after Catch's platform terms
 * changed (the trial length), a page of organizers at a time in id order.
 * @param {Db} db Firestore.
 * @return {Promise<number>} How many organizers were evaluated.
 */
export async function reconcileAllOrganizerBillingViews(db: Db):
  Promise<number> {
  let after: string | null = null;
  let count = 0;
  for (;;) {
    let query = db.collection("organizers").orderBy(FieldPath.documentId())
      .select().limit(billingFanoutPage);
    if (after) query = query.startAfter(after);
    const page = await query.get();
    for (const doc of page.docs) {
      await reconcileOrganizerBillingView(db, doc.id);
    }
    count += page.size;
    if (page.size < billingFanoutPage) return count;
    after = page.docs[page.size - 1].id;
  }
}
