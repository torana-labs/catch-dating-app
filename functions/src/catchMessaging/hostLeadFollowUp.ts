import {Timestamp, type Firestore} from "firebase-admin/firestore";
import {HttpsError, type CallableRequest} from "firebase-functions/v2/https";
import {requireAdminRole} from "../platform/adminAuth";
import {
  setAdminAuditLogInTransaction,
  writeAdminAuditLog,
} from "../platform/adminAudit";
import type {checkRateLimit} from "../shared/rateLimit";
import type {AdminSendCatchWhatsappReplyCallablePayload} from
  "../shared/generated/adminSendCatchWhatsappReplyCallablePayload";
import type {AdminSendCatchWhatsappReplyCallableResponse} from
  "../shared/generated/adminSendCatchWhatsappReplyCallableResponse";
import {validateAdminSendCatchWhatsappReplyCallablePayload} from
  "../shared/generated/validators/adminSendCatchWhatsappReplyInput";
import {
  SUPPORT_CONVERSATIONS,
  type SupportInboxDeps,
} from "../supportInbox/conversations";
import {
  SupportReplyRefused,
  WHATSAPP_REPLY_WINDOW_MARGIN_MS,
  WHATSAPP_REPLY_WINDOW_MS,
} from "../supportInbox/whatsappReplies";
import {claimSupportWhatsappTemplate} from "../supportInbox/whatsappTemplates";
import type {CatchTemplateSender} from "./catchSender";
import {CATCH_TEMPLATES, leadFirstName} from "./catchTemplates";
import {deliverClaimedTemplate} from "./templateDelivery";
import {supportRepliesConfigured, type SupportConversationReplyConfig} from
  "./supportConversationReply";
import {CATCH_ENDPOINT_STOPS} from "./whatsappEndpointStops";
import {catchEndpointHash, catchReplyHash, catchStopId} from "./whatsappReply";

// Staff send the approved host_lead_follow_up template to a host lead from
// the Admin inbox ("Hi {{1}}, thanks for asking about Catch Host, and sorry
// we missed you..."), where a free-form reply is no longer allowed. The rules:
// only while sending from Catch's number is on; never after STOP; only when
// the person has not written in the last 24 hours (inside the window staff
// reply in Support instead); and at most one follow-up per WhatsApp number in
// any 7 days, counting every attempt WhatsApp did not refuse. One client
// request id is one send: the Support message is created as "sending" before
// WhatsApp is called, so a retried request returns the first outcome.

export type HostLeadFollowUpInput = Extract<
  AdminSendCatchWhatsappReplyCallablePayload, {purpose: "hostLeadFollowUp"}>;

/** Inbox roles: the people who work leads. */
export const HOST_LEAD_FOLLOW_UP_ROLES = ["admin", "adminOwner",
  "support"] as const;
export const HOST_LEAD_FOLLOW_UP_GAP_MS = 7 * 24 * 60 * 60 * 1000;

/** Lead kinds the follow-up's "asking about Catch Host" does not fit. */
const NOT_HOST_LEADS = new Set(["referral", "city_alerts"]);

export interface HostLeadFollowUpDeps {
  config: () => SupportConversationReplyConfig;
  db: () => Firestore;
  now: () => number;
  rateLimit: typeof checkRateLimit;
  /** Null when this environment has no sender credential. */
  sender: (config: SupportConversationReplyConfig) =>
    Promise<CatchTemplateSender | null>;
  findUidByPhone: SupportInboxDeps["findUidByPhone"];
  serverTimestamp: () => FirebaseFirestore.FieldValue;
}

export function isHostLeadFollowUp(value: unknown):
  value is HostLeadFollowUpInput {
  return Boolean(value) && typeof value === "object" &&
    (value as {purpose?: unknown}).purpose === "hostLeadFollowUp";
}

export const hostLeadFollowUpMessageId = (
  scope: Pick<SupportConversationReplyConfig, "wabaId" | "phoneNumberId">,
  intentId: string, clientRequestId: string): string =>
  "cwfollowup_" + catchReplyHash([scope.wabaId, scope.phoneNumberId,
    "host_lead_follow_up", intentId, clientRequestId]);

const failed = (message: string) =>
  new HttpsError("failed-precondition", message);

