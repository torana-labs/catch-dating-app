import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import type {
  EventDocument,
  OrganizerDocument,
} from "../../shared/generated/firestoreAdminTypes";
import {validateManagePublicEventCheckoutCallablePayload as validInput} from
  "../../shared/generated/validators/managePublicEventCheckoutInput";
import {CHECKOUT_HOLD_MILLIS} from "../seatAuthority/seatAuthority";
import {deriveEventSeatPolicy} from "../seatAuthority/firestoreAdapter";
import {cancelPaidEventAdmission} from
  "../../payments/eventCheckout/eventPaymentCancellation";
import {releaseEventPaymentHold} from
  "../../payments/eventCheckout/eventPaymentExpiry";
import type {Store} from "../../organizerFormAdmission/admissionTestFixture";
import {managePublicEventCheckoutHandler as handle} from "./callables";
import {publicCheckoutQuote, MAX_PUBLIC_BOOKING_PLACES} from "./policy";
import {
  PUBLIC_PAYMENT_COLLECTION,
  PUBLIC_ADMISSION_COLLECTION,
  parsePublicPayment,
  publicPaymentLedger,
} from "./paymentLedger";
import {readPublicPaidAdmission} from "./admissionProof";
import {finalizePublicPayment} from "./admission";
import {projectPublicPayment} from "./projection";
import {processorFixture} from "./processorTestFixture";
import {publicFixture, eventId, uid, phone, now} from "./testFixture";

const ledgerOf = (h: {store: Store}) =>
  h.store.get(`eventSeatLedgers/${eventId}`)!;
/** Updates replace the stored row, so read the event after each write. */
const eventOf = (h: {store: Store}) => h.store.get(`events/${eventId}`)!;

/** A public fixture with room for four places. */
async function roomy(capacity = 4) {
  const h = await publicFixture();
  const policy = h.event.eventPolicy as {admission: {capacityLimit: number}};
  policy.admission.capacityLimit = capacity;
  h.event.capacityLimit = capacity;
  const derived = deriveEventSeatPolicy(h.event);
  Object.assign(ledgerOf(h), {capacity,
    policyHash: derived.policyHash});
  const quoteFor = (places: number) => publicCheckoutQuote(eventId,
    h.event as unknown as EventDocument,
    h.organizer as unknown as OrganizerDocument, now, false, null, places);
  const reserveFor = (places: number, patch: Parameters<
    typeof h.reserve>[0] = {}) => h.reserve({
    reviewedQuote: quoteFor(places),
    routing: h.routingFor(10000 * places), ...patch});
  return {...h, quoteFor, reserveFor};
}

/** Admits a reserved multi-place payment as if the provider captured it. */
async function admitted(places = 2) {
  const h = await roomy();
  const reserved = await h.reserveFor(places);
  assert.ok("payment" in reserved);
  const {paymentId} = reserved;
  Object.assign(h.store.get(`${PUBLIC_PAYMENT_COLLECTION}/${paymentId}`)!, {
    status: "captured",
    providerOrderId: "order_party",
    providerPaymentId: "pay_party",
    capturedAt: Timestamp.fromMillis(now + 10),
  });
  const finalize = (at = now + 20) => finalizePublicPayment({
    db: h.store.db(), paymentId, nowMillis: at,
    loadCurrentAuthUser: h.auth});
  assert.equal(await finalize(), "admitted");
  const payment = () => parsePublicPayment(
    h.store.get(`${PUBLIC_PAYMENT_COLLECTION}/${paymentId}`), paymentId);
  return {...h, paymentId, finalize, payment};
}

/**
 * Firestore-style optimistic concurrency for the in-memory store: a
 * transaction whose read documents changed before it commits is retried.
 */
