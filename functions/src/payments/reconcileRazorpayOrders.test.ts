import {prepareNativePaidBooking} from "./nativeBooking";
import assert from "node:assert/strict";
import test from "node:test";
import Razorpay from "razorpay";
import {reconcileRazorpayOrdersHandler} from "./reconcileRazorpayOrders";

const runtimeProjectId = "catchdates-dev";
const localOwnership = {projectId: runtimeProjectId, schema: "1" as const};

test("reconcileRazorpayOrdersHandler fulfills a stale captured order",
  async () => {
    const firestore = new FakeFirestore({
      "razorpayPendingOrders/order_stale": {
        provider: "razorpay",
        orderId: "order_stale",
        userId: "runner-1",
        eventId: "trusted-event",
        amountInPaise: 25000,
        currency: "INR",
        razorpayOwnership: localOwnership,
        status: "pending",
        createdAt: ts(0),
      },
    });
    const signUps: Array<{eventId: string; userId: string}> = [];

    const summary = await reconcileRazorpayOrdersHandler({
      firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
      createClient: () => razorpayClient({
        payments: [{
          id: "pay_stale",
          order_id: "order_stale",
          amount: 25000,
          currency: "INR",
          status: "captured",
          refund_status: "null",
        }],
      }),
      now: () => new Date(60 * 60 * 1000),
      timestampFromDate: (date) =>
        ts(date.getTime()) as unknown as FirebaseFirestore.Timestamp,
      serverTimestamp: () => "server-now",
      signUpForEvent: async (_db, eventId, userId, paymentId, options) => {
        signUps.push({eventId, userId});
        await _db.runTransaction(async (tx) => {
          (await prepareNativePaidBooking({db: _db, tx, eventId, userId,
            paymentId, booking: options!.paidBooking!}))();
        });
      },
      graceMs: 15 * 60 * 1000,
      batchLimit: 25,
      runtimeProjectId: () => runtimeProjectId,
    });

    assert.deepEqual(summary, {processed: 1, fulfilled: 1, expired: 0});
    assert.deepEqual(signUps, [{eventId: "trusted-event", userId: "runner-1"}]);
    const payment = firestore.data["guestPayments/pay_stale"] as
      Record<string, unknown>;
    assert.equal(payment.status, "completed");
    assert.equal(payment.orderId, "order_stale");
    // Fulfillment removes the pending tracking doc.
    assert.equal(
      firestore.data["razorpayPendingOrders/order_stale"],
      undefined
    );
  });

test("reconcileRazorpayOrdersHandler expires an order with no captured payment",
  async () => {
    const firestore = new FakeFirestore({
      "razorpayPendingOrders/order_abandoned": {
        provider: "razorpay",
        orderId: "order_abandoned",
        userId: "runner-1",
        eventId: "trusted-event",
        amountInPaise: 25000,
        currency: "INR",
        razorpayOwnership: localOwnership,
        status: "pending",
        createdAt: ts(0),
      },
    });

    const summary = await reconcileRazorpayOrdersHandler({
      firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
      createClient: () => razorpayClient({payments: []}),
      now: () => new Date(60 * 60 * 1000),
      timestampFromDate: (date) =>
        ts(date.getTime()) as unknown as FirebaseFirestore.Timestamp,
      serverTimestamp: () => "server-now",
      signUpForEvent: async () => {
        throw new Error("signUpForEvent should not be called.");
      },
      graceMs: 15 * 60 * 1000,
      batchLimit: 25,
      runtimeProjectId: () => runtimeProjectId,
    });

    assert.deepEqual(summary, {processed: 1, fulfilled: 0, expired: 1});
    assert.deepEqual(
      firestore.data["razorpayPendingOrders/order_abandoned"],
      {
        provider: "razorpay",
        orderId: "order_abandoned",
        userId: "runner-1",
        eventId: "trusted-event",
        amountInPaise: 25000,
        currency: "INR",
        razorpayOwnership: localOwnership,
        status: "expired",
        createdAt: ts(0),
        updatedAt: "server-now",
      }
    );
  });

