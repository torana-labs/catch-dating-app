import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {AudienceTestStore} from "../organizers/organizerAudienceTestStore";
import {contractValidator} from "../shared/contractTestValidators";
import {
  accountSpendAtCutoff,
  applyPaymentSpendChange,
  maxSpendAccounts,
  rebuildOrganizerSpend,
} from "./organizerSpendStore";

type Data = Record<string, unknown>;

const day = 24 * 60 * 60 * 1000;
const nowMillis = Date.parse("2026-09-01T10:00:00.000Z");
const at = (millis: number) => Timestamp.fromMillis(millis);
const clock = {now: () => at(nowMillis)};
const validateTotals = contractValidator("OrganizerSpendTotalsDocument");
const validateProjection =
  contractValidator("HostOrganizerSpendProjectionDocument");

function spendPayment(patch: Data = {}): Data {
  return {
    userId: "user-1",
    orderId: "order-1",
    paymentId: "pay-1",
    eventId: "event-1",
    amount: 1000,
    amountMinor: 1000,
    currency: "INR",
    status: "completed",
    signUpFailed: false,
    createdAt: at(nowMillis - 10 * day),
    completedAt: at(nowMillis - 10 * day),
    ...patch,
  };
}

function store(docs: Record<string, Data> = {}): AudienceTestStore {
  return new AudienceTestStore({
    "events/event-1": {organizerId: "org", startTime: at(nowMillis)},
    "events/event-2": {organizerId: "org", startTime: at(nowMillis + day)},
    "events/other-event": {organizerId: "other", startTime: at(nowMillis)},
    ...docs,
  });
}

const totals = (db: AudienceTestStore, id = "org") =>
  db.docs[`organizerSpendTotals/${id}`] as Data | undefined;
const projection = (db: AudienceTestStore, id = "org") =>
  db.docs[`hostOrganizerSpendProjections/${id}`] as Data | undefined;

async function write(db: AudienceTestStore, changeId: string,
  before?: Data, after?: Data) {
  return applyPaymentSpendChange(db.asFirestore(), {changeId, before, after},
    clock);
}

test("a completed payment counts at its retained amount for its organizer",
  async () => {
    const db = store();
    const [outcome] = await write(db, "c1", undefined, spendPayment());
    assert.equal(outcome.kind, "applied");
    const written = totals(db)!;
    assert.ok(validateTotals(written), JSON.stringify(validateTotals.errors));
    assert.deepEqual(written.byUid, {"user-1": {
      byCurrency: {INR: {amountMinor: 1000, paidOrderCount: 1}},
      firstCompletedAtMillis: nowMillis - 10 * day,
      lastCompletedAtMillis: nowMillis - 10 * day,
    }});
    assert.equal(written.uidCount, 1);
    assert.equal(written.coverage, "exact");
    const projected = projection(db)!;
    assert.ok(validateProjection(projected),
      JSON.stringify(validateProjection.errors));
    // One paid order is not yet eligible for the top quartile.
    assert.deepEqual(projected.topQuartileThresholdByCurrency, {});
    assert.equal(projected.spendCoverage, "catchPaymentsOnly");
    assert.equal(totals(db, "other"), undefined);
  });

test("a refund removes the contribution and the account with it",
  async () => {
    const db = store();
    await write(db, "c1", undefined, spendPayment());
    const [outcome] = await write(db, "c2", spendPayment(),
      spendPayment({status: "refunded"}));
    assert.equal(outcome.kind, "applied");
    assert.deepEqual(totals(db)!.byUid, {});
    assert.equal(totals(db)!.uidCount, 0);
  });

test("a redelivered trigger event is applied once", async () => {
  const db = store();
  await write(db, "c1", undefined, spendPayment());
  const [again] = await write(db, "c1", undefined, spendPayment());
  assert.deepEqual(again, {kind: "duplicate", organizerId: "org"});
  const byUid = totals(db)!.byUid as Record<string, {byCurrency: Data}>;
  assert.deepEqual(byUid["user-1"].byCurrency.INR,
    {amountMinor: 1000, paidOrderCount: 1});
});

test("a write that leaves the contribution as it was does nothing",
  async () => {
    const db = store();
    assert.deepEqual(await write(db, "c1", spendPayment(),
      spendPayment({orderId: "renamed"})), [{kind: "unchanged"}]);
    assert.equal(totals(db), undefined);
  });

