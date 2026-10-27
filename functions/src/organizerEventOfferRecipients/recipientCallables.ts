import {findRecipientAdmission} from "./recipientAdmission";
import {createHash} from "node:crypto";
import {commitOrganizerFormAdmission, previewOrganizerFormAdmission} from
  "../organizerFormAdmission/admissionService";
import * as admin from "firebase-admin";
import {onCall, HttpsError, type CallableRequest} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {checkRateLimit} from "../shared/rateLimit";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {validateCallableWithAjv} from "../shared/validation";
import type {ManageEventOfferCheckoutCallablePayload as Input} from
  "../shared/generated/manageEventOfferCheckoutCallablePayload";
import type {ManageEventOfferCheckoutCallableResponse as Response} from
  "../shared/generated/manageEventOfferCheckoutCallableResponse";
import type {PrepareEventOfferInvitationCallablePayload as InvitationInput} from
  "../shared/generated/prepareEventOfferInvitationCallablePayload";
import {validateManageEventOfferCheckoutCallablePayload as validateInput} from
  "../shared/generated/validators/manageEventOfferCheckoutInput";
import {validateManageEventOfferCheckoutCallableResponse as validateResponse}
  from "../shared/generated/validators/manageEventOfferCheckoutOutput";
import {validatePrepareEventOfferInvitationCallablePayload} from
  "../shared/generated/validators/prepareEventOfferInvitationInput";
import {prepareRazorpayCollectionRouting} from
  "../payments/razorpayCollectionRouting";
import {offerPaymentId, OFFER_PAYMENT_COLLECTION, parseOfferPayment,
  reserveOfferPayment} from "../payments/offerPayments/offerPaymentReservation";
import {offerPaymentExecutionFor} from
  "../payments/offerPayments/offerPaymentRuntime";
import {projectOfferPayment} from
  "../payments/offerPayments/offerPaymentProjection";
import {issueOfferRecipientInvitation, claimOfferRecipientInvitation,
  readVerifiedOfferRecipient, offerRecipientGrantId} from "./recipientGrant";

import {offerCancellationPolicy} from
  "../payments/offerPayments/offerCancellationPolicy";
import {cancelPaidOfferForCancelledEvent} from
  "../payments/offerPayments/offerPaymentCancellation";

export const recipientCallableDefaults = {
  db: () => admin.firestore(), rateLimit: checkRateLimit,
  now: Date.now,
  issue: issueOfferRecipientInvitation, claim: claimOfferRecipientInvitation,
  readRecipient: readVerifiedOfferRecipient,
  prepareRouting: prepareRazorpayCollectionRouting,
  reserve: reserveOfferPayment, execution: offerPaymentExecutionFor,
  project: projectOfferPayment, cancel: cancelPaidOfferForCancelledEvent,
  previewAdmission: previewOrganizerFormAdmission,
  commitAdmission: commitOrganizerFormAdmission,
};
type Deps = typeof recipientCallableDefaults;

export async function prepareEventOfferInvitationHandler(
  request: CallableRequest<unknown>, deps: Deps = recipientCallableDefaults) {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<InvitationInput>(request,
    validatePrepareEventOfferInvitationCallablePayload);
  const db = deps.db();
  await deps.rateLimit(db, uid, "prepareEventOfferInvitation", {
    maxRequests: 10, windowMs: 60 * 1000,
  });
  const invitation = await deps.issue({db, actorUid: uid,
    scope: {organizerId: data.organizerId, eventId: data.eventId,
      offerId: data.offerId, responseId: data.responseId},
    expectedOfferGeneration: data.expectedOfferGeneration,
    expectedOfferRevision: data.expectedOfferRevision, nowMillis: deps.now});
  // Link preparation is not delivery. The token never enters a URL query/path.
  return {url: `https://catchdates.com/offer#${invitation.token}`,
    expiresAtMillis: invitation.expiresAtMillis};
}

