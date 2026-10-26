import * as admin from "firebase-admin";
import {onCall, HttpsError, type CallableRequest} from
  "firebase-functions/v2/https";
import type {PrepareOrganizerFormPaymentCallablePayload} from
  "../../shared/generated/prepareOrganizerFormPaymentCallablePayload";
import type {GetOrganizerFormPaymentCallablePayload} from
  "../../shared/generated/getOrganizerFormPaymentCallablePayload";
import type {FindOrganizerFormPaymentCallablePayload} from
  "../../shared/generated/findOrganizerFormPaymentCallablePayload";
import type {FindOrganizerFormPaymentCallableResponse} from
  "../../shared/generated/findOrganizerFormPaymentCallableResponse";
import {validateFindOrganizerFormPaymentCallablePayload} from
  "../../shared/generated/validators/findOrganizerFormPaymentInput";
import type {ManageOrganizerFormPaymentConnectionCallablePayload} from
  "../../shared/generated/manageOrganizerFormPaymentConnectionCallablePayload";
import type {ManageOrganizerFormPaymentConnectionCallableResponse} from
  "../../shared/generated/manageOrganizerFormPaymentConnectionCallableResponse";
import {validatePrepareOrganizerFormPaymentCallablePayload} from
  "../../shared/generated/validators/prepareOrganizerFormPaymentInput";
import {validateGetOrganizerFormPaymentCallablePayload} from
  "../../shared/generated/validators/getOrganizerFormPaymentInput";
import {validateManageOrganizerFormPaymentConnectionCallablePayload} from
  "../../shared/generated/validators/manageOrganizerFormPaymentConnectionInput";
import type {OrganizerFormResponseDraftDocument as Draft,
  OrganizerFormDocument as Form,
  OrganizerFormVersionDocument as Version,
  OrganizerFormPaymentDocument as Payment,
  OrganizerPaymentConnectionDocument as Connection} from
  "../../shared/generated/firestoreAdminTypes";
import {requireAuth} from "../../shared/auth";
import {checkRateLimit} from "../../shared/rateLimit";
import {requireOrganizerManager} from "../../shared/organizerManagerAuthority";
import {appCheckCallableOptionsWithLimits} from "../../shared/callableOptions";
import {requireDoc, validateCallableWithAjv} from "../../shared/validation";
import {reserveFormPayment} from "./formPaymentSubmission";
import {formPaymentRuntime, formPaymentsConfigured} from "./formPaymentRuntime";
import {projectFormPayment} from "./formPaymentProjection";
import {formPaymentId} from "./formPaymentIdentity";
import {prepareFormPaymentRouting, formPaymentExecutionFor,
  formPaymentCollectionSetup} from
  "./formPaymentRoutingRuntime";

interface HandlerDeps {
  db: () => FirebaseFirestore.Firestore;
  runtime: typeof formPaymentRuntime;
  collectionSetup: typeof formPaymentCollectionSetup;
  prepareRouting: typeof prepareFormPaymentRouting;
  executionFor: typeof formPaymentExecutionFor;
  configured: typeof formPaymentsConfigured;
  rateLimit: typeof checkRateLimit;
  requireManager: typeof requireOrganizerManager;
}
const defaults: HandlerDeps = {db: () => admin.firestore(),
  runtime: formPaymentRuntime, configured: formPaymentsConfigured,
  collectionSetup: formPaymentCollectionSetup,
  prepareRouting: prepareFormPaymentRouting,
  executionFor: formPaymentExecutionFor,
  rateLimit: checkRateLimit, requireManager: requireOrganizerManager};

