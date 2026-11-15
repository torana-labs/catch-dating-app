import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {PaymentDocument} from "../../shared/generated/firestoreAdminTypes";
import {Store} from "../../organizerFormAdmission/admissionTestFixture";
import {legacyPaymentFingerprint, planLegacyCancellationRefund,
  type LegacyRazorpayRefundAuthorization,
  type LegacyRefundIntent} from "./intent";
import {stageCancelledEventPayment, stageCancelledEventRefunds,
  reconcileNativeCancellationRefunds,
  recoverCancelledRazorpayStagingPage,
  recoverNativeCancellationRefundPage} from "./recovery";
import {LegacyRefundReviewRequired} from "./errors";
import {razorpayOwnershipNotes, resolveRazorpayOrderOwnership} from
  "../razorpayOrderOwnership";

process.env.GCLOUD_PROJECT = "catchdates-dev";
process.env.GCLOUDPROJECT = "catchdates-dev";

function ownedPayment(payment: PaymentDocument): PaymentDocument {
  return {...payment,
    razorpayOwnership: {projectId: "catchdates-dev", schema: "1"}};
}

function ownedAuthorization(payment: PaymentDocument):
  LegacyRazorpayRefundAuthorization {
  const owned = ownedPayment(payment);
  const runtimeProjectId = "catchdates-dev";
  const ownership = resolveRazorpayOrderOwnership({runtimeProjectId,
    order: {id: owned.orderId,
      notes: razorpayOwnershipNotes(runtimeProjectId)},
    frozenContexts: [owned.razorpayOwnership,
      owned.cancellationRefund?.razorpayOwnership]});
  if (ownership.kind !== "owned") throw new Error("Expected owned order.");
  return {evidence: ownership.evidence, runtimeProjectId};
}

function unprovenRazorpayIntent(payment: PaymentDocument,
  nowMillis: number): LegacyRefundIntent {
  const stripe: PaymentDocument = {...payment, provider: "stripe",
    providerPaymentId: "pi_legacy", stripeAccountId: "acct_legacy"};
  const staged = planLegacyCancellationRefund({payment: stripe,
    reason: "guestCancelled", targetAmountMinor: stripe.amount, nowMillis});
  return {...staged, provider: "razorpay",
    providerPaymentId: payment.paymentId, orderId: payment.orderId,
    stripeAccountId: null, refundApplicationFee: false,
    paymentFingerprint: legacyPaymentFingerprint(payment)};
}

function fixture(provider: "stripe" | "razorpay" = "stripe") {
  const store = new Store();
  const payment: PaymentDocument = {purpose: "booking", userId: "user1",
    eventId: "event1",
    orderId: "order_one", paymentId: "pay_one", amount: 1000, currency: "INR",
    provider, ...(provider === "stripe" ? {providerPaymentId: "pi_one",
      stripeAccountId: "acct_one"} : {}),
    status: "completed", signUpFailed: false,
    createdAt: Timestamp.fromMillis(1)};
  store.put("guestPayments/payment1", {...payment});
  store.put("events/event1", {status: "active"});
  return {store, payment,
    stage: () => stageCancelledEventPayment({db: store.db(),
      paymentId: "payment1", nowMillis: 1000}),
    read: () =>
      store.get("guestPayments/payment1") as unknown as PaymentDocument};
}

test("late capture stages a full refund only for a currently cancelled event",
  async () => {
    const h = fixture(); await h.stage();
    assert.equal(h.read().cancellationRefund, undefined);
    h.store.put("events/event1", {status: "cancelled"});
    await h.stage(); const intent = h.read().cancellationRefund;
    assert.equal(intent?.reason, "eventCancelled");
    assert.equal(intent?.targetAmountMinor, 1000);
    assert.equal(h.read().status, "completed");
    await h.stage(); assert.deepEqual(h.read().cancellationRefund, intent);
  });

test("host cancellation upgrades a frozen zero-refund guest cancellation",
  async () => {
    const h = fixture();
    h.store.put("guestPayments/payment1", {...h.payment,
      cancellationRefund: planLegacyCancellationRefund({payment: h.payment,
        reason: "guestCancelled", targetAmountMinor: 0, nowMillis: 1})});
    h.store.put("events/event1", {status: "cancelled"});
    await h.stage();
    assert.equal(h.read().cancellationRefund?.state, "pending");
    assert.equal(h.read().cancellationRefund?.targetAmountMinor, 1000);
  });

test("a failed staging commit can be replayed without losing the refund",
  async () => {
    const h = fixture(); h.store.put("events/event1", {status: "cancelled"});
    h.store.failNextCommit = true;
    await assert.rejects(h.stage(), /Interrupted commit/);
    assert.equal(h.read().cancellationRefund, undefined);
    await h.stage();
    assert.equal(h.read().cancellationRefund?.state, "pending");
  });

test("staging cannot invent capture authority or re-refund historical payments",
  async () => {
    for (const patch of [{status: "pending"},
      {signUpFailed: true}]) {
      const h = fixture(); h.store.put("events/event1", {status: "cancelled"});
      h.store.put("guestPayments/payment1", {...h.payment, ...patch});
      await h.stage(); assert.equal(h.read().cancellationRefund, undefined);
    }
  });

interface ExactFirestoreInteger {
  __exactFirestoreInteger: string;
}

function exactFirestoreInteger(value: string): ExactFirestoreInteger {
  return {__exactFirestoreInteger: value};
}

function isExactFirestoreInteger(value: unknown):
  value is ExactFirestoreInteger {
  return value !== null && typeof value === "object" &&
    "__exactFirestoreInteger" in value;
}

