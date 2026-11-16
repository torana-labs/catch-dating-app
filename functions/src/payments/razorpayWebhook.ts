import {onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import Razorpay from "razorpay";
import {
  createRazorpayClient,
  razorpayKeySecret,
  razorpayWebhookSecret,
  verifyRazorpayWebhookSignature,
} from "./razorpay";
import {razorpayBillInvoices} from "../money/billInvoices";
import {
  markBillPaidFromInvoice,
  markBillPaidFromLink,
} from "../money/organizerBills";
import {markToolsOnlyPaidFromLink} from "../money/organizerBillingPlan";
import {razorpayBillPaymentLinks} from "../money/billPaymentLinks";
import {razorpayRuntimeProject} from "./razorpayOrderOwnership";

interface RazorpayWebhookDeps {
  firestore: () => FirebaseFirestore.Firestore;
  createClient: () => Razorpay;
  runtimeProjectId?: () => string;
}

const defaultDeps: RazorpayWebhookDeps = {
  firestore: () => admin.firestore(),
  createClient: createRazorpayClient,
  runtimeProjectId: razorpayRuntimeProject,
};

/**
 * Processes a verified Razorpay webhook delivery.
 *
 * Handles organizers paying Catch's bills: `payment_link.paid` and
 * `invoice.paid`, each read back from Razorpay. Catch no longer sells seats on
 * its own merchant account, so `payment.captured` and every other event type
 * is acknowledged without reads or writes.
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

  if (event.event === "payment_link.paid") {
    // An organizer paying Catch's bill or buying tools-only; the link is read
    // back from Razorpay.
    const linkId = paymentLinkId(event);
    const projectId = (deps.runtimeProjectId ?? razorpayRuntimeProject)();
    const billDeps = {db: () => db, now: Date.now,
      links: () => razorpayBillPaymentLinks(deps.createClient(), projectId)};
    // A link is a bill's or a tools-only purchase's; each reads it back.
    if (!await markBillPaidFromLink(billDeps, linkId, projectId)) {
      await markToolsOnlyPaidFromLink(billDeps, linkId, projectId);
    }
    return;
  }

  if (event.event === "invoice.paid") {
    // An organizer paying Catch's bill from its Razorpay invoice; the invoice
    // is read back from Razorpay.
    const invoiceId = invoiceIdOf(event);
    const projectId = (deps.runtimeProjectId ?? razorpayRuntimeProject)();
    await markBillPaidFromInvoice({db: () => db, now: Date.now,
      invoices: () => razorpayBillInvoices(deps.createClient(), projectId)},
    invoiceId, projectId);
    return;
  }

  // Other event types (payment.captured, refund.* and the rest) are not
  // acted on here.
}

/**
 * Reads the invoice id from an invoice.paid event.
 * @param {RazorpayWebhookEvent} event Parsed webhook event.
 * @return {string} Invoice id.
 */
function invoiceIdOf(event: RazorpayWebhookEvent): string {
  const entity = event.payload?.invoice?.entity as
    Record<string, unknown> | undefined;
  const id = entity?.id;
  if (typeof id !== "string" || !/^inv_[A-Za-z0-9]{1,40}$/u.test(id)) {
    throw new Error("Razorpay webhook invoice id was missing.");
  }
  return id;
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

interface RazorpayWebhookEvent {
  event: string;
  payload: {
    payment_link?: {entity?: unknown};
    invoice?: {entity?: unknown};
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