test(
  "reconcileRazorpayOrdersHandler fulfills a failed order that was recaptured",
  async () => {
    // A payment.failed webhook already moved this order to "failed", but the
    // user retried and a later attempt on the SAME order was captured. The
    // sweep must still pick it up ("failed" stays sweep-eligible) and fulfill.
    const firestore = new FakeFirestore({
      "razorpayPendingOrders/order_stale": {
        provider: "razorpay",
        orderId: "order_stale",
        userId: "runner-1",
        eventId: "trusted-event",
        amountInPaise: 25000,
        currency: "INR",
        razorpayOwnership: localOwnership,
        status: "failed",
        createdAt: ts(0),
      },
    });
    const signUps: Array<{eventId: string; userId: string}> = [];

    const summary = await reconcileRazorpayOrdersHandler({
      firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
      createClient: () => razorpayClient({
        payments: [{
          id: "pay_recaptured",
          order_id: "order_stale",
          amount: 25000,
          currency: "INR",
          status: "captured",
          refund_status: "null",
        }],
      }),
      now: () => new Date(60 * 60 * 1000),
      timestampFromDate: (date) =>
        ts(date.getTime()) as unknown as FirebaseFirestore.Timestamp,
      serverTimestamp: () => "server-now",
      signUpForEvent: async (_db, eventId, userId, paymentId, options) => {
        signUps.push({eventId, userId});
        await _db.runTransaction(async (tx) => {
          (await prepareNativePaidBooking({db: _db, tx, eventId, userId,
            paymentId, booking: options!.paidBooking!}))();
        });
      },
      graceMs: 15 * 60 * 1000,
      batchLimit: 25,
      runtimeProjectId: () => runtimeProjectId,
    });

    assert.deepEqual(summary, {processed: 1, fulfilled: 1, expired: 0});
    assert.deepEqual(signUps, [{eventId: "trusted-event", userId: "runner-1"}]);
    const payment = firestore.data["guestPayments/pay_recaptured"] as
      Record<string, unknown>;
    assert.equal(payment.status, "completed");
    // Fulfillment removes the tracking doc once the booking succeeds.
    assert.equal(
      firestore.data["razorpayPendingOrders/order_stale"],
      undefined
    );
  });

test("ownership: wrong-environment order has zero reconciliation effects",
  async () => {
    const result = await runOwnershipCase({
      orderNotes: {
        eventId: "trusted-event",
        userId: "runner-1",
        catchBookingProject: "catch-dating-app-64e51",
        catchBookingSchema: "1",
      },
      payments: [capturedPayment("order_case", "pay_foreign")],
    });

    assert.deepEqual(result.summary,
      {processed: 1, fulfilled: 0, expired: 0});
    assert.equal(result.fetchPayments, 0);
    assert.equal(result.signUps, 0);
    assert.equal(JSON.stringify(domainData(result.firestore.data)),
      result.before);
  });

test("ownership: missing provider owner cannot expire a local pending order",
  async () => {
    const result = await runOwnershipCase({
      orderNotes: {eventId: "trusted-event", userId: "runner-1"},
    });

    assert.deepEqual(result.summary,
      {processed: 1, fulfilled: 0, expired: 0});
    assert.equal(result.fetchPayments, 0);
    assert.equal(result.signUps, 0);
    assert.equal(JSON.stringify(domainData(result.firestore.data)),
      result.before);
  });

test("ownership: provider and frozen pending collision has zero effects",
  async () => {
    const result = await runOwnershipCase({
      pendingOwnership: {
        projectId: "catch-dating-app-64e51",
        schema: "1",
      },
      payments: [capturedPayment("order_case", "pay_collision")],
    });

    assert.deepEqual(result.summary,
      {processed: 1, fulfilled: 0, expired: 0});
    assert.equal(result.fetchPayments, 0);
    assert.equal(result.signUps, 0);
    assert.equal(JSON.stringify(domainData(result.firestore.data)),
      result.before);
  });

