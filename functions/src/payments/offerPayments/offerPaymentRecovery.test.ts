import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {OrganizerEventOfferPaymentDocument as Payment} from
  "../../shared/generated/firestoreAdminTypes";
import {reconcileOfferPayments} from "./offerPaymentRecovery";

function row(id: string, status = "checkoutReady", failsWrite = false) {
  const updates: Array<Record<string, unknown>> = [];
  return {id, updates, get: () => status,
    ref: {update: async (value: Record<string, unknown>) => {
      updates.push(value);
      if (failsWrite) throw new Error("Write unavailable");
    }}};
}
function database(batches: Array<Array<ReturnType<typeof row>>>,
  queries: unknown[][][] = []) {
  let cursor = 0;
  // Like Firestore, every where() returns a new query that keeps its filters.
  const build = (filters: unknown[][]): unknown => ({
    where: (...filter: unknown[]) => build([...filters, filter]),
    orderBy: () => build(filters),
    limit: () => build(filters),
    get: async () => {
      queries.push(filters);
      return {docs: batches[cursor++] ?? []};
    },
  });
  const query = build([]);
  return {collection: () => query,
    runTransaction: async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({get: async () => ({data: () => ({settlement: {
        state: "waiting", leaseUntilMillis: 0, nextAttemptAtMillis: 0}})}),
      update: (ref: ReturnType<typeof row>["ref"], value: object) =>
        ref.update(value as Record<string, unknown>)}),
  } as unknown as FirebaseFirestore.Firestore;
}

test("failed expiry, provider and touch do not starve other offer payments",
  async () => {
    const pending = [row("expiry"), row("provider"),
      row("touch", "failed", true),
      row("review", "reviewRequired"), row("healthy")];
    const completed = [row("admitted", "admitted")];
    const released: string[] = [];
    const reconciled: string[] = [];
    const result = await reconcileOfferPayments({
      db: database([pending, completed]), nowMillis: 10000}, {
      clock: () => 0,
      release: async ({paymentId}) => {
        released.push(paymentId);
        if (paymentId === "expiry") throw new Error("Bad ledger");
        return "expired";
      },
      execution: async ({paymentId}) => {
        assert.ok(released.includes(paymentId));
        if (paymentId === "provider") throw new Error("Config unavailable");
        return {reconcile: async () => {
          reconciled.push(paymentId); return {} as Payment;
        }};
      },
    });
    assert.deepEqual(result, {processed: 3, failed: 3, deferred: 0});
    assert.equal(released.length, 6);
    assert.equal(reconciled.includes("review"), false);
    assert.ok(reconciled.includes("healthy"));
    assert.ok(reconciled.includes("admitted"));
    assert.equal((pending[1].updates[0].updatedAt as Timestamp).toMillis(),
      10000);
  });

test("every recovery query reads only offer payments from the shared ledger",
  async () => {
    const queries: unknown[][][] = [];
    await reconcileOfferPayments({
      db: database([[], [], []], queries), nowMillis: 10000}, {
      clock: () => 0,
      release: async () => "admitted",
      execution: async () => ({reconcile: async () => ({} as Payment)}),
    });
    // The purpose-led indexes cannot serve a query without the purpose.
    assert.equal(queries.length, 3);
    for (const filters of queries) {
      assert.deepEqual(filters[0], ["purpose", "==", "offer"]);
    }
  });

test("exhausted offer sweep leaves remaining jobs untouched", async () => {
  let elapsed = 0;
  const pending = [row("first"), row("deferred")];
  const result = await reconcileOfferPayments({
    db: database([pending, []]), nowMillis: 10000}, {
    clock: () => elapsed,
    release: async () => {
      elapsed = 8 * 60_000; return "expired";
    },
    execution: async () => ({reconcile: async () => ({} as Payment)}),
  });
  assert.deepEqual(result, {processed: 1, failed: 0, deferred: 1});
  assert.equal(pending[1].updates.length, 0);
});

test("settlement due queue handles old purchases and quarantines bad proofs",
  async () => {
    const invalid = row("malformed");
    const settled: string[] = [];
    const result = await reconcileOfferPayments({
      db: database([[], [], [invalid, row("old-purchase")]]),
      nowMillis: 10000}, {clock: () => 0,
      release: async () => "admitted",
      execution: async () => ({reconcile: async () => ({} as Payment)}),
      settle: async ({paymentId}) => {
        if (paymentId === "malformed") throw new Error("Invalid proof");
        settled.push(paymentId);
      }});
    assert.deepEqual(settled, ["old-purchase"]);
    assert.deepEqual(invalid.updates, [{"settlement.state": "reviewRequired"}]);
    assert.deepEqual(result, {processed: 1, failed: 1, deferred: 0});
  });