function withOptimisticConcurrency(store: Store) {
  const base = store.runTransaction.bind(store);
  const versions = new Map<string, number>();
  let commitLock: Promise<void> = Promise.resolve();
  const stats = {attempts: 0, retries: 0};
  class Conflict extends Error {}
  store.runTransaction = async <T>(callback: (
    tx: FirebaseFirestore.Transaction) => Promise<T>): Promise<T> => {
    for (let attempt = 0; attempt < 5; attempt++) {
      stats.attempts++;
      const seen = new Map<string, number>();
      const written = new Set<string>();
      let release: (() => void) | undefined;
      try {
        const result = await base(async (tx) => {
          const raw = tx as unknown as Record<string, (...args: unknown[]) =>
            unknown>;
          const proxy = {
            get: async (ref: {path?: string}) => {
              if (ref.path) seen.set(ref.path, versions.get(ref.path) ?? 0);
              return raw.get(ref);
            },
            ...Object.fromEntries(["create", "set", "update"].map((kind) =>
              [kind, (ref: {path: string}, ...rest: unknown[]) => {
                written.add(ref.path);
                return raw[kind](ref, ...rest);
              }])),
          } as unknown as FirebaseFirestore.Transaction;
          const value = await callback(proxy);
          // Validate and apply as one commit section, like a server commit.
          const previous = commitLock;
          commitLock = new Promise((resolve) => {
            release = resolve;
          });
          await previous;
          for (const [path, version] of seen) {
            if ((versions.get(path) ?? 0) !== version) throw new Conflict();
          }
          return value;
        });
        for (const path of written) {
          versions.set(path, (versions.get(path) ?? 0) + 1);
        }
        return result;
      } catch (error) {
        if (!(error instanceof Conflict)) throw error;
        stats.retries++;
      } finally {
        release?.();
      }
    }
    throw new Error("Transaction contention did not settle.");
  };
  return stats;
}

test("quotes price every place and keep one place byte-identical", async () => {
  const h = await roomy();
  const single = h.quoteFor(1);
  assert.deepEqual(single, h.quote());
  assert.equal("placeCount" in single, false);
  assert.equal("unitAmountPaise" in single, false);
  const party = h.quoteFor(3);
  assert.equal(party.amountPaise, 30000);
  assert.equal(party.unitAmountPaise, 10000);
  assert.equal(party.placeCount, 3);
  assert.equal(MAX_PUBLIC_BOOKING_PLACES, 4);
  for (const places of [0, -1, 1.5, 5, NaN]) {
    assert.throws(() => h.quoteFor(places), /between 1 and 4/u);
  }
  // A member price is personal: a member party is not priced yet.
  assert.throws(() => publicCheckoutQuote(eventId,
    h.event as unknown as EventDocument,
    h.organizer as unknown as OrganizerDocument, now, false,
    {priceInPaise: 8000, listPriceInPaise: 10000}, 2), /Member pricing/u);
  // A whole order above the provider ceiling is refused.
  h.event.priceInPaise = 40_000_000;
  (h.event.eventPolicy as {pricing: {basePriceInPaise: number}}).pricing
    .basePriceInPaise = 40_000_000;
  assert.throws(() => h.quoteFor(3), /fewer places/u);
});

test("the payload contract bounds places and defaults to one", () => {
  assert.equal(validInput({action: "quote", eventId}), true);
  assert.equal(validInput({action: "quote", eventId, placeCount: 4}), true);
  for (const placeCount of [0, 5, 2.5, "2"]) {
    assert.equal(validInput({action: "quote", eventId, placeCount}), false);
  }
  const reviewedQuote = {eventId, eventName: "Sunday Run",
    registrationRevision: 1, startTimeMillis: 100_000_000,
    amountPaise: 20000, currency: "INR", cancellationPolicy: {
      refundDeadlineMillis: 0, eventStartsAtMillis: 100_000_000}};
  const prepare = {action: "prepare", eventId, requestId: "public_request1",
    displayName: "Ada Guest", inviteToken: null};
  assert.equal(validInput({...prepare, reviewedQuote: {...reviewedQuote,
    unitAmountPaise: 10000, placeCount: 2}}), true);
  // One place is the absent field, so an echoed old quote cannot drift.
  assert.equal(validInput({...prepare, reviewedQuote: {...reviewedQuote,
    placeCount: 1}}), false);
  assert.equal(validInput({...prepare, reviewedQuote: {...reviewedQuote,
    placeCount: 5}}), false);
  assert.equal(validInput({...prepare, placeCount: 2,
    reviewedQuote}), false);
});

