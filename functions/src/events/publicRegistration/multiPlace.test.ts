import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import type {
  EventDocument,
  OrganizerDocument,
} from "../../shared/generated/firestoreAdminTypes";
import {validateManagePublicEventCheckoutCallablePayload as validInput} from
  "../../shared/generated/validators/managePublicEventCheckoutInput";
import {validateEventAttendeeDocument} from
  "../../shared/generated/validators/eventAttendeeDocument";
import {canonicalJson} from "../eventSetupPreferences/resolve";
import {hostMembershipId} from "../../hostMemberships/ids";
import {publicHostMembershipQuoteTerms} from
  "../../hostMemberships/publicCheckout";
import {plan as membershipPlan, planId as membershipPlanId} from
  "../../hostMemberships/testFixture";
import {CHECKOUT_HOLD_MILLIS} from "../seatAuthority/seatAuthority";
import {deriveEventSeatPolicy} from "../seatAuthority/firestoreAdapter";
import {cancelPaidEventAdmission} from
  "../../payments/eventCheckout/eventPaymentCancellation";
import {releaseEventPaymentHold} from
  "../../payments/eventCheckout/eventPaymentExpiry";
import type {Store} from "../../organizerFormAdmission/admissionTestFixture";
import {managePublicEventCheckoutHandler as handle} from "./callables";
import {
  publicCheckoutQuote,
  publicGuestNames,
  MAX_PUBLIC_BOOKING_PLACES,
} from "./policy";
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
import {publicFixture, eventId, uid, phone, now, org} from "./testFixture";

/** The people a booker brings, in the order they name them. */
const GUESTS = ["Arjun", "Meera", "Kabir"];
const guestsFor = (places: number) => GUESTS.slice(0, places - 1);

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
    reviewedQuote: quoteFor(places), guestNames: guestsFor(places),
    routing: h.routingFor(10000 * places), ...patch});
  return {...h, quoteFor, reserveFor};
}

/**
 * The in-memory store reads only inside transactions. Membership savings are
 * recorded after admission with direct reads and a create, so give its
 * references those methods too.
 */
function withDirectReads(store: Store) {
  const base = store.collection.bind(store);
  const read = (ref: unknown) =>
    store.runTransaction((tx) => tx.get(ref as FirebaseFirestore.Query));
  type Query = Record<string, (...args: never[]) => unknown>;
  const wrap = (query: Query): Query => ({...query,
    get: () => read(query),
    where: (...args: never[]) => wrap(query.where(...args) as Query),
    orderBy: (...args: never[]) => wrap(query.orderBy(...args) as Query),
    limit: (...args: never[]) => {
      const limited = query.limit(...args) as Query;
      return {...limited, get: () => read(limited)};
    }});
  store.collection = ((name: string) => {
    const collection = base(name);
    return {...collection,
      where: (...args: Parameters<typeof collection.where>) =>
        wrap(collection.where(...args) as unknown as Query),
      doc: (id: string) => {
        const ref = collection.doc(id);
        return {...ref, get: () => read(ref),
          create: async (value: Record<string, unknown>) => {
            assert.equal(store.rows.has(ref.path), false);
            store.put(ref.path, value);
          }};
      }};
  }) as unknown as Store["collection"];
}

/** An active paid host membership whose plan takes 20% off: a ₹100 event
 * costs the member ₹80. */
function seedMember(store: Store) {
  withDirectReads(store);
  store.put(`hostMembershipPlans/${membershipPlanId}`,
    membershipPlan({organizerId: org,
      benefits: [{type: "eventDiscount", percentOff: 20}]}) as unknown as
      Record<string, unknown>);
  store.put(`hostMemberships/${hostMembershipId(org, uid)}`, {
    schemaVersion: 1, organizerId: org, uid, planId: membershipPlanId,
    planName: "Sunday Runners", interval: "monthly", status: "active",
    statusReason: null, priceInPaise: 49900, currency: "INR",
    currentPeriodStartMillis: 1, currentPeriodEndMillis: 1_000_000_000_000,
    trialEndsAtMillis: null, cancelAtPeriodEnd: false, pause: null,
    pastDueSinceMillis: null, memberSinceMillis: 1,
    tenure: {accumulatedMillis: 0, stretchStartedAtMillis: 0},
    provider: "razorpay", providerSubscriptionId: "sub_TestSub1",
    providerPlanId: "plan_TestPlan1", providerEventAtMillis: 1,
    lastCheckoutId: "hmc_AbCdEfGhIjKlMnOpQrSt", revision: 1,
    createdAtMillis: 1, updatedAtMillis: 1});
}

