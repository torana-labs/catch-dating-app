import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {PaymentDocument} from "../../shared/generated/firestoreAdminTypes";
import {Store} from "../../organizerFormAdmission/admissionTestFixture";
import {LegacyRefundReviewRequired} from "./errors";
import {planLegacyCancellationRefund,
  type LegacyRazorpayRefundAuthorization,
  type LegacyRefundIntent} from "./intent";
import {processLegacyCancellationRefund, type LegacyRefundProvider,
  type LegacyRefundObservation} from "./processor";
import {razorpayOwnershipNotes, resolveRazorpayOrderOwnership} from
  "../razorpayOrderOwnership";

function ownedAuthorization(payment: PaymentDocument):
  LegacyRazorpayRefundAuthorization {
  const runtimeProjectId = "catchdates-dev";
  const ownership = resolveRazorpayOrderOwnership({runtimeProjectId,
    order: {id: payment.orderId,
      notes: razorpayOwnershipNotes(runtimeProjectId)},
    frozenContexts: [payment.razorpayOwnership,
      payment.cancellationRefund?.razorpayOwnership]});
  if (ownership.kind !== "owned") throw new Error("Expected owned order.");
  return {evidence: ownership.evidence, runtimeProjectId};
}

function setup(targetAmountMinor = 1000, provider: "razorpay" | "stripe" =
"razorpay") {
  const store = new Store();
  let now = 1_000_000;
  const path = "guestPayments/payment1";
  const initial: PaymentDocument = {purpose: "booking", userId: "user1",
    eventId: "event1",
    orderId: "order_one", paymentId: "pay_one", amount: 1000, currency: "INR",
    provider, ...(provider === "stripe" ? {providerPaymentId: "pi_one",
      stripeAccountId: "acct_one"} : {razorpayOwnership: {
      projectId: "catchdates-dev", schema: "1"}}),
    status: "completed", signUpFailed: false,
    createdAt: Timestamp.fromMillis(1)};
  const razorpayAuthorization = provider === "razorpay" ?
    ownedAuthorization(initial) : undefined;
  const intent = planLegacyCancellationRefund({payment: initial,
    reason: "guestCancelled", targetAmountMinor, nowMillis: now,
    razorpayAuthorization});
  store.put(path, {...initial, cancellationRefund: intent});
  const payment = () => store.get(path) as unknown as PaymentDocument;
  const readIntent = () => payment().cancellationRefund!;
  const refundCalls: string[] = [];
  let observations = 0;
  const issued = new Map<string, LegacyRefundObservation>();
  const api: LegacyRefundProvider = {
    verifyPayment: async () => undefined,
    createRefund: async (authority, attempt) => {
      refundCalls.push(attempt.idempotencyKey);
      const result = issued.get(attempt.idempotencyKey) ?? {
        id: `rfnd_${issued.size}`, paymentId: authority.providerPaymentId,
        amountMinor: attempt.amountMinor, currency: authority.currency,
        state: "processed" as const};
      issued.set(attempt.idempotencyKey, result);
      return result;
    },
    fetchRefund: async (_authority, attempt) => {
      observations++;
      return [...issued.values()].find((row) =>
        row.id === attempt.providerRefundId)!;
    },
  };
  return {store, path, initial, payment, readIntent, api, issued, refundCalls,
    observations: () => observations,
    advance: (millis = 120_001) => {
      now += millis;
    },
    upgrade: () => {
      store.put(path, {...payment(), cancellationRefund:
        planLegacyCancellationRefund({payment: payment(),
          reason: "eventCancelled", targetAmountMinor: 1000, nowMillis: now,
          razorpayAuthorization})});
    },
    run: () => processLegacyCancellationRefund({db: store.db(),
      paymentId: "payment1", provider: api, clock: () => now})};
}

