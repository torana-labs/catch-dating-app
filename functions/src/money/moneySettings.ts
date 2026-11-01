import * as admin from "firebase-admin";
import {onCall, HttpsError, type CallableRequest} from
  "firebase-functions/v2/https";
import {requireAdminRole} from "../admin/adminAuth";
import {setAdminAuditLogInTransaction} from "../admin/adminAudit";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import type {MoneySettingsDocument} from
  "../shared/generated/firestoreAdminTypes";
import type {AdminManageMoneySettingsCallablePayload as Payload} from
  "../shared/generated/adminManageMoneySettingsCallablePayload";
import type {AdminManageMoneySettingsCallableResponse as Result} from
  "../shared/generated/adminManageMoneySettingsCallableResponse";
import {validateAdminManageMoneySettingsCallablePayload} from
  "../shared/generated/validators/adminManageMoneySettingsInput";
import {validateAdminManageMoneySettingsCallableResponse} from
  "../shared/generated/validators/adminManageMoneySettingsOutput";
import {validateMoneySettingsDocument} from
  "../shared/generated/validators/moneySettingsDocument";
import {
  defaultMoneySettings,
  financialYearOf,
  invoiceNumber,
  type MoneySettings,
} from "./billComputation";

export const moneySettingsCollection = "moneySettings";
export const moneySettingsId = "platform";
export const invoiceCountersCollection = "moneyInvoiceCounters";
// Money is the owner's job; finance and analyticsViewer fold into it.
export const moneyRoles = ["admin", "adminOwner"] as const;

type Db = FirebaseFirestore.Firestore;
type Tx = FirebaseFirestore.Transaction;

/**
 * The stored money settings, or the decided defaults.
 * @param {Db} db Firestore.
 * @param {Tx} tx Optional transaction.
 * @return {Promise<object>} Settings with their stored document, if any.
 */
export async function readMoneySettings(db: Db, tx?: Tx):
  Promise<{settings: MoneySettings; stored: MoneySettingsDocument | null}> {
  const ref = db.collection(moneySettingsCollection).doc(moneySettingsId);
  const snap = tx ? await tx.get(ref) : await ref.get();
  if (!snap.exists) return {settings: defaultMoneySettings, stored: null};
  const data = snap.data();
  if (!validateMoneySettingsDocument(data)) {
    throw new HttpsError("failed-precondition",
      "Catch's money settings are not valid. Save them again.");
  }
  return {settings: data.settings, stored: data};
}

/**
 * The invoice number the next sent bill will take.
 * @param {Db} db Firestore.
 * @param {number} nowMillis Now.
 * @param {Tx} tx Optional transaction.
 * @return {Promise<object>} Financial year, next number and its label.
 */
export async function nextInvoice(db: Db, nowMillis: number, tx?: Tx):
  Promise<{financialYear: string; number: number; label: string;
    ref: FirebaseFirestore.DocumentReference}> {
  const financialYear = financialYearOf(nowMillis);
  const ref = db.collection(invoiceCountersCollection).doc(financialYear);
  const snap = tx ? await tx.get(ref) : await ref.get();
  const last = Number(snap.data()?.lastNumber ?? 0);
  const number = Number.isSafeInteger(last) && last >= 0 ? last + 1 : 1;
  return {financialYear, number, ref,
    label: invoiceNumber(financialYear, number)};
}

interface Dependencies {
  db: () => Db;
  rateLimit: typeof checkRateLimit;
  now: () => number;
}
const defaults: Dependencies = {db: () => admin.firestore(),
  rateLimit: checkRateLimit, now: Date.now};

/**
 * The owner reads or replaces the money settings against the revision they
 * reviewed. Turning on GST changes only bills made afterwards.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {Dependencies} deps Injectable dependencies.
 * @return {Promise<Result>} Settings in force.
 */
export async function adminManageMoneySettingsHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults):
  Promise<Result> {
  const actor = requireAdminRole(request, moneyRoles);
  const data = validateCallableWithAjv<Payload>(request,
    validateAdminManageMoneySettingsCallablePayload);
  if (data.action === "read" ?
    data.expectedRevision !== null || data.settings !== null :
    data.expectedRevision === null || data.settings === null) {
    throw new HttpsError("invalid-argument", "Invalid money settings action.");
  }
  const db = deps.db();
  await deps.rateLimit(db, actor.uid, "adminManageMoneySettings", {
    maxRequests: 30, windowMs: 60 * 1000});
  const ref = db.collection(moneySettingsCollection).doc(moneySettingsId);
  return db.runTransaction(async (tx) => {
    const {settings, stored} = await readMoneySettings(db, tx);
    const next = await nextInvoice(db, deps.now(), tx);
    if (data.action === "read") return project(stored, settings, next.label);
    if ((stored?.revision ?? 0) !== data.expectedRevision) {
      throw new HttpsError("aborted",
        "Money settings changed. Review them again.");
    }
    const record: MoneySettingsDocument = {schemaVersion: 1,
      settingsId: "platform", revision: (stored?.revision ?? 0) + 1,
      settings: data.settings!, updatedAtMillis: deps.now(),
      updatedByUid: actor.uid};
    if (!validateMoneySettingsDocument(record)) {
      throw new HttpsError("invalid-argument",
        "These money settings are not valid.");
    }
    tx.set(ref, record);
    setAdminAuditLogInTransaction(tx, db, actor, {
      action: "adminManageMoneySettings", targetPath: ref.path, request,
      before: {revision: stored?.revision ?? 0, settings},
      after: {revision: record.revision, settings: record.settings},
      note: null,
      serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
    });
    return project(record, record.settings, next.label);
  });
}

function project(stored: MoneySettingsDocument | null,
  settings: MoneySettings, nextInvoiceNumber: string): Result {
  const result: Result = {revision: stored?.revision ?? 0, settings,
    updatedAtMillis: stored?.updatedAtMillis ?? null,
    updatedByUid: stored?.updatedByUid ?? null, nextInvoiceNumber};
  if (!validateAdminManageMoneySettingsCallableResponse(result)) {
    throw new HttpsError("internal", "Invalid money settings.");
  }
  return result;
}

export const adminManageMoneySettings = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 30, maxInstances: 10}),
  (request) => adminManageMoneySettingsHandler(request));