test("ownership control: exact completed recovery deletes only pending state",
  async () => {
    const paymentId = "pay_exact";
    const result = await runOwnershipCase({
      payments: [capturedPayment("order_case", paymentId)],
      existingPayment: {
        status: "completed",
        signUpFailed: false,
        userId: "runner-1",
        eventId: "trusted-event",
        orderId: "order_case",
        paymentId,
        amount: 25000,
        amountMinor: 25000,
        currency: "INR",
        provider: "razorpay",
        razorpayOwnership: localOwnership,
      },
    });

    assert.deepEqual(result.summary,
      {processed: 1, fulfilled: 1, expired: 0});
    assert.equal(result.fetchPayments, 1);
    assert.equal(result.signUps, 0);
    assert.equal(result.firestore.data["razorpayPendingOrders/order_case"],
      undefined);
    assert.deepEqual(result.firestore.data[`guestPayments/${paymentId}`],
      result.existingPayment);
  });

test("ownership control: local expiry lookup failure remains retryable",
  async () => {
    const result = await runOwnershipCase({failPendingGet: true});

    assert.deepEqual(result.summary,
      {processed: 1, fulfilled: 0, expired: 0});
    assert.equal(result.fetchPayments, 1);
    assert.equal(result.signUps, 0);
    assert.equal(JSON.stringify(domainData(result.firestore.data)),
      result.before);
  });

test("durable discovery reaches owned work after a full quarantined page",
  async () => {
    const data: Record<string, unknown> = {};
    const foreignBefore: Record<string, unknown> = {};
    for (let index = 0; index < 25; index++) {
      const orderId = `order_foreign_${String(index).padStart(2, "0")}`;
      const pending = pendingOrder(orderId, 0);
      data[`razorpayPendingOrders/${orderId}`] = pending;
      foreignBefore[orderId] = pending;
    }
    data["razorpayPendingOrders/order_owned_26"] =
      pendingOrder("order_owned_26", 0);
    const firestore = new FakeFirestore(data);
    const signUps: string[] = [];
    let paymentLists = 0;
    const deps: Parameters<typeof reconcileRazorpayOrdersHandler>[0] = {
      firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
      createClient: () => razorpayClient({
        orderFor: (orderId) => ({notes: orderId === "order_owned_26" ? {
          eventId: "trusted-event",
          userId: "runner-1",
          catchBookingProject: runtimeProjectId,
          catchBookingSchema: "1",
        } : {
          eventId: "trusted-event",
          userId: "runner-1",
          catchBookingProject: "catch-dating-app-64e51",
          catchBookingSchema: "1",
        }}),
        paymentsFor: (orderId) => orderId === "order_owned_26" ?
          [capturedPayment(orderId, "pay_owned_26")] : [],
        onFetchPayments: () => {
          paymentLists++;
        },
      }),
      now: () => new Date(60 * 60 * 1000),
      timestampFromDate: (date: Date) =>
        ts(date.getTime()) as unknown as FirebaseFirestore.Timestamp,
      serverTimestamp: () => "server-now",
      signUpForEvent: async (_db, eventId, userId, paymentId, options) => {
        assert.ok(paymentId);
        signUps.push(paymentId);
        await _db.runTransaction(async (tx) => {
          (await prepareNativePaidBooking({db: _db, tx, eventId, userId,
            paymentId, booking: options!.paidBooking!}))();
        });
      },
      graceMs: 15 * 60 * 1000,
      batchLimit: 25,
      runtimeProjectId: () => runtimeProjectId,
    };

    const first = await reconcileRazorpayOrdersHandler(deps);
    assert.deepEqual(first, {processed: 25, fulfilled: 0, expired: 0});
    assert.equal(paymentLists, 0);
    assert.equal(signUps.length, 0);
    for (const [orderId, pending] of Object.entries(foreignBefore)) {
      assert.deepEqual(firestore.data[`razorpayPendingOrders/${orderId}`],
        pending);
    }
    assert.deepEqual(
      (firestore.data[
        "nativeRefundRecoveryCursors/pendingRazorpayOrders"
      ] as Record<string, unknown>).cursor,
      {nextAttemptOrderKey: "integer:0", paymentId: "order_foreign_24"}
    );

    const second = await reconcileRazorpayOrdersHandler(deps);
    assert.deepEqual(second, {processed: 1, fulfilled: 1, expired: 0});
    assert.equal(paymentLists, 1);
    assert.deepEqual(signUps, ["pay_owned_26"]);
    assert.equal(firestore.data["razorpayPendingOrders/order_owned_26"],
      undefined);
    assert.equal(
      (firestore.data[
        "nativeRefundRecoveryCursors/pendingRazorpayOrders"
      ] as Record<string, unknown>).cursor,
      null
    );
  });

