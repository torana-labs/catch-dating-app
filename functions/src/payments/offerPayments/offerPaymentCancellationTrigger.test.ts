import assert from "node:assert/strict";
import test from "node:test";
import {HttpsError} from "firebase-functions/v2/https";
import {queueCancelledEventOfferRefunds} from
  "./offerPaymentCancellationTrigger";

function fixture(count: number) {
  const rows = new Map(Array.from({length: count}, (_, index) =>
    [`payment${index}`, {eventId: "event1", status: "admitted"}]));
  let eventStatus = "cancelled";
  let pageLimit = 0;
  let queries = 0;
  const filters: Array<[string, string, unknown]> = [];
  const query = {where: (field: string, op: string, value: unknown) => {
    filters.push([field, op, value]); return query;
  }, limit: (limit: number) => {
    pageLimit = limit; return query;
  }, get: async () => {
    queries++;
    assert.equal(pageLimit, 50);
    assert.deepEqual(filters.splice(0), [
      ["purpose", "==", "offer"], ["eventId", "==", "event1"],
      ["status", "in", ["admitted", "cancelled"]]]);
    const docs = [...rows].filter(([, row]) => ["admitted",
      "cancelled"].includes(row.status))
      .slice(0, pageLimit).map(([id]) => ({id, ref: {id}}));
    return {empty: docs.length === 0, docs};
  }};
  const db = {collection: (name: string) => name === "events" ? {
    doc: () => ({get: async () => ({data: () => ({status: eventStatus})})}),
  } : query,
  runTransaction: async (callback: (tx: unknown) => Promise<unknown>) => {
    const updates: Array<() => void> = [];
    const result = await callback({get: async (ref: {id: string}) => ({
      data: () => rows.get(ref.id)}),
    update: (ref: {id: string}, data: object) => {
      updates.push(() => Object.assign(rows.get(ref.id)!, data));
    }});
    updates.forEach((apply) => apply());
    return result;
  }} as unknown as FirebaseFirestore.Firestore;
  return {db, rows, queries: () => queries, active: () => {
    eventStatus = "active";
  }};
}

test("host cancellation pages every admission and retries without duplicates",
  async () => {
    const h = fixture(121);
    h.rows.get("payment0")!.status = "cancelled";
    let active = 0;
    let maximum = 0;
    const deps = {now: () => 1000, cancel: async ({paymentId}: {
      paymentId: string}) => {
      active++;
      maximum = Math.max(maximum, active);
      await Promise.resolve();
      h.rows.get(paymentId)!.status = "refundPending";
      active--;
      return true;
    }};
    assert.deepEqual(await queueCancelledEventOfferRefunds({db: h.db,
      eventId: "event1"}, deps), {queued: 121, review: 0});
    assert.equal(h.queries(), 4);
    assert.equal(maximum, 4);
    assert.deepEqual(await queueCancelledEventOfferRefunds({db: h.db,
      eventId: "event1"}, deps), {queued: 0, review: 0});
  });

test("migration lock remains admitted for automatic event retry",
  async () => {
    const h = fixture(6);
    let fail = true;
    const deps = {now: () => 1000, cancel: async ({paymentId}: {
      paymentId: string}) => {
      if (paymentId === "payment0" && fail) {
        throw new HttpsError("unavailable", "Waiting for the seat ledger");
      }
      h.rows.get(paymentId)!.status = "refundPending";
      return true;
    }};
    await assert.rejects(queueCancelledEventOfferRefunds({db: h.db,
      eventId: "event1"}, deps), /Waiting for the seat ledger/u);
    assert.equal(h.rows.get("payment0")!.status, "admitted");
    fail = false;
    assert.deepEqual(await queueCancelledEventOfferRefunds({db: h.db,
      eventId: "event1"}, deps), {queued: 1, review: 0});
  });

test("explicit authority failure needs review without starving later refunds",
  async () => {
    const h = fixture(51);
    const result = await queueCancelledEventOfferRefunds({db: h.db,
      eventId: "event1"}, {now: () => 1000, cancel: async ({paymentId}) => {
      if (paymentId === "payment0") {
        throw new HttpsError("failed-precondition", "Bad admission proof");
      }
      h.rows.get(paymentId)!.status = "refundPending";
      return true;
    }});
    assert.deepEqual(result, {queued: 50, review: 1});
    assert.equal(h.rows.get("payment0")!.status, "reviewRequired");
  });

test("active events never queue cancellation work", async () => {
  const h = fixture(1);
  h.active();
  assert.deepEqual(await queueCancelledEventOfferRefunds({db: h.db,
    eventId: "event1"}, {now: () => 1000, cancel: async () => {
    throw new Error("Unexpected cancellation");
  }}), {queued: 0, review: 0});
  assert.equal(h.queries(), 0);
});