/** The query seam retains pagination and ordering for recovery regressions. */
function queryDatabase(store: Store, hooks: {
  beforeQuery?: (collection: string) => Promise<void>;
  afterTransaction?: () => void;
} = {}) {
  const pages: number[] = [];
  let transactionTail = Promise.resolve();
  const runTransaction = <T>(callback: (tx: FirebaseFirestore.Transaction) =>
    Promise<T>): Promise<T> => {
    const result = transactionTail.then(async () => {
      const value = await store.runTransaction(callback);
      hooks.afterTransaction?.();
      return value;
    });
    transactionTail = result.then(() => undefined, () => undefined);
    return result;
  };
  const db = {runTransaction,
    collection: (name: string) => {
      const query = (filters: Array<[string, string, unknown]> = [],
        orders: string[] = [], count = Infinity,
        after?: {values: unknown[]}) => ({
        doc: (id: string) => ({path: `${name}/${id}`}),
        where: (field: string, op: string, value: unknown) =>
          query([...filters, [field, op, value]], orders, count, after),
        orderBy: (field: unknown) => query(filters,
          [...orders, typeof field === "string" ? field : "id"], count, after),
        limit: (size: number) => query(filters, orders, size, after),
        startAfter: (...values: unknown[]) => {
          const value = values[0] as {id?: string; data?: () =>
            Record<string, unknown>};
          if (values.length === 1 && value.id) {
            const row = value.data?.() ?? {};
            const effective = orders.length ? orders : ["id"];
            return query(filters, orders, count, {
              values: effective.map((field) => field === "id" ? value.id :
                field.split(".").reduce<unknown>((v, part) =>
                  (v as Record<string, unknown>)?.[part], row)),
            });
          }
          return query(filters, orders, count, {values: values.map((v) =>
            v !== null && typeof v === "object" && "path" in v ?
              String((v as {path: string}).path).split("/").at(-1) : v)});
        },
        get: async () => {
          await hooks.beforeQuery?.(name);
          const get = (row: Record<string, unknown>, key: string): unknown =>
            key.split(".").reduce<unknown>((value, part) =>
              (value as Record<string, unknown>)?.[part], row);
          type Numeric = {kind: "integer"; value: bigint} |
            {kind: "double"; value: number};
          const numeric = (value: unknown): Numeric => {
            if (isExactFirestoreInteger(value)) {
              return {kind: "integer",
                value: BigInt(value.__exactFirestoreInteger)};
            }
            if (typeof value === "bigint") {
              return {kind: "integer", value};
            }
            if (typeof value !== "number") {
              throw new Error("Expected Firestore numeric value.");
            }
            if (Number.isSafeInteger(value) && !Object.is(value, -0)) {
              return {kind: "integer", value: BigInt(value)};
            }
            return {kind: "double", value};
          };
          const numericRank = (value: Numeric) => value.kind === "integer" ?
            2 : Number.isNaN(value.value) ? 0 :
              value.value === Number.NEGATIVE_INFINITY ? 1 :
                value.value === Number.POSITIVE_INFINITY ? 3 : 2;
          const compareInteger = (left: bigint, right: bigint) =>
            left < right ? -1 : left > right ? 1 : 0;
          const compareIntegerDouble = (left: bigint, right: number) => {
            if (Number.isInteger(right)) {
              return compareInteger(left, BigInt(right));
            }
            const truncated = BigInt(Math.trunc(right));
            const wholeDelta = compareInteger(left, truncated);
            return wholeDelta || (right > 0 ? -1 : 1);
          };
          const compareNumeric = (leftValue: unknown, rightValue: unknown) => {
            const left = numeric(leftValue); const right = numeric(rightValue);
            const rankDelta = numericRank(left) - numericRank(right);
            if (rankDelta) return rankDelta;
            if (numericRank(left) !== 2) return 0;
            if (left.kind === "integer" && right.kind === "integer") {
              return compareInteger(left.value, right.value);
            }
            if (left.kind === "integer" && right.kind === "double") {
              return compareIntegerDouble(left.value, right.value);
            }
            if (left.kind === "double" && right.kind === "integer") {
              return -compareIntegerDouble(right.value, left.value);
            }
            return (left as {kind: "double"; value: number}).value -
              (right as {kind: "double"; value: number}).value;
          };
          const decodeRow = (row: Record<string, unknown>) => {
            const order = get(row,
              "cancellationRefund.nextAttemptAtMillis");
            if (!isExactFirestoreInteger(order)) return row;
            return {...row, cancellationRefund: {
              ...(row.cancellationRefund as Record<string, unknown>),
              nextAttemptAtMillis: Number(order.__exactFirestoreInteger),
            }};
          };
          const protoField = (row: Record<string, unknown>, field: string) => {
            const value = get(row, field);
            const model = numeric(value);
            return model.kind === "integer" ?
              {integerValue: model.value.toString()} :
              {doubleValue: model.value};
          };
          const effective = orders.length ? orders : ["id"];
          const tuple = (doc: {id: string; rawData: () =>
            Record<string, unknown>}) => effective.map((field) =>
            field === "id" ? doc.id : get(doc.rawData(), field));
          const compare = (a: unknown[], b: unknown[]) => {
            for (let i = 0; i < a.length; i++) {
              const numericValue = typeof a[i] === "number" ||
                typeof a[i] === "bigint" || isExactFirestoreInteger(a[i]);
              const delta = numericValue ? compareNumeric(a[i], b[i]) :
                String(a[i]).localeCompare(String(b[i]));
              if (delta) return delta;
            }
            return 0;
          };
          const docs = [...store.rows].filter(([path, row]) =>
            path.startsWith(`${name}/`) &&
            filters.every(([field, op, value]) => op === "==" ?
              get(row, field) === value : op === "in" ?
                (value as unknown[]).includes(get(row, field)) :
                compareNumeric(get(row, field), value) <= 0))
            .map(([path, row]) => ({id: path.split("/")[1], ref: {path},
              rawData: () => row, data: () => decodeRow(row),
              protoField: (field: string) => protoField(row, field)}))
            .sort((a, b) => compare(tuple(a), tuple(b)))
            .filter((doc) => !after || compare(tuple(doc), after.values) > 0)
            .slice(0, count);
          pages.push(docs.length);
          return {docs};
        },
      });
      return query();
    }} as unknown as FirebaseFirestore.Firestore;
  return {db, pages};
}