test("durable discovery wraps and retries a provider lookup failure",
  async () => {
    const firstId = "order_lookup_retry";
    const secondId = "order_tail_owned";
    const firestore = new FakeFirestore({
      [`razorpayPendingOrders/${firstId}`]: pendingOrder(firstId, 0),
      [`razorpayPendingOrders/${secondId}`]: pendingOrder(secondId, 1000),
    });
    let firstAttempts = 0;
    const deps: Parameters<typeof reconcileRazorpayOrdersHandler>[0] = {
      firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
      createClient: () => razorpayClient({
        orderFor: (orderId) => {
          if (orderId === firstId && firstAttempts++ === 0) {
            throw new Error("Synthetic provider lookup failure.");
          }
          return {};
        },
        paymentsFor: () => [],
      }),
      now: () => new Date(60 * 60 * 1000),
      timestampFromDate: (date: Date) =>
        ts(date.getTime()) as unknown as FirebaseFirestore.Timestamp,
      serverTimestamp: () => "server-now",
      signUpForEvent: async () => {
        throw new Error("signUpForEvent should not be called.");
      },
      graceMs: 15 * 60 * 1000,
      batchLimit: 1,
      runtimeProjectId: () => runtimeProjectId,
    };

    assert.deepEqual(await reconcileRazorpayOrdersHandler(deps),
      {processed: 1, fulfilled: 0, expired: 0});
    assert.deepEqual(await reconcileRazorpayOrdersHandler(deps),
      {processed: 1, fulfilled: 0, expired: 1});
    // The full tail page leaves a continuation. One empty pass wraps it.
    assert.deepEqual(await reconcileRazorpayOrdersHandler(deps),
      {processed: 0, fulfilled: 0, expired: 0});
    assert.deepEqual(await reconcileRazorpayOrdersHandler(deps),
      {processed: 1, fulfilled: 0, expired: 1});
    assert.equal(firstAttempts, 2);
  });

test("committed short-tail discovery survives interruption before provider I/O",
  async () => {
    const orderId = "order_short_tail";
    const firestore = new FakeFirestore({
      [`razorpayPendingOrders/${orderId}`]: pendingOrder(orderId, 0),
      "nativeRefundRecoveryCursors/pendingRazorpayOrders": {
        stateId: "pendingRazorpayOrders",
        projectId: runtimeProjectId,
        schema: "1",
        revision: 1,
        cursor: {nextAttemptOrderKey: "integer:0",
          paymentId: "order_before_tail"},
        updatedAtMillis: 1,
      },
    });
    let interrupt = true;
    const deps: Parameters<typeof reconcileRazorpayOrdersHandler>[0] = {
      firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
      createClient: () => {
        if (interrupt) throw new Error("Interrupted before provider work.");
        return razorpayClient({payments: []});
      },
      now: () => new Date(60 * 60 * 1000),
      timestampFromDate: (date) =>
        ts(date.getTime()) as unknown as FirebaseFirestore.Timestamp,
      serverTimestamp: () => "server-now",
      signUpForEvent: async () => {
        throw new Error("signUpForEvent should not be called.");
      },
      graceMs: 15 * 60 * 1000,
      batchLimit: 25,
      runtimeProjectId: () => runtimeProjectId,
    };

    await assert.rejects(reconcileRazorpayOrdersHandler(deps),
      /Interrupted before provider work/u);
    assert.deepEqual(
      (firestore.data[
        "nativeRefundRecoveryCursors/pendingRazorpayOrders"
      ] as Record<string, unknown>).cursor,
      {nextAttemptOrderKey: "integer:0", paymentId: orderId}
    );
    assert.deepEqual(firestore.data[`razorpayPendingOrders/${orderId}`],
      pendingOrder(orderId, 0));

    interrupt = false;
    // The committed tail closes first, then wrap makes the row retryable.
    assert.deepEqual(await reconcileRazorpayOrdersHandler(deps),
      {processed: 0, fulfilled: 0, expired: 0});
    assert.deepEqual(await reconcileRazorpayOrdersHandler(deps),
      {processed: 1, fulfilled: 0, expired: 1});
  });

