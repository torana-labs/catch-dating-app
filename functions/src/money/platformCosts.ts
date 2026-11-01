import * as admin from "firebase-admin";
import {onCall, HttpsError, type CallableRequest} from
  "firebase-functions/v2/https";
import {requireAdminRole} from "../admin/adminAuth";
import {setAdminAuditLogInTransaction} from "../admin/adminAudit";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import type {PlatformCostDocument} from
  "../shared/generated/firestoreAdminTypes";
import type {AdminManagePlatformCostsCallablePayload as Payload} from
  "../shared/generated/adminManagePlatformCostsCallablePayload";
import type {AdminManagePlatformCostsCallableResponse as Result} from
  "../shared/generated/adminManagePlatformCostsCallableResponse";
import {validateAdminManagePlatformCostsCallablePayload} from
  "../shared/generated/validators/adminManagePlatformCostsInput";
import {validateAdminManagePlatformCostsCallableResponse} from
  "../shared/generated/validators/adminManagePlatformCostsOutput";
import {validatePlatformCostDocument} from
  "../shared/generated/validators/platformCostDocument";
import {monthWindow} from "./billComputation";
import {moneyRoles} from "./moneySettings";

export const platformCostsCollection = "platformCosts";
type Db = FirebaseFirestore.Firestore;

// Collections whose rows are one WhatsApp message each, by createdAt millis.
const whatsappDispatchCollections = ["eventAssistanceWhatsappDispatches",
  "automationWhatsappDispatches", "campaignWhatsappDispatches",
  "programWhatsappDispatches"];

/**
 * WhatsApp in one month: messages dispatched, and the cost reserved for the
 * dispatches that carry one (an upper bound, not Meta's invoice).
 * @param {Db} db Firestore.
 * @param {string} month YYYY-MM.
 * @return {Promise<object>} Estimate in minor units and message count.
 */
export async function whatsappMonth(db: Db, month: string):
  Promise<{estimateMinor: number; messageCount: number}> {
  const {startMillis, endMillis} = monthWindow(month);
  const inMonth = (name: string) => db.collection(name)
    .where("createdAt", ">=", startMillis).where("createdAt", "<", endMillis);
  const counts = await Promise.all(whatsappDispatchCollections.map(
    async (name) => (await inMonth(name).count().get()).data().count));
  let micros = 0;
  const reserved = await inMonth("eventAssistanceWhatsappDispatches")
    .select("maxCostMicros", "currency").limit(20_000).get();
  for (const doc of reserved.docs) {
    if (doc.get("currency") === "INR") {
      micros += Number(doc.get("maxCostMicros")) || 0;
    }
  }
  return {estimateMinor: Math.round(micros / 10_000),
    messageCount: counts.reduce((sum, count) => sum + count, 0)};
}

/**
 * A month's costs with the WhatsApp estimate standing in until an invoice
 * total is entered.
 * @param {Db} db Firestore.
 * @param {string} month YYYY-MM.
 * @return {Promise<Result>} The month's costs.
 */
export async function listMonthCosts(db: Db, month: string): Promise<Result> {
  const [snap, whatsapp] = await Promise.all([
    db.collection(platformCostsCollection).where("month", "==", month)
      .limit(20).get(),
    whatsappMonth(db, month)]);
  const costs = snap.docs.map((doc) => doc.data() as PlatformCostDocument)
    .sort((a, b) => a.category.localeCompare(b.category));
  const usesEstimate = !costs.some((cost) => cost.category === "whatsapp");
  const totalMinor = costs.reduce((sum, cost) => sum + cost.amountMinor, 0) +
    (usesEstimate ? whatsapp.estimateMinor : 0);
  return {month, costs, whatsapp: {...whatsapp, usesEstimate}, totalMinor,
    adSpend: {metaConnected: costs.some((cost) => cost.source === "meta_api"),
      googleConnected: costs.some((cost) =>
        cost.source === "google_ads_api")}};
}

interface Dependencies {
  db: () => Db;
  rateLimit: typeof checkRateLimit;
  now: () => number;
}
const defaults: Dependencies = {db: () => admin.firestore(),
  rateLimit: checkRateLimit, now: Date.now};

/**
 * The owner reads a month's costs, enters one by hand, or clears one.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {Dependencies} deps Injectable dependencies.
 * @return {Promise<Result>} The month after the action.
 */
export async function adminManagePlatformCostsHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults):
  Promise<Result> {
  const actor = requireAdminRole(request, moneyRoles);
  const data = validateCallableWithAjv<Payload>(request,
    validateAdminManagePlatformCostsCallablePayload);
  if (data.action === "list" ? data.category !== null ||
      data.amountMinor !== null : data.category === null ||
      (data.action === "set") !== (data.amountMinor !== null)) {
    throw new HttpsError("invalid-argument", "Invalid cost action.");
  }
  const db = deps.db();
  await deps.rateLimit(db, actor.uid, "adminManagePlatformCosts", {
    maxRequests: 60, windowMs: 60 * 1000});
  if (data.action !== "list") {
    const costId = `${data.month}_${data.category}`;
    const ref = db.collection(platformCostsCollection).doc(costId);
    await db.runTransaction(async (tx) => {
      const before = (await tx.get(ref)).data() as PlatformCostDocument |
        undefined;
      if (before && before.source !== "manual") {
        throw new HttpsError("failed-precondition",
          "This cost comes from the ad platform and cannot be edited here.");
      }
      if (data.action === "clear") {
        if (before) tx.delete(ref);
      } else {
        const cost: PlatformCostDocument = {schemaVersion: 1, costId,
          month: data.month, category: data.category!,
          amountMinor: data.amountMinor!, source: "manual",
          note: data.note?.trim() || null, updatedAtMillis: deps.now(),
          updatedByUid: actor.uid};
        if (!validatePlatformCostDocument(cost)) {
          throw new HttpsError("invalid-argument", "Invalid cost.");
        }
        tx.set(ref, cost);
      }
      setAdminAuditLogInTransaction(tx, db, actor, {
        action: `adminManagePlatformCosts.${data.action}`,
        targetPath: ref.path, request,
        before: {amountMinor: before?.amountMinor ?? null},
        after: {amountMinor: data.amountMinor}, note: data.note,
        serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
      });
    });
  }
  const result = await listMonthCosts(db, data.month);
  if (!validateAdminManagePlatformCostsCallableResponse(result)) {
    throw new HttpsError("internal", "Invalid costs.");
  }
  return result;
}

export const adminManagePlatformCosts = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60, maxInstances: 5}),
  (request) => adminManagePlatformCostsHandler(request));