test("host cancellation stages all payments in bounded pages", async () => {
  const h = fixture(); h.store.rows.delete("guestPayments/payment1");
  h.store.put("events/event1", {status: "cancelled"});
  for (let index = 0; index < 205; index++) {
    const id = `guestPayments/pay${String(index).padStart(3, "0")}`;
    h.store.put(id, {...h.payment});
  }
  const {db, pages} = queryDatabase(h.store);
  await stageCancelledEventRefunds({db, eventId: "event1",
    clock: () => 1000});
  assert.deepEqual(pages, [100, 100, 5]);
  assert.equal([...h.store.rows.values()].filter((row) =>
    row.cancellationRefund).length, 205);
});

test("recovery selects oldest due work without a purchase-age cutoff",
  async () => {
    const h = fixture(); h.store.rows.delete("guestPayments/payment1");
    for (let index = 0; index < 43; index++) {
      const cancellationRefund = planLegacyCancellationRefund({
        payment: h.payment, reason: "guestCancelled", targetAmountMinor: 1000,
        nowMillis: index + 1});
      h.store.put(
        `guestPayments/pay${index}`, {...h.payment, cancellationRefund});
    }
    const {db} = queryDatabase(h.store); const processed: string[] = [];
    const result = await reconcileNativeCancellationRefunds({db,
      nowMillis: 1000, process: async (paymentId) => {
        processed.push(paymentId);
      }});
    assert.deepEqual(result, {processed: 40, failed: 0,
      continuation: {nextAttemptOrderKey: "integer:40", paymentId: "pay39"}});
    assert.equal(processed[0], "pay0");
    assert.equal(processed.at(-1), "pay39");
  });

test("due recovery bounds unavailable reads with eight workers", async () => {
  const h = fixture(); h.store.rows.delete("guestPayments/payment1");
  for (let index = 0; index < 39; index++) {
    const cancellationRefund = planLegacyCancellationRefund({
      payment: h.payment, reason: "guestCancelled", targetAmountMinor: 1000,
      nowMillis: index + 1});
    h.store.put(`guestPayments/pay${String(index).padStart(2, "0")}`,
      {...h.payment, cancellationRefund});
  }
  let active = 0; let maxActive = 0;
  const result = await reconcileNativeCancellationRefunds({
    db: queryDatabase(h.store).db,
    nowMillis: 1000,
    process: async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise<void>((resolve) => setImmediate(resolve));
      active--;
      throw new Error("Provider unavailable");
    },
  });
  assert.deepEqual(result, {processed: 0, failed: 39});
  assert.equal(maxActive, 8);
});

test("a failed refund preflight leaves the due queue byte-for-byte intact",
  async () => {
    const h = fixture(); h.store.put("events/event1", {status: "cancelled"});
    await h.stage(); const {db} = queryDatabase(h.store);
    const result = await reconcileNativeCancellationRefunds({db,
      nowMillis: 2000, process: async () => {
        throw new Error("Bad authority");
      }});
    assert.deepEqual(result, {processed: 0, failed: 1});
    assert.equal(h.read().cancellationRefund?.state, "pending");
    h.store.put("guestPayments/payment1", {...h.read(), cancellationRefund: {
      ...h.read().cancellationRefund!, state: "pending",
      nextAttemptAtMillis: 1000}});
    await reconcileNativeCancellationRefunds({db, nowMillis: 2000,
      process: async () => {
        h.store.put("guestPayments/payment1", {
          ...h.read(), cancellationRefund: {
            ...h.read().cancellationRefund!, nextAttemptAtMillis: 5000}});
        throw new Error("Retry already scheduled");
      }});
    assert.equal(h.read().cancellationRefund?.state, "pending");
  });


test("old refunded status without amount proof explicitly requires review",
  async () => {
    const h = fixture(); h.store.put("events/event1", {status: "cancelled"});
    h.store.put("guestPayments/payment1", {...h.payment, status: "refunded"});
    const {db} = queryDatabase(h.store);
    await stageCancelledEventRefunds({db, eventId: "event1",
      clock: () => 1000});
    assert.equal(h.read().cancellationRefund?.state, "reviewRequired");
    assert.equal(h.read().cancellationRefund?.lastErrorCode,
      "historicalRefundAmountUnknown");
    assert.deepEqual(h.read().cancellationRefund?.attempts, []);
  });

test("owned Razorpay cancellation staging freezes the runtime context",
  async () => {
    const h = fixture("razorpay");
    const payment = ownedPayment(h.payment);
    h.store.put("guestPayments/payment1", {...payment});
    h.store.put("events/event1", {status: "cancelled"});
    await stageCancelledEventPayment({db: h.store.db(),
      paymentId: "payment1", nowMillis: 1000,
      razorpayAuthorization: ownedAuthorization(payment)});
    assert.deepEqual(h.read().razorpayOwnership,
      {projectId: "catchdates-dev", schema: "1"});
    assert.deepEqual(h.read().cancellationRefund?.razorpayOwnership,
      {projectId: "catchdates-dev", schema: "1"});
  });