test("cursor preserves a maximum-size Firestore document id",
  async () => {
    const longId = "a".repeat(1500);
    const tailId = "z";
    const minimumTimestampMillis = -62_135_596_800_000;
    const firestore = new FakeFirestore({
      [`razorpayPendingOrders/${longId}`]:
        pendingOrder("order_foreign_long", minimumTimestampMillis),
      [`razorpayPendingOrders/${tailId}`]:
        pendingOrder("order_long_tail", minimumTimestampMillis),
    });
    const deps: Parameters<typeof reconcileRazorpayOrdersHandler>[0] = {
      firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
      createClient: () => razorpayClient({
        orderFor: (orderId) => ({notes: {
          eventId: "trusted-event",
          userId: "runner-1",
          catchBookingProject: orderId === "order_foreign_long" ?
            "catch-dating-app-64e51" : runtimeProjectId,
          catchBookingSchema: "1",
        }}),
        paymentsFor: () => [],
      }),
      now: () => new Date(60 * 60 * 1000),
      timestampFromDate: (date) =>
        ts(date.getTime()) as unknown as FirebaseFirestore.Timestamp,
      serverTimestamp: () => "server-now",
      signUpForEvent: async () => {
        throw new Error("signUpForEvent should not be called.");
      },
      graceMs: 15 * 60 * 1000,
      batchLimit: 1,
      runtimeProjectId: () => runtimeProjectId,
    };

    assert.deepEqual(await reconcileRazorpayOrdersHandler(deps),
      {processed: 1, fulfilled: 0, expired: 0});
    const cursor = (firestore.data[
      "nativeRefundRecoveryCursors/pendingRazorpayOrders"
    ] as {cursor: {paymentId: string}}).cursor;
    assert.equal(cursor.paymentId, longId);
    assert.equal(Buffer.byteLength(cursor.paymentId, "utf8"), 1500);
    assert.equal((firestore.data[
      "nativeRefundRecoveryCursors/pendingRazorpayOrders"
    ] as {cursor: {nextAttemptOrderKey: string}}).cursor.nextAttemptOrderKey,
    "integer:-62135596800000000000");
    assert.deepEqual(await reconcileRazorpayOrdersHandler(deps),
      {processed: 1, fulfilled: 0, expired: 1});
  });

