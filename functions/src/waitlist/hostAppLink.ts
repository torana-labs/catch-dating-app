import {getFirestore, Timestamp, type Firestore} from
  "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import {defineBoolean, defineString} from "firebase-functions/params";
import {isInternalTestLead} from "./internalTestLead";
import {
  defaultSupportInboxDeps,
  type SupportInboxDeps,
} from "../supportInbox/conversations";
import {SupportReplyRefused} from "../supportInbox/whatsappReplies";
import {claimSupportWhatsappTemplate} from "../supportInbox/whatsappTemplates";
import type {SalesInboundIntentsDocument} from
  "../shared/generated/firestoreAdminTypes";
import {
  catchReplyTemplateSender,
  type CatchTemplateSender,
} from "../catchMessaging/catchSender";
import {CATCH_TEMPLATES} from "../catchMessaging/catchTemplates";
import {
  deliverClaimedTemplate,
  type TemplateDeliveryOutcome,
} from "../catchMessaging/templateDelivery";
import {CATCH_ENDPOINT_STOPS} from "../catchMessaging/whatsappEndpointStops";
import {
  catchEndpointHash,
  catchReplyHash,
  catchStopId,
} from "../catchMessaging/whatsappReply";

type TemplateSendRecord = NonNullable<
  SalesInboundIntentsDocument["appLinkWhatsapp"]>;

// "Text me the link": when a website lead of kind app_link asks for the
// Catch Host app, Catch's WhatsApp number sends the approved host_app_link
// template once. It runs from the lead's create trigger, beside the operator
// alert, and never throws, so it never causes a retry. Its one attempt is
// claimed before WhatsApp is called (the Support message's id is the lead's,
// and the lead records the attempt), so a redelivered event never sends
// twice; a failed or unconfirmed send is logged and left for staff, never
// retried. Nothing is sent after STOP, to internal test leads, or while
// CATCH_WHATSAPP_HOST_APP_LINK_ENABLED is off.

export const HOST_APP_LINK_CONSENT_VERSION = "app-link-whatsapp-v1";
/** A trigger delivered later than this is stale: no message. */
export const HOST_APP_LINK_MAX_AGE_MILLIS = 6 * 60 * 60 * 1000;

export interface HostAppLinkConfig {
  /** CATCH_WHATSAPP_HOST_APP_LINK_ENABLED and _REPLIES_ENABLED, both on. */
  enabled: boolean;
  wabaId: string;
  phoneNumberId: string;
}

export interface HostAppLinkDeps {
  config: () => HostAppLinkConfig;
  db: () => Firestore;
  nowMillis: () => number;
  /** Null when this environment has no sender credential. */
  sender: (config: HostAppLinkConfig) => Promise<CatchTemplateSender | null>;
  findUidByPhone: SupportInboxDeps["findUidByPhone"];
  warn: (message: string, fields: Record<string, unknown>) => void;
}

export type HostAppLinkOutcome = "disabled" | "notApplicable" | "stale" |
  "replayed" | "stopped" | "unavailable" | "accepted" | "failed" | "unknown";

type Data = Record<string, unknown>;

function record(value: unknown): Data | null {
  return value && typeof value === "object" && !Array.isArray(value) ?
    value as Data : null;
}

/**
 * The Support message id of a lead's one app link send.
 * @param {object} scope Catch's WhatsApp account and number.
 * @param {string} intentId The lead.
 * @return {string} Message id.
 */
export function hostAppLinkMessageId(
  scope: {wabaId: string; phoneNumberId: string}, intentId: string): string {
  return "cwapplink_" + catchReplyHash([scope.wabaId, scope.phoneNumberId,
    "host_app_link", intentId]);
}

/**
 * Whether a new salesInboundIntents row is a host app link request Catch
 * should answer: a website app_link lead for the Host app, with this
 * consent, still awaiting review, not an internal test, and with a number.
 * @param {unknown} value The intent.
 * @return {string|null} The E.164 number to send to, or null.
 */
export function hostAppLinkRecipient(value: unknown): string | null {
  const intent = record(value);
  const lead = record(intent?.lead);
  const consent = record(lead?.consent);
  if (!intent || !lead || intent.source !== "website" ||
      intent.leadKind !== "app_link" ||
      intent.status !== "needs_identity_review" ||
      record(lead.appLink)?.app !== "host" ||
      consent?.version !== HOST_APP_LINK_CONSENT_VERSION ||
      isInternalTestLead(intent)) return null;
  const phone = intent.phone;
  return typeof phone === "string" && /^\+[1-9][0-9]{6,14}$/u.test(phone) ?
    phone : null;
}

/**
 * The fields that settle the lead's record of its send, as dotted updates.
 * @param {TemplateDeliveryOutcome} outcome What happened.
 * @return {object} Update fields.
 */
function settledRecord(outcome: TemplateDeliveryOutcome):
  Record<string, unknown> {
  return {
    "appLinkWhatsapp.state": outcome.state,
    "appLinkWhatsapp.providerMessageId": outcome.providerMessageId,
    "appLinkWhatsapp.deliveryErrorCode": outcome.deliveryErrorCode,
  };
}

function createdMillis(value: unknown): number | null {
  const createdAt = record(value)?.createdAt;
  return createdAt instanceof Timestamp ? createdAt.toMillis() : null;
}

/**
 * Sends the Host app link for one new lead, at most once. Never throws.
 * @param {HostAppLinkDeps} deps Dependencies.
 * @param {string} intentId The new salesInboundIntents document id.
 * @return {Promise<HostAppLinkOutcome>} What happened.
 */
