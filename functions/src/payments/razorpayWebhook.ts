import {onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import Razorpay from "razorpay";
import {signUpUserForEvent} from "../events/signUpUserForEvent";
import {verifyPaidEventBooking} from "./paymentValidation";
import {
  fulfillRazorpayPayment,
  markRazorpayPendingOrder,
} from "./razorpayFulfillment";
import {
  createRazorpayClient,
  razorpayKeySecret,
  razorpayWebhookSecret,
  verifyRazorpayWebhookSignature,
} from "./razorpay";
import {markBillPaidFromLink} from "../money/organizerBills";
import {razorpayBillPaymentLinks} from "../money/billPaymentLinks";
import {
  assertRazorpayOrderOwnership,
  razorpayRuntimeProject,
  resolveRazorpayOrderOwnership,
} from "./razorpayOrderOwnership";

interface RazorpayWebhookDeps {
  firestore: () => FirebaseFirestore.Firestore;
  createClient: () => Razorpay;
  serverTimestamp: () => unknown;
  signUpForEvent: typeof signUpUserForEvent;
  runtimeProjectId?: () => string;
}

const defaultDeps: RazorpayWebhookDeps = {
  firestore: () => admin.firestore(),
  createClient: createRazorpayClient,
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  signUpForEvent: signUpUserForEvent,
  runtimeProjectId: razorpayRuntimeProject,
};

/**
 * Processes a verified Razorpay webhook delivery.
 *
 * Handles `payment.captured` by re-fetching and validating the order + payment
 * (so we trust Razorpay's server state, not the webhook body) and running the
 * shared fulfillment helper — idempotent if the client callback already
 * fulfilled the booking. Handles `payment.failed` by marking the matching
 * pending-order tracking doc failed.
 *
 * Throws on an invalid signature or a malformed event so the onRequest wrapper
 * can answer 400 and Razorpay retries.
 * @param {Buffer} rawBody Exact raw request body bytes.
 * @param {string|undefined} signatureHeader x-razorpay-signature header value.
 * @param {string} secret Razorpay webhook secret.
 * @param {RazorpayWebhookDeps} deps Injectable dependencies.
 * @return {Promise<void>} Resolves when processing completes.
 */
export async function razorpayWebhookHandler(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  secret: string,
  deps: RazorpayWebhookDeps = defaultDeps
): Promise<void> {
  if (!verifyRazorpayWebhookSignature(rawBody, signatureHeader, secret)) {
    throw new Error("Invalid Razorpay webhook signature.");
  }

  const event = parseRazorpayEvent(rawBody);
  const db = deps.firestore();

  if (event.event === "payment.captured") {
    await handlePaymentCaptured({db, deps, payment: paymentEntity(event)});
    return;
  }

  if (event.event === "payment.failed") {
    await handlePaymentFailed({db, deps, payment: paymentEntity(event)});
    return;
  }

  if (event.event === "payment_link.paid") {
    // An organizer paying Catch's bill; the bill is read back from Razorpay.
    const linkId = paymentLinkId(event);
    const projectId = (deps.runtimeProjectId ?? razorpayRuntimeProject)();
    await markBillPaidFromLink({db: () => db, now: Date.now,
      links: () => razorpayBillPaymentLinks(deps.createClient(), projectId)},
    linkId, projectId);
    return;
  }

  // Other event types (e.g. order.paid, refund.*) are not acted on here.
}

/**
 * Reads the payment link id from a payment_link.paid event.
 * @param {RazorpayWebhookEvent} event Parsed webhook event.
 * @return {string} Payment link id.
 */
function paymentLinkId(event: RazorpayWebhookEvent): string {
  const entity = event.payload?.payment_link?.entity as
    Record<string, unknown> | undefined;
  const id = entity?.id;
  if (typeof id !== "string" || !/^plink_[A-Za-z0-9]{1,40}$/u.test(id)) {
    throw new Error("Razorpay webhook payment link id was missing.");
  }
  return id;
}

/**
 * Fulfills a captured Razorpay payment, validating against Razorpay truth.
 * @param {object} params Handler parameters.
 * @param {FirebaseFirestore.Firestore} params.db Firestore instance.
 * @param {RazorpayWebhookDeps} params.deps Injectable dependencies.
 * @param {RazorpayWebhookPayment} params.payment Webhook payment entity.
 * @return {Promise<void>} Resolves when fulfillment settles.
 */
async function handlePaymentCaptured({
  db,
  deps,
  payment: webhookPayment,
}: {
  db: FirebaseFirestore.Firestore;
  deps: RazorpayWebhookDeps;
  payment: RazorpayWebhookPayment;
}): Promise<void> {
  const orderId = webhookPayment.order_id;
  const paymentId = webhookPayment.id;
  if (!orderId) {
    throw new Error("Razorpay payment.captured event has no order_id.");
  }

  const razorpay = deps.createClient();
  // Re-fetch from Razorpay rather than trusting the webhook body, and discover
  // the booking owner from the order notes (the user id lives there, set at
  // order-creation time).
  const paymentRef = db.collection("payments").doc(paymentId);
  const pendingRef = db.collection("razorpayPendingOrders").doc(orderId);
  const [order, payment, localPayment, pendingOrder] = await Promise.all([
    razorpay.orders.fetch(orderId),
    razorpay.payments.fetch(paymentId),
    paymentRef.get(),
    pendingRef.get(),
  ]);
  const runtimeProjectId =
    (deps.runtimeProjectId ?? razorpayRuntimeProject)();
  const ownership = resolveRazorpayOrderOwnership({
    runtimeProjectId,
    order,
    frozenContexts: [
      localPayment.data()?.razorpayOwnership,
      pendingOrder.data()?.razorpayOwnership,
    ],
  });
  // Validly signed shared-merchant traffic from another environment is
  // acknowledged without mutating local booking, payment or tracking state.
  if (ownership.kind !== "owned") return;
  const razorpayOwnership = assertRazorpayOrderOwnership({
    evidence: ownership.evidence,
    orderId,
    runtimeProjectId,
  });
  const razorpayAuthorization = {evidence: ownership.evidence,
    runtimeProjectId};
  const expectedUserId = noteString(
    order as {notes?: Record<string, unknown> | null},
    "userId"
  );
  if (!expectedUserId) {
    throw new Error("Razorpay order is missing the userId note.");
  }

  if (isExactTerminalRefundReplay({order, payment,
    localPayment: localPayment.data(), orderId, paymentId,
    userId: expectedUserId})) return;

  const booking = verifyPaidEventBooking({
    order,
    payment,
    expectedUserId,
  });

  await fulfillRazorpayPayment({
    db,
    orderId,
    paymentId,
    booking,
    razorpayOwnership,
    razorpayAuthorization,
    deps: {
      signUpForEvent: deps.signUpForEvent,
      serverTimestamp: deps.serverTimestamp,
    },
  });
}

async function handlePaymentFailed({
  db,
  deps,
  payment,
}: {
  db: FirebaseFirestore.Firestore;
  deps: RazorpayWebhookDeps;
  payment: RazorpayWebhookPayment;
}): Promise<void> {
  const orderId = payment.order_id;
  if (!orderId) return;
  const razorpay = deps.createClient();
  const [order, localPayment, pendingOrder] = await Promise.all([
    razorpay.orders.fetch(orderId),
    db.collection("payments").doc(payment.id).get(),
    db.collection("razorpayPendingOrders").doc(orderId).get(),
  ]);
  const runtimeProjectId =
    (deps.runtimeProjectId ?? razorpayRuntimeProject)();
  const ownership = resolveRazorpayOrderOwnership({runtimeProjectId, order,
    frozenContexts: [localPayment.data()?.razorpayOwnership,
      pendingOrder.data()?.razorpayOwnership]});
  if (ownership.kind !== "owned") return;
  assertRazorpayOrderOwnership({evidence: ownership.evidence, orderId,
    runtimeProjectId});
  await markRazorpayPendingOrder({
    db,
    orderId,
    status: "failed",
    serverTimestamp: deps.serverTimestamp,
  });
}

function isExactTerminalRefundReplay(input: {
  order: {id: string; amount: string | number; currency: string;
    notes?: Record<string, string | number | null> | null};
  payment: {id: string; order_id: string; amount: string | number;
    currency: string; status: string; amount_refunded?: number};
  localPayment: FirebaseFirestore.DocumentData | undefined;
  orderId: string;
  paymentId: string;
  userId: string;
}): boolean {
  const {order, payment, localPayment, orderId, paymentId, userId} = input;
  if (!localPayment || !["refunded", "refundFailed"]
    .includes(String(localPayment.status))) return false;
  const amount = Number(order.amount);
  return order.id === orderId && payment.id === paymentId &&
    payment.order_id === orderId && Number.isSafeInteger(amount) &&
    amount > 0 &&
    Number(payment.amount) === amount && payment.currency === order.currency &&
    payment.status === "refunded" && payment.amount_refunded === amount &&
    localPayment.provider === "razorpay" && localPayment.orderId === orderId &&
    localPayment.paymentId === paymentId && localPayment.userId === userId &&
    localPayment.eventId === noteString(order, "eventId") &&
    localPayment.amount === amount && localPayment.currency === order.currency;
}

interface RazorpayWebhookPayment {
  id: string;
  order_id: string | null;
  status?: string;
}

interface RazorpayWebhookEvent {
  event: string;
  payload: {
    payment?: {entity?: unknown};
    payment_link?: {entity?: unknown};
  };
}

/**
 * Reads the payment entity from a Razorpay webhook event.
 * @param {RazorpayWebhookEvent} event Parsed webhook event.
 * @return {RazorpayWebhookPayment} Payment entity with id and order id.
 */
function paymentEntity(event: RazorpayWebhookEvent): RazorpayWebhookPayment {
  const entity = event.payload?.payment?.entity;
  if (entity === null || typeof entity !== "object") {
    throw new Error("Razorpay webhook payment entity was missing.");
  }
  const record = entity as Record<string, unknown>;
  const id = record.id;
  if (typeof id !== "string" || id.length === 0) {
    throw new Error("Razorpay webhook payment id was missing.");
  }
  const orderId = record.order_id;
  return {
    id,
    order_id: typeof orderId === "string" && orderId.length > 0 ?
      orderId :
      null,
    status: typeof record.status === "string" ? record.status : undefined,
  };
}

/**
 * Parses and shape-checks a Razorpay webhook event body.
 * @param {Buffer} rawBody Raw request body bytes.
 * @return {RazorpayWebhookEvent} Parsed event.
 */
function parseRazorpayEvent(rawBody: Buffer): RazorpayWebhookEvent {
  const parsed = JSON.parse(rawBody.toString("utf8")) as unknown;
  if (parsed === null || typeof parsed !== "object") {
    throw new Error("Razorpay webhook event was malformed.");
  }
  const event = parsed as Record<string, unknown>;
  if (
    typeof event.event !== "string" ||
    event.payload === null ||
    typeof event.payload !== "object"
  ) {
    throw new Error("Razorpay webhook event was malformed.");
  }
  return {
    event: event.event,
    payload: event.payload as RazorpayWebhookEvent["payload"],
  };
}

/**
 * Reads a non-empty string note from a Razorpay order.
 * @param {object} order Razorpay order with optional notes map.
 * @param {string} key Note key.
 * @return {string|null} Note value when present.
 */
function noteString(
  order: {notes?: Record<string, unknown> | null},
  key: string
): string | null {
  const value = order.notes?.[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export const razorpayWebhook = onRequest(
  {secrets: [razorpayKeySecret, razorpayWebhookSecret]},
  async (request, response) => {
    const rawBody = (request as {rawBody?: Buffer}).rawBody;
    if (!rawBody) {
      response.status(400).send("Missing raw Razorpay webhook body.");
      return;
    }
    try {
      await razorpayWebhookHandler(
        rawBody,
        request.header("x-razorpay-signature"),
        razorpayWebhookSecret.value()
      );
      response.status(200).send("ok");
    } catch (error) {
      logger.error("Razorpay webhook failed", error);
      response.status(400).send("Razorpay webhook failed.");
    }
  }
);