test("concurrent cursor writers cannot overwrite newer progress", async () => {
  const orderId = "order_cursor_race";
  const gate = queryBarrier(2);
  const firestore = new FakeFirestore({
    [`razorpayPendingOrders/${orderId}`]: pendingOrder(orderId, 0),
  }, new Set(), gate);
  let providerFetches = 0;
  const deps: Parameters<typeof reconcileRazorpayOrdersHandler>[0] = {
    firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
    createClient: () => razorpayClient({
      orderFor: () => {
        providerFetches++;
        return {notes: {
          eventId: "trusted-event",
          userId: "runner-1",
          catchBookingProject: "catch-dating-app-64e51",
          catchBookingSchema: "1",
        }};
      },
    }),
    now: () => new Date(60 * 60 * 1000),
    timestampFromDate: (date) =>
      ts(date.getTime()) as unknown as FirebaseFirestore.Timestamp,
    serverTimestamp: () => "server-now",
    signUpForEvent: async () => undefined,
    graceMs: 15 * 60 * 1000,
    batchLimit: 25,
    runtimeProjectId: () => runtimeProjectId,
  };

  const results = await Promise.allSettled([
    reconcileRazorpayOrdersHandler(deps),
    reconcileRazorpayOrdersHandler(deps),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length,
    1);
  const rejected = results.find((result) => result.status === "rejected");
  assert.match(rejected?.status === "rejected" ?
    String(rejected.reason) : "", /cursor changed/u);
  assert.equal(providerFetches, 1);
});

test("foreign durable cursor authority stops before order discovery",
  async () => {
    const orderId = "order_cursor_authority";
    const pending = pendingOrder(orderId, 0);
    const firestore = new FakeFirestore({
      [`razorpayPendingOrders/${orderId}`]: pending,
      "nativeRefundRecoveryCursors/pendingRazorpayOrders": {
        stateId: "pendingRazorpayOrders",
        projectId: "catch-dating-app-64e51",
        schema: "1",
        revision: 1,
        cursor: null,
        updatedAtMillis: 1,
      },
    });
    let clients = 0;

    await assert.rejects(reconcileRazorpayOrdersHandler({
      firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
      createClient: () => {
        clients++;
        return razorpayClient();
      },
      now: () => new Date(60 * 60 * 1000),
      timestampFromDate: (date) =>
        ts(date.getTime()) as unknown as FirebaseFirestore.Timestamp,
      serverTimestamp: () => "server-now",
      signUpForEvent: async () => undefined,
      graceMs: 15 * 60 * 1000,
      batchLimit: 25,
      runtimeProjectId: () => runtimeProjectId,
    }), /cursor authority is invalid/u);
    assert.equal(clients, 0);
    assert.deepEqual(firestore.data[`razorpayPendingOrders/${orderId}`],
      pending);
  });

test("reconcileRazorpayOrdersHandler skips orders inside the grace window",
  async () => {
    const firestore = new FakeFirestore({
      "razorpayPendingOrders/order_fresh": {
        provider: "razorpay",
        orderId: "order_fresh",
        userId: "runner-1",
        eventId: "trusted-event",
        amountInPaise: 25000,
        currency: "INR",
        razorpayOwnership: localOwnership,
        status: "pending",
        // Created 5 minutes ago; inside the 15 minute grace window.
        createdAt: ts(55 * 60 * 1000),
      },
    });

    const summary = await reconcileRazorpayOrdersHandler({
      firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
      createClient: () => {
        throw new Error("Razorpay client should not be created.");
      },
      now: () => new Date(60 * 60 * 1000),
      timestampFromDate: (date) =>
        ts(date.getTime()) as unknown as FirebaseFirestore.Timestamp,
      serverTimestamp: () => "server-now",
      signUpForEvent: async () => undefined,
      graceMs: 15 * 60 * 1000,
      batchLimit: 25,
      runtimeProjectId: () => runtimeProjectId,
    });

    assert.deepEqual(summary, {processed: 0, fulfilled: 0, expired: 0});
    assert.equal(
      (firestore.data["razorpayPendingOrders/order_fresh"] as
        Record<string, unknown>).status,
      "pending"
    );
  });

async function runOwnershipCase(input: {
  failPendingGet?: boolean;
  orderNotes?: Record<string, unknown>;
  pendingOwnership?: {projectId: string; schema: "1"};
  payments?: Array<Record<string, unknown>>;
  existingPayment?: Record<string, unknown>;
}) {
  const orderId = "order_case";
  const pending = {
    provider: "razorpay",
    orderId,
    userId: "runner-1",
    eventId: "trusted-event",
    amountInPaise: 25000,
    currency: "INR",
    razorpayOwnership: input.pendingOwnership ?? localOwnership,
    status: "pending",
    createdAt: ts(0),
  };
  const data: Record<string, unknown> = {
    [`razorpayPendingOrders/${orderId}`]: pending,
  };
  const paymentId = String(input.payments?.[0]?.id ?? "pay_case");
  if (input.existingPayment) {
    data[`guestPayments/${paymentId}`] = input.existingPayment;
  }
  const firestore = new FakeFirestore(data, input.failPendingGet ?
    new Set([`razorpayPendingOrders/${orderId}`]) : new Set());
  const before = JSON.stringify(domainData(firestore.data));
  let fetchPayments = 0;
  let signUps = 0;
  const orderNotes = input.orderNotes ?? {
    eventId: "trusted-event",
    userId: "runner-1",
    catchBookingProject: runtimeProjectId,
    catchBookingSchema: "1",
  };

  const summary = await reconcileRazorpayOrdersHandler({
    firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
    createClient: () => razorpayClient({
      order: {notes: orderNotes},
      payments: input.payments,
      onFetchPayments: () => {
        fetchPayments++;
      },
    }),
    now: () => new Date(60 * 60 * 1000),
    timestampFromDate: (date) =>
      ts(date.getTime()) as unknown as FirebaseFirestore.Timestamp,
    serverTimestamp: () => "server-now",
    signUpForEvent: async (_db, eventId, userId, id, options) => {
      signUps++;
      await _db.runTransaction(async (tx) => {
        (await prepareNativePaidBooking({db: _db, tx, eventId, userId,
          paymentId: id, booking: options!.paidBooking!}))();
      });
    },
    graceMs: 15 * 60 * 1000,
    batchLimit: 25,
    runtimeProjectId: () => runtimeProjectId,
  });
  return {before, existingPayment: input.existingPayment, fetchPayments,
    firestore, signUps, summary};
}

function capturedPayment(orderId: string, paymentId: string) {
  return {id: paymentId, order_id: orderId, amount: 25000,
    currency: "INR", status: "captured", refund_status: "null"};
}

function pendingOrder(orderId: string, createdAtMillis: number) {
  return {
    provider: "razorpay",
    orderId,
    userId: "runner-1",
    eventId: "trusted-event",
    amountInPaise: 25000,
    currency: "INR",
    razorpayOwnership: localOwnership,
    status: "pending",
    createdAt: ts(createdAtMillis),
  };
}

function domainData(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).filter(([path]) =>
    !path.startsWith("nativeRefundRecoveryCursors/")));
}

