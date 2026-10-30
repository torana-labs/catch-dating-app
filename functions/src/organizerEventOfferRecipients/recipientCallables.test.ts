import {commitOrganizerFormAdmission, previewOrganizerFormAdmission} from
  "../organizerFormAdmission/admissionService";
import assert from "node:assert/strict";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {setup, uid, phone, now} from
  "../payments/offerPayments/offerPaymentTestFixture";
import {org, eventId, responseId, offerId, actorUid} from
  "../organizerFormAdmission/admissionTestFixture";
import {OFFER_PAYMENT_COLLECTION, reserveOfferPayment, parseOfferPayment} from
  "../payments/offerPayments/offerPaymentReservation";
import {claimOfferRecipientInvitation, readVerifiedOfferRecipient} from
  "./recipientGrant";
import {manageEventOfferCheckoutHandler, prepareEventOfferInvitationHandler,
  recipientCallableDefaults} from "./recipientCallables";

import {offerCancellationPolicy} from
  "../payments/offerPayments/offerCancellationPolicy";
import type {EventDocument} from "../shared/generated/firestoreAdminTypes";

import {finalizeCapturedOfferPayment} from
  "../payments/offerPayments/offerPaymentAdmission";
import {Timestamp} from "firebase-admin/firestore";
import {BRAND} from "../shared/generated/brand";

const request = (data: unknown, user = uid, verifiedPhone: unknown = phone) =>
  ({data, auth: {uid: user, token: {phone_number: verifiedPhone}}}) as
  CallableRequest<unknown>;
async function harness() {
  const h = await setup();
  let executions = 0;
  let routes = 0;
  const db = {runTransaction: h.store.runTransaction.bind(h.store),
    collection: (name: string) => {
      const base = h.store.collection(name);
      const query = (filters: Array<[string, unknown]> = []) => ({
        where: (field: string, _op: string, value: unknown) =>
          query([...filters, [field, value]]),
        orderBy: () => query(filters), limit: () => query(filters),
        get: async () => ({docs: [...h.store.rows]
          .filter(([path, row]) => path.startsWith(`${name}/`) &&
            filters.every(([field, value]) => row[field] === value))
          .slice(-1).map(([path, row]) => ({
            id: path.split("/").at(-1)!, data: () => row}))}),
      });
      return {...base, ...(name === OFFER_PAYMENT_COLLECTION ? query() : {}),
        doc: (id: string) => ({...base.doc(id),
          get: async () => ({exists: !!h.store.get(`${name}/${id}`),
            data: () => h.store.get(`${name}/${id}`)})})};
    }} as unknown as FirebaseFirestore.Firestore;
  const deps = {...recipientCallableDefaults, db: () => db,
    now: () => now + 20,
    rateLimit: async () => undefined,
    claim: (input: Parameters<typeof claimOfferRecipientInvitation>[0]) =>
      claimOfferRecipientInvitation({...input, loadCurrentAuthUser: h.auth}),
    readRecipient: (input: Parameters<typeof readVerifiedOfferRecipient>[0]) =>
      readVerifiedOfferRecipient({...input, loadCurrentAuthUser: h.auth}),
    previewAdmission: (input: Parameters<
      typeof previewOrganizerFormAdmission>[0]) =>
      previewOrganizerFormAdmission({...input, loadCurrentAuthUser: h.auth}),
    commitAdmission: (input: Parameters<
      typeof commitOrganizerFormAdmission>[0]) =>
      commitOrganizerFormAdmission({...input, loadCurrentAuthUser: h.auth}),
    prepareRouting: async () => {
      routes++; return h.routing;
    },
    reserve: (input: Parameters<typeof reserveOfferPayment>[0]) =>
      reserveOfferPayment({...input, loadCurrentAuthUser: h.auth}),
    execution: async ({paymentId}: {paymentId: string}) => {
      executions++;
      const read = async () => parseOfferPayment(h.store.get(
        `${OFFER_PAYMENT_COLLECTION}/${paymentId}`), paymentId);
      return {ensureOrder: read, reconcile: read,
        verifyClientCallback: read};
    },
    project: async ({paymentId, payment}: Parameters<
      typeof recipientCallableDefaults.project>[0]) => ({paymentId,
      eventId: payment.eventId,
      status: payment.status, amountPaise: payment.amountPaise,
      currency: "INR" as const, mode: payment.routing.selection.mode,
      refundedAmountPaise: payment.refundedAmountPaise,
      cancellationReason: payment.cancellation?.reason ?? null,
      cancellationPolicy:
        payment.cancellationPolicy ?? null,
      cancellationQuote: null,
      expiresAtMillis: payment.checkoutExpiresAt.toMillis(), checkout: null}),
  } as unknown as typeof recipientCallableDefaults;
  return {...h, deps, executions: () => executions, routes: () => routes};
}

test("recipient callable requires authenticated phone claims and strict input",
  async () => {
    const h = await harness();
    const claim = {action: "claim", token: h.invitation.token};
    for (const input of [request(claim, uid, null),
      request({...claim, phoneNumber: phone}),
      {data: claim} as CallableRequest<unknown>,
      request(claim, "other")]) {
      await assert.rejects(manageEventOfferCheckoutHandler(input, h.deps));
    }
    const result = await manageEventOfferCheckoutHandler(request(claim),
      h.deps);
    assert.equal(result.grant?.grantId, h.invitation.grantId);
    assert.equal(result.grant?.amountPaise, 10000);
    assert.equal(result.payment, null);
    assert.equal(h.executions(), 0);
  });