const memberTerms = {priceInPaise: 8000, listPriceInPaise: 10000};
const benefitUseOf = (h: {store: Store}) =>
  h.store.get(`hostMembershipBenefitUses/${eventId}_${uid}`);

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
  assert.equal("memberPlaceCount" in party, false);
  assert.equal("guestUnitAmountPaise" in party, false);
  for (const places of [0, -1, 1.5, 5, NaN]) {
    assert.throws(() => h.quoteFor(places), /between 1 and 4/u);
  }
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

test("a member pays the member price for one place and list for guests",
  async () => {
    const h = await roomy();
    const memberQuote = (places: number) => publicCheckoutQuote(eventId,
      h.event as unknown as EventDocument,
      h.organizer as unknown as OrganizerDocument, now, false, memberTerms,
      places);
    {
      // One member place keeps today's exact quote, byte for byte.
      const single = memberQuote(1);
      const base = h.quote();
      assert.equal(JSON.stringify(single), JSON.stringify({
        eventId: base.eventId, eventName: base.eventName,
        registrationRevision: base.registrationRevision,
        startTimeMillis: base.startTimeMillis, amountPaise: 8000,
        listAmountPaise: 10000, currency: "INR",
        cancellationPolicy: base.cancellationPolicy}));
      // The member's own place at ₹80, each guest at the ₹100 list price.
      const party = memberQuote(3);
      assert.deepEqual({...party, cancellationPolicy: undefined}, {
        eventId, eventName: "Sunday Run", registrationRevision: 1,
        startTimeMillis: 100_000_000, amountPaise: 28000,
        unitAmountPaise: 8000, placeCount: 3, memberPlaceCount: 1,
        guestUnitAmountPaise: 10000, listAmountPaise: 10000,
        currency: "INR", cancellationPolicy: undefined});
      assert.equal(memberQuote(4).amountPaise, 38000);
      // The reviewed quote carries the breakdown through the contract.
      assert.equal(validInput({action: "prepare", eventId,
        requestId: "public_member1", displayName: "Riya",
        guestNames: ["Arjun", "Meera"], reviewedQuote: party,
        inviteToken: null}), true);
      assert.equal(validInput({action: "prepare", eventId,
        requestId: "public_member1", displayName: "Riya",
        guestNames: ["Arjun", "Meera"],
        reviewedQuote: {...party, memberPlaceCount: 2}, inviteToken: null}),
      false);
    }
  });

test("a member party is charged, admitted, receipted and refunded as one " +
  "order", async () => {
  const h = await roomy();
  seedMember(h.store);
  const quote = await h.store.db().runTransaction(async (tx) =>
    publicCheckoutQuote(eventId, h.event as unknown as EventDocument,
      h.organizer as unknown as OrganizerDocument, now, false,
      await publicHostMembershipQuoteTerms({db: h.store.db(), tx, eventId,
        event: h.event as unknown as EventDocument, uid, nowMillis: now}),
      3));
  assert.equal(quote.amountPaise, 28000);
  assert.equal(quote.memberPlaceCount, 1);
  // A reviewed quote without the member breakdown is stale terms.
  await assert.rejects(h.reserveFor(3, {routing: h.routingFor(30000)}),
    /Event terms changed/u);
  const reserved = await h.reserveFor(3, {reviewedQuote: quote,
    routing: h.routingFor(28000)});
  assert.ok("payment" in reserved);
  const {paymentId} = reserved;
  const stored = h.store.get(`${PUBLIC_PAYMENT_COLLECTION}/${paymentId}`)!;
  assert.equal(stored.amountPaise, 28000);
  assert.equal(stored.unitAmountPaise, 8000);
  assert.equal(stored.memberPlaceCount, 1);
  assert.equal(stored.guestUnitAmountPaise, 10000);
  assert.equal((stored.routing as {amountMinor: number}).amountMinor, 28000);
  assert.equal(ledgerOf(h).checkoutHeld, 3);
  Object.assign(stored, {status: "captured", providerOrderId: "order_party",
    providerPaymentId: "pay_party",
    capturedAt: Timestamp.fromMillis(now + 10)});
  assert.equal(await finalizePublicPayment({db: h.store.db(), paymentId,
    nowMillis: now + 20, loadCurrentAuthUser: h.auth}), "admitted");
  // Writes replace the stored row, so read it again after each one.
  const current = () => parsePublicPayment(
    h.store.get(`${PUBLIC_PAYMENT_COLLECTION}/${paymentId}`), paymentId);
  const p = current();
  // The receipt and the roster revenue are the whole order.
  const receipt = h.store.get(
    `${PUBLIC_ADMISSION_COLLECTION}/${p.admissionReceiptId}`)!;
  assert.equal(receipt.amountPaise, 28000);
  assert.equal(receipt.placeCount, 3);
  const attendee = h.store.get(`eventAttendees/${p.attendeeId}`)!;
  assert.equal(attendee.revenueAmountMinor, 28000);
  assert.equal(attendee.partySize, 3);
  // The membership benefit counts one member place: ₹80 against ₹100.
  const use = benefitUseOf(h)!;
  assert.equal(use.listPriceInPaise, 10000);
  assert.equal(use.paidPriceInPaise, 8000);
  assert.equal(use.savingsInPaise, 2000);
  const view = await projectPublicPayment({db: h.store.db(), paymentId, uid,
    nowMillis: now + 30, loadCurrentAuthUser: h.auth});
  assert.equal(view.payment?.amountPaise, 28000);
  assert.equal(view.payment?.unitAmountPaise, 8000);
  assert.equal(view.payment?.memberPlaceCount, 1);
  assert.equal(view.payment?.guestUnitAmountPaise, 10000);
  assert.equal(view.payment?.cancellationQuote?.refundAmountPaise, 28000);
  // The frozen policy refunds the whole order, never a per-place guess.
  const cancel = (expectedRefundAmountPaise: number) =>
    cancelPaidEventAdmission({db: h.store.db(), paymentId,
      nowMillis: now + 30, ledger: publicPaymentLedger,
      readAdmission: readPublicPaidAdmission,
      guest: {uid, expectedRefundAmountPaise}});
  for (const wrong of [8000, 10000, 24000, 30000]) {
    await assert.rejects(cancel(wrong));
  }
  assert.equal(await cancel(28000), true);
  assert.equal(current().cancellation?.refundAmountPaise, 28000);
  assert.equal(current().status, "refundPending");
  assert.equal(ledgerOf(h).occupied, 0);
});

