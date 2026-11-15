import {GUEST_PAYMENTS} from "../guestPayments";
import {bookingPaymentRef, bookingPayments} from "../bookingPayments";
import * as admin from "firebase-admin";
import {onDocumentUpdated, onDocumentWritten} from
  "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import type {NativeRefundRecoveryCursorDocument,
  PaymentDocument} from "../../shared/generated/firestoreAdminTypes";
import {validateNativeRefundRecoveryCursorDocument} from
  "../../shared/generated/validators/nativeRefundRecoveryCursorDocument";
import {validatePaymentDocument} from
  "../../shared/generated/validators/paymentDocument";
import {requireDoc} from "../../shared/validation";
import {razorpayKeySecret} from "../razorpay";
import {stripeSecretKey} from "../stripe";
import {planLegacyCancellationRefund,
  type LegacyRazorpayRefundAuthorization} from "./intent";
import {processLegacyCancellationRefund} from "./processor";
import {NativeCancellationRefundProvider} from "./provider";
import {razorpayRuntimeProject} from "../razorpayOrderOwnership";
import {LegacyRefundReviewRequired} from "./errors";

type RefundRecoveryContinuation = NonNullable<
  NativeRefundRecoveryCursorDocument["cursor"]>;

interface LoadedRecoveryCursor {
  revision: number;
  cursor?: RefundRecoveryContinuation;
}

interface RefundRecoveryResult {
  processed: number;
  failed: number;
  continuation?: RefundRecoveryContinuation;
}

interface CancellationStagingResult {
  scanned: number;
  staged: number;
  failed: number;
  continuation?: RefundRecoveryContinuation;
}

type RecoveryStateId = NativeRefundRecoveryCursorDocument["stateId"];

const RECOVERY_STATE_COLLECTION = "nativeRefundRecoveryCursors";
const RECOVERY_STATE_ID = "pendingRefunds";
const CANCELLATION_STAGING_STATE_ID = "cancelledRazorpayPayments";

/** Read cancellation and the current charge together, including captures which
 * arrive after event cancellation. No provider I/O happens in this transaction.
 */
export async function stageCancelledEventPayment(input: {
  db: FirebaseFirestore.Firestore; paymentId: string; nowMillis: number;
  razorpayAuthorization?: LegacyRazorpayRefundAuthorization;
}): Promise<void> {
  const {db, paymentId, nowMillis} = input;
  const ref = bookingPaymentRef(db, paymentId);
  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) return;
    const payment = requireDoc<PaymentDocument>(snapshot, "PaymentDocument");
    if (!["completed", "refunded"].includes(payment.status) ||
        payment.signUpFailed) return;
    if ((payment.provider ?? "razorpay") === "razorpay" &&
        !input.razorpayAuthorization) return;
    const event = await tx.get(db.collection("events").doc(payment.eventId));
    if (event.data()?.status !== "cancelled") return;
    if (payment.cancellationRefund?.reason === "eventCancelled") return;
    const cancellationRefund = planLegacyCancellationRefund({payment,
      reason: "eventCancelled", targetAmountMinor: payment.amount, nowMillis,
      razorpayAuthorization: input.razorpayAuthorization});
    tx.update(ref, {cancellationRefund});
  });
}

/** Page through all captures, without a purchase-age cutoff. Retrying after an
 * interrupted page is safe: each record has an independently persisted intent.
 */
export async function stageCancelledEventRefunds(input: {
  db: FirebaseFirestore.Firestore; eventId: string;
  clock?: () => number;
}): Promise<void> {
  const {db, eventId} = input;
  const clock = input.clock ?? Date.now;
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  let failures = 0;
  do {
    let query = bookingPayments(db).where("eventId", "==", eventId)
      .where("status", "in", ["completed", "refunded"])
      .orderBy(admin.firestore.FieldPath.documentId()).limit(100);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    let index = 0;
    await Promise.all(Array.from({length: Math.min(4, page.docs.length)},
      async () => {
        while (index < page.docs.length) {
          const paymentId = page.docs[index++].id;
          try {
            await stageCancelledEventPayment({db, paymentId,
              nowMillis: clock()});
          } catch {
            failures++;
            logger.error("Native cancelled-event payment needs review", {
              eventId, paymentId});
          }
        }
      }));
    cursor = page.docs.length === 100 ? page.docs.at(-1) : undefined;
  } while (cursor);
  if (failures) throw new Error("Native cancellation staging needs recovery.");
}