export async function sendHostAppLinkForLead(deps: HostAppLinkDeps,
  intentId: string): Promise<HostAppLinkOutcome> {
  try {
    return await sendOnce(deps, intentId);
  } catch (error) {
    deps.warn("Host app link not sent: unexpected error.", {intentId,
      error: error instanceof Error ? error.name : "unknown"});
    return "unknown";
  }
}

async function sendOnce(deps: HostAppLinkDeps, intentId: string):
  Promise<HostAppLinkOutcome> {
  const config = {...deps.config()};
  if (!config.enabled || !/^[a-f0-9]{64}$/u.test(intentId)) return "disabled";
  const db = deps.db();
  const intentRef = db.collection("salesInboundIntents").doc(intentId);
  const intent = (await intentRef.get()).data();
  const toE164 = hostAppLinkRecipient(intent);
  if (!toE164) return "notApplicable";
  if (record(intent)?.appLinkWhatsapp) return "replayed";
  const created = createdMillis(intent);
  if (created === null ||
      deps.nowMillis() - created > HOST_APP_LINK_MAX_AGE_MILLIS) {
    return "stale";
  }
  const template = CATCH_TEMPLATES.host_app_link;
  const now = () => Timestamp.fromMillis(deps.nowMillis());
  const skip = async (reason: "stopped" | "unavailable") => {
    const skipped: TemplateSendRecord = {templateName: "host_app_link",
      state: "skipped", skipReason: reason, conversationId: null,
      messageId: null, providerMessageId: null, deliveryErrorCode: null,
      actorUid: null, attemptedAt: now()};
    await intentRef.update({appLinkWhatsapp: skipped});
    if (reason === "unavailable") {
      deps.warn("Host app link not sent: no WhatsApp sender here.",
        {intentId});
    }
    return reason;
  };
  if (!/^[0-9]{1,32}$/u.test(config.wabaId) ||
      !/^[0-9]{1,32}$/u.test(config.phoneNumberId)) return skip("unavailable");
  let send: CatchTemplateSender | null;
  try {
    send = await deps.sender(config);
  } catch {
    send = null;
  }
  if (!send) return skip("unavailable");

  const text = template.text({});
  const messageId = hostAppLinkMessageId(config, intentId);
  const bodyHash = catchReplyHash(["template/v1", template.name, text]);
  let claimed: Awaited<ReturnType<typeof claimSupportWhatsappTemplate>>;
  try {
    claimed = await claimSupportWhatsappTemplate({firestore: () => db,
      now, findUidByPhone: deps.findUidByPhone}, {
      contactAddress: toE164,
      displayName: typeof intent?.fullName === "string" ?
        intent.fullName : null,
      messageId, bodyHash, text, subject: template.subject, authorUid: null,
    }, {
      stopRef: (address) => db.collection(CATCH_ENDPOINT_STOPS).doc(
        catchStopId(config, catchEndpointHash(address))),
      recentSinceMillis: deps.nowMillis(),
      check: ({stopped}) => {
        if (stopped) throw new SupportReplyRefused("stopped");
      },
      onClaim: (tx, {conversationId, now: at}) => tx.update(intentRef, {
        appLinkWhatsapp: {templateName: "host_app_link", state: "sending",
          skipReason: null, conversationId, messageId,
          providerMessageId: null, deliveryErrorCode: null, actorUid: null,
          attemptedAt: at} satisfies TemplateSendRecord,
      }),
    });
  } catch (error) {
    if (error instanceof SupportReplyRefused && error.reason === "stopped") {
      return skip("stopped");
    }
    if (error instanceof SupportReplyRefused) return "replayed";
    throw error;
  }
  if (claimed.kind === "replay") return "replayed";

  const outcome = await deliverClaimedTemplate(db, {
    scope: config, conversationId: claimed.conversationId, messageId,
    bodyHash, toE164, template: template.name, variables: {}, send,
    automatic: true, nowMillis: deps.nowMillis,
  });
  await intentRef.update(settledRecord(outcome))
    .catch(() => deps.warn("Host app link record not settled.", {intentId}));
  if (outcome.state !== "accepted") {
    deps.warn(outcome.state === "failed" ?
      "Host app link refused by WhatsApp." :
      "Host app link outcome unknown.", {intentId,
      deliveryErrorCode: outcome.deliveryErrorCode});
  }
  return outcome.state;
}


const appLinkEnabled = defineBoolean("CATCH_WHATSAPP_HOST_APP_LINK_ENABLED",
  {default: false});
const repliesEnabled = defineBoolean("CATCH_WHATSAPP_REPLIES_ENABLED",
  {default: false});
const wabaId = defineString("CATCH_WHATSAPP_WABA_ID", {default: ""});
const phoneNumberId = defineString("CATCH_WHATSAPP_PHONE_NUMBER_ID",
  {default: ""});
export const defaultHostAppLinkDeps: HostAppLinkDeps = {
  config: () => ({enabled: appLinkEnabled.value() && repliesEnabled.value(),
    wabaId: wabaId.value().trim(),
    phoneNumberId: phoneNumberId.value().trim()}),
  db: getFirestore,
  nowMillis: Date.now,
  sender: catchReplyTemplateSender,
  findUidByPhone: defaultSupportInboxDeps.findUidByPhone,
  warn: (message, fields) => logger.warn(message, fields),
};