test("a non-member party records no membership savings", async () => {
  const h = await admitted(3);
  withDirectReads(h.store);
  assert.equal(benefitUseOf(h), undefined);
  const p = h.payment();
  assert.equal(p.memberPlaceCount, undefined);
  assert.equal(p.guestUnitAmountPaise, undefined);
});

test("a stored member breakdown must add up to the order", async () => {
  const h = await admitted(3);
  const row = h.store.get(`${PUBLIC_PAYMENT_COLLECTION}/${h.paymentId}`)!;
  const parse = (patch: Record<string, unknown>) => () =>
    parsePublicPayment({...row, ...patch}, h.paymentId);
  assert.doesNotThrow(parse({}));
  // Either breakdown field alone is incomplete.
  assert.throws(parse({memberPlaceCount: 1}));
  assert.throws(parse({guestUnitAmountPaise: 10000}));
  // A member party of three at 80 + 2 x 100 is 280, not 300.
  assert.throws(parse({memberPlaceCount: 1, guestUnitAmountPaise: 10000,
    unitAmountPaise: 8000}));
  assert.doesNotThrow(() => parsePublicPayment({...row, amountPaise: 28000,
    routing: h.routingFor(28000), unitAmountPaise: 8000,
    memberPlaceCount: 1, guestUnitAmountPaise: 10000}, h.paymentId));
  // One place has no guests to price.
  const one: Record<string, unknown> = {...row, amountPaise: 8000,
    routing: h.routingFor(8000), placeCount: 1, unitAmountPaise: 8000};
  delete one.guestNames;
  assert.doesNotThrow(() => parsePublicPayment(one, h.paymentId));
  assert.throws(() => parsePublicPayment({...one, memberPlaceCount: 1,
    guestUnitAmountPaise: 10000}, h.paymentId));
  // A party must name every guest, and a single place names none.
  const named = {...row};
  delete named.guestNames;
  assert.throws(() => parsePublicPayment(named, h.paymentId));
  assert.throws(parse({guestNames: ["Arjun"]}));
  assert.throws(() => parsePublicPayment({...one, guestNames: ["Arjun"]},
    h.paymentId));
});

