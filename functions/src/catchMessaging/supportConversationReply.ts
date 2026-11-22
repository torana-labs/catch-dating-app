import {Timestamp, type Firestore} from "firebase-admin/firestore";
import {HttpsError, type CallableRequest} from "firebase-functions/v2/https";
import {requireAdminRole} from "../platform/adminAuth";
import {
  setAdminAuditLogInTransaction,
  writeAdminAuditLog,
} from "../platform/adminAudit";
import {assertOutboundContentAllowed} from
  "../communications/outboundContentPolicy";
import {MetaProviderError} from
  "../platform/delivery/organizerWhatsappProvider";
import type {checkRateLimit} from "../shared/rateLimit";
import type {AdminSendCatchWhatsappReplyCallablePayload} from
  "../shared/generated/adminSendCatchWhatsappReplyCallablePayload";
import type {AdminSendCatchWhatsappReplyCallableResponse} from
  "../shared/generated/adminSendCatchWhatsappReplyCallableResponse";
import {validateAdminSendCatchWhatsappReplyCallablePayload} from
  "../shared/generated/validators/adminSendCatchWhatsappReplyInput";
import {
  SUPPORT_CONVERSATIONS,
  SUPPORT_ROLES,
  SUPPORT_SAVED_REPLIES,
  supportConversationId,
} from "../supportInbox/conversations";
import {
  SupportReplyRefused,
  applySupportWhatsappStatus,
  claimSupportWhatsappReply,
  completeSupportWhatsappReply,
  endSupportWhatsappReply,
} from "../supportInbox/whatsappReplies";
import type {CatchTextSender} from "./autoReply";
import {CATCH_ENDPOINT_STOPS, CATCH_RECEIPTS} from "./whatsappEndpointStops";
import {catchEndpointHash, catchReplyHash, catchStopId} from
  "./whatsappReply";

// Staff replies from Admin → Support to a WhatsApp conversation, sent as a
// free-form text from Catch's own number. One request id is one send: the
// reply is saved as "sending" before WhatsApp is called, so a retried
// request returns the first outcome and never sends twice. A refusal from
// WhatsApp marks it failed; a lost answer marks it unknown, and neither is
// retried. Only inside the 24-hour customer-service window, never after
// STOP, and only while CATCH_WHATSAPP_REPLIES_ENABLED is on.

export type SupportConversationReplyInput = Extract<
  AdminSendCatchWhatsappReplyCallablePayload,
  {purpose: "supportConversation"}>;

export interface SupportConversationReplyConfig {
  enabled: boolean;
  wabaId: string;
  phoneNumberId: string;
}

export interface SupportConversationReplyDeps {
  config: () => SupportConversationReplyConfig;
  db: () => Firestore;
  now: () => number;
  rateLimit: typeof checkRateLimit;
  /** Null when this environment has no sender credential. */
  sender: (config: SupportConversationReplyConfig) =>
    Promise<CatchTextSender | null>;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
}

/** Re-engagement: the person's last message is over 24 hours old. */
const WINDOW_CLOSED_CODE = 131047;
const STATUS_RECONCILE_LIMIT = 20;

export function isSupportConversationReply(
  value: unknown
): value is SupportConversationReplyInput {
  return Boolean(value) && typeof value === "object" &&
    (value as {purpose?: unknown}).purpose === "supportConversation";
}

export function supportRepliesConfigured(
  config: SupportConversationReplyConfig
): boolean {
  return config.enabled === true && /^[0-9]{1,32}$/u.test(config.wabaId) &&
    /^[0-9]{1,32}$/u.test(config.phoneNumberId);
}

export const supportReplyOperationId = (
  scope: Pick<SupportConversationReplyConfig, "wabaId" | "phoneNumberId">,
  conversationId: string, clientRequestId: string): string =>
  "cwsupport_" + catchReplyHash([scope.wabaId, scope.phoneNumberId,
    conversationId, clientRequestId]);

