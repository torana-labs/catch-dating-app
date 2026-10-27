import {createHash} from "node:crypto";
import * as admin from "firebase-admin";
import {FieldPath, Timestamp} from "firebase-admin/firestore";
import {onCall, HttpsError, type CallableRequest} from
  "firebase-functions/v2/https";
import {requireAuth} from "../../shared/auth";
import {checkRateLimit} from "../../shared/rateLimit";
import {requireOrganizerManager} from "../../shared/organizerManagerAuthority";
import {requireDoc, validateCallableWithAjv} from "../../shared/validation";
import {appCheckCallableOptionsWithLimits} from "../../shared/callableOptions";
import {formPaymentId} from "./formPaymentIdentity";
import type {ListOrganizerFormPaymentsCallablePayload as Payload} from
  "../../shared/generated/listOrganizerFormPaymentsCallablePayload";
import type {ListOrganizerFormPaymentsCallableResponse as Result} from
  "../../shared/generated/listOrganizerFormPaymentsCallableResponse";
import {validateListOrganizerFormPaymentsCallablePayload} from
  "../../shared/generated/validators/listOrganizerFormPaymentsInput";
import type {OrganizerFormPaymentDocument as Payment,
  OrganizerFormDocument as Form, OrganizerFormResponseDocument as Response} from
  "../../shared/generated/firestoreAdminTypes";

interface LedgerDeps {
  db: () => FirebaseFirestore.Firestore;
  rateLimit: typeof checkRateLimit;
  requireManager: typeof requireOrganizerManager;
}
const defaults: LedgerDeps = {db: () => admin.firestore(),
  rateLimit: checkRateLimit, requireManager: requireOrganizerManager};
interface Cursor {version: 1; scope: string; millis: number; id: string}

/** Financial records include unfinished checkouts, without exposing answers. */
export async function listOrganizerFormPaymentsHandler(
  request: CallableRequest<unknown>, deps: LedgerDeps = defaults):
  Promise<Result> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<Payload>(request,
    validateListOrganizerFormPaymentsCallablePayload);
  const db = deps.db();
  await deps.rateLimit(db, uid, "listOrganizerFormPayments", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  await deps.requireManager({db, organizerId: data.organizerId, actorUid: uid});
  const formSnap = await db.collection("organizerForms").doc(data.formId).get();
  if (!formSnap.exists || requireDoc<Form>(formSnap,
    "OrganizerFormDocument").organizerId !== data.organizerId) {
    throw new HttpsError("not-found", "Form not found.");
  }
  const scope = createHash("sha256").update(JSON.stringify([
    data.organizerId, data.formId, [...data.statuses].sort(),
  ])).digest("hex");
  const cursor = decodeCursor(data.cursor, scope);
  let query: FirebaseFirestore.Query = db.collection("organizerFormPayments")
    .where("organizerId", "==", data.organizerId)
    .where("formId", "==", data.formId)
    .orderBy("createdAt", "desc")
    .orderBy(FieldPath.documentId(), "desc")
    .limit(data.limit + 1);
  if (data.statuses.length) query = query.where("status", "in", data.statuses);
  if (cursor) {
    query = query.startAfter(Timestamp.fromMillis(cursor.millis),
      cursor.id);
  }
  const page = await query.get();
  const items = page.docs.slice(0, data.limit).map((snap) => {
    const payment = requireDoc<Payment>(snap, "OrganizerFormPaymentDocument");
    if (payment.organizerId !== data.organizerId ||
        payment.formId !== data.formId) {
      throw new HttpsError("internal", "Payment records could not be loaded.");
    }
    return projectLedgerRow(snap.id, payment);
  });
  const last = items.at(-1);
  return {items, nextCursor: page.docs.length > data.limit && last ?
    Buffer.from(JSON.stringify({version: 1, scope, millis: last.createdAtMillis,
      id: last.paymentId} satisfies Cursor)).toString("base64url") : null};
}

export function projectLedgerRow(paymentId: string, payment: Payment):
  Result["items"][number] {
  return {paymentId, status: payment.status, mode: payment.mode,
    amountPaise: payment.amountPaise, currency: payment.currency,
    refundedAmountPaise: payment.refundedAmountPaise,
    createdAtMillis: payment.createdAt.toMillis(),
    updatedAtMillis: payment.updatedAt.toMillis(),
    capturedAtMillis: payment.capturedAt?.toMillis() ?? null,
    submittedAtMillis: payment.submittedAt?.toMillis() ?? null,
    responseId: payment.responseId, providerOrderId: payment.providerOrderId,
    providerPaymentId: payment.providerPaymentId,
    providerRefundId: payment.providerRefundId, receipt: payment.receipt};
}

/** Called only after manager and response ownership checks. One point read,
 * never a search across another organizer's payments or unsubmitted drafts. */
export async function readResponsePayment(db: FirebaseFirestore.Firestore,
  responseId: string, response: Response):
  Promise<Result["items"][number] | null> {
  const id = formPaymentId(response.draftId);
  const snap = await db.collection("organizerFormPayments").doc(id).get();
  if (!snap.exists) return null;
  const payment = requireDoc<Payment>(snap, "OrganizerFormPaymentDocument");
  if (payment.organizerId !== response.organizerId ||
      payment.formId !== response.formId ||
      payment.versionId !== response.versionId ||
      payment.draftId !== response.draftId ||
      payment.respondentUid !== response.respondentUid ||
      payment.responseId !== responseId) {
    throw new HttpsError("internal", "Response payment could not be loaded.");
  }
  return projectLedgerRow(id, payment);
}

function decodeCursor(value: string | null, scope: string): Cursor | null {
  if (!value) return null;
  try {
    const parsed: Cursor = JSON.parse(
      Buffer.from(value, "base64url").toString());
    if (parsed.version !== 1 || parsed.scope !== scope ||
        !Number.isSafeInteger(parsed.millis) || parsed.millis < 0 ||
        parsed.millis > 253402300799999 ||
        typeof parsed.id !== "string" ||
        !/^fp_[a-f0-9]{32}$/u.test(parsed.id)) {
      throw new Error("Invalid cursor");
    }
    return parsed;
  } catch {
    throw new HttpsError("invalid-argument", "Payment cursor is invalid.");
  }
}

export const listOrganizerFormPayments = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 30, maxInstances: 20}),
  (request) => listOrganizerFormPaymentsHandler(request));