test("a party names every guest, trimmed, before any hold", async () => {
  const h = await roomy();
  const reason = (expected: string) => (error: {code?: string;
    details?: {reason?: string}}) => {
    assert.equal(error.code, "invalid-argument");
    assert.equal(error.details?.reason, expected);
    return true;
  };
  for (const names of [undefined, [], ["Arjun"], [...GUESTS]]) {
    await assert.rejects(h.reserveFor(3, {guestNames: names}),
      reason("guestNamesCount"));
  }
  await assert.rejects(h.reserveFor(3, {guestNames: ["Arjun"]}),
    /Add a name for each guest: 2 names for 3 places/u);
  for (const bad of ["   ", "Ar\u0007jun", "Ar\njun", "Ar\u0085jun",
    "x".repeat(81)]) {
    await assert.rejects(h.reserveFor(2, {guestNames: [bad]}),
      reason("guestNameInvalid"));
  }
  assert.equal(ledgerOf(h).checkoutHeld ?? 0, 0);
  assert.equal([...h.store.rows.keys()].some((key) =>
    key.startsWith(`${PUBLIC_PAYMENT_COLLECTION}/`)), false);
  // Names keep their letters, lose surrounding and repeated spaces, and may
  // use any script; 80 characters is the limit after trimming.
  assert.deepEqual(publicGuestNames(["  Riya   Sharma ", "मीरा",
    ` ${"y".repeat(80)} `], 4), ["Riya Sharma", "मीरा", "y".repeat(80)]);
  const reserved = await h.reserveFor(3,
    {guestNames: ["  Arjun  Rao ", "Meera"]});
  assert.ok("payment" in reserved);
  assert.deepEqual(reserved.payment.guestNames, ["Arjun Rao", "Meera"]);
  // The names are part of the request: a replay naming others is refused.
  await assert.rejects(h.reserveFor(3, {guestNames: ["Arjun Rao", "Kabir"]}),
    /reused/u);
  const replay = await h.reserveFor(3,
    {guestNames: ["Arjun Rao", "Meera"]});
  assert.ok("replayed" in replay && replay.replayed);
});

test("the payload contract bounds guest names", () => {
  const quote = {eventId, eventName: "Sunday Run", registrationRevision: 1,
    startTimeMillis: 100_000_000, amountPaise: 20000, unitAmountPaise: 10000,
    placeCount: 2, currency: "INR", cancellationPolicy: {
      refundDeadlineMillis: 0, eventStartsAtMillis: 100_000_000}};
  const prepare = (guestNames: unknown) => validInput({action: "prepare",
    eventId, requestId: "public_request1", displayName: "Riya",
    ...(guestNames === undefined ? {} : {guestNames}), reviewedQuote: quote,
    inviteToken: null});
  assert.equal(prepare(["Arjun"]), true);
  assert.equal(prepare(["मीरा"]), true);
  // The count against placeCount is the server's check, not the schema's.
  assert.equal(prepare(undefined), true);
  assert.equal(prepare([]), true);
  for (const bad of [[""], ["Ar\u0000jun"], ["Ar\tjun"], ["Ar\u009fjun"],
    ["x".repeat(81)], ["a", "b", "c", "d"], [7], "Arjun"]) {
    assert.equal(prepare(bad), false, JSON.stringify(bad));
  }
});

