import {Timestamp} from "firebase-admin/firestore";
import {prepareNativePaidBooking} from "./nativeBooking";
import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import test from "node:test";
import {HttpsError} from "firebase-functions/v2/https";
import {stripeWebhookHandler} from "./stripeWebhook";
import {
  StripeCheckoutSessionSnapshot,
  StripeClient,
} from "./stripe";

test("stripeWebhookHandler signs up and completes trusted checkout sessions",
  async () => {
    const firestore = new FakeFirestore({
      "guestPayments/payment_1": {purpose: "booking",
        status: "pending",
        createdAt: Timestamp.fromMillis(1),
      },
    });
    const signUps: Array<{
      eventId: string;
      userId: string;
      paymentId: string;
      options: Record<string, unknown>;
    }> = [];
    const payload = checkoutEventPayload("checkout.session.completed");

    await stripeWebhookHandler(
      payload,
      stripeSignature(payload),
      "whsec_test",
      {
        firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
        stripe: () => stripeClient({
          retrieveCheckoutSession: async () => checkoutSession(),
        }),
        serverTimestamp: () => "server-now",
        signUpForEvent: async (_db, eventId, userId, paymentId, options) => {
          if (paymentId === undefined) {
            throw new Error("paymentId is required.");
          }
          const {paidBooking, ...visibleOptions} = options!;
          signUps.push({eventId, userId, paymentId, options: visibleOptions});
          await _db.runTransaction(async (tx) => {
            (await prepareNativePaidBooking({db: _db, tx, eventId, userId,
              paymentId, booking: paidBooking!}))();
          });
        },
      }
    );

    assert.deepEqual(signUps, [{
      eventId: "event-1",
      userId: "runner-1",
      paymentId: "payment_1",
      options: {hasValidInvite: false},
    }]);
    const result = firestore.data["guestPayments/payment_1"] as
      Record<string, unknown>;
    assert.equal(result.status, "completed");
    assert.equal(result.amount, 3500);
    assert.ok(result.completedAt);
    assert.deepEqual(result.createdAt, Timestamp.fromMillis(1));
  });

test("stripeWebhookHandler queues a refund when admission rejects a capture",
  async () => {
    const firestore = new FakeFirestore({
      "guestPayments/payment_1": {purpose: "booking",
        status: "pending",
        createdAt: Timestamp.fromMillis(1),
      },
    });
    const refunds: Array<{paymentIntentId: string; amountMinor: number}> = [];
    const payload = checkoutEventPayload("checkout.session.completed");

    await assert.rejects(
      stripeWebhookHandler(payload, stripeSignature(payload), "whsec_test", {
        firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
        stripe: () => stripeClient({
          retrieveCheckoutSession: async () => checkoutSession(),
          createRefund: async (input) => {
            refunds.push(input);
          },
        }),
        serverTimestamp: () => "server-now",
        signUpForEvent: async () => {
          throw new HttpsError("failed-precondition", "This event is full.");
        },
      }),
      isHttpsError("failed-precondition", "This event is full.")
    );

    assert.deepEqual(refunds, []);
    assert.equal(
      (firestore.data["guestPayments/payment_1"] as
        Record<string, unknown>).status,
      "refundFailed"
    );
    assert.equal(
      (firestore.data["guestPayments/payment_1"] as Record<string, unknown>)
        .signUpFailed,
      true
    );
  });

test("Stripe webhook records refund intent before provider work",
  async () => {
    const firestore = new FakeFirestore({
      "guestPayments/payment_1": {purpose: "booking",
        status: "pending",
        createdAt: Timestamp.fromMillis(1),
      },
    });
    const payload = checkoutEventPayload("checkout.session.completed");

    await assert.rejects(
      stripeWebhookHandler(payload, stripeSignature(payload), "whsec_test", {
        firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
        stripe: () => stripeClient({
          retrieveCheckoutSession: async () => checkoutSession(),
          createRefund: async () => {
            throw new Error("Stripe refund API unavailable.");
          },
        }),
        serverTimestamp: () => "server-now",
        signUpForEvent: async () => {
          throw new HttpsError("failed-precondition", "This event is full.");
        },
      }),
      isHttpsError("failed-precondition", "This event is full.")
    );

    const record = firestore.data["guestPayments/payment_1"] as
      Record<string, unknown>;
    assert.equal(record.status, "refundFailed");
    assert.equal(record.signUpFailed, true);
    assert.equal((record.cancellationRefund as {state: string}).state,
      "pending");
  });

