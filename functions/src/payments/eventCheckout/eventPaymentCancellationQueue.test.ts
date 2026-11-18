import assert from "node:assert/strict";
import test from "node:test";
import {queueCancelledEventPaymentRefunds} from
  "./eventPaymentCancellationQueue";

test("cancelled-event refunds read only the named purpose", async () => {
  const filters: unknown[][] = [];
  const query = {
    where: (...filter: unknown[]) => {
      filters.push(filter);
      return query;
    },
    limit: () => query,
    get: async () => ({empty: true, docs: []}),
  };
  const event = {get: async () => ({data: () => ({status: "cancelled"})})};
  const db = {
    collection: (name: string) => name === "events" ?
      {doc: () => event} : query,
  } as unknown as FirebaseFirestore.Firestore;
  await queueCancelledEventPaymentRefunds({db, eventId: "e1"}, {
    collection: "guestPayments",
    purpose: "offer",
    now: Date.now,
    cancel: async () => true,
  });
  assert.deepEqual(filters[0], ["purpose", "==", "offer"]);
  assert.deepEqual(filters[1], ["eventId", "==", "e1"]);
});
