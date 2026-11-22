import {createHash} from "node:crypto";
import {assertTransactionalEmail, type TransactionalEmail} from
  "../email/emailProvider";
import {BRAND} from "../shared/generated/brand";
import type {HostOperatorAlertDocument} from
  "../shared/generated/firestoreAdminTypes";

/**
 * What staff are told, and when. Pure: routing, wording and the email; the
 * Firestore side lives in delivery.ts. An alert names the sender and gives a
 * short preview, but never a phone number or email address in the subject,
 * and the stored receipt keeps ids and links only.
 */
export type OperatorAlertKind = HostOperatorAlertDocument["kind"];

export interface OperatorAlert {
  alertId: string;
  kind: OperatorAlertKind;
  sourcePath: string;
  adminPath: string;
  occurredAtMillis: number;
  /** "WhatsApp message", "Meta lead", "Website lead": what it is. */
  headline: string;
  /** Why now: new conversation, quiet for four hours, the lead's type. */
  detail: string;
  /** A person's or business's name; never contact details. */
  sender: string;
  /** Where it came in: WhatsApp, Instagram, Email, Meta lead form, Website. */
  channel: string;
  /** At most 140 characters. */
  preview: string;
}

/** A support message is a "return" after this long with no inbound one. */
export const SUPPORT_QUIET_MILLIS = 4 * 60 * 60 * 1000;
/** Trigger retries older than this are dropped: the news is stale. */
export const MAX_ALERT_AGE_MILLIS = 6 * 60 * 60 * 1000;
export const PREVIEW_LIMIT = 140;

type Data = Record<string, unknown>;

function record(value: unknown): Data | null {
  return value && typeof value === "object" && !Array.isArray(value) ?
    value as Data : null;
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const flat = value.replace(/\s+/gu, " ").trim();
  return flat ? flat : null;
}

function millis(value: unknown): number | null {
  const toMillis = record(value)?.toMillis;
  if (typeof toMillis !== "function") return null;
  const result = (toMillis as () => unknown).call(value);
  return typeof result === "number" && Number.isSafeInteger(result) &&
    result > 0 ? result : null;
}

/**
 * Cuts text to a limit on a character boundary, with an ellipsis.
 * @param {string} value Text.
 * @param {number} limit Maximum length.
 * @return {string} Text no longer than the limit.
 */
export function clip(value: string, limit: number): string {
  const chars = [...value.replace(/\s+/gu, " ").trim()];
  return chars.length <= limit ? chars.join("") :
    `${chars.slice(0, limit - 1).join("").trimEnd()}…`;
}

/**
 * Replaces anything shaped like an email address or phone number.
 * @param {string} value Text.
 * @return {string} Text without contact details.
 */
export function withoutContactDetails(value: string): string {
  return value
    .replace(/[^\s<>@]+@[^\s<>@]+/gu, "[email]")
    .replace(/\+?\d[\d\s().-]{5,}\d/gu, "[number]");
}

/**
 * The UTC clock hour an alert counts against: yyyyMMddHH.
 * @param {number} atMillis Time.
 * @return {string} Window id.
 */
export function alertWindowId(atMillis: number): string {
  return new Date(atMillis).toISOString().slice(0, 13).replace(/[-T]/gu, "");
}

/**
 * Whether a source event is recent enough to alert about.
 * @param {number} occurredAtMillis When it happened.
 * @param {number} nowMillis Now.
 * @return {boolean} True when fresh.
 */
export function isFresh(occurredAtMillis: number, nowMillis: number):
  boolean {
  return occurredAtMillis <= nowMillis + 60_000 &&
    nowMillis - occurredAtMillis < MAX_ALERT_AGE_MILLIS;
}

const channelLabels: Record<string, string> = {
  whatsapp: "WhatsApp", instagram: "Instagram", email: "Email",
};

/**
 * Which support alert, if any, a new message needs. Only messages the person
 * sent count: staff notes, replies and emails staff logged by hand (which
 * carry their author) do not. "new" when the message opened the
 * conversation; "existing" needs the four-hour quiet check.
 * @param {unknown} conversation The conversation document.
 * @param {unknown} message The new message document.
 * @return {"new"|"existing"|null} The case.
 */
export function classifySupportMessage(conversation: unknown,
  message: unknown): "new" | "existing" | null {
  const thread = record(conversation);
  const row = record(message);
  if (!thread || !row || row.direction !== "inbound" ||
      row.authorUid !== null || !channelLabels[String(thread.channel)]) {
    return null;
  }
  const at = millis(row.at);
  const created = millis(thread.createdAt);
  if (at === null || created === null) return null;
  return created === at ? "new" : "existing";
}

/**
 * The alert for a support message classify chose.
 * @param {object} input Ids, documents and the case.
 * @return {OperatorAlert|null} The alert.
 */