// Ownership regressions run against preserved production before integration.
test("ownership recovery: unknown refusal cannot trigger scheduler catch " +
  "writes",
async () => {
  const h = fixture("razorpay");
  h.store.rows.delete("guestPayments/payment1");
  h.store.put("guestPayments/pay_one", {...h.payment,
    cancellationRefund: unprovenRazorpayIntent(h.payment, 1)});
  const before = JSON.stringify(h.store.get("guestPayments/pay_one"));
  const writesBefore = h.store.writes.length;
  const timelineBefore = h.store.timeline.length;
  const {db} = queryDatabase(h.store);
  await reconcileNativeCancellationRefunds({db, nowMillis: 1000,
    process: async () => {
      throw new Error("Unknown native order ownership");
    }});
  assert.equal(JSON.stringify(h.store.get("guestPayments/pay_one")), before);
  assert.equal(h.store.writes.length - writesBefore, 0);
  assert.deepEqual(h.store.timeline.slice(timelineBefore)
    .filter((entry) => entry.startsWith("write:")), []);
});

test("ownership recovery: unknown legacy capture cannot stage " +
  "cancellation intent",
async () => {
  const h = fixture("razorpay");
  h.store.rows.delete("guestPayments/payment1");
  h.store.put("guestPayments/pay_one", {...h.payment});
  h.store.put("events/event1", {status: "cancelled"});
  const before = JSON.stringify(h.store.get("guestPayments/pay_one"));
  const writesBefore = h.store.writes.length;
  const timelineBefore = h.store.timeline.length;
  await stageCancelledEventPayment({db: h.store.db(),
    paymentId: "pay_one", nowMillis: 1000}).catch(() => undefined);
  assert.equal(JSON.stringify(h.store.get("guestPayments/pay_one")), before);
  assert.equal(h.store.writes.length - writesBefore, 0);
  assert.deepEqual(h.store.timeline.slice(timelineBefore)
    .filter((entry) => entry.startsWith("write:")), []);
});

function unresolvedQueueFixture(count: number) {
  const h = fixture("razorpay");
  h.store.rows.delete("guestPayments/payment1");
  for (let index = 0; index < count; index++) {
    const id = `pay_unknown${String(index).padStart(4, "0")}`;
    const payment: PaymentDocument = {...h.payment, paymentId: id,
      orderId: `order_${id}`};
    const cancellationRefund = unprovenRazorpayIntent(payment, index + 1);
    h.store.put(`guestPayments/${id}`, {...payment, cancellationRefund});
  }
  const ownedStripe: PaymentDocument = {...h.payment, provider: "stripe",
    paymentId: "ownedStripe", providerPaymentId: "pi_one",
    stripeAccountId: "acct_one"};
  const cancellationRefund = planLegacyCancellationRefund({payment: ownedStripe,
    reason: "guestCancelled", targetAmountMinor: 1000, nowMillis: count + 1});
  h.store.put(
    "guestPayments/ownedStripe", {...ownedStripe, cancellationRefund});
  return h;
}
function unresolvedQueueBytes(store: Store) {
  return JSON.stringify([...store.rows].filter(([path]) =>
    path.startsWith("guestPayments/pay_unknown")));
}

test("ownership recovery: 80 unresolved oldest rows do not block later " +
  "owned work",
async () => {
  const h = unresolvedQueueFixture(80);
  const before = unresolvedQueueBytes(h.store);
  const {db, pages} = queryDatabase(h.store);
  const processed: string[] = [];
  await reconcileNativeCancellationRefunds({db, nowMillis: 1000,
    process: async (id) => {
      processed.push(id);
    }});
  assert.deepEqual(processed, ["ownedStripe"]);
  assert.equal(unresolvedQueueBytes(h.store), before);
  assert.deepEqual(h.store.writes, []);
  assert.ok(pages.length <= 3);
  assert.ok(pages.reduce((a, b) => a + b, 0) <= 81);
});

test("ownership recovery: bounded continuation reaches owned work beyond " +
  "400 refusals",
async () => {
  const h = unresolvedQueueFixture(450);
  const before = unresolvedQueueBytes(h.store);
  const {db, pages} = queryDatabase(h.store);
  const processed: string[] = [];
  const run = (continuation?: {
      nextAttemptOrderKey: string; paymentId: string;
    }) => {
    // Variable permits the prospective optional seam without breaking
    // baseline compilation; original source ignores it and cannot advance
    // its page.
    const options = Object.assign({db, nowMillis: 1000,
      process: async (id: string) => {
        processed.push(id);
      }}, {continuation});
    return reconcileNativeCancellationRefunds(options);
  };
  const first = await run();
  assert.deepEqual(processed, []);
  assert.ok(pages.length <= 10);
  assert.ok(pages.reduce((a, b) => a + b, 0) <= 400);
  const continuation = Reflect.get(first, "continuation") as
      {nextAttemptOrderKey: string; paymentId: string} | undefined;
  assert.ok(continuation, "Capped scan must retain explicit continuation");
  await run(continuation);
  assert.deepEqual(processed, ["ownedStripe"]);
  assert.equal(unresolvedQueueBytes(h.store), before);
  assert.deepEqual(h.store.writes, []);
  assert.ok(pages.length <= 12);
  assert.ok(pages.reduce((a, b) => a + b, 0) <= 451);
});