function dayLabel(millis: number): string {
  return new Date(millis).toLocaleDateString("en-GB", {day: "numeric",
    month: "short", timeZone: "Asia/Kolkata"});
}

function refusal(error: SupportReplyRefused): HttpsError {
  switch (error.reason) {
  case "stopped":
    return failed("They asked Catch to stop messaging them, so Catch " +
      "can't send the follow-up.");
  case "conflict":
    return new HttpsError("already-exists",
      "That request was already used for a different send.");
  case "sending":
    return failed("This follow-up is still sending. Refresh in a moment.");
  case "failed":
    return failed("WhatsApp refused the follow-up, so it was not sent.");
  case "unknown":
    return new HttpsError("unavailable", "Catch couldn't confirm whether " +
      "WhatsApp got this follow-up. Check their Support thread before " +
      "sending it again.");
  default:
    return failed("Sending from Catch's WhatsApp number is switched off.");
  }
}

/**
 * Sends the host lead follow-up template to one lead's phone.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {HostLeadFollowUpDeps} deps Dependencies.
 * @return {Promise<AdminSendCatchWhatsappReplyCallableResponse>} Outcome.
 */
export async function sendHostLeadFollowUp(request: CallableRequest<unknown>,
  deps: HostLeadFollowUpDeps):
  Promise<AdminSendCatchWhatsappReplyCallableResponse> {
  const context = requireAdminRole(request, HOST_LEAD_FOLLOW_UP_ROLES);
  if (!request.app) {
    throw new HttpsError("unauthenticated", "App Check is required.");
  }
  const data = request.data;
  if (!validateAdminSendCatchWhatsappReplyCallablePayload(data) ||
      !isHostLeadFollowUp(data)) {
    throw new HttpsError("invalid-argument", "Invalid follow-up request.");
  }
  const config = {...deps.config()};
  if (!supportRepliesConfigured(config)) {
    throw refusal(new SupportReplyRefused("switchedOff"));
  }
  const db = deps.db();
  await deps.rateLimit(db, context.uid, "adminSendCatchWhatsappReply",
    {maxRequests: 30, windowMs: 60_000});
  await deps.rateLimit(db, data.intentId, "adminSendHostLeadFollowUp",
    {maxRequests: 5, windowMs: 60_000});
  // Read only: the send is recorded in the Support thread and the audit log.
  const intent = (await db.collection("salesInboundIntents")
    .doc(data.intentId).get()).data();
  if (!intent) throw new HttpsError("not-found", "Lead not found.");
  const phone = typeof intent.phone === "string" &&
    /^\+[1-9][0-9]{6,14}$/u.test(intent.phone) ? intent.phone : null;
  const hostLead = intent.source === "meta_lead_ad" ||
    (intent.source === "website" && !NOT_HOST_LEADS.has(intent.leadKind));
  if (!phone) throw failed("This lead has no WhatsApp number.");
  if (!hostLead) {
    throw failed("The follow-up is for people asking about running " +
      "events on Catch, which this lead isn't.");
  }
  if (intent.status !== "needs_identity_review") {
    throw failed("This lead is already linked or dismissed.");
  }

  let send: CatchTemplateSender | null;
  try {
    send = await deps.sender(config);
  } catch {
    send = null;
  }
  if (!send) {
    throw new HttpsError("unavailable",
      "Catch's WhatsApp sender isn't set up in this environment.");
  }

  const template = CATCH_TEMPLATES.host_lead_follow_up;
  const variables = {first_name: leadFirstName(intent.fullName)};
  const text = template.text(variables);
  const messageId = hostLeadFollowUpMessageId(config, data.intentId,
    data.clientRequestId);
  const bodyHash = catchReplyHash(["template/v1", template.name, text]);
  const nowMillis = deps.now();
  const now = () => Timestamp.fromMillis(deps.now());
  let claimed: Awaited<ReturnType<typeof claimSupportWhatsappTemplate>>;
  let targetPath = "";
  try {
    claimed = await claimSupportWhatsappTemplate({firestore: () => db, now,
      findUidByPhone: deps.findUidByPhone}, {
      contactAddress: phone,
      displayName: typeof intent.fullName === "string" ?
        intent.fullName : null,
      messageId, bodyHash, text, subject: template.subject,
      authorUid: context.uid,
    }, {
      stopRef: (address) => db.collection(CATCH_ENDPOINT_STOPS).doc(
        catchStopId(config, catchEndpointHash(address))),
      recentSinceMillis: nowMillis - HOST_LEAD_FOLLOW_UP_GAP_MS,
      check: (facts) => assertFollowUpAllowed(facts),
      onClaim: (tx, {conversationId}) => {
        targetPath = `${SUPPORT_CONVERSATIONS}/${conversationId}/messages/` +
          messageId;
        setAdminAuditLogInTransaction(tx, db, context, {
          action: "adminSendCatchWhatsappReply", targetPath, request,
          after: {purpose: "hostLeadFollowUp", messageId,
            intentId: data.intentId, deliveryState: "sending"},
          serverTimestamp: deps.serverTimestamp,
        });
      },
    });
  } catch (error) {
    if (error instanceof SupportReplyRefused) throw refusal(error);
    throw error;
  }
  if (claimed.kind === "replay") {
    return result(claimed.conversationId, messageId,
      claimed.message.providerMessageId!, claimed.message.deliveryState, true);
  }

  const outcome = await deliverClaimedTemplate(db, {
    scope: config, conversationId: claimed.conversationId, messageId,
    bodyHash, toE164: phone, template: template.name, variables, send,
    automatic: false, nowMillis: deps.now,
  });
  await writeAdminAuditLog(db, context, {
    action: "adminSendCatchWhatsappReply", targetPath, request,
    after: {purpose: "hostLeadFollowUp", messageId, intentId: data.intentId,
      deliveryState: outcome.deliveryState,
      providerMessageId: outcome.providerMessageId,
      deliveryErrorCode: outcome.deliveryErrorCode},
    serverTimestamp: deps.serverTimestamp,
  }).catch(() => undefined);
  if (outcome.state !== "accepted" || !outcome.providerMessageId) {
    throw refusal(new SupportReplyRefused(outcome.state === "failed" ?
      "failed" : "unknown", outcome.deliveryErrorCode));
  }
  return result(claimed.conversationId, messageId, outcome.providerMessageId,
    outcome.deliveryState, false);
}