function refusal(error: SupportReplyRefused): HttpsError {
  switch (error.reason) {
  case "notFound":
    return new HttpsError("not-found", "Conversation not found.");
  case "notWhatsapp":
    return new HttpsError("failed-precondition",
      "Only WhatsApp conversations can be answered from Catch's number.");
  case "conflict":
    return new HttpsError("already-exists",
      "That request was already used for a different reply.");
  case "sending":
    return new HttpsError("failed-precondition",
      "This reply is still sending. Refresh in a moment.");
  case "failed":
    return new HttpsError("failed-precondition",
      error.deliveryErrorCode === WINDOW_CLOSED_CODE ?
        "WhatsApp refused the reply because their last message is more " +
          "than 24 hours old. It was not sent." :
        "WhatsApp refused the reply, so it was not sent.");
  case "unknown":
    return new HttpsError("unavailable",
      "Catch couldn't confirm whether WhatsApp got this reply. Check the " +
        "conversation before sending it again.");
  case "switchedOff":
    return new HttpsError("failed-precondition",
      "Sending from Catch's WhatsApp number is switched off.");
  case "stopped":
    return new HttpsError("failed-precondition",
      "They asked Catch to stop messaging them, so Catch can't reply.");
  case "noInboundMessage":
  case "windowClosed":
    // The seam for approved template messages, which WhatsApp allows
    // outside the window. Not built: only free-form replies are sent.
    return new HttpsError("failed-precondition",
      "WhatsApp only allows a reply within 24 hours of their last " +
        "message. Catch can reply once they write again.");
  }
}

function result(conversationId: string, messageId: string,
  providerMessageId: string,
  deliveryState: string, replayed: boolean):
  AdminSendCatchWhatsappReplyCallableResponse {
  const deliveryStatus = (["sent", "delivered", "read", "failed"]
    .includes(deliveryState) ? deliveryState : "accepted") as
    AdminSendCatchWhatsappReplyCallableResponse["deliveryStatus"];
  return {operationId: messageId, providerMessageId, deliveryStatus,
    replayed, conversationId, messageId};
}

/**
 * Sends one staff reply to a WhatsApp Support conversation.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {SupportConversationReplyDeps} deps Dependencies.
 * @return {Promise<AdminSendCatchWhatsappReplyCallableResponse>} Outcome.
 */
