import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import {onRequest} from "firebase-functions/v2/https";
import {verifyRazorpayWebhookSignature} from "../razorpay";
import {resolveConversationPushTokens} from
  "../../shared/conversationPushTargets";
import {notificationCopy} from "../../shared/notificationCopy";
import {buildFcmMessage} from "../../shared/notifications";
import {organizerOwnerUserId} from "../../shared/organizerHosts";
import type {
  OrganizerDocument,
  OrganizerPaymentConnectionDocument as Connection,
} from "../../shared/generated/firestoreAdminTypes";
import {formPaymentPartnerWebhookConfig} from "./formPaymentRuntime";
import {FormPaymentProviderError} from "./razorpayPaymentProvider";

/**
 * An organizer revoking Catch's Razorpay access (#1255). Razorpay reports it
 * with the partner app's account.app.authorization_revoked webhook, and any
 * call with a revoked token answers 401. Either marks the organizer's
 * connections needsAttention with lastErrorCode authorizationRevoked:
 * checkout then finds no ready connection and tells guests honestly that paid
 * booking is unavailable (organizerPaymentsNotReady, nothing charged), the
 * Host app shows Reconnect, and the owner gets a push. The status reuses
 * needsAttention because older Host apps reject unknown statuses.
 */
export const authorizationRevokedCode = "authorizationRevoked";
export const revocationEvent = "account.app.authorization_revoked";
const connectionsCollection = "organizerPaymentConnections";
const liveStatuses = new Set(["connecting", "ready", "needsAttention"]);

type Db = FirebaseFirestore.Firestore;

export interface RevocationDeps {
  db: () => Db;
  now: () => number;
  /** Pushes the owner; failures never undo the revocation. */
  notifyOwner: (organizerId: string) => Promise<void>;
}

export const defaultRevocationDeps: RevocationDeps = {
  db: () => admin.firestore(),
  now: Date.now,
  notifyOwner: (organizerId) => pushOwner(admin.firestore(), organizerId),
};

/**
 * Marks connections revoked: all the organizer connections on a Razorpay
 * account (from the partner webhook), or named connections (from a 401).
 * Disconnected connections and those already marked are left as they are.
 * @param {RevocationDeps} deps Dependencies.
 * @param {object} target The account and mode, or connection ids.
 * @return {Promise<string[]>} Organizers newly marked, each notified once.
 */
export async function markRazorpayAuthorizationRevoked(deps: RevocationDeps,
  target: {accountId: string; mode: "test" | "live"} |
    {connectionIds: string[]}): Promise<string[]> {
  const db = deps.db();
  const refs = "accountId" in target ?
    (await db.collection(connectionsCollection)
      .where("accountId", "==", target.accountId).limit(20).get()).docs
      .filter((doc) => (doc.data() as Connection).mode === target.mode)
      .map((doc) => doc.ref) :
    target.connectionIds.map((id) => db.collection(connectionsCollection)
      .doc(id));
  const organizers = new Set<string>();
  for (const ref of refs) {
    const organizerId = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const connection = snap.data() as Connection | undefined;
      if (!connection || !liveStatuses.has(connection.status) ||
          connection.disconnectedAt !== null ||
          connection.lastErrorCode === authorizationRevokedCode) return null;
      tx.update(ref, {status: "needsAttention",
        lastErrorCode: authorizationRevokedCode,
        revision: connection.revision + 1, refreshLeaseUntil: null,
        updatedAt: Timestamp.fromMillis(deps.now())});
      return connection.organizerId;
    });
    if (organizerId) organizers.add(organizerId);
  }
  for (const organizerId of organizers) {
    logger.warn("Razorpay authorization revoked.", {organizerId});
    await deps.notifyOwner(organizerId).catch((error) => {
      logger.warn("Revocation push was not sent.", {organizerId,
        error: error instanceof Error ? error.message : String(error)});
    });
  }
  return [...organizers];
}

/**
 * Wraps a provider bound to one organizer connection so that any call the
 * provider refuses with 401 marks that connection revoked. The error still
 * reaches the caller unchanged.
 * @param {T} provider Provider using the connection's token.
 * @param {Function} onUnauthorized Marks the connection.
 * @return {T} The watched provider.
 */
