import {createHash} from "node:crypto";
import * as admin from "firebase-admin";
import {onCall, HttpsError, type CallableRequest} from
  "firebase-functions/v2/https";
import {Timestamp} from "firebase-admin/firestore";
import {requireAdminRole} from "../admin/adminAuth";
import {setAdminAuditLogInTransaction} from "../admin/adminAudit";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import type {ManagePaymentRoutingPolicyCallablePayload as Payload} from
  "../shared/generated/managePaymentRoutingPolicyCallablePayload";
import type {ManagePaymentRoutingPolicyCallableResponse as Result} from
  "../shared/generated/managePaymentRoutingPolicyCallableResponse";
import type {PaymentRoutingPolicyDocument as Policy} from
  "../shared/generated/firestoreAdminTypes";
import {validateManagePaymentRoutingPolicyCallablePayload} from
  "../shared/generated/validators/managePaymentRoutingPolicyInput";
import {organizerPaymentPolicyId, parsePaymentRoutingPolicy} from
  "./paymentRouting";

interface Dependencies {
  db: () => FirebaseFirestore.Firestore;
  rateLimit: typeof checkRateLimit;
  now: () => number;
}
const defaults: Dependencies = {db: () => admin.firestore(),
  rateLimit: checkRateLimit, now: Date.now};

/** Route selection does not establish account or payment eligibility. */
export async function managePaymentRoutingPolicyHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults):
  Promise<Result> {
  const actor = requireAdminRole(request, ["adminOwner", "finance"]);
  const data = validateCallableWithAjv<Payload>(request,
    validateManagePaymentRoutingPolicyCallablePayload);
  if (data.action === "read" ? data.expectedRevision !== null ||
      data.formFee !== null || data.eventAdmission !== null :
    data.expectedRevision === null) {
    throw new HttpsError("invalid-argument", "Invalid payment policy action.");
  }
  const db = deps.db();
  await deps.rateLimit(db, actor.uid, "managePaymentRoutingPolicy", {
    maxRequests: 20, windowMs: 60 * 1000,
  });
  const policyId = data.organizerId === null ? "app" :
    organizerPaymentPolicyId(data.organizerId);
  const ref = db.collection("paymentRoutingPolicies").doc(policyId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const before = snap.exists ? parsePaymentRoutingPolicy(snap.data()) : null;
    if (before && (before.organizerId !== data.organizerId ||
        before.scope !== (data.organizerId === null ? "app" : "organizer"))) {
      throw new HttpsError("failed-precondition",
        "Payment policy scope mismatch.");
    }
    if (data.action === "read") {
      return project(policyId, data.organizerId, before);
    }
    if (data.organizerId !== null && !(await tx.get(
      db.collection("organizers").doc(data.organizerId))).exists) {
      throw new HttpsError("not-found", "Organizer not found.");
    }
    const mutationHash = createHash("sha256").update(JSON.stringify([
      actor.uid, data.organizerId, data.expectedRevision,
      selectionKey(data.formFee), selectionKey(data.eventAdmission),
    ])).digest("hex");
    // Only the most recent exact command replays. An intervening change must
    // cause a fresh review, even when it eventually restores the same values.
    if (before?.lastMutationHash === mutationHash) {
      return project(policyId, data.organizerId, before);
    }
    if ((before?.revision ?? 0) !== data.expectedRevision) {
      throw new HttpsError("aborted",
        "Payment settings changed. Review them again.");
    }
    const next: Policy = {
      scope: data.organizerId === null ? "app" : "organizer",
      organizerId: data.organizerId, revision: (before?.revision ?? 0) + 1,
      formFee: data.formFee, eventAdmission: data.eventAdmission,
      updatedAt: Timestamp.fromMillis(deps.now()),
      lastMutationHash: mutationHash};
    parsePaymentRoutingPolicy(next);
    tx.set(ref, next);
    setAdminAuditLogInTransaction(tx, db, actor, {
      action: "managePaymentRoutingPolicy", targetPath: ref.path,
      before: {revision: before?.revision ?? 0,
        formFee: before?.formFee ?? null,
        eventAdmission: before?.eventAdmission ?? null},
      after: {revision: next.revision, formFee: next.formFee,
        eventAdmission: next.eventAdmission},
      serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
    });
    return project(policyId, data.organizerId, next);
  });
}

function project(policyId: string, organizerId: string | null,
  policy: Policy | null): Result {
  return {policyId, organizerId, revision: policy?.revision ?? 0,
    formFee: policy?.formFee ?? null,
    eventAdmission: policy?.eventAdmission ?? null,
    updatedAtMillis: policy?.updatedAt.toMillis() ?? null};
}

function selectionKey(value: Payload["formFee"]): unknown {
  if (!value || value.route === "disabled") return value?.route ?? null;
  return [value.route, value.mode, value.currency, value.merchantCountry];
}

export const managePaymentRoutingPolicy = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 30, maxInstances: 10}),
  (request) => managePaymentRoutingPolicyHandler(request));
