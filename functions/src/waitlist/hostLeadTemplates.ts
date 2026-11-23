import {getFirestore, Timestamp, type Firestore} from
  "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import {defineBoolean, defineString} from "firebase-functions/params";
import {isInternalTestLead} from "./internalTestLead";
import {
  defaultSupportInboxDeps,
  type SupportInboxDeps,
} from "../supportInbox/conversations";
import type {SalesInboundIntentsDocument} from
  "../shared/generated/firestoreAdminTypes";
import {
  catchReplyTemplateSender,
  type CatchTemplateSender,
} from "../catchMessaging/catchSender";
import {leadFirstName} from "../catchMessaging/catchTemplates";
import {
  sendAutomaticTemplate,
  type AutomaticTemplateScope,
  type TemplateDeliveryOutcome,
} from "../catchMessaging/templateDelivery";
import {catchReplyHash} from "../catchMessaging/whatsappReply";

type TemplateSendRecord = NonNullable<
  SalesInboundIntentsDocument["appLinkWhatsapp"]>;

// The automatic WhatsApp templates Catch's number sends a new lead, from the
// lead's create trigger beside the operator alert:
//
// - host_app_link ("Text me the link"): a website app_link lead for the
//   Catch Host app, with consent app-link-whatsapp-v1. Recorded as
//   appLinkWhatsapp. Switch: CATCH_WHATSAPP_HOST_APP_LINK_ENABLED.
// - host_lead_welcome: the first message to a host lead who asked to be
//   contacted on WhatsApp. Website guide, demo and venue leads whose form
//   said "We reply on WhatsApp" (consent playbook-lead-whatsapp-v2) get it;
//   Meta lead-form leads get it only while
//   CATCH_WHATSAPP_HOST_LEAD_WELCOME_META_ENABLED is also on, because that
//   form mentions WhatsApp only on its thank-you screen, after the person
//   has sent it. Recorded as welcomeWhatsapp. Switch:
//   CATCH_WHATSAPP_HOST_LEAD_WELCOME_ENABLED.
//
// A lead gets at most one of each, and never throws, so it never causes a
// retry. Its one attempt is claimed before WhatsApp is called (the Support
// message's id is the lead's, and the lead records the attempt), so a
// redelivered event never sends twice; a failed or unconfirmed send is logged
// and left for staff, never retried. Nothing is sent after STOP, to internal
// test leads, for a lead older than six hours, or while the switch (or
// CATCH_WHATSAPP_REPLIES_ENABLED) is off. A number that had a welcome in the
// last seven days is not welcomed again.

export const HOST_APP_LINK_CONSENT_VERSION = "app-link-whatsapp-v1";
/**
 * Website lead consents whose wording covers a WhatsApp message: the
 * playbook lead form's "We reply on WhatsApp." A new wording gets a new
 * version and is added here only once it still says so.
 */
export const HOST_LEAD_WELCOME_CONSENT_VERSIONS: ReadonlySet<string> =
  new Set(["playbook-lead-whatsapp-v2"]);
/**
 * Website host enquiries that get the welcome. Not app_link (it gets the app
 * link), walkthrough (a request for a time, which staff answer), referral or
 * city_alerts (not the person's own host enquiry), and story or org_contact
 * (no form sends them, so no wording to check).
 */
export const HOST_LEAD_WELCOME_KINDS: ReadonlySet<string> =
  new Set(["guide", "demo", "venue"]);
/** A trigger delivered later than this is stale: no message. */
export const HOST_LEAD_TEMPLATE_MAX_AGE_MILLIS = 6 * 60 * 60 * 1000;
/** One welcome per WhatsApp number in this long. */
export const HOST_LEAD_WELCOME_GAP_MILLIS = 7 * 24 * 60 * 60 * 1000;

export interface HostLeadTemplateConfig {
  /** CATCH_WHATSAPP_HOST_APP_LINK_ENABLED and _REPLIES_ENABLED, both on. */
  appLinkEnabled: boolean;
  /** CATCH_WHATSAPP_HOST_LEAD_WELCOME_ENABLED and _REPLIES_ENABLED. */
  welcomeEnabled: boolean;
  /** CATCH_WHATSAPP_HOST_LEAD_WELCOME_META_ENABLED, with the welcome. */
  welcomeMetaLeads: boolean;
  wabaId: string;
  phoneNumberId: string;
}

