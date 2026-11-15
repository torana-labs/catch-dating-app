import {bookingPaymentRef, bookingPayments} from "./bookingPayments";
import {onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {signUpUserForEvent} from "../events/signUpUserForEvent";
import {eventParticipationId} from "../shared/relationshipDocuments";
import {hasHostApprovedJoinRequest} from "../events/eventPolicy";
import {
  InviteAttribution,
} from "../events/inviteLinks";
import {
  createStripeClient,
  normalizeStripeAccount,
  StripeCheckoutSessionSnapshot,
  StripeClient,
  stripeSecretKey,
  stripeWebhookSecret,
  verifyStripeWebhookSignature,
} from "./stripe";
import {NativePaidBooking, stageRejectedNativeBooking} from "./nativeBooking";
import {releaseCrossPathsPairHold} from "../crossPaths/pairHolds";
import {
  syncHostPaymentAccountByStripeAccountId,
} from "./stripeHostAccounts";

interface StripeWebhookDeps {
  firestore: () => FirebaseFirestore.Firestore;
  stripe: () => StripeClient;
  serverTimestamp: () => unknown;
  signUpForEvent: typeof signUpUserForEvent;
}

const defaultDeps: StripeWebhookDeps = {
  firestore: () => admin.firestore(),
  stripe: createStripeClient,
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  signUpForEvent: signUpUserForEvent,
};

export async function stripeWebhookHandler(
  payload: Buffer,
  signatureHeader: string | undefined,
  secret: string,
  deps: StripeWebhookDeps = defaultDeps
): Promise<void> {
  if (!verifyStripeWebhookSignature({
    payload,
    signatureHeader,
    secret,
  })) {
    throw new Error("Invalid Stripe webhook signature.");
  }

  const event = parseStripeEvent(payload);
  const db = deps.firestore();
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const sessionId = objectId(event.data.object);
    const session = await deps.stripe().retrieveCheckoutSession(sessionId);
    await fulfillStripeCheckoutSession({db, session, deps});
    return;
  }

  if (
    event.type === "checkout.session.async_payment_failed" ||
    event.type === "checkout.session.expired"
  ) {
    const sessionId = objectId(event.data.object);
    await markStripeCheckoutFailed({
      db,
      sessionId,
      serverTimestamp: deps.serverTimestamp(),
    });
    return;
  }

  if (event.type.startsWith("account.") ||
      event.type.startsWith("v2.core.account")) {
    const account = normalizeStripeAccount(event.data.object);
    await syncHostPaymentAccountByStripeAccountId({
      db,
      stripeAccountId: account.id,
      account,
      serverTimestamp: deps.serverTimestamp(),
      lastStripeEventId: event.id,
    });
  }
}

async function fulfillStripeCheckoutSession({
  db,
  session,
  deps,
}: {
  db: FirebaseFirestore.Firestore;
  session: StripeCheckoutSessionSnapshot;
  deps: StripeWebhookDeps;
}) {
  if (session.paymentStatus !== "paid") return;
  const metadata = session.metadata;
  const paymentId = requiredMetadata(metadata, "paymentId");
  const eventId = requiredMetadata(metadata, "eventId");
  const userId = requiredMetadata(metadata, "userId");
  const amountMinor = Number(requiredMetadata(metadata, "amountMinor"));
  const currency = requiredMetadata(metadata, "currency").toUpperCase();
  const inviteAttribution = inviteAttributionFromMetadata(metadata);
  const crossPathsPairHoldId = optionalMetadata(
    metadata,
    "crossPathsPairHoldId"
  );
  const paymentIntentId = session.paymentIntentId;
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw new Error("Stripe Checkout Session amount metadata is invalid.");
  }
  if (session.amountTotal !== amountMinor || session.currency !== currency) {
    throw new Error("Stripe Checkout Session amount or currency mismatch.");
  }

  const paymentRef = bookingPaymentRef(db, paymentId);
  const paymentSnap = await paymentRef.get();
  const existingStatus = paymentSnap.exists ?
    paymentSnap.data()?.status :
    null;
  if (["completed", "refunded", "refundFailed"].includes(existingStatus)) {
    return;
  }

  const original = paymentSnap.data();
  const paidBooking: NativePaidBooking = {
    orderId: session.id, paymentId, eventId, userId, amount: amountMinor,
    amountMinor, currency, provider: "stripe",
    providerPaymentId: paymentIntentId, checkoutSessionId: session.id,
    ...(original?.stripeAccountId ?
      {stripeAccountId: original.stripeAccountId} : {}),
    ...(original?.applicationFeeAmount != null ?
      {applicationFeeAmount: original.applicationFeeAmount} : {}),
    ...(crossPathsPairHoldId ? {crossPathsPairHoldId} : {}),
    ...(inviteAttribution?.inviteLinkId ?
      {inviteLinkId: inviteAttribution.inviteLinkId} : {}),
    ...(inviteAttribution?.inviteSource ?
      {inviteSource: inviteAttribution.inviteSource} : {}),
  };
  try {
    const participationSnap = await db
      .collection("eventParticipations")
      .doc(eventParticipationId(eventId, userId))
      .get();
    const hasHostApproval =
      hasHostApprovedJoinRequest(participationSnap.data());
    await deps.signUpForEvent(db, eventId, userId, paymentId, {
      paidBooking,
      hasValidInvite: metadata.inviteVerified === "true",
      ...(hasHostApproval ? {hasHostApproval} : {}),
      ...(inviteAttribution ? {inviteAttribution} : {}),
      ...(crossPathsPairHoldId ? {crossPathsPairHoldId} : {}),
    });
  } catch (signUpError) {
    const outcome = await stageRejectedNativeBooking({db,
      booking: paidBooking});
    if (outcome === "admitted") return;
    if (crossPathsPairHoldId) {
      await releaseCrossPathsPairHold({
        db,
        holdId: crossPathsPairHoldId,
        reason: "payment_failed",
      });
    }
    throw signUpError;
  }
}

