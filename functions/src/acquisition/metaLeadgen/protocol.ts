import {createHash} from "node:crypto";
import {normalizeRosterPhone} from "../../events/eventAttendees";
import {hashedEmail, hashedPhone} from "../adConversions/hostConversions";

/**
 * Meta host lead forms (docs/ads_conversion_spec.md): a Facebook or
 * Instagram lead form sends a `leadgen` webhook; Catch fetches the lead and
 * files it in the sales inbox as a `meta_lead_ad` intent.
 */

export interface LeadgenChange {
  leadgenId: string;
  pageId: string;
  formId: string;
  adId: string | null;
}

const metaId = (value: unknown, min = 5): string | null => {
  const text = typeof value === "number" ? String(value) : value;
  return typeof text === "string" &&
    new RegExp(`^[0-9]{${min},20}$`).test(text) ? text : null;
};

/**
 * The leadgen changes in a verified webhook body. Anything else (other
 * fields, other objects, malformed IDs) is skipped, never thrown.
 * @param {unknown} body Parsed webhook JSON.
 * @return {LeadgenChange[]} Leads to fetch.
 */
export function leadgenChanges(body: unknown): LeadgenChange[] {
  const root = body as {object?: unknown; entry?: unknown} | null;
  if (root?.object !== "page" || !Array.isArray(root.entry)) return [];
  const found: LeadgenChange[] = [];
  for (const entry of root.entry.slice(0, 100)) {
    const changes = (entry as {changes?: unknown})?.changes;
    if (!Array.isArray(changes)) continue;
    for (const change of changes.slice(0, 100)) {
      const row = change as {field?: unknown; value?: Record<string, unknown>};
      if (row?.field !== "leadgen" || !row.value) continue;
      const leadgenId = metaId(row.value.leadgen_id, 10);
      const pageId = metaId(row.value.page_id);
      const formId = metaId(row.value.form_id);
      if (!leadgenId || !pageId || !formId) continue;
      found.push({leadgenId, pageId, formId, adId: metaId(row.value.ad_id)});
    }
  }
  return found;
}

/** The pages whose leads Catch takes, from a comma-separated setting. */
export function allowedPages(value: string): Set<string> {
  return new Set(value.split(",").map((part) => part.trim())
    .filter((part) => /^[0-9]{5,20}$/.test(part)));
}

export interface MetaLead {
  createdTime: string;
  formId: string;
  adId: string | null;
  campaignId: string | null;
  answers: Map<string, string>;
}

/**
 * Reads the Graph API lead object. Field names are normalised to lowercase
 * snake case so a renamed custom question still maps.
 * @param {unknown} body Graph response.
 * @return {MetaLead|null} The lead, or null when unusable.
 */
export function parseMetaLead(body: unknown): MetaLead | null {
  const lead = body as Record<string, unknown> | null;
  if (!lead || typeof lead.created_time !== "string" ||
      !Array.isArray(lead.field_data)) return null;
  const formId = metaId(lead.form_id);
  if (!formId) return null;
  const answers = new Map<string, string>();
  for (const field of lead.field_data.slice(0, 50)) {
    const row = field as {name?: unknown; values?: unknown};
    if (typeof row?.name !== "string" || !Array.isArray(row.values)) continue;
    const value = row.values.find((item) => typeof item === "string");
    if (typeof value !== "string" || !value.trim()) continue;
    answers.set(row.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_"),
      value.trim().slice(0, 512));
  }
  return {createdTime: lead.created_time, formId,
    adId: metaId(lead.ad_id), campaignId: metaId(lead.campaign_id), answers};
}

const first = (answers: Map<string, string>, keys: string[]) => {
  for (const key of keys) {
    const value = answers.get(key);
    if (value) return value;
  }
  return null;
};

/** The lead's contact details, normalised; raw values stay server-side. */
export function leadContact(lead: MetaLead) {
  const phone = normalizeRosterPhone(first(lead.answers,
    ["phone_number", "phone", "mobile_number", "whatsapp_number"])).value;
  const emailRaw = first(lead.answers, ["email", "email_address"]);
  const email = emailRaw && hashedEmail(emailRaw) ?
    emailRaw.trim().toLowerCase() : null;
  return {phone, email,
    phoneSha256: hashedPhone(phone), emailSha256: hashedEmail(email)};
}

export const metaLeadIntentId = (leadgenId: string) =>
  createHash("sha256").update(JSON.stringify(["meta_lead", leadgenId]))
    .digest("hex");

const httpsLink = (value: string | null) => {
  if (!value) return null;
  const withScheme = /^https?:\/\//i.test(value) ? value :
    /^@?[A-Za-z0-9._]{1,30}$/.test(value) ?
      `https://instagram.com/${value.replace(/^@/, "")}` : `https://${value}`;
  try {
    const url = new URL(withScheme);
    return url.protocol === "https:" || url.protocol === "http:" ?
      `https://${url.host}${url.pathname}`.slice(0, 512) : null;
  } catch {
    return null;
  }
};

/**
 * The sales intent for one lead, or null when it has no usable contact.
 * The shape follows sales_inbound_intents.schema.json's meta_lead_ad branch.
 * @param {object} input Change, lead and time.
 * @return {object|null} Intent document fields.
 */
export function metaLeadIntent(input: {
  change: LeadgenChange; lead: MetaLead; nowMillis: number;
  timestamp: (millis: number) => unknown;
}) {
  const {change, lead} = input;
  const contact = leadContact(lead);
  if (!contact.email && !contact.phone) return null;
  const answers = lead.answers;
  const fullName = first(answers, ["full_name", "name"])?.slice(0, 100) ?? null;
  const city = first(answers, ["city", "operating_city"])?.slice(0, 80) ?? null;
  const organizationName = first(answers, ["organisation_name",
    "organization_name", "club_name", "community_name", "company_name"])
    ?.slice(0, 140) ?? null;
  const communityLink = httpsLink(first(answers, ["instagram_handle",
    "instagram", "community_link", "website"]));
  const eventCadence = first(answers, ["event_cadence"])?.slice(0, 80) ?? null;
  const created = Date.parse(lead.createdTime);
  const intentId = metaLeadIntentId(change.leadgenId);
  const fields = {fullName, email: contact.email, phone: contact.phone, city,
    organizationName, communityLink, eventCadence};
  const now = input.timestamp(input.nowMillis);
  return {
    schemaVersion: 1,
    revision: 1,
    classification: "sales_private",
    intentId,
    source: "meta_lead_ad",
    submissionId: `meta_lead_${change.leadgenId}`,
    requestHash: createHash("sha256")
      .update(JSON.stringify([change.leadgenId, fields])).digest("hex"),
    waitlistId: `meta_lead_${change.leadgenId}`,
    status: "needs_identity_review",
    organizerId: null,
    evidenceStatus: "self_reported",
    fullName,
    // The schema allows a phone-only intent only with a null email.
    email: contact.email,
    ...(contact.phone ? {phone: contact.phone} : {}),
    city,
    entryRoute: null,
    alreadyJoined: false,
    hostApplication: {
      ...(organizationName ? {organizationName} : {}),
      ...(city ? {operatingCity: city} : {}),
      ...(communityLink ? {communityLink} : {}),
      ...(eventCadence ? {eventCadence} : {}),
    },
    metaLead: {
      leadgenId: change.leadgenId,
      pageId: change.pageId,
      formId: lead.formId,
      adId: lead.adId ?? change.adId,
      campaignId: lead.campaignId,
      leadCreatedAt: input.timestamp(Number.isFinite(created) ?
        created : input.nowMillis),
    },
    createdAt: now,
    updatedAt: now,
  };
}
