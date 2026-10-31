import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {eventId, org} from
  "../../organizerFormAdmission/admissionTestFixture";
import type {RouteTransferSettlement} from
  "../formPayments/razorpayRouteProvider";
import {cancelPaidOfferForCancelledEvent} from "./offerPaymentCancellation";
import {capturedFixture, uid} from "./offerPaymentTestFixture";
import {OFFER_PAYMENT_COLLECTION, parseOfferPayment} from
  "./offerPaymentReservation";
import {reconcileOfferSettlement} from "./offerPaymentSettlement";

async function fixture() {
  const h = await capturedFixture();
  await h.finalize();
  const path = `${OFFER_PAYMENT_COLLECTION}/${h.paymentId}`;
  const payment = () => parseOfferPayment(h.store.get(path), h.paymentId);
  const settlement = () => payment().settlement!;
  const event = h.store.get(`events/${eventId}`)!;
  event.endTime = Timestamp.fromMillis(5_500_000);
  const plan = {eventId, organizerId: org,
    playbookId: "casual", selectedModuleIds: [], targetAttendeeCount: 2,
    hostGoal: "Meet people", wingmanRequestsEnabled: false,
    contextualOpenersEnabled: false, activeStepIndex: 0,
    status: "complete", liveControlRevision: 2,
    createdAt: Timestamp.fromMillis(1000),
    updatedAt: Timestamp.fromMillis(5_400_000),
    completedAt: Timestamp.fromMillis(5_400_000)};
  h.store.put(`eventSuccessPlans/${eventId}`, plan);
  let at = 6_000_000;
  let releaseCount = 0;
  let inspectCount = 0;
  let loseResponse = false;
  let duringInspect: () => void = () => undefined;
  let observed: RouteTransferSettlement = {transferId: "trf_one",
    orderId: "order_one", onHold: true, settlementStatus: "on_hold"};
  const run = () => reconcileOfferSettlement({db: h.store.db(),
    paymentId: h.paymentId}, {now: () => at, binding: async () => ({
    inspect: async () => {
      inspectCount++;
      duringInspect();
      return {...observed};
    },
    release: async (id) => {
      assert.equal(id, "trf_one");
      assert.equal(settlement().state, "releasePending");
      assert.ok(settlement().authorizedAtMillis);
      releaseCount++;
      observed = {...observed, onHold: false, settlementStatus: "pending"};
      if (loseResponse) throw new Error("Response lost");
      return observed;
    },
  })});
  return {...h, path, payment, settlement, event, plan, run,
    counts: () => ({releaseCount, inspectCount}),
    advance: (millis = 24 * 3600_000) => {
      at += millis;
    },
    loseResponse: () => {
      loseResponse = true;
    },
    duringInspect: (action: () => void) => {
      duringInspect = action;
    },
    observed: (value: Partial<RouteTransferSettlement>) => {
      observed = {...observed, ...value};
    },
  };
}

test("early completion releases only after end and settles separately",
  async () => {
    const h = await fixture();
    await h.run();
    assert.equal(h.settlement().state, "released");
    assert.equal(h.settlement().settledAtMillis, null);
    assert.equal(h.payment().status, "admitted");
    assert.equal(h.counts().releaseCount, 1);
    await h.run();
    assert.equal(h.counts().inspectCount, 1);
    h.advance();
    h.observed({settlementStatus: "settled"});
    await h.run();
    assert.equal(h.settlement().state, "settled");
    assert.ok(h.settlement().settledAtMillis);
    h.advance();
    await h.run();
    assert.deepEqual(h.counts(), {releaseCount: 1, inspectCount: 2});
  });

test("missing completion, cancelled event and unelapsed end never release",
  async () => {
    const mutations: Array<(h: Awaited<ReturnType<typeof fixture>>) => void> = [
      (h) => {
        h.plan.status = "live";
      },
      (h) => {
        h.event.status = "cancelled";
      },
      (h) => {
        h.event.endTime = Timestamp.fromMillis(7_000_000);
      },
      (h) => {
        delete (h.plan as Record<string, unknown>).completedAt;
      },
      (h) => {
        h.plan.organizerId = "other";
      },
      (h) => {
        h.plan.completedAt = Timestamp.fromMillis(7_000_000);
      },
      (h) => {
        const receipt = h.store.get("organizerFormAdmissionReceipts/" +
          h.payment().admissionReceiptId)!;
        h.store.get(`eventAttendees/${receipt.attendeeId}`)!
          .status = "cancelled";
      },
    ];
    for (const change of mutations) {
      const h = await fixture();
      change(h);
      await h.run();
      assert.deepEqual(h.counts(), {releaseCount: 0, inspectCount: 0});
      assert.equal(h.settlement().state, "waiting");
    }
  });

