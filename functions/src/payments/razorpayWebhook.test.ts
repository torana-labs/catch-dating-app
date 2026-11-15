import {Timestamp} from "firebase-admin/firestore";
import {prepareNativePaidBooking} from "./nativeBooking";
import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import test from "node:test";
import Razorpay from "razorpay";
import {razorpayWebhookHandler} from "./razorpayWebhook";

const WEBHOOK_SECRET = "whsec_razorpay_test";
process.env.GCLOUD_PROJECT = "catchdates-dev";
process.env.GCLOUDPROJECT = "catchdates-dev";

test(
  "razorpayWebhookHandler signs up and completes a captured payment",
  async () => {
    const firestore = new FakeFirestore({
      "guestPayments/pay_123": {purpose: "booking", status: "pending",
        createdAt: Timestamp.fromMillis(1)},
      "razorpayPendingOrders/order_123": {
        status: "pending",
        orderId: "order_123",
      },
    });
    const signUps: Array<{eventId: string; userId: string}> = [];
    const payload = capturedEventPayload();

    await razorpayWebhookHandler(
      payload,
      sign(payload),
      WEBHOOK_SECRET,
      {
        firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
        createClient: () => razorpayClient(),
        serverTimestamp: () => "server-now",
        signUpForEvent: async (_db, eventId, userId, paymentId, options) => {
          signUps.push({eventId, userId});
          await _db.runTransaction(async (tx) => {
            (await prepareNativePaidBooking({db: _db, tx, eventId, userId,
              paymentId, booking: options!.paidBooking!}))();
          });
        },
      }
    );

    assert.deepEqual(signUps, [{eventId: "trusted-event", userId: "runner-1"}]);
    const payment = firestore.data["guestPayments/pay_123"] as
      Record<string, unknown>;
    assert.equal(payment.status, "completed");
    assert.equal(payment.signUpFailed, false);
    assert.equal(payment.orderId, "order_123");
    assert.equal(payment.amount, 25000);
    assert.deepEqual(payment.razorpayOwnership,
      {projectId: "catchdates-dev", schema: "1"});
    // The pending-order tracking doc is removed once fulfillment succeeds.
    assert.equal(firestore.data["razorpayPendingOrders/order_123"], undefined);
  }
);

test(
  "razorpayWebhookHandler is idempotent when the callback already fulfilled",
  async () => {
    const completed = {status: "completed", userId: "runner-1",
      eventId: "trusted-event", orderId: "order_123",
      paymentId: "pay_123", amount: 25000, amountMinor: 25000,
      currency: "INR", provider: "razorpay",
      razorpayOwnership: {projectId: "catchdates-dev", schema: "1"},
      createdAt: Timestamp.fromMillis(1)};
    const firestore = new FakeFirestore({
      "guestPayments/pay_123": completed,
      "razorpayPendingOrders/order_123": {
        status: "pending",
        orderId: "order_123",
      },
    });
    let signUpCalled = false;
    const payload = capturedEventPayload();

    await razorpayWebhookHandler(payload, sign(payload), WEBHOOK_SECRET, {
      firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
      createClient: () => razorpayClient({
        refund: async () => {
          throw new Error("Refund should not run when already completed.");
        },
      }),
      serverTimestamp: () => "server-now",
      signUpForEvent: async () => {
        signUpCalled = true;
      },
    });

    assert.equal(signUpCalled, false);
    // The already-completed payment doc is left untouched.
    assert.deepEqual(firestore.data["guestPayments/pay_123"], completed);
    // The leftover pending-order doc is cleaned up.
    assert.equal(firestore.data["razorpayPendingOrders/order_123"], undefined);
  }
);

test("razorpayWebhookHandler marks the pending order failed on payment.failed",
  async () => {
    const firestore = new FakeFirestore({
      "razorpayPendingOrders/order_123": {
        status: "pending",
        orderId: "order_123",
      },
    });
    const payload = failedEventPayload();

    await razorpayWebhookHandler(payload, sign(payload), WEBHOOK_SECRET, {
      firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
      createClient: () => razorpayClient(),
      serverTimestamp: () => "server-now",
      signUpForEvent: async () => {
        throw new Error("signUpForEvent should not be called.");
      },
    });

    assert.deepEqual(firestore.data["razorpayPendingOrders/order_123"], {
      status: "failed",
      orderId: "order_123",
      updatedAt: "server-now",
    });
  });