interface FakeTimestamp {
  __millis: number;
  seconds: number;
  nanoseconds: number;
}

function ts(millis: number): FakeTimestamp {
  const seconds = Math.floor(millis / 1000);
  return {__millis: millis, seconds,
    nanoseconds: Math.floor((millis - seconds * 1000) * 1_000_000)};
}

function tsMillis(value: unknown): number {
  const timestamp = value as FakeTimestamp & {toMillis?: () => number};
  if (typeof timestamp.__millis === "number") return timestamp.__millis;
  if (timestamp.toMillis) return timestamp.toMillis();
  return timestamp.seconds * 1000 + timestamp.nanoseconds / 1_000_000;
}

function razorpayClient(
  overrides: {
    payments?: Array<Record<string, unknown>>;
    order?: Record<string, unknown>;
    orderFor?: (orderId: string) => Record<string, unknown>;
    paymentsFor?: (orderId: string) => Array<Record<string, unknown>>;
    onFetchPayments?: () => void;
  } = {}
): Razorpay {
  return {
    orders: {
      fetch: async (orderId: string) => ({
        id: orderId,
        amount: 25000,
        currency: "INR",
        amount_paid: 25000,
        amount_due: 0,
        notes: {
          eventId: "trusted-event",
          userId: "runner-1",
          catchBookingProject: runtimeProjectId,
          catchBookingSchema: "1",
        },
        ...overrides.order,
        ...overrides.orderFor?.(orderId),
      }),
      fetchPayments: async (orderId: string) => {
        overrides.onFetchPayments?.();
        const payments = overrides.paymentsFor?.(orderId) ??
          overrides.payments ?? [];
        return {
          entity: "collection",
          count: payments.length,
          items: payments,
        };
      },
    },
    payments: {
      refund: async () => {
        throw new Error("Refund should not be called.");
      },
    },
  } as unknown as Razorpay;
}

interface QueryFilter {
  field: string;
  op: FirebaseFirestore.WhereFilterOp;
  value: unknown;
}

class FakeFirestore {
  private transactionTail: Promise<void> = Promise.resolve();

  constructor(readonly data: Record<string, unknown>,
    readonly failingGets: ReadonlySet<string> = new Set(),
    readonly beforeQuery?: () => Promise<void>) {}

  collection(collectionPath: string) {
    return new FakeCollectionRef(this, collectionPath);
  }

  // Fulfillment completes the payment + bumps paidCount inside a transaction;
  // the fake forwards tx reads/writes to the doc refs.
  async runTransaction<T>(
    updateFn: (tx: {
      get: (ref: FakeDocRef) => Promise<unknown>;
      set: (
        ref: FakeDocRef,
        data: Record<string, unknown>,
        options?: {merge?: boolean}
      ) => void;
    }) => Promise<T>
  ): Promise<T> {
    const run = this.transactionTail.then(() => updateFn({
      get: (ref) => ref.get(),
      set: (ref, data, options) => {
        void ref.set(data, options);
      },
    }));
    this.transactionTail = run.then(() => undefined, () => undefined);
    return run;
  }
}