test("durable recovery reaches work beyond 400 refusals across fresh calls",
  async () => {
    const h = unresolvedQueueFixture(450);
    const before = unresolvedQueueBytes(h.store);
    const processed: string[] = [];
    const firstDb = queryDatabase(h.store).db;
    const first = await recoverNativeCancellationRefundPage({db: firstDb,
      nowMillis: 1000, process: async (id) => {
        processed.push(id);
      }});
    assert.equal(processed.length, 0);
    assert.ok(first.continuation);
    const persisted = h.store.get(
      "nativeRefundRecoveryCursors/pendingRefunds");
    assert.deepEqual(persisted?.cursor, first.continuation);
    assert.equal(persisted?.projectId, "catchdates-dev");
    assert.equal(persisted?.schema, "1");

    const secondDb = queryDatabase(h.store).db;
    await recoverNativeCancellationRefundPage({db: secondDb,
      nowMillis: 1000, process: async (id) => {
        processed.push(id);
      }});
    assert.deepEqual(processed, ["ownedStripe"]);
    assert.equal(h.store.get("nativeRefundRecoveryCursors/pendingRefunds")
      ?.cursor, null);
    assert.equal(unresolvedQueueBytes(h.store), before);
  });

test("committed discovery survives interruption before provider work",
  async () => {
    const h = unresolvedQueueFixture(80);
    let interrupt = true;
    const interrupted = queryDatabase(h.store, {afterTransaction: () => {
      if (interrupt && h.store.get(
        "nativeRefundRecoveryCursors/pendingRefunds")) {
        interrupt = false;
        throw new Error("Interrupted after committed cursor");
      }
    }}).db;
    let processCalls = 0;
    await assert.rejects(() => recoverNativeCancellationRefundPage({
      db: interrupted, nowMillis: 1000, process: async () => {
        processCalls++;
      }}), /Interrupted after committed cursor/);
    assert.equal(processCalls, 0);
    assert.deepEqual(h.store.get(
      "nativeRefundRecoveryCursors/pendingRefunds")?.cursor,
    {nextAttemptOrderKey: "integer:40", paymentId: "pay_unknown0039"});

    const processed: string[] = [];
    await recoverNativeCancellationRefundPage({
      db: queryDatabase(h.store).db, nowMillis: 1000,
      process: async (id) => {
        processed.push(id);
      }});
    assert.deepEqual(processed, ["ownedStripe"]);
  });

test("concurrent cursor writers cannot overwrite newer progress", async () => {
  const h = fixture(); h.store.rows.delete("guestPayments/payment1");
  for (let index = 0; index < 40; index++) {
    const payment: PaymentDocument = {...h.payment, provider: "stripe",
      paymentId: `stripe_${index}`, providerPaymentId: `pi_${index}`,
      stripeAccountId: "acct_one"};
    const cancellationRefund = planLegacyCancellationRefund({payment,
      reason: "guestCancelled", targetAmountMinor: 1000,
      nowMillis: index + 1});
    h.store.put(`guestPayments/stripe_${String(index).padStart(2, "0")}`,
      {...payment, cancellationRefund});
  }
  let arrivals = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const {db} = queryDatabase(h.store, {beforeQuery: async (collection) => {
    if (collection !== "payments" || arrivals >= 2) return;
    arrivals++;
    if (arrivals === 2) release();
    await gate;
  }});
  const processed: string[] = [];
  const run = () => recoverNativeCancellationRefundPage({db,
    nowMillis: 1000, process: async (id) => {
      processed.push(id);
    }});
  const results = await Promise.allSettled([run(), run()]);
  assert.equal(results.filter((result) => result.status === "fulfilled")
    .length, 1);
  const rejected = results.find((result) => result.status === "rejected");
  assert.match(String(rejected && rejected.status === "rejected" ?
    rejected.reason : ""), /cursor changed/);
  assert.equal(new Set(processed).size, 40);
  assert.equal(processed.length, 40);
  const cursor = h.store.get(
    "nativeRefundRecoveryCursors/pendingRefunds");
  assert.equal(cursor?.revision, 1);
  assert.deepEqual(cursor?.cursor,
    {nextAttemptOrderKey: "integer:40", paymentId: "stripe_39"});
});

test("foreign or malformed durable cursor authority stops before discovery",
  async () => {
    for (const state of [{stateId: "pendingRefunds",
      projectId: "catch-dating-app-64e51", schema: "1", revision: 1,
      cursor: null, updatedAtMillis: 1},
    {stateId: "pendingRefunds", projectId: "catchdates-dev", schema: "1",
      revision: 1, cursor: {nextAttemptOrderKey: "integer:-1", paymentId: ""},
      updatedAtMillis: 1},
    {stateId: "pendingRefunds", projectId: "catchdates-dev", schema: "1",
      revision: 1, cursor: {nextAttemptOrderKey: Number.NaN,
        paymentId: "payment1"},
      updatedAtMillis: 1},
    {stateId: "pendingRefunds", projectId: "catchdates-dev", schema: "1",
      revision: 1, cursor: {
        nextAttemptOrderKey: "integer:-9223372036854775809",
        paymentId: "payment1"},
      updatedAtMillis: 1}]) {
      const h = unresolvedQueueFixture(1);
      h.store.put("nativeRefundRecoveryCursors/pendingRefunds", state);
      const {db, pages} = queryDatabase(h.store);
      let processCalls = 0;
      await assert.rejects(() => recoverNativeCancellationRefundPage({db,
        nowMillis: 1000, process: async () => {
          processCalls++;
        }}));
      assert.equal(processCalls, 0);
      assert.deepEqual(pages, []);
      assert.deepEqual(h.store.get(
        "nativeRefundRecoveryCursors/pendingRefunds"), state);
    }
  });