export interface HostLeadTemplateDeps {
  config: () => HostLeadTemplateConfig;
  db: () => Firestore;
  nowMillis: () => number;
  /** Null when this environment has no sender credential. */
  sender: (scope: AutomaticTemplateScope) =>
    Promise<CatchTemplateSender | null>;
  findUidByPhone: SupportInboxDeps["findUidByPhone"];
  warn: (message: string, fields: Record<string, unknown>) => void;
}

export type HostLeadTemplateOutcome = "disabled" | "notApplicable" |
  "stale" | "replayed" | "stopped" | "unavailable" | "recentlySent" |
  "accepted" | "failed" | "unknown";

type Data = Record<string, unknown>;
type LeadTemplateField = "appLinkWhatsapp" | "welcomeWhatsapp";

interface LeadTemplateSpec {
  /** For logs. */
  label: string;
  field: LeadTemplateField;
  template: TemplateSendRecord["templateName"];
  prefix: string;
  enabled: (config: HostLeadTemplateConfig) => boolean;
  recipient: (intent: unknown, config: HostLeadTemplateConfig) =>
    string | null;
  variables: (intent: Data) => Record<string, string>;
  /** Welcome only: no second welcome to a number within the gap. */
  gapMillis: number | null;
}

class RecentlySent extends Error {}

function record(value: unknown): Data | null {
  return value && typeof value === "object" && !Array.isArray(value) ?
    value as Data : null;
}

const E164 = /^\+[1-9][0-9]{6,14}$/u;

function phoneOf(intent: Data): string | null {
  return typeof intent.phone === "string" && E164.test(intent.phone) ?
    intent.phone : null;
}

function leadMessageId(prefix: string, template: string,
  scope: {wabaId: string; phoneNumberId: string}, intentId: string): string {
  return prefix + catchReplyHash([scope.wabaId, scope.phoneNumberId,
    template, intentId]);
}

/**
 * The Support message id of a lead's one app link send.
 * @param {object} scope Catch's WhatsApp account and number.
 * @param {string} intentId The lead.
 * @return {string} Message id.
 */
export function hostAppLinkMessageId(
  scope: {wabaId: string; phoneNumberId: string}, intentId: string): string {
  return leadMessageId("cwapplink_", "host_app_link", scope, intentId);
}

/**
 * The Support message id of a lead's one welcome.
 * @param {object} scope Catch's WhatsApp account and number.
 * @param {string} intentId The lead.
 * @return {string} Message id.
 */
export function hostLeadWelcomeMessageId(
  scope: {wabaId: string; phoneNumberId: string}, intentId: string): string {
  return leadMessageId("cwwelcome_", "host_lead_welcome", scope, intentId);
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
  return phoneOf(intent);
}

/**
 * Whether a new salesInboundIntents row is a host lead to welcome: a website
 * guide, demo or venue lead given under a consent whose wording covers a
 * WhatsApp reply, or (when metaLeads) a Meta lead-form lead; still awaiting
 * review, not an internal test, and with a number.
 * @param {unknown} value The intent.
 * @param {boolean} metaLeads Whether Meta lead-form leads are welcomed.
 * @return {string|null} The E.164 number to send to, or null.
 */
export function hostLeadWelcomeRecipient(value: unknown, metaLeads: boolean):
  string | null {
  const intent = record(value);
  if (!intent || intent.status !== "needs_identity_review" ||
      isInternalTestLead(intent)) return null;
  if (intent.source === "meta_lead_ad") {
    return metaLeads && record(intent.metaLead) ? phoneOf(intent) : null;
  }
  const consent = record(record(intent.lead)?.consent);
  if (intent.source !== "website" ||
      !HOST_LEAD_WELCOME_KINDS.has(String(intent.leadKind)) ||
      consent?.purpose !== "leadFollowUp" ||
      !HOST_LEAD_WELCOME_CONSENT_VERSIONS.has(String(consent?.version))) {
    return null;
  }
  return phoneOf(intent);
}