/**
 * The follow-up's window and repeat rules, read inside the claim.
 * @param {object} facts The conversation, STOP, the clock and recent
 *     messages.
 */
export function assertFollowUpAllowed(facts: {
  conversation: {lastInboundAt: FirebaseFirestore.Timestamp | null} | null;
  stopped: boolean;
  nowMillis: number;
  recent: Array<{messageId: string; deliveryState: string;
    at: FirebaseFirestore.Timestamp}>;
}): void {
  if (facts.stopped) throw new SupportReplyRefused("stopped");
  const lastInbound = facts.conversation?.lastInboundAt?.toMillis() ?? null;
  if (lastInbound !== null && facts.nowMillis < lastInbound +
      WHATSAPP_REPLY_WINDOW_MS - WHATSAPP_REPLY_WINDOW_MARGIN_MS) {
    throw failed("They wrote in the last 24 hours, so reply to them in " +
      "Support instead of sending the follow-up.");
  }
  const earlier = facts.recent
    .filter((message) => message.messageId.startsWith("cwfollowup_") &&
      message.deliveryState !== "failed")
    .map((message) => message.at.toMillis())
    .sort((left, right) => right - left)[0];
  if (earlier !== undefined &&
      facts.nowMillis - earlier < HOST_LEAD_FOLLOW_UP_GAP_MS) {
    throw failed(`A follow-up went to this number on ${dayLabel(earlier)}. ` +
      "Catch sends one a week at most, so the next can go on " +
      `${dayLabel(earlier + HOST_LEAD_FOLLOW_UP_GAP_MS)}.`);
  }
}

function result(conversationId: string, messageId: string,
  providerMessageId: string, deliveryState: string, replayed: boolean):
  AdminSendCatchWhatsappReplyCallableResponse {
  const deliveryStatus = (["sent", "delivered", "read", "failed"]
    .includes(deliveryState) ? deliveryState : "accepted") as
    AdminSendCatchWhatsappReplyCallableResponse["deliveryStatus"];
  return {operationId: messageId, providerMessageId, deliveryStatus,
    replayed, conversationId, messageId};
}