test("stripeWebhookHandler marks expired checkout sessions as failed",
  async () => {
    const firestore = new FakeFirestore({
      "guestPayments/payment_1": {purpose: "booking",
        status: "pending",
        checkoutSessionId: "cs_test_123",
        createdAt: Timestamp.fromMillis(1),
      },
    });
    const payload = checkoutEventPayload("checkout.session.expired");

    await stripeWebhookHandler(
      payload,
      stripeSignature(payload),
      "whsec_test",
      {
        firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
        stripe: () => stripeClient({}),
        serverTimestamp: () => "server-now",
        signUpForEvent: async () => {
          throw new Error("signUpForEvent should not be called.");
        },
      }
    );

    assert.deepEqual(firestore.data["guestPayments/payment_1"], {
      purpose: "booking",
      status: "failed",
      checkoutSessionId: "cs_test_123",
      createdAt: Timestamp.fromMillis(1),
      updatedAt: "server-now",
    });
  });

test("late Stripe failure preserves paid and refund records", async () => {
  for (const type of ["checkout.session.expired",
    "checkout.session.async_payment_failed"]) {
    for (const status of ["completed", "refunded", "refundFailed"]) {
      const before = {purpose: "booking", status,
        checkoutSessionId: "cs_test_123",
        provider: "stripe", providerPaymentId: "pi_test123"};
      const firestore = new FakeFirestore({
        "guestPayments/payment_1": before,
      });
      const payload = checkoutEventPayload(type);
      await stripeWebhookHandler(payload, stripeSignature(payload),
        "whsec_test", {firestore: () => firestore as unknown as
          FirebaseFirestore.Firestore, stripe: () => stripeClient({}),
        serverTimestamp: () => "server-now",
        signUpForEvent: async () => undefined});
      assert.deepEqual(firestore.data["guestPayments/payment_1"], before);
    }
  }
});

test("Stripe failure rechecks current payment authority",
  async () => {
    for (const change of [{status: "completed"},
      {checkoutSessionId: "cs_new"}, {provider: "razorpay"}]) {
      const before = {purpose: "booking", status: "pending",
        checkoutSessionId: "cs_test_123", provider: "stripe"};
      const firestore = new FakeFirestore({
        "guestPayments/payment_1": before,
      });
      firestore.beforeTransaction = () => {
        firestore.data["guestPayments/payment_1"] = {...before, ...change};
      };
      const payload = checkoutEventPayload("checkout.session.expired");
      await stripeWebhookHandler(payload, stripeSignature(payload),
        "whsec_test", {firestore: () => firestore as unknown as
          FirebaseFirestore.Firestore, stripe: () => stripeClient({}),
        serverTimestamp: () => "server-now",
        signUpForEvent: async () => undefined});
      assert.deepEqual(firestore.data["guestPayments/payment_1"],
        {...before, ...change});
    }
  });

test("stripeWebhookHandler rejects invalid webhook signatures", async () => {
  const payload = checkoutEventPayload("checkout.session.completed");

  await assert.rejects(
    stripeWebhookHandler(payload, "t=123,v1=bad", "whsec_test", {
      firestore: () => new FakeFirestore({}) as unknown as
        FirebaseFirestore.Firestore,
      stripe: () => stripeClient({}),
      serverTimestamp: () => "server-now",
      signUpForEvent: async () => undefined,
    }),
    /Invalid Stripe webhook signature/
  );
});

function checkoutEventPayload(type: string): Buffer {
  return Buffer.from(JSON.stringify({
    id: "evt_test_123",
    type,
    data: {
      object: {
        id: "cs_test_123",
      },
    },
  }));
}

function stripeSignature(payload: Buffer): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const digest = crypto
    .createHmac("sha256", "whsec_test")
    .update(`${timestamp}.`)
    .update(payload)
    .digest("hex");
  return `t=${timestamp},v1=${digest}`;
}

function checkoutSession(
  overrides: Partial<StripeCheckoutSessionSnapshot> = {}
): StripeCheckoutSessionSnapshot {
  return {
    id: "cs_test_123",
    url: null,
    paymentStatus: "paid",
    amountTotal: 3500,
    currency: "USD",
    paymentIntentId: "pi_test123",
    metadata: {
      paymentId: "payment_1",
      eventId: "event-1",
      userId: "runner-1",
      amountMinor: "3500",
      currency: "USD",
      inviteVerified: "false",
    },
    ...overrides,
  };
}