export function supportAlert(input: {
  conversationId: string; messageId: string; conversation: unknown;
  message: unknown; kind: "new" | "existing";
}): OperatorAlert | null {
  const thread = record(input.conversation);
  const row = record(input.message);
  const at = millis(row?.at);
  const channel = channelLabels[String(thread?.channel)];
  const body = text(row?.text);
  if (!thread || !row || at === null || !channel || !body ||
      !/^(whatsapp|instagram|email)-[a-f0-9]{64}$/u
        .test(input.conversationId) ||
      !/^[A-Za-z0-9_-]{8,160}$/u.test(input.messageId)) return null;
  const sourcePath = `supportConversations/${input.conversationId}/` +
    `messages/${input.messageId}`;
  const audience = thread.audience;
  return {
    alertId: `support_${createHash("sha256").update(sourcePath)
      .digest("hex")}`,
    kind: input.kind === "new" ? "supportConversation" : "supportReturn",
    sourcePath,
    adminPath: `/support/${input.conversationId}`,
    occurredAtMillis: at,
    headline: `${channel} message`,
    detail: input.kind === "new" ? "New conversation" :
      "First message from them in over 4 hours",
    sender: text(thread.displayName) ??
      (audience === "organizer" ? "A Catch host (no name on file)" :
        audience === "guest" ? "A Catch member (no name on file)" :
          "New contact (no name on file)"),
    channel,
    preview: clip(body, PREVIEW_LIMIT),
  };
}

const leadKindLabels: Record<string, string> = {
  guide: "Setup guide request", walkthrough: "Walkthrough request",
  demo: "Demo request", venue: "Space to list", story: "Story nomination",
  referral: "Host referral", org_contact: "College, team or brand",
  app_link: "App link request",
};

const leadPayloadKeys: Record<string, string> = {
  org_contact: "orgContact",
  app_link: "appLink",
};

const leadDetailFields: Record<string, string[]> = {
  guide: ["format"],
  walkthrough: ["preferredTime", "organisation", "whatYouRun"],
  demo: ["whatYouHost", "currentQuestions"],
  venue: ["area", "capacity", "nights"],
  story: ["communityName", "cadence"],
  referral: ["hostName", "relationship"],
  org_contact: ["orgType", "orgName", "message"],
};

/** Which app's link a "Text me the link" request asked for. */
const appLinkApps: Record<string, string> = {host: "Host app"};

function joined(...values: unknown[]): string | null {
  const parts = values.flatMap((value) => Array.isArray(value) ?
    [value.map(text).filter(Boolean).join(", ")] : [text(value)])
    .filter((part): part is string => Boolean(part));
  return parts.length ? parts.join(" · ") : null;
}

/** Reserved test domains and the explicit internal QA markers. */
function isInternalTest(intent: Data): boolean {
  return /^internal_qa_/iu.test(String(intent.submissionId)) ||
    /^\[QA\]/iu.test(String(intent.fullName ?? "").trim()) ||
    /@(?:[^@]*\.)?(?:example\.(?:com|net|org|test)|invalid|test)$/iu
      .test(String(intent.email ?? ""));
}

/**
 * The alert for a new salesInboundIntents row, or null when it needs none:
 * partner nominations (a signed-in partner already told staff), city alert
 * sign-ups (nothing to answer), rows not awaiting review, and internal QA.
 * @param {string} intentId Document id.
 * @param {unknown} value The intent.
 * @return {OperatorAlert|null} The alert.
 */
export function salesLeadAlert(intentId: string, value: unknown):
  OperatorAlert | null {
  const intent = record(value);
  const at = millis(intent?.createdAt);
  if (!intent || at === null || !/^[a-f0-9]{64}$/u.test(intentId) ||
      intent.status !== "needs_identity_review" ||
      isInternalTest(intent)) return null;
  const application = record(intent.hostApplication) ?? {};
  const programme = record(intent.programmeApplication) ?? {};
  const lead = record(intent.lead) ?? {};
  const leadKind = typeof intent.leadKind === "string" ?
    intent.leadKind : null;
  const payload = leadKind ?
    record(lead[leadPayloadKeys[leadKind] ?? leadKind]) ?? {} : {};
  let kind: OperatorAlertKind;
  let headline: string;
  let detail: string;
  let channel: string;
  let preview: string | null;
  if (intent.source === "meta_lead_ad") {
    kind = "metaLead";
    headline = "Meta lead";
    detail = "Facebook or Instagram lead form";
    channel = "Meta lead form";
    preview = joined(application.formats, application.operatingCity ??
      intent.city, application.eventCadence, application.expectedCapacity);
  } else if (intent.source === "website" && leadKind) {
    if (!leadKindLabels[leadKind]) return null;
    kind = "websiteLead";
    headline = "Website lead";
    detail = leadKindLabels[leadKind];
    channel = "Website";
    // An app link request has nothing to read but the app and the page.
    preview = leadKind === "app_link" ?
      joined(appLinkApps[String(payload.app)] ?? payload.app, lead.sourcePage) :
      joined(...(leadDetailFields[leadKind] ?? [])
        .map((field) => payload[field]), intent.city);
  } else if (intent.source === "website") {
    const weddings = intent.programme === "weddings";
    kind = "websiteHostApplication";
    headline = "Website lead";
    detail = weddings ? "Weddings pilot application" : "Host application";
    channel = "Website";
    preview = weddings ?
      joined(programme.programmeKind, programme.weddingDate, intent.city) :
      joined(application.formats, application.operatingCity ?? intent.city,
        application.eventCadence, application.expectedCapacity);
  } else {
    return null;
  }
  const person = text(intent.fullName);
  const business = text(application.organizationName) ??
    text(programme.planningCompany) ?? text(payload.spaceName) ??
    text(payload.orgName) ?? text(payload.communityName);
  return {
    alertId: `lead_${intentId}`,
    kind,
    sourcePath: `salesInboundIntents/${intentId}`,
    adminPath: `/inbox/enquiry-${intentId}`,
    occurredAtMillis: at,
    headline,
    detail,
    sender: person && business ? `${person}, ${business}` :
      person ?? business ?? "No name given",
    channel,
    preview: clip(preview ?? "No details given", PREVIEW_LIMIT),
  };
}