test("sign-up failures, other states and other organizers never count",
  async () => {
    const db = store();
    await write(db, "c1", undefined, spendPayment({signUpFailed: true}));
    await write(db, "c2", undefined, spendPayment({status: "pending"}));
    await write(db, "c3", undefined, spendPayment({eventId: "other-event"}));
    assert.equal(totals(db), undefined);
    assert.deepEqual(totals(db, "other")!.byUid, {"user-1": {
      byCurrency: {INR: {amountMinor: 1000, paidOrderCount: 1}},
      firstCompletedAtMillis: nowMillis - 10 * day,
      lastCompletedAtMillis: nowMillis - 10 * day,
    }});
  });

test("a payment whose event cannot be resolved counts for no one",
  async () => {
    const db = store();
    const [outcome] = await write(db, "c1", undefined,
      spendPayment({eventId: "deleted-event"}));
    assert.deepEqual(outcome, {kind: "unresolved", eventId: "deleted-event"});
    assert.equal(totals(db), undefined);
  });

test("an uncomputable amount makes totals partial until it is fixed",
  async () => {
    const db = store();
    await write(db, "c1", undefined, spendPayment({amountMinor: 1.5}));
    assert.equal(totals(db)!.coverage, "partial");
    assert.equal(totals(db)!.uncomputablePaymentCount, 1);
    assert.deepEqual(projection(db)!.topQuartileThresholdByCurrency, {});
    assert.equal(projection(db)!.spendCoverage, "insufficientData");
    await write(db, "c2", spendPayment({amountMinor: 1.5}), spendPayment());
    assert.equal(totals(db)!.coverage, "exact");
    assert.equal(totals(db)!.uncomputablePaymentCount, 0);
    assert.equal(projection(db)!.spendCoverage, "catchPaymentsOnly");
  });

test("thresholds rank accounts with two paid orders, top quartile",
  async () => {
    const db = store();
    let change = 0;
    for (const [index, total] of [1000, 2000, 3000, 4000, 5000, 6000, 7000,
      8000].entries()) {
      for (let order = 0; order < 2; order++) {
        await write(db, `c${change++}`, undefined, spendPayment({
          userId: `user-${index + 1}`, paymentId: `pay-${index}-${order}`,
          amount: total / 2, amountMinor: total / 2}));
      }
    }
    await write(db, `c${change++}`, undefined, spendPayment({
      userId: "one-big-order", paymentId: "big", amount: 90000,
      amountMinor: 90000}));
    // Eight eligible accounts: the top two (8,000 and 7,000) qualify.
    assert.deepEqual(projection(db)!.topQuartileThresholdByCurrency,
      {INR: 7000});
    assert.ok(validateProjection(projection(db)),
      JSON.stringify(validateProjection.errors));
  });

test("an account past the cap makes totals partial and is not added",
  async () => {
    const byUid: Data = {};
    for (let index = 0; index < maxSpendAccounts; index++) {
      byUid[`user-${index}`] = {byCurrency: {INR: {amountMinor: 100,
        paidOrderCount: 1}}, firstCompletedAtMillis: 1,
      lastCompletedAtMillis: 1};
    }
    const db = store({"organizerSpendTotals/org": {schemaVersion: 1,
      organizerId: "org", byUid, uidCount: maxSpendAccounts,
      uncomputablePaymentCount: 0, accountCapReached: false,
      coverage: "exact", appliedChangeIds: [], revision: 1,
      updatedAt: at(nowMillis)}});
    await write(db, "c1", undefined, spendPayment({userId: "newcomer"}));
    const written = totals(db)!;
    assert.equal(written.coverage, "partial");
    assert.equal(written.accountCapReached, true);
    assert.equal((written.byUid as Data).newcomer, undefined);
    assert.equal(projection(db)!.spendCoverage, "insufficientData");
  });

/** Firestore's documented storage size: names, values and nesting. */
function storageSize(value: unknown): number {
  if (value === null || typeof value === "boolean") return 1;
  if (typeof value === "number") return 8;
  if (typeof value === "string") return Buffer.byteLength(value) + 1;
  if (value instanceof Timestamp) return 8;
  if (Array.isArray(value)) {
    return value.reduce((sum: number, item) => sum + storageSize(item), 0);
  }
  return Object.entries(value as Data).reduce((sum, [key, item]) =>
    sum + Buffer.byteLength(key) + 1 + storageSize(item), 0);
}