test("replay preserves frozen terms and never lowers a host refund",
  () => {
    const h = setup(300);
    const before = h.readIntent();
    assert.deepEqual(planLegacyCancellationRefund({payment: h.payment(),
      reason: "guestCancelled", targetAmountMinor: 300,
      nowMillis: 2_000_000}), before);
    assert.throws(() => planLegacyCancellationRefund({payment: h.payment(),
      reason: "guestCancelled", targetAmountMinor: 500, nowMillis: 2_000_000}));
    h.upgrade();
    assert.equal(h.readIntent().targetAmountMinor, 1000);
    assert.throws(() => planLegacyCancellationRefund({payment: h.payment(),
      reason: "guestCancelled", targetAmountMinor: 300, nowMillis: 2_000_000}));
  });

test("a lost refund response retries the identical provider key and amount",
  async () => {
    const h = setup();
    const create = h.api.createRefund;
    let lost = true;
    h.api.createRefund = async (...args) => {
      const result = await create(...args);
      if (lost) {
        lost = false; throw new Error("Lost response");
      }
      return result;
    };
    await assert.rejects(h.run(), /Lost response/);
    assert.equal(h.payment().status, "completed");
    assert.equal(h.readIntent().confirmedAmountMinor, 0);
    h.advance(); await h.run();
    assert.equal(h.issued.size, 1);
    assert.equal(new Set(h.refundCalls).size, 1);
    assert.equal(h.payment().status, "refunded");
    assert.equal(h.readIntent().confirmedAmountMinor, 1000);
    await h.run(); assert.equal(h.refundCalls.length, 2);
  });

test("provider acceptance survives a lost database status write", async () => {
  const h = setup();
  const create = h.api.createRefund;
  h.api.createRefund = async (...args) => {
    const result = await create(...args);
    h.store.failNextCommit = true;
    h.api.createRefund = create;
    return result;
  };
  await assert.rejects(h.run(), /Interrupted commit/);
  h.advance(); await h.run();
  assert.equal(h.issued.size, 1);
  assert.equal(h.readIntent().state, "complete");
});

test("pending provider refunds are observed instead of submitted twice",
  async () => {
    const h = setup();
    const create = h.api.createRefund;
    h.api.createRefund = async (...args) => {
      const result = await create(...args); result.state = "pending";
      return result;
    };
    await h.run();
    assert.equal(h.readIntent().state, "pending");
    assert.equal(h.payment().status, "completed");
    h.issued.values().next().value!.state = "processed";
    h.advance(); await h.run();
    assert.equal(h.refundCalls.length, 1);
    assert.equal(h.observations(), 1);
    assert.equal(h.payment().status, "refunded");
  });

test("host cancellation during a partial refund retains the first request",
  async () => {
    const h = setup(300);
    const create = h.api.createRefund;
    h.api.createRefund = async (...args) => {
      h.upgrade(); h.api.createRefund = create;
      return create(...args);
    };
    await h.run();
    assert.equal(h.readIntent().confirmedAmountMinor, 300);
    assert.equal(h.readIntent().targetAmountMinor, 1000);
    assert.equal(h.payment().status, "completed");
    await h.run();
    assert.deepEqual(h.readIntent().attempts.map((row) => row.amountMinor),
      [300, 700]);
    assert.equal(h.payment().status, "refunded");
    assert.equal(h.issued.size, 2);
  });

test("a no-refund guest cancellation can later gain a full host refund",
  async () => {
    const h = setup(0); await h.run();
    assert.equal(h.refundCalls.length, 0);
    h.upgrade(); await h.run();
    assert.equal(h.readIntent().confirmedAmountMinor, 1000);
  });

test("changed payment authority blocks provider work", async () => {
  const h = setup();
  h.store.put(h.path, {...h.payment(), currency: "USD"});
  await assert.rejects(h.run(), /reconciliation/);
  assert.equal(h.refundCalls.length, 0);
});

test("a lease prevents another worker dispatch while the provider is running",
  async () => {
    const h = setup(); let release!: () => void;
    const create = h.api.createRefund;
    h.api.createRefund = async (...args) => {
      await new Promise<void>((done) => {
        release = done;
      });
      return create(...args);
    };
    const first = h.run();
    while (!release) await new Promise((done) => setImmediate(done));
    await h.run(); assert.equal(h.refundCalls.length, 0);
    release(); await first; assert.equal(h.refundCalls.length, 1);
  });

