import {Timestamp} from "firebase-admin/firestore";
import type {
  EventDocument,
  OrganizerDocument,
} from "../../shared/generated/firestoreAdminTypes";
import {
  setup,
  uid,
  phone,
  now,
} from "../../payments/offerPayments/offerPaymentTestFixture";
import {
  eventId,
  org,
} from "../../organizerFormAdmission/admissionTestFixture";
import {deriveEventSeatPolicy} from "../seatAuthority/firestoreAdapter";
import {publicCheckoutQuote} from "./policy";
import {reservePublicPayment} from "./reservation";
import {finalizePublicPayment} from "./admission";
import {PUBLIC_PAYMENT_COLLECTION} from "./paymentLedger";
export {uid, phone, now, eventId, org};

export async function publicFixture() {
  const h = await setup();
  // Public checkout has no form, contact, application, grant or offer.
  for (const key of h.store.rows.keys()) {
    if (
      /^organizer(Form|Contact|EventOffer|Applications)/u
        .test(
          key,
        )
    ) {
      h.store.rows.delete(key);
    }
  }
  const event = h.store.get(`events/${eventId}`)!;
  Object.assign(event, {
    name: "Sunday Run",
    publicRegistrationEnabled: true,
    publicRegistrationMode: "paid",
    publicRegistrationRevision: 1,
    priceInPaise: 10000,
    endTime: Timestamp.fromMillis(200_000_000),
    startTime: Timestamp.fromMillis(100_000_000),
    meetingPoint: "Park",
    meetingLocation: {name: "Park", latitude: 12, longitude: 77},
    eventFormat: {
      version: 1,
      activityKind: "running",
      interactionModel: "open",
    },
    eventPolicy: {
      version: 2,
      admission: {capacityLimit: 2, format: "open"},
      pricing: {basePriceInPaise: 10000},
      cancellation: {policyId: "standard"},
      settlement: {hostPayoutTiming: "afterEventCompletion"},
    },
  });
  const organizer = h.store.get(`organizers/${org}`)!;
  Object.assign(organizer, {
    appVisibility: "discoverable",
    publicPage: {publishStatus: "published"},
  });
  const policy = deriveEventSeatPolicy(event);
  Object.assign(h.store.get(`eventSeatLedgers/${eventId}`)!, {
    policyVersion: policy.policyVersion,
    policyHash: policy.policyHash,
  });
  const quote = () =>
    publicCheckoutQuote(
      eventId,
      event as unknown as EventDocument,
      organizer as unknown as OrganizerDocument,
      now,
    );
  const reserve = (
    patch: Partial<Parameters<typeof reservePublicPayment>[0]> = {},
  ) =>
    reservePublicPayment({
      db: h.store.db(),
      eventId,
      uid,
      phoneE164: phone,
      requestId: "public_request1",
      displayName: "Ada Guest",
      reviewedQuote: patch.reviewedQuote ?? quote(),
      routing: h.routing,
      inviteLinkId: null,
      nowMillis: () => now,
      loadCurrentAuthUser: h.auth,
      ...patch,
    });
  // A multi-place order freezes its whole amount, and the platform fee, in
  // the routing snapshot.
  const routingFor = (amountMinor: number) => amountMinor === 10000 ?
    h.routing : {...h.routing, amountMinor,
      transferAmountMinor: Math.round(amountMinor * 0.95)};
  return {...h, event, organizer, quote, reserve, routingFor};
}

export async function publicCapturedFixture() {
  const h = await publicFixture();
  const result = await h.reserve();
  if (!("payment" in result)) throw new Error("Expected public payment");
  const {paymentId} = result;
  Object.assign(h.store.get(`${PUBLIC_PAYMENT_COLLECTION}/${paymentId}`)!, {
    status: "captured",
    providerOrderId: "order_one",
    providerPaymentId: "pay_one",
    capturedAt: Timestamp.fromMillis(now + 10),
  });
  const finalize = (
    patch: Partial<Parameters<typeof finalizePublicPayment>[0]> = {},
  ) =>
    finalizePublicPayment({
      db: h.store.db(),
      paymentId,
      nowMillis: now + 20,
      loadCurrentAuthUser: h.auth,
      ...patch,
    });
  return {...h, paymentId, finalize};
}