test("razorpayWebhookHandler rejects invalid webhook signatures", async () => {
  const payload = capturedEventPayload();

  await assert.rejects(
    razorpayWebhookHandler(payload, "deadbeef", WEBHOOK_SECRET, {
      firestore: () => new FakeFirestore({}) as unknown as
        FirebaseFirestore.Firestore,
      createClient: () => {
        throw new Error("Razorpay client should not be created.");
      },
      serverTimestamp: () => "server-now",
      signUpForEvent: async () => undefined,
    }),
    /Invalid Razorpay webhook signature/
  );
});

function capturedEventPayload(): Buffer {
  return Buffer.from(JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_123",
          order_id: "order_123",
          status: "captured",
        },
      },
    },
  }));
}

function failedEventPayload(): Buffer {
  return Buffer.from(JSON.stringify({
    event: "payment.failed",
    payload: {
      payment: {
        entity: {
          id: "pay_456",
          order_id: "order_123",
          status: "failed",
        },
      },
    },
  }));
}

function sign(payload: Buffer): string {
  return crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");
}

function razorpayClient(
  overrides: {refund?: () => Promise<void>} = {}
): Razorpay {
  return {
    orders: {
      fetch: async () => ({
        id: "order_123",
        amount: 25000,
        currency: "INR",
        amount_paid: 25000,
        amount_due: 0,
        notes: {
          eventId: "trusted-event",
          userId: "runner-1",
          catchBookingProject: "catchdates-dev",
          catchBookingSchema: "1",
        },
      }),
    },
    payments: {
      fetch: async () => ({
        id: "pay_123",
        order_id: "order_123",
        amount: 25000,
        currency: "INR",
        status: "captured",
        refund_status: "null",
      }),
      refund: overrides.refund ?? (async () => {
        throw new Error("Refund should not be called on success.");
      }),
    },
  } as unknown as Razorpay;
}

interface QueryFilter {
  field: string;
  op: FirebaseFirestore.WhereFilterOp;
  value: unknown;
}

class FakeFirestore {
  constructor(readonly data: Record<string, unknown>) {}

  collection(collectionPath: string) {
    return new FakeCollectionRef(this, collectionPath);
  }

  // Fulfillment completes the payment + bumps paidCount inside a transaction;
  // the fake serializes nothing (single-threaded tests) and just forwards
  // reads/writes to the doc refs.
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
    return updateFn({
      get: (ref) => ref.get(),
      set: (ref, data, options) => {
        void ref.set(data, options);
      },
    });
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
    private readonly filters: QueryFilter[]
  ) {}

  async get() {
    const prefix = `${this.collectionPath}/`;
    const docs = Object.entries(this.firestore.data)
      .filter(([path]) => path.startsWith(prefix))
      .map(([path, data]) => ({
        id: path.slice(prefix.length),
        data: () => data,
      }))
      .filter((doc) => this.filters.every((filter) =>
        matchesFilter(doc.data(), filter)));
    return {docs, empty: docs.length === 0};
  }
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
    const value = this.firestore.data[this.path];
    return {
      exists: value !== undefined,
      id: this.id,
      data: () => value,
    };
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
  throw new Error(`Unsupported fake query op ${filter.op}`);
}