test("a full totals document stays under Firestore's 1 MiB limit", () => {
  const byUid: Data = {};
  for (let index = 0; index < maxSpendAccounts; index++) {
    // A 28-character Firebase Auth uid paying in two currencies.
    byUid[`uid${String(index).padStart(25, "0")}`] = {byCurrency: {
      INR: {amountMinor: 123456789, paidOrderCount: 42},
      USD: {amountMinor: 123456, paidOrderCount: 3},
    }, firstCompletedAtMillis: nowMillis, lastCompletedAtMillis: nowMillis};
  }
  const document = {schemaVersion: 1, organizerId: "o".repeat(28), byUid,
    uidCount: maxSpendAccounts, uncomputablePaymentCount: 0,
    accountCapReached: true, coverage: "partial",
    appliedChangeIds: Array.from({length: 100}, (_, index) =>
      `${index}`.padStart(36, "x")),
    revision: 1, updatedAt: at(nowMillis)};
  const bytes = storageSize(document) +
    Buffer.byteLength("projects/p/databases/(default)/documents/" +
      `organizerSpendTotals/${"o".repeat(28)}`) + 1 + 32;
  assert.ok(bytes < 1024 * 1024, `${bytes} bytes`);
  // Measured: about 766 KiB with two currencies on every account (582 KiB
  // with one).
  assert.ok(bytes > 700 * 1024, `${bytes} bytes`);
});

test("an account's spend at a cutoff counts only this organizer's payments",
  async () => {
    const db = store({
      "payments/a": spendPayment({paymentId: "a",
        completedAt: at(nowMillis - day)}),
      "payments/b": spendPayment({paymentId: "b", eventId: "event-2",
        completedAt: at(nowMillis + 60_000)}),
      "payments/c": spendPayment({paymentId: "c", eventId: "other-event",
        completedAt: at(nowMillis - day)}),
      "payments/d": spendPayment({paymentId: "d", userId: "user-2"}),
    });
    const result = await db.runTransaction((tx) => accountSpendAtCutoff(
      db.asFirestore(), tx as unknown as FirebaseFirestore.Transaction, {
        organizerId: "org", uid: "user-1", cutoffAtMillis: nowMillis}));
    assert.deepEqual(result, {kind: "exact", catchSpend: [
      {currency: "INR", amountMinor: 1000, paidOrderCount: 1}]});
  });

test("a rebuild writes what the triggers would have", async () => {
  const payments: Record<string, Data> = {
    "payments/a": spendPayment({paymentId: "a"}),
    "payments/b": spendPayment({paymentId: "b", eventId: "event-2",
      amount: 500, amountMinor: 500, completedAt: at(nowMillis + day)}),
    "payments/c": spendPayment({paymentId: "c", userId: "user-2",
      currency: "usd", amount: 300, amountMinor: 300}),
    "payments/d": spendPayment({paymentId: "d", status: "refunded"}),
    "payments/e": spendPayment({paymentId: "e", eventId: "other-event"}),
  };
  const incremental = store(payments);
  let change = 0;
  for (const data of Object.values(payments)) {
    await write(incremental, `c${change++}`, undefined, data);
  }
  const rebuilt = store(payments);
  const report = await rebuildOrganizerSpend(rebuilt.asFirestore(), "org",
    true, clock);
  assert.deepEqual(report, {events: 2, payments: 4, uidCount: 2,
    coverage: "exact", written: true});
  assert.deepEqual(totals(rebuilt)!.byUid, totals(incremental)!.byUid);
  assert.ok(validateTotals(totals(rebuilt)),
    JSON.stringify(validateTotals.errors));
  assert.deepEqual(projection(rebuilt)!.topQuartileThresholdByCurrency,
    projection(incremental)!.topQuartileThresholdByCurrency);
  const dryRun = store(payments);
  assert.equal((await rebuildOrganizerSpend(dryRun.asFirestore(), "org",
    false, clock)).written, false);
  assert.equal(totals(dryRun), undefined);
});