test("secret-bound staging proves provider ownership before refund intent",
  async () => {
    const h = fixture("razorpay");
    h.store.rows.delete("guestPayments/payment1");
    const own = ownedPayment({...h.payment, orderId: "order_owned"});
    const foreign = ownedPayment({...h.payment, orderId: "order_foreign",
      paymentId: "pay_foreign"});
    h.store.put("guestPayments/owned", {...own});
    h.store.put("guestPayments/foreign", {...foreign});
    h.store.put("events/event1", {status: "cancelled"});
    const foreignBefore = JSON.stringify(h.store.get("guestPayments/foreign"));
    const result = await recoverCancelledRazorpayStagingPage({
      db: queryDatabase(h.store).db, nowMillis: 1000,
      provider: {authorizeRazorpayRefund: async (payment) => {
        if (payment.orderId === "order_foreign") {
          throw new LegacyRefundReviewRequired("Foreign order.");
        }
        return ownedAuthorization(payment);
      }},
    });
    assert.equal(result.staged, 1);
    assert.equal(result.failed, 0);
    assert.equal((h.store.get("guestPayments/owned")?.cancellationRefund as
      LegacyRefundIntent | undefined)?.reason, "eventCancelled");
    assert.equal(JSON.stringify(h.store.get("guestPayments/foreign")),
      foreignBefore);
  });

test("staging checkpoints discovery before provider work and resumes",
  async () => {
    const h = fixture("razorpay");
    h.store.rows.delete("guestPayments/payment1");
    h.store.put("events/event1", {status: "cancelled"});
    for (let index = 0; index < 40; index++) {
      const id = `payment${String(index).padStart(2, "0")}`;
      h.store.put(`guestPayments/${id}`, {...ownedPayment(h.payment),
        paymentId: `pay_${id}`, orderId: `order_${id}`});
    }
    let interrupt = true;
    const interrupted = queryDatabase(h.store, {afterTransaction: () => {
      if (interrupt && h.store.get(
        "nativeRefundRecoveryCursors/cancelledRazorpayPayments")) {
        interrupt = false;
        throw new Error("Interrupted after staging cursor");
      }
    }}).db;
    let providerCalls = 0;
    await assert.rejects(() => recoverCancelledRazorpayStagingPage({
      db: interrupted, nowMillis: 1000,
      provider: {authorizeRazorpayRefund: async (payment) => {
        providerCalls++;
        return ownedAuthorization(payment);
      }},
    }), /Interrupted after staging cursor/);
    assert.equal(providerCalls, 0);
    assert.deepEqual(h.store.get(
      "nativeRefundRecoveryCursors/cancelledRazorpayPayments")?.cursor,
    {nextAttemptOrderKey: "integer:0", paymentId: "payment39"});

    const provider = {authorizeRazorpayRefund: async (payment:
      PaymentDocument) => ownedAuthorization(payment)};
    const wrap = await recoverCancelledRazorpayStagingPage({
      db: queryDatabase(h.store).db, nowMillis: 2000, provider});
    assert.equal(wrap.scanned, 0);
    const resumed = await recoverCancelledRazorpayStagingPage({
      db: queryDatabase(h.store).db, nowMillis: 3000, provider});
    assert.equal(resumed.staged, 40);
  });

test("staging provider read failure retries after cursor wrap without writes",
  async () => {
    const h = fixture("razorpay");
    const payment = ownedPayment(h.payment);
    h.store.put("guestPayments/payment1", {...payment});
    h.store.put("events/event1", {status: "cancelled"});
    const before = JSON.stringify(h.store.get("guestPayments/payment1"));
    const first = await recoverCancelledRazorpayStagingPage({
      db: queryDatabase(h.store).db, nowMillis: 1000,
      provider: {authorizeRazorpayRefund: async () => {
        throw new Error("Provider unavailable.");
      }},
    });
    assert.deepEqual(first, {scanned: 1, staged: 0, failed: 1});
    assert.equal(JSON.stringify(h.store.get("guestPayments/payment1")), before);
    const second = await recoverCancelledRazorpayStagingPage({
      db: queryDatabase(h.store).db, nowMillis: 2000,
      provider: {authorizeRazorpayRefund: async (current) =>
        ownedAuthorization(current)},
    });
    assert.equal(second.staged, 1);
    assert.equal((h.read().cancellationRefund as LegacyRefundIntent).reason,
      "eventCancelled");
  });

test("malformed due rows cannot block later valid refund work", async () => {
  const h = fixture("razorpay");
  h.store.rows.delete("guestPayments/payment1");
  for (let index = 0; index < 39; index++) {
    const payment: PaymentDocument = {...h.payment,
      paymentId: `pay_unknown${index}`, orderId: `order_unknown${index}`};
    h.store.put(`guestPayments/pay${String(index).padStart(3, "0")}`,
      {...payment,
        cancellationRefund: unprovenRazorpayIntent(payment, index + 1)});
  }
  const malformedPayment: PaymentDocument = {...h.payment,
    paymentId: "pay_malformed", orderId: "order_malformed"};
  const malformed = {...malformedPayment, amount: "not-an-integer",
    cancellationRefund: {...unprovenRazorpayIntent(malformedPayment, 40),
      nextAttemptAtMillis: 40.5}};
  h.store.put("guestPayments/pay039", malformed);
  const stripe: PaymentDocument = {...h.payment, provider: "stripe",
    paymentId: "pay_stripe", providerPaymentId: "pi_stripe",
    stripeAccountId: "acct_one"};
  h.store.put("guestPayments/pay040", {...stripe,
    cancellationRefund: planLegacyCancellationRefund({payment: stripe,
      reason: "guestCancelled", targetAmountMinor: 1000, nowMillis: 41})});
  const malformedBefore = JSON.stringify(h.store.get("guestPayments/pay039"));
  const processed: string[] = [];
  const result = await reconcileNativeCancellationRefunds({
    db: queryDatabase(h.store).db, nowMillis: 1000,
    process: async (id) => {
      processed.push(id);
    }});
  assert.deepEqual(result, {processed: 1, failed: 1});
  assert.deepEqual(processed, ["pay040"]);
  assert.equal(JSON.stringify(h.store.get("guestPayments/pay039")),
    malformedBefore);
});