test("an unresolved Stripe POST cannot be retried after idempotency expiry",
  async () => {
    const h = setup(1000, "stripe");
    h.api.createRefund = async () => {
      throw new Error("Unknown outcome");
    };
    await assert.rejects(h.run()); h.advance(24 * 3600_000);
    await h.run();
    assert.equal(h.readIntent().state, "reviewRequired");
    assert.equal(h.readIntent().lastErrorCode, "refundOutcomeUnknown");
  });

test("failed refunds keep liability explicit without claiming success",
  async () => {
    const h = setup(); const create = h.api.createRefund;
    h.api.createRefund = async (...args) => ({...await create(...args),
      state: "failed"});
    await h.run();
    const intent: LegacyRefundIntent = h.readIntent();
    assert.equal(intent.state, "reviewRequired");
    assert.equal(intent.confirmedAmountMinor, 0);
    assert.equal(h.payment().status, "completed");
  });


test("a provider preflight rejection leaves the refund intent untouched",
  async () => {
    const h = setup();
    const before = JSON.stringify(h.payment());
    h.api.verifyPayment = async () => {
      throw new LegacyRefundReviewRequired("Wrong provider authority");
    };
    await assert.rejects(h.run(), LegacyRefundReviewRequired);
    assert.equal(JSON.stringify(h.payment()), before);
    assert.equal(h.refundCalls.length, 0);
    assert.equal(h.payment().status, "completed");
  });

// Append to legacyRefunds/processor.test.ts. Source-only baseline regressions.
// Fakes refuse verified ownership at the provider boundary. The original worker
// currently mutates lease/attempt/review before and after that refusal.
for (const origin of ["foreign", "unknown"] as const) {
  test(`ownership worker: ${origin} persisted intent has zero ` +
    "local/provider effects",
  async () => {
    const h = setup();
    const before = JSON.stringify(h.store.get(h.path));
    const beforeIntent = JSON.stringify(h.readIntent());
    let verifies = 0;
    h.api.verifyPayment = async () => {
      verifies++;
      throw new LegacyRefundReviewRequired(`${origin} order origin`);
    };
    const writesBefore = h.store.writes.length;
    const timelineBefore = h.store.timeline.length;
    // Rejection status is not the decisive assertion: domain effects are.
    await h.run().catch(() => undefined);
    assert.equal(JSON.stringify(h.store.get(h.path)), before);
    assert.equal(JSON.stringify(h.readIntent()), beforeIntent);
    assert.equal(h.store.writes.length - writesBefore, 0);
    assert.deepEqual(h.store.timeline.slice(timelineBefore)
      .filter((entry) => entry.startsWith("write:")), []);
    assert.equal(h.refundCalls.length, 0);
    assert.equal(h.observations(), 0);
    assert.ok(verifies <= 1);
  });
}

test("ownership worker control: own provider retry retains key and uses " +
  "readback",
async () => {
  const h = setup();
  const create = h.api.createRefund;
  let loseFirst = true;
  h.api.createRefund = async (...args) => {
    const result = await create(...args);
    if (loseFirst) {
      loseFirst = false; throw new Error("Lost response");
    }
    result.state = "pending";
    return result;
  };
  await assert.rejects(h.run(), /Lost response/);
  const firstKey = h.readIntent().attempts[0].idempotencyKey;
  h.advance(); await h.run();
  assert.equal(h.issued.size, 1);
  assert.equal(h.readIntent().attempts[0].idempotencyKey, firstKey);
  assert.equal(new Set(h.refundCalls).size, 1);
  const posts = h.refundCalls.length;
    h.issued.values().next().value!.state = "processed";
    h.advance(); await h.run();
    assert.equal(h.refundCalls.length, posts);
    assert.equal(h.observations(), 1);
    assert.equal(h.readIntent().confirmedAmountMinor, 1000);
    assert.equal(h.payment().status, "refunded");
});