class FakeCollectionRef {
  constructor(
    private readonly firestore: FakeFirestore,
    private readonly collectionPath: string
  ) {}

  doc(id: string) {
    return new FakeDocRef(this.firestore, this.collectionPath, id);
  }

  where(field: string, op: FirebaseFirestore.WhereFilterOp, value: unknown) {
    return new FakeQuery(this.firestore, this.collectionPath, [
      {field, op, value},
    ]);
  }
}

class FakeQuery {
  constructor(
    private readonly firestore: FakeFirestore,
    private readonly collectionPath: string,
    private readonly filters: QueryFilter[],
    private readonly limitCount?: number,
    private readonly cursor?: [unknown, string]
  ) {}

  where(field: string, op: FirebaseFirestore.WhereFilterOp, value: unknown) {
    return new FakeQuery(
      this.firestore,
      this.collectionPath,
      [...this.filters, {field, op, value}],
      this.limitCount,
      this.cursor
    );
  }

  orderBy() {
    return this;
  }

  limit(limitCount: number) {
    return new FakeQuery(
      this.firestore,
      this.collectionPath,
      this.filters,
      limitCount,
      this.cursor
    );
  }

  startAfter(createdAt: unknown, orderId: string) {
    return new FakeQuery(this.firestore, this.collectionPath, this.filters,
      this.limitCount, [createdAt, orderId]);
  }

  async get() {
    await this.firestore.beforeQuery?.();
    const prefix = `${this.collectionPath}/`;
    let docs = Object.entries(this.firestore.data)
      .filter(([path]) => path.startsWith(prefix) &&
        !path.slice(prefix.length).includes("/"))
      .map(([path, data]) => ({
        id: path.slice(prefix.length),
        data: () => data,
      }))
      .filter((doc) => this.filters.every((filter) =>
        matchesFilter(doc.data(), filter)))
      .sort((left, right) => {
        const delta = tsMillis((left.data() as Record<string, unknown>)
          .createdAt) - tsMillis((right.data() as Record<string, unknown>)
          .createdAt);
        return delta || left.id.localeCompare(right.id);
      });
    if (this.cursor) {
      const [createdAt, orderId] = this.cursor;
      docs = docs.filter((doc) => {
        const delta = tsMillis((doc.data() as Record<string, unknown>)
          .createdAt) - tsMillis(createdAt);
        return delta > 0 || delta === 0 && doc.id > orderId;
      });
    }
    if (this.limitCount !== undefined) docs = docs.slice(0, this.limitCount);
    return {docs, empty: docs.length === 0};
  }
}

function queryBarrier(expected: number): () => Promise<void> {
  let arrived = 0;
  let release: (() => void) | undefined;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  return async () => {
    arrived++;
    if (arrived === expected) release?.();
    await ready;
  };
}

class FakeDocRef {
  readonly path: string;

  constructor(
    private readonly firestore: FakeFirestore,
    collectionPath: string,
    readonly id: string
  ) {
    this.path = `${collectionPath}/${id}`;
  }

  async get() {
    if (this.firestore.failingGets.has(this.path)) {
      throw new Error("Synthetic local lookup failure.");
    }
    const value = this.firestore.data[this.path];
    return {exists: value !== undefined, id: this.id, data: () => value};
  }

  async set(data: Record<string, unknown>, options?: {merge?: boolean}) {
    this.firestore.data[this.path] = options?.merge === true ?
      {
        ...(this.firestore.data[this.path] as Record<string, unknown>),
        ...data,
      } :
      data;
  }

  async delete() {
    delete this.firestore.data[this.path];
  }
}

function matchesFilter(data: unknown, filter: QueryFilter): boolean {
  const value = (data as Record<string, unknown>)[filter.field];
  if (filter.op === "==") return value === filter.value;
  if (filter.op === "in") {
    return Array.isArray(filter.value) && filter.value.includes(value);
  }
  if (filter.op === "<") return tsMillis(value) < tsMillis(filter.value);
  throw new Error(`Unsupported fake query op ${filter.op}`);
}