test("a party hold takes every place and freezes the whole order",
  async () => {
    const h = await roomy();
    const reserved = await h.reserveFor(3);
    assert.ok("payment" in reserved);
    assert.equal(ledgerOf(h).checkoutHeld, 3);
    assert.equal(ledgerOf(h).occupied, 0);
    const p = parsePublicPayment(
      h.store.get(`${PUBLIC_PAYMENT_COLLECTION}/${reserved.paymentId}`),
      reserved.paymentId);
    assert.equal(p.placeCount, 3);
    assert.equal(p.unitAmountPaise, 10000);
    assert.equal(p.amountPaise, 30000);
    assert.equal(p.routing.amountMinor, 30000);
    // The reviewed party size is part of the request: a replay with another
    // size cannot reuse it.
    await assert.rejects(h.reserveFor(2), /reused/u);
  });

test("a party larger than the places left is refused without a hold",
  async () => {
    const h = await roomy();
    ledgerOf(h).occupied = 3;
    await assert.rejects(h.reserveFor(2), (error: {details?: unknown}) => {
      assert.deepEqual(error.details,
        {reason: "notEnoughPlaces", placesLeft: 1});
      return true;
    });
    assert.equal(ledgerOf(h).checkoutHeld ?? 0, 0);
    assert.equal([...h.store.rows.keys()].some((key) =>
      key.startsWith(`${PUBLIC_PAYMENT_COLLECTION}/`)), false);
    // A routing snapshot for one place cannot pay for a party.
    const other = await roomy();
    await assert.rejects(other.reserveFor(2, {routing: other.routing}),
      /routing mismatch/u);
    ledgerOf(h).occupied = 4;
    await assert.rejects(h.reserveFor(1), /now full/u);
  });

test("two parties racing for the last places cannot oversell", async () => {
  const h = await roomy(3);
  const stats = withOptimisticConcurrency(h.store);
  const second = {uid: "recipient2", phone: "+919000000002"};
  h.store.put(`users/${second.uid}`, {...h.store.get(`users/${uid}`)});
  const results = await Promise.allSettled([
    h.reserveFor(2),
    h.reserveFor(2, {uid: second.uid, phoneE164: second.phone,
      requestId: "public_request2",
      loadCurrentAuthUser: async () => ({uid: second.uid,
        phoneNumber: second.phone})}),
  ]);
  const won = results.filter((row) => row.status === "fulfilled");
  const lost = results.filter((row) => row.status === "rejected");
  assert.equal(won.length, 1, JSON.stringify(results.map((row) =>
    row.status === "rejected" ? String(row.reason) : "ok")));
  assert.equal(lost.length, 1);
  assert.match(String((lost[0] as PromiseRejectedResult).reason),
    /Only 1 place is left/u);
  assert.ok(stats.retries >= 1, "the losing transaction was retried");
  assert.equal(ledgerOf(h).checkoutHeld, 2);
  assert.equal(ledgerOf(h).occupied, 0);
  assert.equal([...h.store.rows.keys()].filter((key) =>
    key.startsWith(`${PUBLIC_PAYMENT_COLLECTION}/`)).length, 1);
});

