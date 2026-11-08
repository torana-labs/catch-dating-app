import * as admin from "firebase-admin";
import {onCall, HttpsError, type CallableRequest} from
  "firebase-functions/v2/https";
import {effectiveCommercialTerms, readCommercialTerms} from
  "../commercialTerms/resolver";
import {growthFactsCollection} from "../growth/organizerGrowthFacts";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {isOrganizerOwner} from "../shared/organizerHosts";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import type {
  OrganizerDocument,
  OrganizerGrowthFactsDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {GetOrganizerBillingStatusCallablePayload as Payload} from
  "../shared/generated/getOrganizerBillingStatusCallablePayload";
import type {GetOrganizerBillingStatusCallableResponse as Result} from
  "../shared/generated/getOrganizerBillingStatusCallableResponse";
import {validateGetOrganizerBillingStatusCallablePayload} from
  "../shared/generated/validators/getOrganizerBillingStatusInput";
import {validateGetOrganizerBillingStatusCallableResponse} from
  "../shared/generated/validators/getOrganizerBillingStatusOutput";
import {
  computeTrialStatus,
  trialAnchorsFromFacts,
  type TrialStatus,
} from "./hostTrial";

type Db = FirebaseFirestore.Firestore;

export interface BillingStatusDeps {
  db: () => Db;
  now: () => number;
  checkRateLimit: typeof checkRateLimit;
}

const defaultDeps: BillingStatusDeps = {
  db: () => admin.firestore(),
  now: Date.now,
  checkRateLimit,
};

/**
 * One organizer's trial from its effective terms and growth facts. Terms that
 * cannot be read report the trial as unconfigured instead of failing.
 * @param {Db} db Firestore.
 * @param {string} organizerId Organizer.
 * @param {number} nowMillis Now.
 * @return {Promise<TrialStatus>} Trial status.
 */
export async function readOrganizerTrialStatus(db: Db, organizerId: string,
  nowMillis: number): Promise<TrialStatus> {
  const [stored, factsSnap] = await Promise.all([
    readCommercialTerms({db, organizerId}).catch(() => null),
    db.collection(growthFactsCollection).doc(organizerId).get()]);
  let terms = null;
  try {
    terms = stored ? effectiveCommercialTerms(stored) : null;
  } catch {
    terms = null;
  }
  return computeTrialStatus({
    anchors: trialAnchorsFromFacts(factsSnap.data() as
      OrganizerGrowthFactsDocument | undefined),
    terms, nowMillis});
}

/**
 * The organizer's owner reads where it stands with Catch's billing.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {BillingStatusDeps} deps Dependencies.
 * @return {Promise<Result>} Status, with no prices.
 */
export async function getOrganizerBillingStatusHandler(
  request: CallableRequest<unknown>, deps: BillingStatusDeps = defaultDeps):
  Promise<Result> {
  const uid = requireAuth(request);
  const {organizerId} = validateCallableWithAjv<Payload>(request,
    validateGetOrganizerBillingStatusCallablePayload);
  const db = deps.db();
  await deps.checkRateLimit(db, uid, "getOrganizerBillingStatus",
    {maxRequests: 60, windowMs: 60 * 1000});
  const organizer = (await db.collection("organizers").doc(organizerId).get())
    .data() as OrganizerDocument | undefined;
  if (!organizer || !isOrganizerOwner(organizer, uid)) {
    throw new HttpsError("permission-denied",
      "Only the organizer's owner can see its billing.");
  }
  const result: Result = {organizerId,
    trial: await readOrganizerTrialStatus(db, organizerId, deps.now())};
  if (!validateGetOrganizerBillingStatusCallableResponse(result)) {
    throw new HttpsError("internal", "Invalid billing status.");
  }
  return result;
}

export const getOrganizerBillingStatus = onCall(appCheckCallableOptions,
  (request) => getOrganizerBillingStatusHandler(request));