test("cancellation during provider inspection prevents release authorization",
  async () => {
    const h = await fixture();
    h.duringInspect(() => {
      h.event.status = "cancelled";
    });
    await h.run();
    assert.equal(h.counts().releaseCount, 0);
    assert.equal(h.settlement().state, "blocked");
    assert.equal(h.settlement().authorizedAtMillis, null);
  });

test("lost release response recovers provider fact after event cancellation",
  async () => {
    const h = await fixture();
    h.loseResponse();
    await assert.rejects(h.run(), /Response lost/u);
    assert.equal(h.settlement().state, "releasePending");
    h.event.status = "cancelled";
    h.advance();
    await h.run();
    assert.equal(h.settlement().state, "released");
    assert.equal(h.counts().releaseCount, 1);
  });

test("externally released transfer without a Catch intent requires review",
  async () => {
    const h = await fixture();
    h.observed({onHold: false, settlementStatus: "pending"});
    await h.run();
    assert.equal(h.settlement().state, "reviewRequired");
    assert.equal(h.counts().releaseCount, 0);
    assert.equal(h.settlement().releasedAtMillis, null);
  });

test("corrupt paid receipt cannot authorize any settlement I/O", async () => {
  const h = await fixture();
  h.store.get("organizerFormAdmissionReceipts/" +
    h.payment().admissionReceiptId)!.requestHash = "a".repeat(64);
  await assert.rejects(h.run());
  assert.deepEqual(h.counts(), {releaseCount: 0, inspectCount: 0});
});

test("active lease and stale owner cannot release or overwrite a new owner",
  async () => {
    const h = await fixture();
    h.duringInspect(() => {
      h.store.get(h.path)!.settlement = {...h.settlement(),
        leaseId: "b".repeat(32), leaseUntilMillis: 10_000_000};
    });
    await h.run();
    assert.equal(h.counts().releaseCount, 0);
    assert.equal(h.settlement().leaseId, "b".repeat(32));
    await h.run();
    assert.equal(h.counts().inspectCount, 1);
  });

test("no-refund guest cancellation settles only after the event completes",
  async () => {
    const h = await fixture();
  h.store.get(h.path)!.cancellationPolicy = {
    refundDeadlineMillis: 2000, eventStartsAtMillis: 5_000_000};
  await cancelPaidOfferForCancelledEvent({db: h.store.db(), paymentId:
    h.paymentId,
  nowMillis: 3000, guest: {uid, expectedRefundAmountPaise: 0}});
  h.plan.status = "live";
  await h.run();
  assert.equal(h.counts().releaseCount, 0);
  h.plan.status = "complete";
  h.advance();
  await h.run();
  assert.equal(h.counts().releaseCount, 1);
  assert.equal(h.payment().status, "cancelled");
  });

test("no-refund receipt survives a later registration using the same row",
  async () => {
    const h = await fixture();
    h.store.get(h.path)!.cancellationPolicy = {
      refundDeadlineMillis: 2000, eventStartsAtMillis: 5_000_000};
    await cancelPaidOfferForCancelledEvent({db: h.store.db(),
      paymentId: h.paymentId, nowMillis: 3000,
      guest: {uid, expectedRefundAmountPaise: 0}});
    const receipt = h.store.get("organizerFormAdmissionReceipts/" +
      h.payment().admissionReceiptId)!;
    Object.assign(h.store.get(`eventAttendees/${receipt.attendeeId}`)!, {
      status: "registered", revenueOrderReference: "order_later",
      revenueAmountMinor: 20000});
    await h.run();
    assert.equal(h.counts().releaseCount, 1);
    assert.equal(h.payment().status, "cancelled");
  });