// SOURCE-ONLY regression draft for current main 43d4684. NOT EXECUTED.
// Append to razorpayWebhook.test.ts; uses that file's existing fake helpers.
// Runtime-project resolution must become injectable when implementation is
// claimed.
async function inReviewProject(run: () => Promise<void>): Promise<void> {
  const previous = process.env.GCLOUD_PROJECT;
  const previousLegacy = process.env.GCLOUDPROJECT;
  process.env.GCLOUD_PROJECT = "catchdates-dev";
  process.env.GCLOUDPROJECT = "catchdates-dev";
  try {
    await run();
  } finally {
    if (previous === undefined) delete process.env.GCLOUD_PROJECT;
    else process.env.GCLOUD_PROJECT = previous;
    if (previousLegacy === undefined) delete process.env.GCLOUDPROJECT;
    else process.env.GCLOUDPROJECT = previousLegacy;
  }
}
function ownershipReviewClient(
  notes: Record<string, string>,
  refunded = false
) {
  const base = razorpayClient();
  return {
    orders: {fetch: async () => ({
      ...await base.orders.fetch("order_123"),
      notes: {eventId: "trusted-event", userId: "runner-1", ...notes},
    })},
    payments: {
      fetch: async () => ({...await base.payments.fetch("pay_123"),
        ...(refunded ? {status: "refunded", refund_status: "full",
          amount_refunded: 25000} : {})}),
      refund: async () => {
        throw new Error("No inline refund authorized");
      },
    },
  } as unknown as Razorpay;
}
const foreignReviewNotes = {
  catchBookingProject: "catch-dating-app-64e51", catchBookingSchema: "1",
};

test("ownership: foreign capture cannot admit or delete cloned local pending",
  async () => inReviewProject(async () => {
    const pending = {status: "pending", orderId: "order_123",
      eventId: "trusted-event", userId: "runner-1", provider: "razorpay",
      amountInPaise: 25000, currency: "INR"};
    const db = new FakeFirestore({"razorpayPendingOrders/order_123": pending});
    let signUps = 0;
    const body = capturedEventPayload();
    await razorpayWebhookHandler(body, sign(body), WEBHOOK_SECRET, {
      firestore: () => db as unknown as FirebaseFirestore.Firestore,
      createClient: () => ownershipReviewClient(foreignReviewNotes),
      serverTimestamp: () => "server-now",
      signUpForEvent: async () => {
        signUps++;
      },
    });
    assert.equal(signUps, 0, "foreign capture must not reach admission");
    assert.deepEqual(db.data, {"razorpayPendingOrders/order_123": pending});
  }));

test("ownership: unknown unmarked capture cannot stage booking-failed refund",
  async () => inReviewProject(async () => {
    const db = new FakeFirestore({});
    let signUps = 0;
    const body = capturedEventPayload();
    // Collect a rejection so the decisive assertion is zero effects, not
    // status.
    await razorpayWebhookHandler(body, sign(body), WEBHOOK_SECRET, {
      firestore: () => db as unknown as FirebaseFirestore.Firestore,
      createClient: () => ownershipReviewClient({}),
      serverTimestamp: () => "server-now",
      signUpForEvent: async () => {
        signUps++; throw new Error("Event missing");
      },
    }).catch(() => undefined);
    assert.deepEqual(db.data, {},
      "unknown origin must not persist refund intent");
    assert.equal(signUps, 0);
  }));

test("ownership: foreign failed event leaves cloned pending untouched",
  async () => inReviewProject(async () => {
    const pending = {status: "pending", orderId: "order_123"};
    const db = new FakeFirestore({"razorpayPendingOrders/order_123": pending});
    const body = failedEventPayload();
    await razorpayWebhookHandler(body, sign(body), WEBHOOK_SECRET, {
      firestore: () => db as unknown as FirebaseFirestore.Firestore,
      createClient: () => ownershipReviewClient(foreignReviewNotes),
      serverTimestamp: () => "server-now",
      signUpForEvent: async () => {
        assert.fail("No admission on failed event");
      },
    });
    assert.deepEqual(db.data, {"razorpayPendingOrders/order_123": pending});
  }));

test("ownership: terminal foreign clone cannot trigger pending cleanup",
  async () => inReviewProject(async () => {
    const payment = {status: "completed", orderId: "order_123",
      paymentId: "pay_123", userId: "runner-1", eventId: "trusted-event",
      provider: "razorpay", amount: 25000, currency: "INR",
      createdAt: Timestamp.fromMillis(1)};
    const pending = {status: "pending", orderId: "order_123"};
    const initial = {"guestPayments/pay_123": payment,
      "razorpayPendingOrders/order_123": pending};
    const db = new FakeFirestore({...initial});
    const body = capturedEventPayload();
    await razorpayWebhookHandler(body, sign(body), WEBHOOK_SECRET, {
      firestore: () => db as unknown as FirebaseFirestore.Firestore,
      createClient: () => ownershipReviewClient(foreignReviewNotes),
      serverTimestamp: () => "server-now",
      signUpForEvent: async () => {
        assert.fail("No duplicate admission");
      },
    });
    assert.deepEqual(db.data, initial);
  }));