test("fractional malformed ordering cannot poison durable progress",
  async () => {
    const h = fixture("razorpay");
    h.store.rows.delete("guestPayments/payment1");
    for (let index = 0; index < 39; index++) {
      const payment: PaymentDocument = {...h.payment,
        paymentId: `pay_unknown${index}`, orderId: `order_unknown${index}`};
      h.store.put(`guestPayments/pay${String(index).padStart(3, "0")}`,
        {...payment,
          cancellationRefund: unprovenRazorpayIntent(payment, index + 1)});
    }
    const malformedPayment: PaymentDocument = {...h.payment,
      paymentId: "pay_malformed", orderId: "order_malformed"};
    h.store.put("guestPayments/pay039", {...malformedPayment,
      cancellationRefund: {...unprovenRazorpayIntent(malformedPayment, 40),
        nextAttemptAtMillis: 40.5}});
    const stripe: PaymentDocument = {...h.payment, provider: "stripe",
      paymentId: "pay_stripe", providerPaymentId: "pi_stripe",
      stripeAccountId: "acct_one"};
    h.store.put("guestPayments/pay040", {...stripe,
      cancellationRefund: planLegacyCancellationRefund({payment: stripe,
        reason: "guestCancelled", targetAmountMinor: 1000, nowMillis: 41})});
    let interrupt = true;
    const interrupted = queryDatabase(h.store, {afterTransaction: () => {
      const cursor = h.store.get(
        "nativeRefundRecoveryCursors/pendingRefunds")?.cursor as
        {nextAttemptOrderKey?: string} | undefined;
      if (interrupt && cursor?.nextAttemptOrderKey === "double:40.5") {
        interrupt = false;
        throw new Error("Interrupted after fractional cursor");
      }
    }}).db;
    let processCalls = 0;
    await assert.rejects(() => recoverNativeCancellationRefundPage({
      db: interrupted, nowMillis: 1000, process: async () => {
        processCalls++;
      }}), /Interrupted after fractional cursor/);
    assert.equal(processCalls, 0);
    assert.deepEqual(h.store.get(
      "nativeRefundRecoveryCursors/pendingRefunds")?.cursor,
    {nextAttemptOrderKey: "double:40.5", paymentId: "pay039"});

    const processed: string[] = [];
    await recoverNativeCancellationRefundPage({
      db: queryDatabase(h.store).db, nowMillis: 2000,
      process: async (id) => {
        processed.push(id);
      }});
    assert.deepEqual(processed, ["pay040"]);
  });

test("negative-infinity ordering cannot poison durable progress",
  async () => {
    const h = fixture("razorpay");
    h.store.rows.delete("guestPayments/payment1");
    for (let index = 0; index < 40; index++) {
      const payment: PaymentDocument = {...h.payment,
        paymentId: `pay_infinite${index}`,
        orderId: `order_infinite${index}`};
      h.store.put(`guestPayments/pay${String(index).padStart(3, "0")}`,
        {...payment, cancellationRefund: {
          ...unprovenRazorpayIntent(payment, index + 1),
          nextAttemptAtMillis: Number.NEGATIVE_INFINITY}});
    }
    const stripe: PaymentDocument = {...h.payment, provider: "stripe",
      paymentId: "pay_stripe", providerPaymentId: "pi_stripe",
      stripeAccountId: "acct_one"};
    h.store.put("guestPayments/pay040", {...stripe,
      cancellationRefund: planLegacyCancellationRefund({payment: stripe,
        reason: "guestCancelled", targetAmountMinor: 1000, nowMillis: 1})});
    let interrupt = true;
    const interrupted = queryDatabase(h.store, {afterTransaction: () => {
      const cursor = h.store.get(
        "nativeRefundRecoveryCursors/pendingRefunds")?.cursor as
        {nextAttemptOrderKey?: string} | undefined;
      if (interrupt && cursor?.nextAttemptOrderKey ===
          "double:negativeInfinity") {
        interrupt = false;
        throw new Error("Interrupted after negative-infinity cursor");
      }
    }}).db;
    let processCalls = 0;
    await assert.rejects(() => recoverNativeCancellationRefundPage({
      db: interrupted, nowMillis: 1000, process: async () => {
        processCalls++;
      }}), /Interrupted after negative-infinity cursor/);
    assert.equal(processCalls, 0);
    assert.deepEqual(h.store.get(
      "nativeRefundRecoveryCursors/pendingRefunds")?.cursor,
    {nextAttemptOrderKey: "double:negativeInfinity", paymentId: "pay039"});

    const processed: string[] = [];
    await recoverNativeCancellationRefundPage({
      db: queryDatabase(h.store).db, nowMillis: 2000,
      process: async (id) => {
        processed.push(id);
      }});
    assert.deepEqual(processed, ["pay040"]);
  });

