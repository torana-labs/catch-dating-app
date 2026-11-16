import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import test from "node:test";
import {razorpayWebhookHandler} from "./razorpayWebhook";

const WEBHOOK_SECRET = "whsec_razorpay_test";
process.env.GCLOUD_PROJECT = "catchdates-dev";

// Catch no longer sells seats on its own merchant account, so a native
// payment event must not read or write anything, nor call Razorpay.
const untouchable = {
  firestore: () => new Proxy({}, {
    get: () => {
      throw new Error("Firestore should not be touched.");
    },
  }) as unknown as FirebaseFirestore.Firestore,
  createClient: () => {
    throw new Error("Razorpay client should not be created.");
  },
};

function eventPayload(event: string): Buffer {
  return Buffer.from(JSON.stringify({
    event,
    payload: {
      payment: {
        entity: {id: "pay_123", order_id: "order_123", status: "captured"},
      },
    },
  }));
}

function sign(payload: Buffer): string {
  return crypto.createHmac("sha256", WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");
}

for (const event of ["payment.captured", "payment.failed", "order.paid",
  "refund.processed"]) {
  test(`razorpayWebhookHandler acknowledges ${event} without effects`,
    async () => {
      const payload = eventPayload(event);
      await razorpayWebhookHandler(payload, sign(payload), WEBHOOK_SECRET,
        untouchable);
    });
}

test("razorpayWebhookHandler rejects invalid webhook signatures", async () => {
  const payload = eventPayload("payment.captured");
  await assert.rejects(
    razorpayWebhookHandler(payload, "deadbeef", WEBHOOK_SECRET, untouchable),
    /Invalid Razorpay webhook signature/
  );
});

test("razorpayWebhookHandler rejects a malformed signed body", async () => {
  const payload = Buffer.from(JSON.stringify({event: "payment.captured"}));
  await assert.rejects(
    razorpayWebhookHandler(payload, sign(payload), WEBHOOK_SECRET,
      untouchable),
    /malformed/
  );
});