export async function reconcileNativeCancellationRefunds(input: {
  db: FirebaseFirestore.Firestore; nowMillis: number;
  process?: (paymentId: string) => Promise<void>;
  continuation?: RefundRecoveryContinuation;
  checkpoint?: (continuation?: RefundRecoveryContinuation) => Promise<void>;
}): Promise<RefundRecoveryResult> {
  const {db, nowMillis} = input;
  const process = input.process ?? ((paymentId: string) =>
    processLegacyCancellationRefund({db, paymentId,
      provider: new NativeCancellationRefundProvider()}));
  const pageSize = 40;
  const workLimit = 40;
  const scanLimit = 400;
  let cursor = input.continuation;
  let scanned = 0; let processed = 0; let failed = 0;
  while (scanned < scanLimit) {
    const limit = Math.min(pageSize, scanLimit - scanned);
    /* firestore-index: payments (
      cancellationRefund.state:ASCENDING,
      cancellationRefund.nextAttemptAtMillis:ASCENDING
    ) */
    let query = bookingPayments(db)
      .where("cancellationRefund.state", "==", "pending")
      .where("cancellationRefund.nextAttemptAtMillis", "<=", nowMillis)
      .orderBy("cancellationRefund.nextAttemptAtMillis")
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(limit);
    if (cursor) {
      query = query.startAfter(
        refundOrderValue(cursor.nextAttemptOrderKey), cursor.paymentId);
    }
    const page = await query.get();
    if (!page.docs.length) {
      await input.checkpoint?.(undefined);
      return {processed, failed};
    }
    const last = page.docs.at(-1)!;
    const pageContinuation = page.docs.length === limit ? {
      nextAttemptOrderKey: refundOrderKey(last),
      paymentId: last.id,
    } : undefined;
    // Advance durable discovery before provider work. Refund dispatch is
    // independently idempotent, and a wrap revisits work skipped by a crash.
    await input.checkpoint?.(pageContinuation);
    const jobs: string[] = [];
    for (const job of page.docs) {
      cursor = {nextAttemptOrderKey: refundOrderKey(job), paymentId: job.id};
      scanned++;
      const value = job.data();
      if (!validatePaymentDocument(value)) {
        failed++;
      } else if (hasLocalRefundOwnership(
        value as unknown as PaymentDocument)) {
        jobs.push(job.id);
      }
      if (jobs.length + failed >= workLimit) break;
    }
    let jobIndex = 0;
    // Eight workers bound a worst-case 40-job Razorpay pass to five waves.
    // Each job can spend three serial 15s provider phases (verification,
    // post-claim ownership refresh, and refund dispatch/observation), leaving
    // the scheduler enough of its 540s budget for cancellation staging.
    await Promise.all(Array.from({length: Math.min(8, jobs.length)},
      async () => {
        while (jobIndex < jobs.length) {
          const paymentId = jobs[jobIndex++];
          try {
            await process(paymentId);
            processed++;
          } catch {
            // Ownership/provider preflight owns retry classification. Recovery
            // never turns an unresolved row into a local review write merely
            // to advance the oldest-due page.
            failed++;
          }
        }
      }));
    if (processed + failed >= workLimit) {
      return pageContinuation ? {processed, failed,
        continuation: pageContinuation} : {processed, failed};
    }
    if (page.docs.length < limit) return {processed, failed};
  }
  return cursor ? {processed, failed, continuation: cursor} :
    {processed, failed};
}