test("unsafe int64 ordering resumes with exact integer authority",
  async () => {
    const h = fixture("razorpay");
    h.store.rows.delete("guestPayments/payment1");
    const exactOrder = "-9007199254740995";
    const doublePayment: PaymentDocument = {...h.payment,
      paymentId: "pay_double", orderId: "order_double"};
    h.store.put("guestPayments/double000", {...doublePayment,
      cancellationRefund: {...unprovenRazorpayIntent(doublePayment, 1),
        nextAttemptAtMillis: -9007199254740996}});
    for (let index = 0; index < 40; index++) {
      const payment: PaymentDocument = {...h.payment,
        paymentId: `pay_integer${index}`, orderId: `order_integer${index}`};
      h.store.put(`guestPayments/pay${String(index).padStart(3, "0")}`,
        {...payment, cancellationRefund: {
          ...unprovenRazorpayIntent(payment, index + 1),
          nextAttemptAtMillis: exactFirestoreInteger(exactOrder)}});
    }
    const stripe: PaymentDocument = {...h.payment, provider: "stripe",
      paymentId: "pay_stripe", providerPaymentId: "pi_stripe",
      stripeAccountId: "acct_one"};
    h.store.put("guestPayments/pay040", {...stripe,
      cancellationRefund: planLegacyCancellationRefund({payment: stripe,
        reason: "guestCancelled", targetAmountMinor: 1000, nowMillis: 1})});
    let interrupt = true;
    const interrupted = queryDatabase(h.store, {afterTransaction: () => {
      const cursor = h.store.get(
        "nativeRefundRecoveryCursors/pendingRefunds")?.cursor as
        {nextAttemptOrderKey?: string} | undefined;
      if (interrupt && cursor?.nextAttemptOrderKey ===
          `integer:${exactOrder}`) {
        interrupt = false;
        throw new Error("Interrupted after exact int64 cursor");
      }
    }}).db;
    let processCalls = 0;
    await assert.rejects(() => recoverNativeCancellationRefundPage({
      db: interrupted, nowMillis: 1000, process: async () => {
        processCalls++;
      }}), /Interrupted after exact int64 cursor/);
    assert.equal(processCalls, 0);
    assert.deepEqual(h.store.get(
      "nativeRefundRecoveryCursors/pendingRefunds")?.cursor,
    {nextAttemptOrderKey: `integer:${exactOrder}`, paymentId: "pay038"});

    const processed: string[] = [];
    await recoverNativeCancellationRefundPage({
      db: queryDatabase(h.store).db, nowMillis: 2000,
      process: async (id) => {
        processed.push(id);
      }});
    assert.deepEqual(processed, ["pay040"]);
  });

test("long Firestore payment IDs remain valid durable cursor keys",
  async () => {
    const h = fixture("razorpay");
    h.store.rows.delete("guestPayments/payment1");
    for (let index = 0; index < 39; index++) {
      const payment: PaymentDocument = {...h.payment,
        paymentId: `pay_unknown${index}`, orderId: `order_unknown${index}`};
      h.store.put(`guestPayments/pay${String(index).padStart(3, "0")}`,
        {...payment,
          cancellationRefund: unprovenRazorpayIntent(payment, index + 1)});
    }
    const longId = "p".repeat(300);
    const malformedPayment: PaymentDocument = {...h.payment,
      paymentId: "pay_long", orderId: "order_long"};
    h.store.put(`guestPayments/${longId}`, {...malformedPayment,
      amount: "not-an-integer",
      cancellationRefund: unprovenRazorpayIntent(malformedPayment, 40)});
    const stripe: PaymentDocument = {...h.payment, provider: "stripe",
      paymentId: "pay_stripe", providerPaymentId: "pi_stripe",
      stripeAccountId: "acct_one"};
    h.store.put("guestPayments/pay040", {...stripe,
      cancellationRefund: planLegacyCancellationRefund({payment: stripe,
        reason: "guestCancelled", targetAmountMinor: 1000, nowMillis: 41})});
    let interrupt = true;
    const interrupted = queryDatabase(h.store, {afterTransaction: () => {
      const cursor = h.store.get(
        "nativeRefundRecoveryCursors/pendingRefunds")?.cursor as
        {paymentId?: string} | undefined;
      if (interrupt && cursor?.paymentId === longId) {
        interrupt = false;
        throw new Error("Interrupted after long payment ID cursor");
      }
    }}).db;
    let processCalls = 0;
    await assert.rejects(() => recoverNativeCancellationRefundPage({
      db: interrupted, nowMillis: 1000, process: async () => {
        processCalls++;
      }}), /Interrupted after long payment ID cursor/);
    assert.equal(processCalls, 0);
    assert.deepEqual(h.store.get(
      "nativeRefundRecoveryCursors/pendingRefunds")?.cursor,
    {nextAttemptOrderKey: "integer:40", paymentId: longId});

    const processed: string[] = [];
    await recoverNativeCancellationRefundPage({
      db: queryDatabase(h.store).db, nowMillis: 2000,
      process: async (id) => {
        processed.push(id);
      }});
    assert.deepEqual(processed, ["pay040"]);
  });

// Legacy Stripe remains eligible; ownership guards are native Razorpay only.
test("ownership recovery control: Stripe cancellation staging replays exactly",
  async () => {
    const h = fixture();
    const payment: PaymentDocument = {...h.payment, provider: "stripe",
      providerPaymentId: "pi_one", stripeAccountId: "acct_one"};
    h.store.put("guestPayments/payment1", {...payment});
    h.store.put("events/event1", {status: "cancelled"});
    await h.stage();
    const intent = JSON.stringify(h.read().cancellationRefund);
    const writes = h.store.writes.length;
    await h.stage();
    assert.equal(JSON.stringify(h.read().cancellationRefund), intent);
    assert.equal(h.store.writes.length, writes);
    assert.equal(h.read().cancellationRefund?.provider, "stripe");
    assert.equal(h.read().cancellationRefund?.providerPaymentId, "pi_one");
    assert.equal(h.read().cancellationRefund?.targetAmountMinor, 1000);
  });