test("capture admits the whole party on one row and one pass", async () => {
  const h = await admitted(3);
  const p = h.payment();
  assert.equal(ledgerOf(h).occupied, 3);
  assert.equal(ledgerOf(h).checkoutHeld, 0);
  assert.equal(eventOf(h).bookedCount, 3);
  const attendee = h.store.get(`eventAttendees/${p.attendeeId}`)!;
  assert.equal(attendee.partySize, 3);
  assert.equal(attendee.revenueAmountMinor, 30000);
  assert.equal(h.store.get(
    `${PUBLIC_ADMISSION_COLLECTION}/${p.admissionReceiptId}`)?.placeCount, 3);
  assert.equal(await h.finalize(now + 30), "admitted");
  assert.equal(ledgerOf(h).occupied, 3);
  const view = await projectPublicPayment({db: h.store.db(),
    paymentId: h.paymentId, uid, nowMillis: now + 40,
    loadCurrentAuthUser: h.auth});
  assert.equal(view.payment?.placeCount, 3);
  assert.equal(view.payment?.unitAmountPaise, 10000);
  assert.equal(view.payment?.amountPaise, 30000);
  assert.equal(view.payment?.cancellationQuote?.refundAmountPaise, 30000);
  assert.equal(view.admission?.placeCount, 3);
  // Rebooking while admitted returns the same party, not a new charge.
  const again = await h.reserveFor(1, {requestId: "already_in"});
  assert.ok("admission" in again);
  assert.equal(again.admission.placeCount, 3);
});

for (const refund of [true, false]) {
  test(`guest cancellation returns every place (${refund ?
    "full" : "no"} refund)`, async () => {
    const h = await admitted(2);
    const at = refund ? now + 30 : 99_000_000;
    const cancel = (expectedRefundAmountPaise: number) =>
      cancelPaidEventAdmission({db: h.store.db(), paymentId: h.paymentId,
        nowMillis: at, ledger: publicPaymentLedger,
        readAdmission: readPublicPaidAdmission,
        guest: {uid, expectedRefundAmountPaise}});
    // The refund is the policy times every place, never one place's price.
    await assert.rejects(cancel(10000));
    assert.equal(await cancel(refund ? 20000 : 0), true);
    assert.equal(ledgerOf(h).occupied, 0);
    assert.equal(eventOf(h).bookedCount, 0);
    const p = h.payment();
    assert.equal(p.status, refund ? "refundPending" : "cancelled");
    assert.equal(p.cancellation?.refundAmountPaise, refund ? 20000 : 0);
    assert.equal(h.store.get(`eventAttendees/${p.attendeeId}`)?.status,
      "cancelled");
  });
}

test("a host-cancelled event refunds the whole party", async () => {
  const h = await admitted(2);
  eventOf(h).status = "cancelled";
  assert.equal(await cancelPaidEventAdmission({db: h.store.db(),
    paymentId: h.paymentId, nowMillis: now + 30,
    ledger: publicPaymentLedger, readAdmission: readPublicPaidAdmission}),
  true);
  assert.equal(ledgerOf(h).occupied, 0);
  assert.equal(h.payment().cancellation?.refundAmountPaise, 20000);
  assert.equal(h.payment().status, "refundPending");
});

test("an expired party hold returns every held place", async () => {
  const h = await roomy();
  const reserved = await h.reserveFor(4);
  assert.ok("payment" in reserved);
  assert.equal(ledgerOf(h).checkoutHeld, 4);
  assert.equal(await releaseEventPaymentHold({ledger: publicPaymentLedger,
    db: h.store.db(), paymentId: reserved.paymentId, reason: "expired",
    nowMillis: now + CHECKOUT_HOLD_MILLIS}), "expired");
  assert.equal(ledgerOf(h).checkoutHeld, 0);
  assert.equal(ledgerOf(h).occupied, 0);
});