export async function manageEventOfferCheckoutHandler(
  request: CallableRequest<unknown>, deps: Deps = recipientCallableDefaults):
  Promise<Response> {
  const uid = requireAuth(request);
  const phone = request.auth?.token.phone_number;
  if (typeof phone !== "string" || !/^\+[1-9][0-9]{7,14}$/u.test(phone)) {
    throw new HttpsError("unauthenticated", "Verify your phone to continue.");
  }
  const data = validateCallableWithAjv<Input>(request, validateInput);
  const db = deps.db();
  await deps.rateLimit(db, uid, "manageEventOfferCheckout", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const result: Response = {grant: null, payment: null,
    serverTimeMillis: deps.now()};
  const respond = () => checkedResponse(result, deps.now(),
    data.includeEventAccess === true);
  if (data.action === "claim") {
    // A returning payer can recover history even after the offer expires.
    const grantId = offerRecipientGrantId(data.token);
    result.admission = await findRecipientAdmission(db, uid, grantId);
    if (result.admission) return respond();
    delete result.admission;
    result.payment = await findOwnedPayment(db, uid, grantId, deps);
    if (result.payment) return respond();
    const claimed = await deps.claim({db, uid, token: data.token,
      authTokenPhoneNumber: phone, nowMillis: deps.now});
    result.grant = await currentGrant(db, uid, claimed.grantId, deps);
  } else if (data.action === "find") {
    result.admission = await findRecipientAdmission(db, uid, data.grantId);
    if (result.admission) return respond();
    delete result.admission;
    result.payment = await findOwnedPayment(db, uid, data.grantId, deps);
    if (!result.payment) {
      result.grant = await currentGrant(db, uid, data.grantId, deps);
    }
  } else if (data.action === "acceptFree") {
    const {grant} = await db.runTransaction((tx) => deps.readRecipient({
      db, tx, grantId: data.grantId, uid, nowMillis: deps.now()}));
    const receipt = await deps.commitAdmission({db, actorUid: uid,
      recipientGrantId: data.grantId, nowMillis: deps.now,
      payload: {organizerId: grant.organizerId, eventId: grant.eventId,
        responseId: grant.responseId, contactId: grant.contactId,
        offerId: grant.offerId,
        requestId: "free_" + createHash("sha256")
          .update(`${uid}:${data.grantId}:${data.requestId}`).digest("hex"),
        expectedOfferGeneration: data.expectedOfferGeneration,
        expectedOfferRevision: data.expectedOfferRevision,
        expectedLedgerRevision: data.expectedLedgerRevision}});
    result.admission = {eventId: receipt.eventId,
      attendeeId: receipt.attendeeId};
  } else {
    const paymentId = data.action === "prepare" ?
      offerPaymentId(data.grantId, uid, data.requestId) : data.paymentId;
    const snap = await db.collection(OFFER_PAYMENT_COLLECTION)
      .doc(paymentId).get();
    let payment;
    if (snap.exists) {
      payment = parseOfferPayment(snap.data(), paymentId);
      if (payment.recipientUid !== uid || data.action === "prepare" &&
          payment.grantId !== data.grantId) unavailable();
    } else {
      if (data.action !== "prepare") unavailable();
      const {grant, source} = await db.runTransaction((tx) =>
        deps.readRecipient({db, tx, grantId: data.grantId,
          uid, nowMillis: deps.now()}));
      const terms = source.offer.paymentSnapshot;
      if (terms.collectionMode !== "catchCheckout" ||
          terms.currency !== "INR" ||
          typeof terms.expectedAmountMinor !== "number" ||
          terms.expectedAmountMinor < 100) unavailable();
      const routing = await deps.prepareRouting({db,
        organizerId: grant.organizerId, purpose: "eventAdmission",
        connectionId: null,
        amountMinor: terms.expectedAmountMinor});
      payment = (await deps.reserve({db, grantId: data.grantId,
        uid, requestId: data.requestId, routing,
        cancellationPolicy: data.cancellationPolicy,
        nowMillis: deps.now})).payment;
    }
    if (data.action === "cancelAdmission") {
      const cancelled = await deps.cancel({db, paymentId, nowMillis: deps.now(),
        guest: {uid, expectedRefundAmountPaise:
          data.expectedRefundAmountPaise}});
      if (!cancelled) {
        throw new HttpsError("failed-precondition",
          "This admission cannot be cancelled. Refresh its status.");
      }
      payment = parseOfferPayment((await db.collection(OFFER_PAYMENT_COLLECTION)
        .doc(paymentId).get()).data(), paymentId);
    }
    // Ended history stays readable without provider readiness or activation.
    if (!payment.admissionReceiptId &&
        !["refunded", "reviewRequired"].includes(payment.status) &&
        !(payment.status === "expired" &&
          (data.action !== "status" || !data.callback))) {
      const processor = await deps.execution({db, paymentId});
      payment = data.action === "status" && data.callback ?
        await processor.verifyClientCallback({uid,
          providerPaymentId: data.callback.paymentId,
          signature: data.callback.signature}) :
        data.action === "prepare" ? await processor.ensureOrder() :
          await processor.reconcile();
    }
    result.payment = await deps.project({db, paymentId, payment,
      uid, nowMillis: deps.now()});
  }
  return respond();
}

function checkedResponse(result: Response, nowMillis: number,
  includeEventAccess: boolean): Response {
  if (result.payment && !includeEventAccess) delete result.payment.eventId;
  result.serverTimeMillis = nowMillis;
  if (!validateResponse(result)) {
    throw new HttpsError("internal", "Invalid checkout result.");
  }
  return result;
}

async function findOwnedPayment(db: FirebaseFirestore.Firestore, uid: string,
  grantId: string, deps: Deps): Promise<Response["payment"]> {
  const candidates = await db.collection(OFFER_PAYMENT_COLLECTION)
    .where("grantId", "==", grantId).where("recipientUid", "==", uid)
    .orderBy("createdAt", "desc").limit(1).get();
  const snap = candidates.docs[0];
  if (!snap) return null;
  const payment = parseOfferPayment(snap.data(), snap.id);
  if (payment.grantId !== grantId || payment.recipientUid !== uid) {
    unavailable();
  }
  return deps.project({db, paymentId: snap.id, payment,
    uid, nowMillis: deps.now()});
}

async function currentGrant(db: FirebaseFirestore.Firestore, uid: string,
  grantId: string, deps: Deps): Promise<NonNullable<Response["grant"]>> {
  const {grant, source} = await db.runTransaction((tx) => deps.readRecipient({
    db, tx, grantId: grantId, uid, nowMillis: deps.now()}));
  const terms = source.offer.paymentSnapshot;
  const free = terms.expectedAmountMinor === 0;
  if (!free && (terms.collectionMode !== "catchCheckout" ||
      terms.currency !== "INR" ||
      typeof terms.expectedAmountMinor !== "number" ||
      terms.expectedAmountMinor < 100)) unavailable();
  const preview = free ? await deps.previewAdmission({db, actorUid: uid,
    recipientGrantId: grantId, nowMillis: deps.now,
    payload: {organizerId: grant.organizerId, eventId: grant.eventId,
      responseId: grant.responseId, contactId: grant.contactId,
      offerId: grant.offerId}}) : null;
  if (preview && !preview.canCommit) unavailable();
  return {grantId: grantId, eventId: source.offer.eventId,
    eventName: (source.event.name?.trim() || "Your event").slice(0, 200),
    startTimeMillis: source.event.startTime.toMillis(),
    amountPaise: terms.expectedAmountMinor!, currency: "INR",
    ...(preview ? {freeAdmission: {
      expectedOfferGeneration: preview.expectedOfferGeneration!,
      expectedOfferRevision: preview.expectedOfferRevision!,
      expectedLedgerRevision: preview.expectedLedgerRevision!}} : {}),
    expiresAtMillis: source.offer.expiresAtMillis,
    cancellationPolicy: offerCancellationPolicy(source.event)};
}

function unavailable(): never {
  throw new HttpsError("failed-precondition",
    "This invitation is unavailable.");
}
export const prepareEventOfferInvitation = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 120,
    maxInstances: 10, concurrency: 10}),
  (request) => prepareEventOfferInvitationHandler(request));
export const manageEventOfferCheckout = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 120,
    maxInstances: 10, concurrency: 10}),
  (request) => manageEventOfferCheckoutHandler(request));
