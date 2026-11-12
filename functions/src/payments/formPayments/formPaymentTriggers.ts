import {GUEST_PAYMENTS} from "../../payments/guestPayments";
import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import {onRequest, type Request} from "firebase-functions/v2/https";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import type {Response} from "express";
import {formPaymentRuntime} from "./formPaymentRuntime";
import {InvalidFormPaymentWebhook,
  recordFormPaymentWebhook} from "./formPaymentWebhook";
import {routedFormPaymentProcessor} from "./formPaymentRoutingRuntime";
import type {FormPaymentProcessor} from "./formPaymentProcessor";
import {formRouteWebhookRuntime, formRouteWebhookConfigurationVersion,
  recordFormRoutePaymentWebhook, processRecordedFormPaymentWebhook} from
  "./formRoutePaymentWebhook";
import {expireFormPaymentReservation} from "./formPaymentSubmission";

export async function organizerFormPaymentOauthCallbackHandler(
  request: Request, response: Response,
  runtime: typeof formPaymentRuntime = formPaymentRuntime): Promise<void> {
  response.set({"Cache-Control": "no-store", "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "X-Content-Type-Options": "nosniff"});
  if (request.method !== "GET") {
    response.status(405).send("Method not allowed."); return;
  }
  const {state, code} = request.query;
  if (typeof state !== "string" || typeof code !== "string" ||
      request.query.error !== undefined) {
    response.status(400).send("Connection was not completed. " +
      "Return to Catch to reconnect Razorpay."); return;
  }
  try {
    const {connections} = await runtime();
    await connections.complete(state, code);
    response.status(200).type("text/plain").send(
      "Razorpay connected. You can close this window and return to Catch.");
  } catch {
    // OAuth codes, state, provider replies and secrets must never be logged or
    // interpolated into this page. There is no user-controlled redirect.
    response.status(400).type("text/plain").send(
      "Connection could not be verified. Return to Catch to reconnect.");
  }
}

export async function organizerFormPaymentWebhookHandler(
  request: Request, response: Response,
  runtime: typeof formPaymentRuntime = formPaymentRuntime,
  routeRuntime = formRouteWebhookRuntime): Promise<void> {
  response.set("Cache-Control", "no-store");
  if (request.method !== "POST") {
    response.status(405).send("Method not allowed."); return;
  }
  const oauth = typeof request.query.connectionId === "string";
  const route = typeof request.query.platformVersion === "string";
  if (oauth === route ||
      !Buffer.isBuffer(request.rawBody) ||
      request.rawBody.length > 64 * 1024) {
    response.status(400).send("Invalid webhook."); return;
  }
  try {
    const input = {rawBody: request.rawBody,
      signature: request.get("x-razorpay-signature"),
      providerEventId: request.get("x-razorpay-event-id")};
    if (route) {
      const configurationVersion = formRouteWebhookConfigurationVersion(
        request.query.platformVersion as string);
      await recordFormRoutePaymentWebhook(input,
        await routeRuntime(configurationVersion));
    } else {
      await recordFormPaymentWebhook({...input,
        connectionId: request.query.connectionId as string}, await runtime());
    }
    // Acknowledgment means durably recorded. The trigger and sweep retry
    // provider verification and fulfillment even when this request ends.
    response.status(200).send("Recorded.");
  } catch (error) {
    if (error instanceof InvalidFormPaymentWebhook) {
      response.status(400).send("Invalid webhook."); return;
    }
    logger.warn("Form payment webhook persistence unavailable");
    response.status(503).send("Please retry.");
  }
}

export async function reconcileOrganizerFormPaymentsHandler(
  deps: {db: FirebaseFirestore.Firestore;
    processor: Pick<FormPaymentProcessor, "reconcile">}, now = Date.now(),
  operations = {
    receipt: processRecordedFormPaymentWebhook,
    expire: expireFormPaymentReservation,
    clock: Date.now,
  }) {
  const deadline = operations.clock() + 8 * 60_000;
  const {db, processor} = deps;
  const cutoff = Timestamp.fromMillis(now - 120_000);
  const [receipts, payments, completed] = await Promise.all([
    db.collection("organizerFormPaymentWebhooks")
      .where("status", "==", "pending")
      .where("nextAttemptAt", "<=", Timestamp.fromMillis(now))
      .orderBy("nextAttemptAt").limit(40).get(),
    db.collection(GUEST_PAYMENTS).where("purpose", "==", "form")
      .where("status", "in", [
        "creatingOrder", "orderUnknown", "checkoutReady", "verifying",
        "captured", "failed", "expired", "refundPending", "reviewRequired"])
      .where("updatedAt", "<=", cutoff).orderBy("updatedAt").limit(40).get(),
    // Recent completed payments get a slower reconciliation pass in case a
    // refund callback was missed. No application state is changed by refunds.
    db.collection(GUEST_PAYMENTS).where("purpose", "==", "form")
      .where("status", "==", "submitted")
      .where("createdAt", ">=", Timestamp.fromMillis(now - 45 * 86400_000))
      .where("updatedAt", "<=", Timestamp.fromMillis(now - 6 * 3600_000))
      .orderBy("createdAt").orderBy("updatedAt").limit(20).get(),
  ]);
  let processed = 0;
  let failed = 0;
  const receiptJobs: Array<() => Promise<void>> = [];
  const paymentJobs: Array<() => Promise<void>> = [];
  for (const receipt of receipts.docs) {
    receiptJobs.push(async () => {
      let succeeded = true;
      try {
        await operations.receipt(receipt.id, deps);
      } catch {
        succeeded = false;
      }
      try {
        // Rescheduling has its own failure boundary: a failed write must not
        // prevent other receipts or payments from being recovered.
        await receipt.ref.update({nextAttemptAt:
          Timestamp.fromMillis(now + 5 * 60_000)});
      } catch {
        succeeded = false;
      }
      if (succeeded) processed++;
      else failed++;
    });
  }
  for (const payment of [...payments.docs, ...completed.docs]) {
    paymentJobs.push(async () => {
      let succeeded = true;
      try {
        // Manual review is not permission to retry capture or refund. Only
        // release its expired capacity; keep the financial review state.
        if (payment.get("status") !== "reviewRequired") {
          await processor.reconcile(payment.id);
        }
      } catch {
        succeeded = false;
      }
      try {
        // Provider outages must not hold capacity forever. A later capture of
        // released capacity follows the existing refund/review path.
        await operations.expire({db, paymentId: payment.id,
          now: Timestamp.fromMillis(now)});
      } catch {
        succeeded = false;
      }
      try {
        // Even malformed records move behind other work when this write works.
        await payment.ref.update({updatedAt: Timestamp.fromMillis(now)});
      } catch {
        succeeded = false;
      }
      if (succeeded) processed++;
      else failed++;
    });
  }
  // Interleave queues so a receipt backlog does not consume every worker before
  // expired capacity or captured submissions get a recovery attempt.
  const jobs: Array<() => Promise<void>> = [];
  for (let i = 0; i < Math.max(receiptJobs.length, paymentJobs.length); i++) {
    if (receiptJobs[i]) jobs.push(receiptJobs[i]);
    if (paymentJobs[i]) jobs.push(paymentJobs[i]);
  }
  // Limit provider pressure, while one slow merchant does not serialize the
  // whole batch. Leave unstarted work eligible for the next scheduled sweep.
  let cursor = 0;
  await Promise.all(Array.from({length: Math.min(4, jobs.length)}, async () => {
    while (cursor < jobs.length && operations.clock() < deadline) {
      const job = jobs[cursor++];
      await job();
    }
  }));
  return {processed, failed, deferred: jobs.length - cursor};
}

export const organizerFormPaymentOauthCallback = onRequest({
  timeoutSeconds: 120, maxInstances: 10, invoker: "public",
}, (request, response) =>
  organizerFormPaymentOauthCallbackHandler(request, response));

export const organizerFormPaymentWebhook = onRequest({
  timeoutSeconds: 60, maxInstances: 20, invoker: "public",
}, (request, response) =>
  organizerFormPaymentWebhookHandler(request, response));

export const onOrganizerFormPaymentWebhook = onDocumentCreated({
  document: "organizerFormPaymentWebhooks/{receiptId}",
  timeoutSeconds: 120, maxInstances: 20, retry: true,
}, async (event) => {
  try {
    const db = admin.firestore();
    await processRecordedFormPaymentWebhook(event.params.receiptId, {db,
      processor: routedFormPaymentProcessor(db)});
  } catch {
    // Throw a sanitized error so infrastructure retries cannot log secrets.
    throw new Error("Form payment webhook reconciliation is pending.");
  }
});

export const reconcileOrganizerFormPayments = onSchedule({
  schedule: "every 5 minutes", timeZone: "Asia/Kolkata",
  timeoutSeconds: 540, maxInstances: 1,
}, async () => {
  try {
    const db = admin.firestore();
    const summary = await reconcileOrganizerFormPaymentsHandler({db,
      processor: routedFormPaymentProcessor(db)});
    if (summary.processed || summary.failed || summary.deferred) {
      logger.info("Form payment reconciliation", summary);
    }
  } catch {
    throw new Error("Form payment recovery sweep is unavailable.");
  }
});