function inviteAttributionFromMetadata(
  metadata: Record<string, string>
): InviteAttribution | null {
  const inviteLinkId = optionalMetadata(metadata, "inviteLinkId");
  if (!inviteLinkId) return null;
  return {
    inviteLinkId,
    inviteSource: optionalMetadata(metadata, "inviteSource"),
  };
}

async function markStripeCheckoutFailed({
  db,
  sessionId,
  serverTimestamp,
}: {
  db: FirebaseFirestore.Firestore;
  sessionId: string;
  serverTimestamp: unknown;
}) {
  const snap = await bookingPayments(db)
    .where("checkoutSessionId", "==", sessionId)
    .limit(1)
    .get();
  if (snap.empty) return;
  const ref = snap.docs[0].ref;
  await db.runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data();
    // A delayed failure cannot undo captured money, admission or a refund.
    if (current?.status !== "pending" ||
        current.checkoutSessionId !== sessionId ||
        current.provider && current.provider !== "stripe") return;
    tx.set(ref, {status: "failed", updatedAt: serverTimestamp}, {merge: true});
  });
}

interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {object: unknown};
}

function parseStripeEvent(payload: Buffer): StripeWebhookEvent {
  const parsed = JSON.parse(payload.toString("utf8")) as unknown;
  if (parsed === null || typeof parsed !== "object") {
    throw new Error("Stripe webhook event was malformed.");
  }
  const event = parsed as Record<string, unknown>;
  if (
    typeof event.id !== "string" ||
    typeof event.type !== "string" ||
    event.data === null ||
    typeof event.data !== "object"
  ) {
    throw new Error("Stripe webhook event was malformed.");
  }
  return {
    id: event.id,
    type: event.type,
    data: event.data as {object: unknown},
  };
}

function objectId(object: unknown): string {
  if (object === null || typeof object !== "object") {
    throw new Error("Stripe webhook object was malformed.");
  }
  const id = (object as Record<string, unknown>).id;
  if (typeof id !== "string" || id.length === 0) {
    throw new Error("Stripe webhook object id was missing.");
  }
  return id;
}

function requiredMetadata(
  metadata: Record<string, string>,
  key: string
): string {
  const value = metadata[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Stripe Checkout Session missing ${key} metadata.`);
  }
  return value;
}

function optionalMetadata(
  metadata: Record<string, string>,
  key: string
): string | null {
  const value = metadata[key];
  if (typeof value !== "string" || value.length === 0) return null;
  return value;
}

export const stripeWebhook = onRequest(
  {secrets: [stripeSecretKey, stripeWebhookSecret]},
  async (request, response) => {
    const rawBody = (request as {rawBody?: Buffer}).rawBody;
    if (!rawBody) {
      response.status(400).send("Missing raw Stripe webhook body.");
      return;
    }
    try {
      await stripeWebhookHandler(
        rawBody,
        request.header("stripe-signature"),
        stripeWebhookSecret.value()
      );
      response.status(200).send("ok");
    } catch (error) {
      logger.error("Stripe webhook failed", error);
      response.status(400).send("Stripe webhook failed.");
    }
  }
);