export async function prepareOrganizerFormPaymentHandler(
  request: CallableRequest<unknown>, deps: HandlerDeps = defaults) {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<
    PrepareOrganizerFormPaymentCallablePayload>(request,
      validatePrepareOrganizerFormPaymentCallablePayload);
  const db = deps.db();
  await deps.rateLimit(db, uid, "prepareOrganizerFormPayment", {
    maxRequests: 10, windowMs: 60 * 1000,
  });
  const draft = requireDoc<Draft>(await db
    .collection("organizerFormResponseDrafts").doc(data.draftId).get(),
  "OrganizerFormResponseDraftDocument");
  if (draft.respondentUid !== uid) unavailable();
  const paymentId = formPaymentId(data.draftId);
  const existing = await db.collection("organizerFormPayments")
    .doc(paymentId).get();
  let current: Payment;
  if (existing.exists) {
    current = requireDoc<Payment>(existing, "OrganizerFormPaymentDocument");
    if (current.respondentUid !== uid || current.draftId !== data.draftId) {
      unavailable();
    }
  } else {
    const version = requireDoc<Version>(await db
      .collection("organizerFormVersions").doc(draft.versionId).get(),
    "OrganizerFormVersionDocument");
    const fee = version.definition.payment;
    if (!fee || version.organizerId !== draft.organizerId ||
        version.formId !== draft.formId) unavailable();
    const prepared = await deps.prepareRouting({db, paymentId,
      organizerId: draft.organizerId, connectionId: fee.connectionId,
      amountPaise: fee.amountPaise});
    const reserved = await reserveFormPayment({db, request, data,
      now: admin.firestore.Timestamp.now(), routing: prepared.snapshot,
      authority: prepared.runtime.authority});
    current = reserved.payment;
  }
  // A concurrent reservation may have won with a different policy. Resolve
  // the saved ledger, never the losing request's proposed provider binding.
  if (current.responseId ||
      ["expired", "refunded", "reviewRequired"].includes(current.status)) {
    return projectFormPayment({db, paymentId, payment: current,
      respondentUid: uid});
  }
  const runtime = await deps.executionFor({db, paymentId, payment: current});
  const payment = await runtime.processor.ensureOrder(paymentId);
  return projectFormPayment({db, paymentId, payment, respondentUid: uid});
}

export async function getOrganizerFormPaymentHandler(
  request: CallableRequest<unknown>, deps: HandlerDeps = defaults) {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<GetOrganizerFormPaymentCallablePayload>(
    request, validateGetOrganizerFormPaymentCallablePayload);
  const db = deps.db();
  await deps.rateLimit(db, uid, "getOrganizerFormPayment", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const current = requireDoc<Payment>(await db
    .collection("organizerFormPayments").doc(data.paymentId).get(),
  "OrganizerFormPaymentDocument");
  if (current.respondentUid !== uid) unavailable();
  // Receipts and ended/manual-review attempts remain readable during provider
  // outages. A read is never permission to retry a payment needing review.
  // Late capture/refund updates continue through callbacks and the sweep.
  if (current.responseId ||
      ["expired", "refunded", "reviewRequired"].includes(current.status)) {
    return projectFormPayment({db,
      paymentId: data.paymentId, payment: current, respondentUid: uid});
  }
  const {processor} = await deps.executionFor({db,
    paymentId: data.paymentId, payment: current});
  const payment = data.callback ?
    await processor.verifyClientCallback({paymentId: data.paymentId,
      respondentUid: uid, providerPaymentId: data.callback.paymentId,
      signature: data.callback.signature}) :
    await processor.reconcile(data.paymentId);
  return projectFormPayment({db, paymentId: data.paymentId, payment,
    respondentUid: uid});
}

/** Read-only discovery works for full, paused, or republished forms.
 * Provider reconciliation still happens through the owned get/pay operation. */
export async function findOrganizerFormPaymentHandler(
  request: CallableRequest<unknown>, deps: HandlerDeps = defaults):
  Promise<FindOrganizerFormPaymentCallableResponse> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<FindOrganizerFormPaymentCallablePayload>(
    request, validateFindOrganizerFormPaymentCallablePayload);
  const db = deps.db();
  await deps.rateLimit(db, uid, "findOrganizerFormPayment", {
    maxRequests: 15, windowMs: 60 * 1000,
  });
  const forms = await db.collection("organizerForms")
    .where("publicFormId", "==", data.publicFormId).limit(2).get();
  if (forms.docs.length !== 1) return {payment: null};
  const formSnap = forms.docs[0];
  const form = requireDoc<Form>(formSnap, "OrganizerFormDocument");
  const payments = await db.collection("organizerFormPayments")
    .where("formId", "==", formSnap.id)
    .where("respondentUid", "==", uid)
    .orderBy("createdAt", "desc").limit(26).get();
  if (!payments.docs.length) return {payment: null};
  for (const snap of payments.docs.slice(0, 25)) {
    const payment = requireDoc<Payment>(snap, "OrganizerFormPaymentDocument");
    if (payment.respondentUid !== uid || payment.formId !== formSnap.id ||
        payment.organizerId !== form.organizerId) unavailable();
    // A newer abandoned retry must not conceal an earlier receipt or
    // outstanding refund/review after browser storage is lost.
    if (!payment.responseId &&
        ["expired", "refunded"].includes(payment.status)) continue;
    return {payment: await projectFormPayment({db, paymentId: snap.id,
      payment, respondentUid: uid})};
  }
  if (payments.docs.length > 25) {
    throw new HttpsError("resource-exhausted",
      "Too many ended attempts to recover automatically.");
  }
  return {payment: null};
}