const kindLabels: Record<OperatorAlertKind, string> = {
  supportConversation: "new support conversations",
  supportReturn: "support messages after a quiet spell",
  metaLead: "Meta leads",
  websiteHostApplication: "website host applications",
  websiteLead: "website leads",
};

/**
 * A time staff read in India.
 * @param {number} atMillis Time.
 * @return {string} "21 Nov 2026, 14:05 IST".
 */
export function istTime(atMillis: number): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata", day: "numeric", month: "short",
    year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(atMillis));
  const part = (type: string) =>
    parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("day")} ${part("month")} ${part("year")}, ` +
    `${part("hour")}:${part("minute")} IST`;
}

function idempotencyKey(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/gu, "-").slice(0, 160);
}

/**
 * The alert email. The subject carries what it is and who, with anything
 * shaped like contact details removed.
 * @param {OperatorAlert} alert Alert.
 * @param {object} route Sender, recipients and the send deadline.
 * @return {TransactionalEmail} Email.
 */
export function operatorAlertEmail(alert: OperatorAlert, route: {
  from: string; to: readonly string[]; nowMillis: number;
}): TransactionalEmail {
  const subject = clip(withoutContactDetails(
    `${alert.headline}: ${alert.sender}`), 150);
  const message: TransactionalEmail = {
    from: route.from,
    to: route.to,
    subject,
    text: [
      `${alert.headline} (${alert.detail})`,
      "",
      `From: ${alert.sender}`,
      `Channel: ${alert.channel}`,
      `Time: ${istTime(alert.occurredAtMillis)}`,
      `Preview: ${alert.preview}`,
      "",
      `Open in ${BRAND.adminName}: ${BRAND.web.adminOrigin}${alert.adminPath}`,
      "",
      "You get this because you are on the operator alert list " +
        "(billingNoticeSettings/platform, operatorAlerts).",
    ].join("\n"),
    idempotencyKey: idempotencyKey(`operator-alert-${alert.alertId}`),
    deadlineMillis: route.nowMillis + 30_000,
  };
  assertTransactionalEmail(message);
  return message;
}

export interface HeldAlert {
  kind: OperatorAlertKind;
  adminPath: string;
  occurredAtMillis: number;
}

/**
 * One email for the alerts held back after a clock hour hit its cap. It
 * lists links and kinds only, no names or message text.
 * @param {object} input The window, its held alerts and the route.
 * @return {TransactionalEmail} Email.
 */
export function overflowSummaryEmail(input: {
  windowId: string; overflowCount: number; held: readonly HeldAlert[];
  from: string; to: readonly string[]; nowMillis: number;
}): TransactionalEmail {
  const start = Date.UTC(Number(input.windowId.slice(0, 4)),
    Number(input.windowId.slice(4, 6)) - 1, Number(input.windowId.slice(6, 8)),
    Number(input.windowId.slice(8, 10)));
  const counts = new Map<OperatorAlertKind, number>();
  for (const alert of input.held) {
    counts.set(alert.kind, (counts.get(alert.kind) ?? 0) + 1);
  }
  const unlisted = Math.max(0, input.overflowCount - input.held.length);
  const lines = [
    `${input.overflowCount} more alerts arrived after the hourly limit ` +
      `between ${istTime(start)} and ${istTime(start + 3_600_000)}, so ` +
      "they were not emailed one by one.",
    "",
    ...[...counts].map(([kind, count]) => `${count} ${kindLabels[kind]}`),
    "",
    ...input.held.map((alert) => `${istTime(alert.occurredAtMillis)}: ` +
      `${BRAND.web.adminOrigin}${alert.adminPath}`),
    ...(unlisted ? [`and ${unlisted} more`] : []),
    "",
    `Support inbox: ${BRAND.web.adminOrigin}/support`,
    `Leads inbox: ${BRAND.web.adminOrigin}/inbox`,
  ];
  const message: TransactionalEmail = {
    from: input.from,
    to: input.to,
    subject: `${input.overflowCount} more ${BRAND.name} alerts in one hour`,
    text: lines.join("\n"),
    idempotencyKey: idempotencyKey(`operator-alert-summary-${input.windowId}`),
    deadlineMillis: input.nowMillis + 30_000,
  };
  assertTransactionalEmail(message);
  return message;
}