const APP_LINK: LeadTemplateSpec = {
  label: "Host app link",
  field: "appLinkWhatsapp",
  template: "host_app_link",
  prefix: "cwapplink_",
  enabled: (config) => config.appLinkEnabled,
  recipient: (intent) => hostAppLinkRecipient(intent),
  variables: () => ({}),
  gapMillis: null,
};

const WELCOME: LeadTemplateSpec = {
  label: "Host lead welcome",
  field: "welcomeWhatsapp",
  template: "host_lead_welcome",
  prefix: "cwwelcome_",
  enabled: (config) => config.welcomeEnabled,
  recipient: (intent, config) =>
    hostLeadWelcomeRecipient(intent, config.welcomeMetaLeads),
  variables: (intent) => ({first_name: leadFirstName(intent.fullName)}),
  gapMillis: HOST_LEAD_WELCOME_GAP_MILLIS,
};

/**
 * When the lead was made: the row's creation, or for a Meta lead the
 * earlier of that and when the person sent Meta's form, so a late import is
 * stale too.
 * @param {Data} intent The intent.
 * @return {number|null} Epoch millis, or null when unreadable.
 */
function createdMillis(intent: Data): number | null {
  const times = [intent.createdAt, record(intent.metaLead)?.leadCreatedAt]
    .flatMap((value) => value instanceof Timestamp ? [value.toMillis()] : []);
  return intent.createdAt instanceof Timestamp ? Math.min(...times) : null;
}

/**
 * The fields that settle the lead's record of its send, as dotted updates.
 * @param {LeadTemplateField} field The record.
 * @param {TemplateDeliveryOutcome} outcome What happened.
 * @return {object} Update fields.
 */
function settledRecord(field: LeadTemplateField,
  outcome: TemplateDeliveryOutcome): Record<string, unknown> {
  return {
    [`${field}.state`]: outcome.state,
    [`${field}.providerMessageId`]: outcome.providerMessageId,
    [`${field}.deliveryErrorCode`]: outcome.deliveryErrorCode,
  };
}

/**
 * Sends the Host app link for one new lead, at most once. Never throws.
 * @param {HostLeadTemplateDeps} deps Dependencies.
 * @param {string} intentId The new salesInboundIntents document id.
 * @return {Promise<HostLeadTemplateOutcome>} What happened.
 */
export function sendHostAppLinkForLead(deps: HostLeadTemplateDeps,
  intentId: string): Promise<HostLeadTemplateOutcome> {
  return sendLeadTemplate(deps, intentId, APP_LINK);
}

/**
 * Sends the host lead welcome for one new lead, at most once. Never throws.
 * @param {HostLeadTemplateDeps} deps Dependencies.
 * @param {string} intentId The new salesInboundIntents document id.
 * @return {Promise<HostLeadTemplateOutcome>} What happened.
 */
export function sendHostLeadWelcomeForLead(deps: HostLeadTemplateDeps,
  intentId: string): Promise<HostLeadTemplateOutcome> {
  return sendLeadTemplate(deps, intentId, WELCOME);
}

async function sendLeadTemplate(deps: HostLeadTemplateDeps, intentId: string,
  spec: LeadTemplateSpec): Promise<HostLeadTemplateOutcome> {
  try {
    return await sendOnce(deps, intentId, spec);
  } catch (error) {
    deps.warn(`${spec.label} not sent: unexpected error.`, {intentId,
      error: error instanceof Error ? error.name : "unknown"});
    return "unknown";
  }
}

