import {Timestamp} from "firebase-admin/firestore";
import {fixture, org, eventId, contactId, actorUid, offerId, responseId} from
  "../../organizerFormAdmission/admissionTestFixture";
import {issueOfferRecipientInvitation, claimOfferRecipientInvitation} from
  "../../organizerEventOfferRecipients/recipientGrant";
import {CHECKOUT_HOLD_MILLIS} from "../../domain/payments/checkoutHold";
import {hostPaymentAccountDocumentId} from "../hostPaymentAccounts";
import type {PaymentRoutingSnapshot} from "../paymentRouting";
import {reserveOfferPayment, OFFER_PAYMENT_COLLECTION} from
  "./offerPaymentReservation";
import {releaseOfferPaymentHold} from "./offerPaymentExpiry";
import {finalizeCapturedOfferPayment} from "./offerPaymentAdmission";

import {offerCancellationPolicy} from "./offerCancellationPolicy";
import type {EventDocument} from "../../shared/generated/firestoreAdminTypes";

export const phone = "+919999999999";
export const uid = "recipient1";
export const now = 2000;
export async function setup() {
  const h = fixture();
  h.store.get(`organizerContacts/${contactId}`)!.phoneE164 = phone;
  Object.assign(h.store.get(`organizerEventOffers/${offerId}`)!
    .paymentSnapshot as object, {collectionMode: "catchCheckout",
    expectedAmountMinor: 10000});
  const invitation = await issueOfferRecipientInvitation({db: h.store.db(),
    actorUid, scope: {organizerId: org, eventId, offerId, responseId},
    expectedOfferGeneration: 1, expectedOfferRevision: 2,
    nowMillis: () => now});
  const auth = async () => ({uid, phoneNumber: phone});
  await claimOfferRecipientInvitation({db: h.store.db(),
    token: invitation.token, uid, authTokenPhoneNumber: phone,
    nowMillis: () => now, loadCurrentAuthUser: auth});
  const bindingId = hostPaymentAccountDocumentId(actorUid, "razorpay");
  h.store.put(`hostPaymentAccounts/${bindingId}`, {
    userId: actorUid, provider: "razorpay", country: "IN",
    defaultCurrency: "INR", providerAccountId: "acc_host",
    razorpayAccountId: "acc_host", razorpayProductId: "accprod_host",
    stripeAccountId: "", chargesEnabled: true, payoutsEnabled: true,
    detailsSubmitted: true, onboardingStatus: "complete",
    requirementsCurrentlyDue: [], requirementsPastDue: [],
    requirementsPendingVerification: [],
    createdAt: Timestamp.fromMillis(now), updatedAt: Timestamp.fromMillis(now),
  });
  const selection = {route: "razorpayRoute" as const, mode: "test" as const,
    currency: "INR", merchantCountry: "IN"};
  h.store.put("paymentRoutingPolicies/app", {scope: "app", organizerId: null,
    revision: 1, updatedAt: Timestamp.fromMillis(now), formFee: null,
    eventAdmission: selection});
  const routing: PaymentRoutingSnapshot = {version: 1, organizerId: org,
    purpose: "eventAdmission", amountMinor: 10000, selection,
    policySource: "app", appRevision: 1, organizerRevision: 0,
    bindingId, merchantAccountId: "acc_platform",
    destinationAccountId: "acc_host", checkoutKey: "rzp_test_platform",
    configurationVersion: "projects/catch-test/secrets/PLATFORM/versions/1",
    transferAmountMinor: 9500, settlementHold: true};
  const reserve = (requestId = "checkout_request1", at = now,
    selected = routing) => reserveOfferPayment({db: h.store.db(),
    grantId: invitation.grantId, uid, requestId, routing: selected,
    cancellationPolicy:
      offerCancellationPolicy(h.store.get(`events/${eventId}`) as unknown as
        EventDocument),
    nowMillis: () => at, loadCurrentAuthUser: auth});
  const expire = (paymentId: string, at = now + CHECKOUT_HOLD_MILLIS,
    reason: "expired" | "fulfillmentFailed" = "expired") =>
    releaseOfferPaymentHold({db: h.store.db(), paymentId,
      nowMillis: at, reason});
  return {...h, routing, reserve, expire, bindingId, invitation, auth};
}

export async function capturedFixture() {
  const h = await setup();
  const {paymentId} = await h.reserve();
  const payment = h.store.get(`${OFFER_PAYMENT_COLLECTION}/${paymentId}`)!;
  Object.assign(payment, {status: "captured", providerOrderId: "order_one",
    providerPaymentId: "pay_one", capturedAt: Timestamp.fromMillis(now + 10)});
  const finalize = (at = now + 20) => finalizeCapturedOfferPayment({
    db: h.store.db(), paymentId, nowMillis: at,
    loadCurrentAuthUser: async () => ({uid, phoneNumber: phone})});
  return {...h, paymentId, finalize};
}