test("prepare replays its frozen attempt without selecting another route",
  async () => {
    const h = await harness();
    const input = request({action: "prepare", grantId: h.invitation.grantId,
      requestId: "checkout_request1", cancellationPolicy:
        offerCancellationPolicy(
          h.store.get(`events/${eventId}`) as unknown as EventDocument)});
    const first = await manageEventOfferCheckoutHandler(input, h.deps);
    assert.ok(first.payment);
    assert.equal(first.payment.eventId, undefined);
    assert.equal(h.routes(), 1);
    const replay = await manageEventOfferCheckoutHandler(input, h.deps);
    assert.equal(replay.payment?.paymentId, first.payment.paymentId);
    assert.equal(h.routes(), 1);
    const before = h.executions();
    await assert.rejects(manageEventOfferCheckoutHandler(request({
      action: "status", paymentId: first.payment.paymentId,
      callback: null}, "other"), h.deps));
    assert.equal(h.executions(), before);
  });

test("a withdrawn offer preserves ended payment history",
  async () => {
    const h = await harness();
    const {paymentId} = await h.reserve();
    await h.expire(paymentId);
    h.store.get(`organizerEventOffers/${offerId}`)!.status = "withdrawn";
    const recovered = await manageEventOfferCheckoutHandler(request({
      action: "claim", token: h.invitation.token}), h.deps);
    assert.equal(recovered.grant, null);
    assert.equal(recovered.payment?.paymentId, paymentId);
    const result = await manageEventOfferCheckoutHandler(request({
      action: "status", paymentId, callback: null}), h.deps);
    assert.equal(result.payment?.status, "expired");
    assert.equal(h.executions(), 0);
  });

test("invitation links are manager-only and keep secrets in the fragment",
  async () => {
    const h = await harness();
    const payload = {organizerId: org, eventId, responseId, offerId,
      expectedOfferGeneration: 1, expectedOfferRevision: 2};
    await assert.rejects(prepareEventOfferInvitationHandler(request(payload),
      h.deps));
    const result = await prepareEventOfferInvitationHandler(
      request(payload, actorUid), h.deps);
    const url = new URL(result.url);
    assert.equal(url.origin, BRAND.web.origin);
    assert.equal(url.pathname, "/offer");
    assert.equal(url.search, "");
    assert.match(url.hash, /^#[A-Za-z0-9_-]{43}$/u);
  });

test("owned cancellation is limited to the payer", async () => {
  const h = await harness();
  const {paymentId} = await h.reserve();
  Object.assign(h.store.get(`${OFFER_PAYMENT_COLLECTION}/${paymentId}`)!, {
    status: "captured", providerOrderId: "order_one",
    providerPaymentId: "pay_one", capturedAt: Timestamp.fromMillis(now + 10),
  });
  await finalizeCapturedOfferPayment({db: h.store.db(), paymentId,
    nowMillis: now + 20, loadCurrentAuthUser: h.auth});
  const command = {action: "cancelAdmission", paymentId,
    expectedRefundAmountPaise: 0};
  await assert.rejects(manageEventOfferCheckoutHandler(
    request(command, "other"), h.deps));
  const first = await manageEventOfferCheckoutHandler(request(command), h.deps);
  assert.equal(first.payment?.status, "cancelled");
  assert.equal(first.payment?.cancellationReason, "guestCancelled");
  await manageEventOfferCheckoutHandler(request(command), h.deps);
  assert.equal(h.executions(), 0);
  assert.equal(h.store.get(`eventSeatLedgers/${eventId}`)!.occupied, 0);
});

test("claimed offer recovery can resume before a payment was created",
  async () => {
    const h = await harness();
    const result = await manageEventOfferCheckoutHandler(request({
      action: "find",
      grantId: h.invitation.grantId}), h.deps);
    assert.equal(result.payment, null);
    assert.equal(result.grant?.grantId, h.invitation.grantId);
    assert.equal(result.grant?.amountPaise, 10000);
    assert.equal(h.executions(), 0);
    await assert.rejects(manageEventOfferCheckoutHandler(request({
      action: "find",
      grantId: h.invitation.grantId}, "other"), h.deps));
  });

test("free acceptance and reload never create a provider order", async () => {
  const h = await harness();
  Object.assign(h.store.get(`organizerEventOffers/${offerId}`)!
    .paymentSnapshot as object, {expectedAmountMinor: 0, collectionMode: null});
  const first = await manageEventOfferCheckoutHandler(request({action: "find",
    grantId: h.invitation.grantId}), h.deps);
  assert.ok(first.grant?.freeAdmission);
  const input = {action: "acceptFree", grantId: h.invitation.grantId,
    requestId: "free_request_001", ...first.grant.freeAdmission};
  const accepted = await manageEventOfferCheckoutHandler(request(input),
    h.deps);
  assert.equal(accepted.admission?.eventId, eventId);
  const recovered = await manageEventOfferCheckoutHandler(request({
    action: "find", grantId: h.invitation.grantId}), h.deps);
  assert.deepEqual(recovered.admission, accepted.admission);
  assert.equal(recovered.payment, null);
  assert.equal(h.routes(), 0);
  assert.equal(h.executions(), 0);
});

test("event access metadata is opt-in for existing strict paid clients",
  async () => {
    const h = await harness();
    const {paymentId} = await h.reserve();
    const result = await manageEventOfferCheckoutHandler(request({
      action: "status", paymentId, callback: null,
      includeEventAccess: true}), h.deps);
    assert.equal(result.payment?.eventId, eventId);
  });