/** Persisted scheduler page. Every full scan advances; a short page wraps. */
export async function recoverNativeCancellationRefundPage(input: {
  db: FirebaseFirestore.Firestore;
  nowMillis: number;
  process?: (paymentId: string) => Promise<void>;
}): Promise<RefundRecoveryResult> {
  const {db, nowMillis} = input;
  const durable = await openRecoveryCursor({db, nowMillis,
    stateId: RECOVERY_STATE_ID});
  return reconcileNativeCancellationRefunds({db, nowMillis,
    process: input.process, continuation: durable.continuation,
    checkpoint: durable.checkpoint});
}

/** The unsecret-bound event trigger stages Stripe only. This bounded pass runs
 * under the existing secret-bound scheduler and proves each Razorpay order at
 * the provider before the first refund-intent write.
 */
export async function recoverCancelledRazorpayStagingPage(input: {
  db: FirebaseFirestore.Firestore;
  nowMillis: number;
  provider?: Pick<NativeCancellationRefundProvider,
    "authorizeRazorpayRefund">;
}): Promise<CancellationStagingResult> {
  const {db, nowMillis} = input;
  const runtimeProjectId = razorpayRuntimeProject();
  const provider = input.provider ?? new NativeCancellationRefundProvider();
  const durable = await openRecoveryCursor({db, nowMillis,
    stateId: CANCELLATION_STAGING_STATE_ID});
  const limit = 40;
  let query = bookingPayments(db)
    .where("razorpayOwnership.projectId", "==", runtimeProjectId)
    .orderBy(admin.firestore.FieldPath.documentId()).limit(limit);
  if (durable.continuation) {
    query = query.startAfter(durable.continuation.paymentId);
  }
  const page = await query.get();
  if (!page.docs.length) {
    await durable.checkpoint(undefined);
    return {scanned: 0, staged: 0, failed: 0};
  }
  const discoveredContinuation = {
    nextAttemptOrderKey: "integer:0",
    paymentId: page.docs.at(-1)!.id,
  };
  // Persist discovery before local/provider I/O. A killed invocation resumes
  // after this page and revisits skipped work after the cursor wraps.
  await durable.checkpoint(discoveredContinuation);
  let staged = 0; let failed = 0;
  let index = 0;
  await Promise.all(Array.from({length: Math.min(4, page.docs.length)},
    async () => {
      while (index < page.docs.length) {
        const snapshot = page.docs[index++];
        const value = snapshot.data();
        if (!validatePaymentDocument(value)) continue;
        const payment = value as unknown as PaymentDocument;
        if ((payment.provider ?? "razorpay") !== "razorpay" ||
            !["completed", "refunded"].includes(payment.status) ||
            payment.signUpFailed ||
            payment.cancellationRefund?.reason === "eventCancelled") continue;
        try {
          const eventCancelled = await db.runTransaction(async (tx) =>
            (await tx.get(db.collection("events").doc(payment.eventId)))
              .data()?.status === "cancelled");
          if (!eventCancelled) continue;
          const razorpayAuthorization =
            await provider.authorizeRazorpayRefund(payment);
          await stageCancelledEventPayment({db, paymentId: snapshot.id,
            nowMillis, razorpayAuthorization});
          staged++;
        } catch (error) {
          // Definite foreign/unknown authority is skipped without a domain
          // write; transient provider or local read failures remain eligible
          // after wrap.
          if (!(error instanceof LegacyRefundReviewRequired)) failed++;
        }
      }
    }));
  const continuation = page.docs.length === limit ?
    discoveredContinuation : undefined;
  if (!continuation) await durable.checkpoint(undefined);
  return {scanned: page.docs.length, staged, failed,
    ...(continuation ? {continuation} : {})};
}