export async function sendSupportConversationReply(
  request: CallableRequest<unknown>,
  deps: SupportConversationReplyDeps
): Promise<AdminSendCatchWhatsappReplyCallableResponse> {
  const context = requireAdminRole(request, SUPPORT_ROLES);
  if (!request.app) {
    throw new HttpsError("unauthenticated", "App Check is required.");
  }
  const data = request.data;
  if (!validateAdminSendCatchWhatsappReplyCallablePayload(data) ||
      !isSupportConversationReply(data) || !data.body.trim()) {
    throw new HttpsError("invalid-argument", "Invalid support reply.");
  }
  const body = data.body.trim();
  assertOutboundContentAllowed([body], "Reply content is not allowed.");
  const config = {...deps.config()};
  if (!supportRepliesConfigured(config)) {
    throw refusal(new SupportReplyRefused("switchedOff"));
  }
  const db = deps.db();
  await deps.rateLimit(db, context.uid, "adminSendCatchWhatsappReply",
    {maxRequests: 30, windowMs: 60_000});
  // Per conversation, whoever is sending: a person gets at most five
  // replies a minute from Catch.
  await deps.rateLimit(db, data.conversationId,
    "adminSendSupportConversationReply", {maxRequests: 5, windowMs: 60_000});
  if (data.savedReplyId) {
    const saved = await db.collection(SUPPORT_SAVED_REPLIES)
      .doc(data.savedReplyId).get();
    if (!saved.exists) {
      throw new HttpsError("not-found", "Saved reply not found.");
    }
  }
  const messageId = supportReplyOperationId(config, data.conversationId,
    data.clientRequestId);
  const bodyHash = catchReplyHash(["support-reply/v1", body,
    data.savedReplyId]);
  const targetPath =
    `${SUPPORT_CONVERSATIONS}/${data.conversationId}/messages/${messageId}`;
  const now = () => Timestamp.fromMillis(deps.now());

  // Resolve the sender before claiming, so a missing credential leaves
  // nothing behind; the claim then rechecks the window and STOP.
  let send: CatchTextSender | null;
  try {
    send = await deps.sender(config);
  } catch {
    send = null;
  }
  if (!send) {
    throw new HttpsError("unavailable",
      "Catch's WhatsApp sender isn't set up in this environment.");
  }

  let claimed: Awaited<ReturnType<typeof claimSupportWhatsappReply>>;
  try {
    claimed = await claimSupportWhatsappReply(db, {
      conversationId: data.conversationId, messageId, bodyHash, text: body,
      authorUid: context.uid, savedReplyId: data.savedReplyId,
    }, {
      now,
      stopRef: (address) => db.collection(CATCH_ENDPOINT_STOPS).doc(
        catchStopId(config, catchEndpointHash(address))),
      onClaim: (tx) => setAdminAuditLogInTransaction(tx, db, context, {
        action: "adminSendCatchWhatsappReply",
        targetPath,
        request,
        after: {purpose: "supportConversation", messageId,
          deliveryState: "sending"},
        serverTimestamp: deps.serverTimestamp,
      }),
    });
  } catch (error) {
    if (error instanceof SupportReplyRefused) throw refusal(error);
    throw error;
  }
  if (claimed.kind === "replay") {
    return result(data.conversationId, messageId,
      claimed.message.providerMessageId!, claimed.message.deliveryState,
      true);
  }

  const audit = (after: Record<string, unknown>) =>
    writeAdminAuditLog(db, context, {
      action: "adminSendCatchWhatsappReply", targetPath, request,
      after: {purpose: "supportConversation", messageId, ...after},
      serverTimestamp: deps.serverTimestamp,
    }).catch(() => undefined);
  let providerMessageId: string;
  try {
    providerMessageId = await send(claimed.contactAddress, body);
  } catch (error) {
    // An answer from WhatsApp means it was refused; no answer means it may
    // still have been sent, so it is never retried automatically.
    const refused = error instanceof MetaProviderError &&
      (error.httpStatus !== null || error.disposition === "requestNotSent");
    const code = refused ? (error as MetaProviderError).providerCode : null;
    const state = refused ? "failed" as const : "unknown" as const;
    await endSupportWhatsappReply(db, {conversationId: data.conversationId,
      messageId, bodyHash, state, deliveryErrorCode: code})
      .catch(() => undefined);
    await audit({deliveryState: state, deliveryErrorCode: code});
    throw refusal(new SupportReplyRefused(state, code));
  }
  let saved;
  try {
    saved = await completeSupportWhatsappReply(db, {
      conversationId: data.conversationId, messageId, bodyHash,
      providerMessageId, now: now(),
    });
  } catch {
    await endSupportWhatsappReply(db, {conversationId: data.conversationId,
      messageId, bodyHash, state: "unknown", deliveryErrorCode: null})
      .catch(() => undefined);
    await audit({deliveryState: "unknown", providerMessageId});
    throw refusal(new SupportReplyRefused("unknown"));
  }
  await audit({deliveryState: saved.deliveryState, providerMessageId});
  await reconcileEarlyStatuses(db, config, data.conversationId,
    providerMessageId).catch(() => undefined);
  return result(data.conversationId, messageId, providerMessageId,
    saved.deliveryState, false);
}

/**
 * A status can arrive before the message id is saved; apply any that did.
 * @param {Firestore} db Firestore.
 * @param {SupportConversationReplyConfig} scope Catch's number.
 * @param {string} conversationId Conversation.
 * @param {string} providerMessageId WhatsApp message id.
 * @return {Promise<void>} Done.
 */
export async function reconcileEarlyStatuses(db: Firestore,
  scope: SupportConversationReplyConfig, conversationId: string,
  providerMessageId: string): Promise<void> {
  const receipts = await db.collection(CATCH_RECEIPTS)
    .where("wabaId", "==", scope.wabaId)
    .where("phoneNumberId", "==", scope.phoneNumberId)
    .where("eventKind", "==", "status")
    .where("messageId", "==", providerMessageId)
    .limit(STATUS_RECONCILE_LIMIT).get();
  for (const doc of receipts.docs) {
    const receipt = doc.data() as {deliveryStatus?: unknown;
      errorCodes?: unknown; participantId?: unknown};
    const status = receipt.deliveryStatus;
    if ((status !== "sent" && status !== "delivered" && status !== "read" &&
        status !== "failed") || typeof receipt.participantId !== "string" ||
        supportConversationId("whatsapp", "+" + receipt.participantId) !==
          conversationId) continue;
    const codes = Array.isArray(receipt.errorCodes) ? receipt.errorCodes : [];
    await applySupportWhatsappStatus(db, {conversationId, providerMessageId,
      deliveryStatus: status,
      errorCode: typeof codes[0] === "number" ? codes[0] : null});
  }
}