export function watchRazorpayAuthorization<T extends object>(provider: T,
  onUnauthorized: () => Promise<unknown>): T {
  const flag = (error: unknown) => {
    if (error instanceof FormPaymentProviderError &&
        error.httpStatus === 401) {
      return onUnauthorized().catch((markError) => {
        logger.warn("A 401 from Razorpay was not recorded.", {
          error: markError instanceof Error ? markError.message :
            String(markError)});
      });
    }
    return Promise.resolve();
  };
  return new Proxy(provider, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => {
        const result = value.apply(target, args);
        if (!(result instanceof Promise)) return result;
        return result.catch(async (error: unknown) => {
          await flag(error);
          throw error;
        });
      };
    },
  });
}

/**
 * Watches the provider of one connection with the default dependencies.
 * @param {T} provider Provider using the connection's token.
 * @param {string} connectionId The connection.
 * @param {RevocationDeps} deps Dependencies.
 * @return {T} The watched provider.
 */
export function watchConnectionAuthorization<T extends object>(provider: T,
  connectionId: string, deps: RevocationDeps = defaultRevocationDeps): T {
  return watchRazorpayAuthorization(provider, () =>
    markRazorpayAuthorizationRevoked(deps, {connectionIds: [connectionId]}));
}

/**
 * The owner's Host app devices hear that payments stopped.
 * @param {Db} db Firestore.
 * @param {string} organizerId Organizer.
 * @return {Promise<void>} Resolves once tried.
 */
async function pushOwner(db: Db, organizerId: string): Promise<void> {
  const organizer = (await db.collection("organizers").doc(organizerId).get())
    .data() as OrganizerDocument | undefined;
  const ownerUid = organizer ? organizerOwnerUserId(organizer) : null;
  if (!ownerUid) return;
  const tokens = await resolveConversationPushTokens(db, ownerUid, "host");
  const copy = notificationCopy("organizerRazorpayRevoked",
    {organizerName: String(organizer?.name ?? "Your organiser")});
  for (const token of tokens.slice(0, 20)) {
    await admin.messaging().send(buildFcmMessage({token, title: copy.title,
      body: copy.body, type: "organizerRazorpayRevoked", organizerId,
      recipientUid: ownerUid, appRole: "host"})).catch(() => undefined);
  }
}

export interface PartnerWebhookDeps extends RevocationDeps {
  /** The partner app's webhook secret and mode, or null while unset. */
  partner: () => Promise<{webhookSecret: string | null;
    mode: "test" | "live"}>;
}

/**
 * Handles one partner app webhook delivery: verifies its signature with the
 * partner webhook secret and acts only on revocation.
 * @param {object} input Raw body and signature header.
 * @param {PartnerWebhookDeps} deps Dependencies.
 * @return {Promise<number>} HTTP status to answer.
 */
export async function handlePartnerWebhook(input: {rawBody: Buffer |
  undefined; signature: string | undefined}, deps: PartnerWebhookDeps):
  Promise<number> {
  let partner: {webhookSecret: string | null; mode: "test" | "live"};
  try {
    partner = await deps.partner();
  } catch {
    return 503;
  }
  if (!partner.webhookSecret) {
    logger.error("Razorpay partner webhook secret is not configured.");
    return 503;
  }
  if (!input.rawBody || !input.signature ||
      !verifyRazorpayWebhookSignature(input.rawBody.toString("utf8"),
        input.signature, partner.webhookSecret)) {
    return 400;
  }
  let event: Record<string, unknown>;
  try {
    event = JSON.parse(input.rawBody.toString("utf8"));
  } catch {
    return 400;
  }
  if (event.event !== revocationEvent) return 200;
  const accountId = typeof event.account_id === "string" ? event.account_id :
    null;
  if (!accountId || !/^acc_[A-Za-z0-9]{1,40}$/u.test(accountId)) return 400;
  await markRazorpayAuthorizationRevoked(deps, {accountId,
    mode: partner.mode});
  return 200;
}

/** The partner app's webhook (Razorpay Partners → Applications). */
export const organizerRazorpayPartnerWebhook = onRequest({
  invoker: "public", timeoutSeconds: 60, maxInstances: 10,
}, async (request, response) => {
  const status = await handlePartnerWebhook({rawBody: request.rawBody,
    signature: request.get("x-razorpay-signature") ?? undefined},
  {...defaultRevocationDeps, partner: formPaymentPartnerWebhookConfig});
  response.status(status).send(status === 200 ? "ok" : "");
});