export async function manageOrganizerFormPaymentConnectionHandler(
  request: CallableRequest<unknown>, deps: HandlerDeps = defaults):
  Promise<ManageOrganizerFormPaymentConnectionCallableResponse> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<
    ManageOrganizerFormPaymentConnectionCallablePayload>(request,
      validateManageOrganizerFormPaymentConnectionCallablePayload);
  const db = deps.db();
  await deps.rateLimit(db, uid, "manageOrganizerFormPaymentConnection", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  await deps.requireManager({db, organizerId: data.organizerId, actorUid: uid});
  const result: ManageOrganizerFormPaymentConnectionCallableResponse = {
    available: deps.configured(), authorizationUrl: null, connectionId: null,
    expiresAtMillis: null, connections: []};
  if (data.action === "begin") {
    if (data.connectionId !== null) invalidAction();
    const {connections} = await deps.runtime();
    return {...result, ...await connections.begin(data.organizerId, uid)};
  }
  if (data.action === "disconnect") {
    if (!data.connectionId) invalidAction();
    const {connections} = await deps.runtime();
    await connections.disconnect(data.organizerId, uid, data.connectionId);
  } else if (data.action === "refresh") {
    if (!data.connectionId) invalidAction();
    const current = requireDoc<Connection>(await db
      .collection("organizerPaymentConnections").doc(data.connectionId).get(),
    "OrganizerPaymentConnectionDocument");
    if (current.organizerId !== data.organizerId) unavailable();
    if (current.status === "ready" && current.accountId) {
      const {credentials} = await deps.runtime();
      await credentials.access({organizerId: data.organizerId,
        connectionId: data.connectionId, accountId: current.accountId,
        mode: current.mode});
    }
  } else if (data.connectionId !== null) invalidAction();
  const snaps = await db.collection("organizerPaymentConnections")
    .where("organizerId", "==", data.organizerId)
    .orderBy("createdAt", "desc").limit(100).get();
  result.connections = snaps.docs.map((snap) => {
    const value = requireDoc<Connection>(snap,
      "OrganizerPaymentConnectionDocument");
    return {connectionId: snap.id, status: value.status, mode: value.mode,
      accountId: value.accountId, webhookVerified: !!value.webhookVerifiedAt,
      lastErrorCode: value.lastErrorCode};
  });
  result.collection = await deps.collectionSetup({db,
    organizerId: data.organizerId});
  return result;
}

function unavailable(): never {
  throw new HttpsError("permission-denied", "Payment unavailable.");
}
function invalidAction(): never {
  throw new HttpsError("invalid-argument", "Invalid connection action.");
}

const limits = {timeoutSeconds: 120, maxInstances: 20};
export const prepareOrganizerFormPayment = onCall(
  appCheckCallableOptionsWithLimits(limits),
  (request) => prepareOrganizerFormPaymentHandler(request));
export const getOrganizerFormPayment = onCall(
  appCheckCallableOptionsWithLimits(limits),
  (request) => getOrganizerFormPaymentHandler(request));
export const findOrganizerFormPayment = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 30, maxInstances: 20}),
  (request) => findOrganizerFormPaymentHandler(request));
export const manageOrganizerFormPaymentConnection = onCall(
  appCheckCallableOptionsWithLimits(limits),
  (request) => manageOrganizerFormPaymentConnectionHandler(request));