test("one place needs no guest names and keeps its request and row",
  async () => {
    const h = await roomy();
    await assert.rejects(h.reserveFor(1, {guestNames: ["Arjun"]}),
      /one place takes no guest names/u);
    const reserved = await h.reserve({});
    assert.ok("payment" in reserved);
    const p = reserved.payment;
    assert.equal("guestNames" in p, false);
    // An older client's single-place request hashes exactly as before, so
    // a replay across the deploy still matches.
    assert.equal(p.requestHash, createHash("sha256").update(canonicalJson({
      eventId, uid, phoneE164: phone, displayName: "Ada Guest",
      requestId: "public_request1", reviewedQuote: h.quote(),
      inviteLinkId: null})).digest("hex"));
    const empty = await h.reserve({guestNames: []});
    assert.ok("payment" in empty && empty.replayed);
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
  // One row holds the party: the booker's name and the guests' names.
  assert.equal(attendee.displayName, "Ada Guest");
  assert.deepEqual(attendee.guestNames, ["Arjun", "Meera"]);
  assert.equal(validateEventAttendeeDocument(attendee), true);
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
    assert.equal(h.store.get(`eventAttendees/${h.payment().attendeeId}`)
      ?.guestNames, undefined);
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
    // A party without a name for its guest is refused before any routing.
    const routes = h.calls.routes;
    for (const guestNames of [undefined, [], ["Riya", "Meera"]]) {
      await assert.rejects(handle(request({...prepare,
        ...(guestNames ? {guestNames} : {})}), h.deps),
      (error: {code?: string; details?: {reason?: string}}) => {
        assert.equal(error.code, "invalid-argument");
        assert.equal(error.details?.reason, "guestNamesCount");
        return true;
      });
    }
    await assert.rejects(handle(request({...prepare,
      guestNames: ["Ri\u0000ya"]}), h.deps),
    (error: {code?: string; message?: string}) => {
      assert.equal(error.code, "invalid-argument");
      assert.match(error.message ?? "", /guestNames\.0: must match pattern/u);
      return true;
    });
    assert.equal(h.calls.routes, routes);
    assert.equal(ledgerOf(h).checkoutHeld ?? 0, 0);
    const first = await handle(request({...prepare,
      guestNames: ["  Riya   Sen "]}), h.deps);
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
    // The host's guest list reads one row: "Ada Guest + Riya Sen".
    const row = h.store.get(`eventAttendees/${admittedView.admission!
      .attendeeId}`)!;
    assert.equal(row.partySize, 2);
    assert.equal(row.displayName, "Ada Guest");
    assert.deepEqual(row.guestNames, ["Riya Sen"]);
    // The guest's own view never echoes the names back.
    assert.equal(JSON.stringify(admittedView).includes("Riya"), false);
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

test("the callable charges a member party one member place end to end",
  async () => {
    const h = await processorFixture();
    const policy = h.event.eventPolicy as {admission: {capacityLimit: number}};
    policy.admission.capacityLimit = 4;
    h.event.capacityLimit = 4;
    Object.assign(ledgerOf(h), {capacity: 4,
      policyHash: deriveEventSeatPolicy(h.event).policyHash});
    seedMember(h.store);
    const request = (data: unknown) => ({data,
      auth: {uid, token: {phone_number: phone}}}) as CallableRequest<unknown>;
    // One member place is still today's quote.
    const single = await handle(request({action: "quote", eventId}), h.deps);
    assert.equal(single.quote?.amountPaise, 8000);
    assert.equal(single.quote?.listAmountPaise, 10000);
    assert.equal(single.quote?.placeCount, undefined);
    assert.equal(single.quote?.memberPlaceCount, undefined);
    const quoted = await handle(request({action: "quote", eventId,
      placeCount: 3}), h.deps);
    assert.equal(quoted.quote?.amountPaise, 28000);
    assert.equal(quoted.quote?.unitAmountPaise, 8000);
    assert.equal(quoted.quote?.guestUnitAmountPaise, 10000);
    assert.equal(quoted.quote?.memberPlaceCount, 1);
    const first = await handle(request({action: "prepare", eventId,
      requestId: "public_member_party", displayName: "Riya",
      guestNames: ["Arjun", "Meera"], reviewedQuote: quoted.quote,
      inviteToken: null}), h.deps);
    assert.equal(first.payment?.status, "checkoutReady");
    assert.equal(first.payment?.checkout?.amountPaise, 28000);
    assert.equal(first.payment?.memberPlaceCount, 1);
    assert.equal(first.payment?.guestUnitAmountPaise, 10000);
    assert.equal(first.payment?.checkout?.description,
      "Sunday Run · 3 places");
    h.observe({amount: 28000});
    const admittedView = await handle(request({action: "status",
      paymentId: first.payment!.paymentId,
      callback: {paymentId: "pay_one", signature: "b".repeat(64)}}), h.deps);
    assert.equal(admittedView.payment?.status, "admitted");
    assert.equal(admittedView.admission?.placeCount, 3);
    assert.equal(ledgerOf(h).occupied, 3);
    const row = h.store.get(`eventAttendees/${admittedView.admission!
      .attendeeId}`)!;
    assert.deepEqual(row.guestNames, ["Arjun", "Meera"]);
    assert.equal(row.revenueAmountMinor, 28000);
    assert.equal(benefitUseOf(h)?.paidPriceInPaise, 8000);
    assert.equal(benefitUseOf(h)?.savingsInPaise, 2000);
    const cancelled = await handle(request({action: "cancelAdmission",
      paymentId: first.payment!.paymentId,
      expectedRefundAmountPaise: 28000}), h.deps);
    assert.equal(cancelled.payment?.status, "refundPending");
    assert.equal(ledgerOf(h).occupied, 0);
    const processor = await h.execution({paymentId:
      first.payment!.paymentId});
    await processor.reconcile();
    const refunded = await handle(request({action: "status",
      paymentId: first.payment!.paymentId, callback: null}), h.deps);
    assert.equal(refunded.payment?.refundedAmountPaise, 28000);
    assert.equal(refunded.payment?.status, "refunded");
  });