async function sendOnce(deps: HostLeadTemplateDeps, intentId: string,
  spec: LeadTemplateSpec): Promise<HostLeadTemplateOutcome> {
  const config = {...deps.config()};
  if (!spec.enabled(config) || !/^[a-f0-9]{64}$/u.test(intentId)) {
    return "disabled";
  }
  const db = deps.db();
  const intentRef = db.collection("salesInboundIntents").doc(intentId);
  const intent = (await intentRef.get()).data();
  const toE164 = spec.recipient(intent, config);
  if (!intent || !toE164) return "notApplicable";
  if (record(intent[spec.field])) return "replayed";
  const created = createdMillis(intent);
  if (created === null ||
      deps.nowMillis() - created > HOST_LEAD_TEMPLATE_MAX_AGE_MILLIS) {
    return "stale";
  }
  const now = () => Timestamp.fromMillis(deps.nowMillis());
  const skip = async (reason: "stopped" | "unavailable" | "recentlySent") => {
    const skipped: TemplateSendRecord = {templateName: spec.template,
      state: "skipped", skipReason: reason, conversationId: null,
      messageId: null, providerMessageId: null, deliveryErrorCode: null,
      actorUid: null, attemptedAt: now()};
    await intentRef.update({[spec.field]: skipped});
    if (reason === "unavailable") {
      deps.warn(`${spec.label} not sent: no WhatsApp sender here.`,
        {intentId});
    }
    return reason;
  };

  const scope = {enabled: true, wabaId: config.wabaId,
    phoneNumberId: config.phoneNumberId};
  const messageId = leadMessageId(spec.prefix, spec.template, scope,
    intentId);
  const gap = spec.gapMillis;
  let result: Awaited<ReturnType<typeof sendAutomaticTemplate>>;
  try {
    result = await sendAutomaticTemplate({
      db, scope, nowMillis: deps.nowMillis, sender: deps.sender,
      findUidByPhone: deps.findUidByPhone, toE164,
      displayName: typeof intent.fullName === "string" ?
        intent.fullName : null,
      template: spec.template, variables: spec.variables(intent), messageId,
      recentSinceMillis: deps.nowMillis() - (gap ?? 0),
      check: gap === null ? undefined : ({recent}) => {
        if (recent.some((message) => message.messageId.startsWith(
          spec.prefix) && message.deliveryState !== "failed")) {
          throw new RecentlySent();
        }
      },
      onClaim: (tx, {conversationId, now: at}) => tx.update(intentRef, {
        [spec.field]: {templateName: spec.template, state: "sending",
          skipReason: null, conversationId, messageId,
          providerMessageId: null, deliveryErrorCode: null, actorUid: null,
          attemptedAt: at} satisfies TemplateSendRecord,
      }),
    });
  } catch (error) {
    if (error instanceof RecentlySent) return skip("recentlySent");
    throw error;
  }
  if (result.kind === "unavailable" || result.kind === "stopped") {
    return skip(result.kind);
  }
  if (result.kind === "replayed") return "replayed";
  const {outcome} = result;
  await intentRef.update(settledRecord(spec.field, outcome))
    .catch(() => deps.warn(`${spec.label} record not settled.`, {intentId}));
  if (outcome.state !== "accepted") {
    deps.warn(outcome.state === "failed" ?
      `${spec.label} refused by WhatsApp.` :
      `${spec.label} outcome unknown.`, {intentId,
      deliveryErrorCode: outcome.deliveryErrorCode});
  }
  return outcome.state;
}


const appLinkEnabled = defineBoolean("CATCH_WHATSAPP_HOST_APP_LINK_ENABLED",
  {default: false});
const welcomeEnabled = defineBoolean(
  "CATCH_WHATSAPP_HOST_LEAD_WELCOME_ENABLED", {default: false});
const welcomeMetaEnabled = defineBoolean(
  "CATCH_WHATSAPP_HOST_LEAD_WELCOME_META_ENABLED", {default: false});
const repliesEnabled = defineBoolean("CATCH_WHATSAPP_REPLIES_ENABLED",
  {default: false});
const wabaId = defineString("CATCH_WHATSAPP_WABA_ID", {default: ""});
const phoneNumberId = defineString("CATCH_WHATSAPP_PHONE_NUMBER_ID",
  {default: ""});
export const defaultHostLeadTemplateDeps: HostLeadTemplateDeps = {
  config: () => {
    const replies = repliesEnabled.value();
    const welcome = welcomeEnabled.value() && replies;
    return {appLinkEnabled: appLinkEnabled.value() && replies,
      welcomeEnabled: welcome,
      welcomeMetaLeads: welcome && welcomeMetaEnabled.value(),
      wabaId: wabaId.value().trim(),
      phoneNumberId: phoneNumberId.value().trim()};
  },
  db: getFirestore,
  nowMillis: Date.now,
  sender: catchReplyTemplateSender,
  findUidByPhone: defaultSupportInboxDeps.findUidByPhone,
  warn: (message, fields) => logger.warn(message, fields),
};
