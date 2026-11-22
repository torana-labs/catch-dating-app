import assert from "node:assert/strict";
import test from "node:test";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import {runAssistanceTransaction} from "./transactionCallback";

const closed = () => Object.assign(new Error("Closed transaction"),
  {code: 3, details: "Transaction is invalid or closed."});
const tx = {} as Transaction;

test("closed callback reads enter the SDK retry path with their cause retained",
  async () => {
    const original = closed();
    let attempts = 0;
    const db = {runTransaction: async (update: (tx: Transaction) =>
      Promise<number>) => {
      try {
        return await update(tx);
      } catch (error) {
        assert.equal((error as {code: number}).code, 10);
        assert.equal((error as Error).cause, original);
        return update(tx);
      }
    }} as unknown as Firestore;
    const result = await runAssistanceTransaction(db, async () => {
      attempts++;
      if (attempts === 1) throw original;
      return 7;
    });
    assert.equal(result, 7);
    assert.equal(attempts, 2);
  });

test("unrelated argument, domain and existing transient errors are unchanged",
  async () => {
    for (const original of [new Error("Domain validation"),
      Object.assign(closed(), {details: "Invalid document path"}),
      Object.assign(closed(), {code: 13})]) {
      const db = {runTransaction:
        (update: (tx: Transaction) => Promise<void>) => update(tx)} as
        unknown as Firestore;
      await assert.rejects(runAssistanceTransaction(db, async () => {
        throw original;
      }), (error) => error === original);
    }
  });

test("commit uncertainty is never translated or retried by the adapter",
  async () => {
    const original = closed();
    let callbacks = 0;
    const db = {runTransaction: async (update: (tx: Transaction) =>
      Promise<void>) => {
      await update(tx);
      throw original;
    }} as unknown as Firestore;
    await assert.rejects(runAssistanceTransaction(db, async () => {
      callbacks++;
    }), (error) => error === original);
    assert.equal(callbacks, 1);
  });