test("single-place bookings stored before multi-place still read as one",
  async () => {
    const h = await admitted(1);
    const row = h.store.get(`${PUBLIC_PAYMENT_COLLECTION}/${h.paymentId}`)!;
    assert.equal(row.placeCount, 1);
    // An older checkout wrote neither field, and its receipt had no count.
    delete row.placeCount;
    delete row.unitAmountPaise;
    const receipt = h.store.get(
      `${PUBLIC_ADMISSION_COLLECTION}/${row.admissionReceiptId}`)!;
    delete receipt.placeCount;
    assert.equal(h.store.get(`eventAttendees/${h.payment().attendeeId}`)
      ?.partySize, undefined);
    const view = await projectPublicPayment({db: h.store.db(),
      paymentId: h.paymentId, uid, nowMillis: now + 40,
      loadCurrentAuthUser: h.auth});
    assert.equal(view.payment?.placeCount, 1);
    assert.equal(view.payment?.unitAmountPaise, 10000);
    assert.equal(view.admission?.placeCount, 1);
    assert.equal(await cancelPaidEventAdmission({db: h.store.db(),
      paymentId: h.paymentId, nowMillis: now + 30,
      ledger: publicPaymentLedger, readAdmission: readPublicPaidAdmission,
      guest: {uid, expectedRefundAmountPaise: 10000}}), true);
    assert.equal(ledgerOf(h).occupied, 0);
    // A stored count that disagrees with its price is not trusted.
    row.placeCount = 2;
    assert.throws(() => parsePublicPayment(row, h.paymentId));
  });

test("the callable quotes, charges and reports a party end to end",
  async () => {
    const h = await processorFixture();
    const policy = h.event.eventPolicy as {admission: {capacityLimit: number}};
    policy.admission.capacityLimit = 4;
    h.event.capacityLimit = 4;
    Object.assign(ledgerOf(h), {capacity: 4,
      policyHash: deriveEventSeatPolicy(h.event).policyHash});
    const request = (data: unknown) => ({data,
      auth: {uid, token: {phone_number: phone}}}) as CallableRequest<unknown>;
    await assert.rejects(handle(request({action: "quote", eventId,
      placeCount: 5}), h.deps));
    const quoted = await handle(request({action: "quote", eventId,
      placeCount: 2}), h.deps);
    assert.equal(quoted.quote?.amountPaise, 20000);
    assert.equal(quoted.quote?.placeCount, 2);
    const prepare = {action: "prepare", eventId,
      requestId: "public_party_1", displayName: "Ada Guest",
      reviewedQuote: quoted.quote, inviteToken: null};
    const first = await handle(request(prepare), h.deps);
    assert.equal(first.payment?.status, "checkoutReady");
    assert.equal(first.payment?.amountPaise, 20000);
    assert.equal(first.payment?.placeCount, 2);
    assert.equal(first.payment?.checkout?.amountPaise, 20000);
    assert.equal(first.payment?.checkout?.description,
      "Sunday Run · 2 places");
    assert.equal(ledgerOf(h).checkoutHeld, 2);
    h.observe({amount: 20000});
    const admittedView = await handle(request({action: "status",
      paymentId: first.payment!.paymentId,
      callback: {paymentId: "pay_one", signature: "b".repeat(64)}}), h.deps);
    assert.equal(admittedView.payment?.status, "admitted");
    assert.equal(admittedView.admission?.placeCount, 2);
    assert.equal(ledgerOf(h).occupied, 2);
    const found = await handle(request({action: "find", eventId}), h.deps);
    assert.equal(found.payment?.placeCount, 2);
    assert.equal(found.payment?.cancellationQuote?.refundAmountPaise, 20000);
    const cancelled = await handle(request({action: "cancelAdmission",
      paymentId: first.payment!.paymentId,
      expectedRefundAmountPaise: 20000}), h.deps);
    assert.equal(cancelled.payment?.status, "refundPending");
    assert.equal(cancelled.payment?.placeCount, 2);
    assert.equal(ledgerOf(h).occupied, 0);
    assert.equal(eventOf(h).bookedCount, 0);
    // The refund worker returns the whole order to the provider.
    const processor = await h.execution({paymentId:
      first.payment!.paymentId});
    await processor.reconcile();
    const refunded = await handle(request({action: "status",
      paymentId: first.payment!.paymentId, callback: null}), h.deps);
    assert.equal(refunded.payment?.refundedAmountPaise, 20000);
    assert.equal(refunded.payment?.status, "refunded");
  });