const invalidReviewNotes: Array<Record<string, string>> = [
  {catchBookingProject: "catchdates-dev"},
  {catchBookingSchema: "1"},
  {catchBookingProject: "catchdates-dev", catchBookingSchema: "999"},
];
for (const notes of invalidReviewNotes) {
  test("ownership: partial/unsupported marker cannot fall back: " +
    JSON.stringify(notes),
  async () => inReviewProject(async () => {
    const db = new FakeFirestore({});
    let signUps = 0;
    const body = capturedEventPayload();
    await razorpayWebhookHandler(body, sign(body), WEBHOOK_SECRET, {
      firestore: () => db as unknown as FirebaseFirestore.Firestore,
      createClient: () => ownershipReviewClient(notes),
      serverTimestamp: () => "server-now",
      signUpForEvent: async () => {
        signUps++;
      },
    }).catch(() => undefined);
    assert.equal(signUps, 0);
    assert.deepEqual(db.data, {});
  }));
}

for (const status of ["refunded", "refundFailed"]) {
  test(`ownership compatibility: own terminal ${status} replay tolerates ` +
    "refunded readback",
  async () => inReviewProject(async () => {
    const initial = {"guestPayments/pay_123": {
      purpose: "booking", status, orderId: "order_123",
      paymentId: "pay_123", eventId: "trusted-event", userId: "runner-1",
      provider: "razorpay", amount: 25000, currency: "INR",
      createdAt: Timestamp.fromMillis(1)}};
    const db = new FakeFirestore({...initial});
    const body = capturedEventPayload();
    // Must ack only after exact terminal identity AND ownership binding.
    await razorpayWebhookHandler(body, sign(body), WEBHOOK_SECRET, {
      firestore: () => db as unknown as FirebaseFirestore.Firestore,
      createClient: () => ownershipReviewClient({
        catchBookingProject: "catchdates-dev", catchBookingSchema: "1",
      }, true),
      serverTimestamp: () => "server-now",
      signUpForEvent: async () => {
        assert.fail("No terminal re-admission");
      },
    });
    assert.deepEqual(db.data, initial);
  }));
}

test("ownership compatibility: own new order recovers despite missing pending",
  async () => inReviewProject(async () => {
    const db = new FakeFirestore({});
    let signUps = 0;
    const body = capturedEventPayload();
    await razorpayWebhookHandler(body, sign(body), WEBHOOK_SECRET, {
      firestore: () => db as unknown as FirebaseFirestore.Firestore,
      createClient: () => ownershipReviewClient({
        catchBookingProject: "catchdates-dev", catchBookingSchema: "1",
      }),
      serverTimestamp: () => "server-now",
      signUpForEvent: async (_db, eventId, userId, paymentId, options) => {
        signUps++;
        await _db.runTransaction(async (tx) => {
          (await prepareNativePaidBooking({db: _db, tx, eventId, userId,
            paymentId, booking: options!.paidBooking!}))();
        });
      },
    });
    await razorpayWebhookHandler(body, sign(body), WEBHOOK_SECRET, {
      firestore: () => db as unknown as FirebaseFirestore.Firestore,
      createClient: () => ownershipReviewClient({
        catchBookingProject: "catchdates-dev", catchBookingSchema: "1",
      }),
      serverTimestamp: () => "server-now",
      signUpForEvent: async () => {
        assert.fail("Duplicate must not re-admit");
      },
    });
    assert.equal(signUps, 1);
    const payment = db.data["guestPayments/pay_123"] as Record<string, unknown>;
    assert.equal(payment.status, "completed");
    assert.equal(payment.orderId, "order_123");
    assert.equal(db.data["razorpayPendingOrders/order_123"], undefined);
  }));