function readRecoveryCursor(snapshot: FirebaseFirestore.DocumentSnapshot,
  runtimeProjectId: string, stateId: RecoveryStateId): LoadedRecoveryCursor {
  if (!snapshot.exists) return {revision: 0};
  const value = snapshot.data();
  if (!validateNativeRefundRecoveryCursorDocument(value)) {
    throw new Error("Native refund recovery cursor is malformed.");
  }
  const state = value;
  if (state.stateId !== stateId || state.schema !== "1" ||
      state.projectId !== runtimeProjectId) {
    throw new Error("Native refund recovery cursor authority is invalid.");
  }
  if (state.cursor) refundOrderValue(state.cursor.nextAttemptOrderKey);
  return {revision: state.revision,
    ...(state.cursor ? {cursor: state.cursor} : {})};
}

async function openRecoveryCursor(input: {
  db: FirebaseFirestore.Firestore;
  nowMillis: number;
  stateId: RecoveryStateId;
}): Promise<{continuation?: RefundRecoveryContinuation;
  checkpoint: (cursor?: RefundRecoveryContinuation) => Promise<void>}> {
  const {db, nowMillis, stateId} = input;
  const stateRef = db.collection(RECOVERY_STATE_COLLECTION).doc(stateId);
  const runtimeProjectId = razorpayRuntimeProject();
  let expected = await db.runTransaction(async (tx) =>
    readRecoveryCursor(await tx.get(stateRef), runtimeProjectId, stateId));
  return {continuation: expected.cursor, checkpoint: async (cursor) => {
    const next = await db.runTransaction(async (tx) => {
      const current = readRecoveryCursor(await tx.get(stateRef),
        runtimeProjectId, stateId);
      if (current.revision !== expected.revision ||
          !sameContinuation(current.cursor, expected.cursor)) {
        throw new Error("Native refund recovery cursor changed.");
      }
      const revision = expected.revision + 1;
      const document: NativeRefundRecoveryCursorDocument = {
        stateId,
        projectId: runtimeProjectId,
        schema: "1",
        revision,
        cursor: cursor ?? null,
        updatedAtMillis: nowMillis,
      };
      tx.set(stateRef, document);
      return {revision, cursor} satisfies LoadedRecoveryCursor;
    });
    expected = next;
  }};
}

function refundOrderKey(snapshot: FirebaseFirestore.QueryDocumentSnapshot):
  string {
  const proto = (snapshot as unknown as {protoField: (field: string) => {
    integerValue?: unknown; doubleValue?: unknown;
  } | undefined}).protoField("cancellationRefund.nextAttemptAtMillis");
  if (proto?.integerValue !== undefined) {
    const value = String(proto.integerValue);
    const integer = parseIntegerOrderValue(value);
    return `integer:${integer.toString()}`;
  }
  const value = proto?.doubleValue;
  if (typeof value !== "number") {
    throw new Error("Native refund recovery order value is malformed.");
  }
  return doubleOrderKey(value);
}

function doubleOrderKey(value: number): string {
  if (Number.isNaN(value)) return "double:nan";
  if (value === Number.NEGATIVE_INFINITY) return "double:negativeInfinity";
  if (value === Number.POSITIVE_INFINITY) return "double:positiveInfinity";
  return `double:${Object.is(value, -0) ? "-0" : String(value)}`;
}

function refundOrderValue(orderKey: string): number | bigint {
  if (orderKey.startsWith("integer:")) {
    return parseIntegerOrderValue(orderKey.slice("integer:".length));
  }
  if (orderKey === "double:nan") return Number.NaN;
  if (orderKey === "double:negativeInfinity") {
    return Number.NEGATIVE_INFINITY;
  }
  if (orderKey === "double:positiveInfinity") {
    return Number.POSITIVE_INFINITY;
  }
  if (!orderKey.startsWith("double:")) {
    throw new Error("Native refund recovery order key is malformed.");
  }
  const encoded = orderKey.slice("double:".length);
  const value = Number(encoded);
  if (!Number.isFinite(value) ||
      doubleOrderKey(value) !== orderKey) {
    throw new Error("Native refund recovery order key is malformed.");
  }
  return value;
}