function stripeClient(overrides: Partial<StripeClient>): StripeClient {
  return {
    createConnectedAccount: async () => {
      throw new Error("createConnectedAccount should not be called.");
    },
    retrieveConnectedAccount: async () => {
      throw new Error("retrieveConnectedAccount should not be called.");
    },
    createAccountLink: async () => {
      throw new Error("createAccountLink should not be called.");
    },
    createCheckoutSession: async () => {
      throw new Error("createCheckoutSession should not be called.");
    },
    retrieveCheckoutSession: async () => {
      throw new Error("retrieveCheckoutSession should not be called.");
    },
    createRefund: async () => {
      throw new Error("createRefund should not be called.");
    },
    ...overrides,
  };
}

function isHttpsError(expectedCode: string, expectedMessage: string) {
  return (error: unknown) =>
    error instanceof HttpsError &&
    error.code === expectedCode &&
    error.message === expectedMessage;
}

interface QueryFilter {
  field: string;
  op: FirebaseFirestore.WhereFilterOp;
  value: unknown;
}

class FakeFirestore {
  beforeTransaction?: () => void;

  async runTransaction<T>(callback: (tx: {
    get: (ref: FakeDocRef) => Promise<FakeDocSnapshot>;
    set: (ref: FakeDocRef, data: Record<string, unknown>,
      options: {merge: boolean}) => Promise<void>;
  }) => Promise<T>): Promise<T> {
    this.beforeTransaction?.();
    return callback({get: (ref) => ref.get(),
      set: (ref, data, options) => ref.set(data, options)});
  }

  constructor(readonly data: Record<string, unknown>) {}

  collection(collectionPath: string) {
    return new FakeCollectionRef(this, collectionPath);
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

  where(
    field: string,
    op: FirebaseFirestore.WhereFilterOp,
    value: unknown
  ) {
    return new FakeQuery(this.firestore, this.collectionPath, [{
      field,
      op,
      value,
    }]);
  }
}

class FakeQuery {
  constructor(
    private readonly firestore: FakeFirestore,
    private readonly collectionPath: string,
    private readonly filters: QueryFilter[],
    private readonly limitCount?: number
  ) {}

  where(
    field: string,
    op: FirebaseFirestore.WhereFilterOp,
    value: unknown
  ) {
    return new FakeQuery(this.firestore, this.collectionPath,
      [...this.filters, {field, op, value}], this.limitCount);
  }

  limit(limitCount: number) {
    return new FakeQuery(
      this.firestore,
      this.collectionPath,
      this.filters,
      limitCount
    );
  }

  async get() {
    const prefix = `${this.collectionPath}/`;
    let docs = Object.entries(this.firestore.data)
      .filter(([path]) => path.startsWith(prefix) &&
        !path.slice(prefix.length).includes("/"))
      .map(([path, data]) => new FakeQueryDocSnapshot(
        this.firestore,
        this.collectionPath,
        path.slice(prefix.length),
        data
      ))
      .filter((doc) => this.filters.every((filter) =>
        matchesFilter(doc.data(), filter)
      ));
    if (this.limitCount !== undefined) docs = docs.slice(0, this.limitCount);
    return {
      docs,
      empty: docs.length === 0,
    };
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
    return new FakeDocSnapshot(
      this,
      this.firestore.data[this.path]
    );
  }

  async set(data: Record<string, unknown>, options?: {merge?: boolean}) {
    this.firestore.data[this.path] = options?.merge === true ?
      {
        ...(this.firestore.data[this.path] as Record<string, unknown>),
        ...data,
      } :
      data;
  }
}

class FakeDocSnapshot {
  constructor(
    readonly ref: FakeDocRef,
    private readonly value: unknown
  ) {}

  get id(): string {
    return this.ref.id;
  }

  get exists(): boolean {
    return this.value !== undefined;
  }

  data() {
    return this.value;
  }
}

class FakeQueryDocSnapshot extends FakeDocSnapshot {
  constructor(
    firestore: FakeFirestore,
    collectionPath: string,
    id: string,
    value: unknown
  ) {
    super(new FakeDocRef(firestore, collectionPath, id), value);
  }
}

function matchesFilter(data: unknown, filter: QueryFilter): boolean {
  const value = (data as Record<string, unknown>)[filter.field];
  if (filter.op === "==") return value === filter.value;
  throw new Error(`Unsupported fake query op ${filter.op}`);
}