function parseIntegerOrderValue(encoded: string): bigint {
  if (!/^-?(?:0|[1-9][0-9]*)$/u.test(encoded)) {
    throw new Error("Native refund recovery integer key is malformed.");
  }
  const value = BigInt(encoded);
  if (value < -9_223_372_036_854_775_808n ||
      value > 9_223_372_036_854_775_807n || value.toString() !== encoded) {
    throw new Error("Native refund recovery integer key is malformed.");
  }
  return value;
}

function sameContinuation(left: RefundRecoveryContinuation | undefined,
  right: RefundRecoveryContinuation | undefined): boolean {
  return left === undefined && right === undefined ||
    left !== undefined && right !== undefined &&
    left.nextAttemptOrderKey === right.nextAttemptOrderKey &&
    left.paymentId === right.paymentId;
}

function hasLocalRefundOwnership(payment: PaymentDocument): boolean {
  if ((payment.provider ?? "razorpay") === "stripe") return true;
  const paymentContext = payment.razorpayOwnership;
  const intentContext = payment.cancellationRefund?.razorpayOwnership;
  if (!paymentContext || payment.cancellationRefund && !intentContext) {
    return false;
  }
  let runtimeProjectId: string;
  try {
    runtimeProjectId = razorpayRuntimeProject();
  } catch {
    return false;
  }
  return paymentContext.projectId === runtimeProjectId &&
    paymentContext.schema === "1" &&
    (!intentContext || intentContext.projectId === runtimeProjectId &&
      intentContext.schema === "1");
}

export const onCancelledNativeEventRefunds = onDocumentUpdated({
  document: "events/{eventId}", retry: true, timeoutSeconds: 540,
}, async (event) => {
  if (event.data?.after.data().status !== "cancelled" ||
      event.data.before.data().status === "cancelled") return;
  await stageCancelledEventRefunds({db: admin.firestore(),
    eventId: event.params.eventId});
});

export const onBookingCancellationRefund = onDocumentWritten({
  document: `${GUEST_PAYMENTS}/{paymentId}`, retry: true, timeoutSeconds: 120,
  secrets: [razorpayKeySecret, stripeSecretKey],
}, async (event) => {
  const value = event.data?.after.data();
  if (!validatePaymentDocument(value)) return;
  const payment = value as unknown as PaymentDocument;
  if (!["completed", "refunded", "refundFailed"]
    .includes(payment.status)) return;
  const db = admin.firestore(); const paymentId = event.params.paymentId;
  const provider = new NativeCancellationRefundProvider();
  let razorpayAuthorization: LegacyRazorpayRefundAuthorization | undefined;
  if ((payment.provider ?? "razorpay") === "razorpay") {
    try {
      razorpayAuthorization = await provider.authorizeRazorpayRefund(payment);
    } catch (error) {
      if (error instanceof LegacyRefundReviewRequired) return;
      throw error;
    }
  }
  await stageCancelledEventPayment({db, paymentId, nowMillis: Date.now(),
    razorpayAuthorization});
  await processLegacyCancellationRefund({db, paymentId,
    provider});
});

export const recoverNativeCancellationRefunds = onSchedule({
  schedule: "every 5 minutes", timeZone: "Asia/Kolkata",
  timeoutSeconds: 540, maxInstances: 1,
  secrets: [razorpayKeySecret, stripeSecretKey],
}, async () => {
  const db = admin.firestore();
  const result = await recoverNativeCancellationRefundPage({
    db, nowMillis: Date.now()});
  // Preserve the existing due-refund queue's first claim on the scheduler
  // budget. Staging has pre-I/O discovery checkpoints and four bounded
  // workers, so interruption advances rather than starving either queue.
  const staging = await recoverCancelledRazorpayStagingPage({
    db, nowMillis: Date.now()});
  if (staging.staged || staging.failed) {
    logger.info("Native cancelled-event Razorpay staging", staging);
  }
  if (result.processed || result.failed) {
    logger.info("Native cancellation refund recovery", result);
  }
});
