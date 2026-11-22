import {createHash} from "node:crypto";
import * as admin from "firebase-admin";
import type {Request} from "express";
import * as logger from "firebase-functions/logger";
import {HttpsError} from "firebase-functions/v2/https";
import type {JoinWaitlistHTTPRequest} from
  "../shared/generated/joinWaitlistHttpRequest";
import type {JoinWaitlistHTTPResponse} from
  "../shared/generated/joinWaitlistHttpResponse";
import {schemaErrorMessages} from "../shared/generated/schemaValidationRuntime";
import {
  validateJoinWaitlistHTTPRequest,
} from "../shared/generated/validators/joinWaitlistHttpRequest";
import {enforceAppCheckForRuntime} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {canonicalMarkets} from "../locations/marketConfig";
import {hasCurrentPartnerMembership} from "../partners/service";
import {readCityAttribution} from "./cityAttribution";
import {validMobileNumber} from "../shared/mobileNumber";

/**
 * Website leads: the short forms on the redesigned pages (send me the guide,
 * book a walkthrough, list your space, refer a host, text me the app link
 * and so on). Each one is
 * a typed salesInboundIntents row, so it reaches the Admin inbox the way a
 * Host application does. Nothing here sends a message: staff reply first,
 * except that an app_link lead gets the approved Host app link template from
 * the row's create trigger (hostAppLink.ts). The city
 * new-plans consent is recorded only.
 */

export const LEAD_KINDS = ["guide", "walkthrough", "demo", "venue", "story",
  "referral", "org_contact", "city_alerts", "app_link"] as const;
export type LeadKind = typeof LEAD_KINDS[number];

type LeadRequest = NonNullable<JoinWaitlistHTTPRequest["lead"]>;
type LeadPayloadKey = Exclude<keyof LeadRequest,
  "requestId" | "phone" | "consent" | "sourcePage" | "entry">;

/** The lead property that carries each kind's answers. */
export const LEAD_PAYLOAD_KEYS: Record<LeadKind, LeadPayloadKey> = {
  guide: "guide",
  walkthrough: "walkthrough",
  demo: "demo",
  venue: "venue",
  story: "story",
  referral: "referral",
  org_contact: "orgContact",
  city_alerts: "cityAlerts",
  app_link: "appLink",
};

/** One hour per number and per network, generous enough for a few forms. */
export const LEAD_NETWORK_LIMIT = {maxRequests: 30, windowMs: 60 * 60 * 1000};
export const LEAD_NUMBER_LIMIT = {maxRequests: 6, windowMs: 60 * 60 * 1000};

export interface ReferrerIdentity {
  uid: string;
  anonymous: boolean;
}

export interface WebsiteLeadDeps {
  db: () => FirebaseFirestore.Firestore;
  now: () => Date;
  enforceAppCheck: boolean;
  /** Resolves when the App Check token is valid; throws otherwise. */
  verifyAppCheck: (token: string) => Promise<void>;
  /** The signed-in website account behind a Bearer ID token. */
  verifyIdToken: (token: string) => Promise<ReferrerIdentity>;
  checkRateLimit: typeof checkRateLimit;
  isCurrentPartner: (db: FirebaseFirestore.Firestore,
    tx: FirebaseFirestore.Transaction, uid: string, now: Date) =>
    Promise<boolean>;
}

export const defaultWebsiteLeadDeps: WebsiteLeadDeps = {
  db: () => admin.firestore(),
  now: () => new Date(),
  enforceAppCheck: enforceAppCheckForRuntime(process.env),
  verifyAppCheck: async (token) => {
    await admin.appCheck().verifyToken(token);
  },
  verifyIdToken: async (token) => {
    const decoded = await admin.auth().verifyIdToken(token, true);
    return {uid: decoded.uid,
      anonymous: decoded.firebase?.sign_in_provider === "anonymous"};
  },
  checkRateLimit,
  isCurrentPartner: hasCurrentPartnerMembership,
};

export interface LeadResult {
  status: number;
  body: JoinWaitlistHTTPResponse;
}

const refused = (status: number, error: string): LeadResult =>
  ({status, body: {error}});

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function compactText(value: unknown): unknown {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") :
    value;
}

/**
 * Trims every answer, drops ones left empty and compacts the number, so a
 * blank optional field never fails the contract and the replay hash only
 * covers what was said.
 * @param {Record<string, unknown>} body The parsed request body.
 * @return {Record<string, unknown>} The body to validate and store.
 */
export function normalizeLeadBody(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {...body};
  for (const key of ["fullName", "city", "cityOther"]) {
    if (key in normalized) {
      normalized[key] = compactText(normalized[key]);
      if (normalized[key] === "") delete normalized[key];
    }
  }
  if (!isRecord(body.lead)) return normalized;
  const lead: Record<string, unknown> = {...body.lead};
  if (typeof lead.phone === "string") {
    lead.phone = lead.phone.trim().replace(/[\s()-]/g, "");
  }
  for (const key of ["sourcePage", "entry", "requestId"]) {
    if (typeof lead[key] === "string") lead[key] = String(lead[key]).trim();
  }
  for (const key of Object.values(LEAD_PAYLOAD_KEYS)) {
    if (!isRecord(lead[key])) continue;
    const payload: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(lead[key] as object)) {
      const answer = Array.isArray(value) ? value.map(compactText) :
        compactText(value);
      if (answer !== "") payload[field] = answer;
    }
    lead[key] = payload;
  }
  normalized.lead = lead;
  return normalized;
}

/**
 * The referred host's link as an https URL when it reads as one: a URL, a
 * domain, or an Instagram handle (with or without @).
 * @param {string} value The link as typed.
 * @return {string|null} An https or http URL, or null.
 */
export function normalizeReferralLink(value: string): string | null {
  const typed = value.trim();
  const handle = /^@?([A-Za-z0-9._]{1,30})$/u.exec(typed);
  if (handle && (typed.startsWith("@") || !typed.includes("."))) {
    return `https://www.instagram.com/${handle[1]}/`;
  }
  const candidate = /^https?:\/\//iu.test(typed) ? typed : `https://${typed}`;
  try {
    const url = new URL(candidate);
    if (!["https:", "http:"].includes(url.protocol) || url.username ||
        url.password || !/\.[a-z]{2,}$/iu.test(url.hostname)) return null;
    return url.href.length <= 512 ? url.href : null;
  } catch {
    return null;
  }
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/** The launchWaitlist-style id a phone-only applicant has. */
export function leadWaitlistId(phone: string): string {
  return `phone_${Buffer.from(phone).toString("base64url")}`;
}

/**
 * One lead per client request id and number: the same pair is the same row.
 * @param {string} phone The E.164 number.
 * @param {string} requestId The client request id.
 * @return {string} The salesInboundIntents document id.
 */
export function leadIntentId(phone: string, requestId: string): string {
  return digest(JSON.stringify([leadWaitlistId(phone), `lead_${requestId}`]));
}

/** Hashed identities, so rate-limit rows never hold an address or number. */
export function leadNetworkKey(address: string): string {
  return `lead_ip_${digest(address).slice(0, 40)}`;
}

export function leadNumberKey(phone: string): string {
  return `lead_phone_${digest(phone).slice(0, 40)}`;
}

function clientAddress(request: Request): string {
  return request.ip ?? request.socket?.remoteAddress ?? "unknown";
}

function bearerToken(request: Request): string | null {
  const header = request.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/iu.exec(header.trim());
  return match ? match[1] : null;
}

function rateLimited(error: unknown): boolean {
  return error instanceof HttpsError && error.code === "resource-exhausted";
}

/**
 * Accepts one website lead. Order matters: App Check and the network limit
 * run before anything is parsed, a retry of a stored lead returns its
 * receipt without spending the number's quota, and the write is one
 * transaction keyed by the client request id.
 * @param {Request} request The HTTP request.
 * @param {Record<string, unknown>} body The parsed request body.
 * @param {WebsiteLeadDeps} deps Injectable services.
 * @return {Promise<LeadResult>} The status and response body.
 */
export async function handleWebsiteLead(
  request: Request,
  body: Record<string, unknown>,
  deps: WebsiteLeadDeps = defaultWebsiteLeadDeps,
): Promise<LeadResult> {
  if (deps.enforceAppCheck) {
    const token = request.get("x-firebase-appcheck");
    if (!token) return refused(401, "Please refresh the page and try again.");
    try {
      await deps.verifyAppCheck(token);
    } catch {
      return refused(401, "Please refresh the page and try again.");
    }
  }
  const db = deps.db();
  try {
    await deps.checkRateLimit(db, leadNetworkKey(clientAddress(request)),
      "joinWaitlistLeadNetwork", LEAD_NETWORK_LIMIT);
  } catch (error) {
    if (rateLimited(error)) {
      return refused(429, "Too many requests. Please try again later.");
    }
    throw error;
  }
  if (typeof body.website === "string" && body.website.trim()) {
    logger.info("Website lead honeypot tripped");
    return {status: 200, body: {ok: true, alreadyJoined: false}};
  }

  const normalized = normalizeLeadBody(body);
  const rawLead = isRecord(normalized.lead) ? normalized.lead : {};
  const validPhone = validMobileNumber(rawLead.phone);
  if (!validPhone) {
    return refused(400, "Please enter a valid WhatsApp number.");
  }
  rawLead.phone = validPhone;
  if (!validateJoinWaitlistHTTPRequest(normalized)) {
    logger.warn("Website lead failed schema validation", {
      errors: schemaErrorMessages(validateJoinWaitlistHTTPRequest),
    });
    return refused(400, "Please check your submission and try again.");
  }
  const attribution = readCityAttribution(normalized);
  if (attribution.kind === "invalid") return refused(400, attribution.error);
  const cityAttribution = attribution.kind === "attributed" ?
    attribution.value : null;

  const kind = normalized.requestKind as LeadKind;
  const lead = normalized.lead as LeadRequest;
  // A ticked "also send me new plans" box is a second consent, for the
  // lead's city; city alerts already ask for exactly that.
  if (lead.newPlansConsent && kind === "city_alerts") {
    return refused(400, "Please check your submission and try again.");
  }
  const payloadKey = LEAD_PAYLOAD_KEYS[kind];
  const payload = lead[payloadKey] as Record<string, unknown>;
  const phone = lead.phone;
  const market = cityAttribution?.cityId ? canonicalMarkets.find((entry) =>
    entry.marketId === cityAttribution.cityId) : undefined;
  // The city is inferred from the catalog when only its id was sent.
  const city = typeof normalized.city === "string" ? normalized.city :
    market?.cityLabel ?? cityAttribution?.cityOther ?? null;
  const fullName = typeof normalized.fullName === "string" ?
    normalized.fullName : null;
  const intentId = leadIntentId(phone, lead.requestId);
  const intentRef = db.collection("salesInboundIntents").doc(intentId);
  const projection = {
    leadKind: kind,
    fullName,
    city,
    phone,
    lead: {
      consent: {purpose: lead.consent.purpose, version: lead.consent.version},
      ...(lead.newPlansConsent ? {newPlansConsent: {
        purpose: lead.newPlansConsent.purpose,
        version: lead.newPlansConsent.version,
      }} : {}),
      sourcePage: lead.sourcePage,
      entry: lead.entry,
      ...(market ? {cityId: market.marketId,
        countryIsoCode: market.countryIsoCode} : {}),
      [payloadKey]: payload,
    },
  };
  const requestHash = digest(canonical(projection));
  const receipt = (isNew: boolean): LeadResult => ({status: 200, body: {
    ok: true, alreadyJoined: !isNew,
    lead: {leadId: intentId, requestKind: kind, isNew},
  }});
  const conflict = refused(409,
    "This submission changed. Please review it and submit again.");

  // A retry of a stored lead is answered before the number's quota is spent.
  const prior = await intentRef.get();
  if (prior.exists) {
    return prior.data()?.requestHash === requestHash ? receipt(false) :
      conflict;
  }
  try {
    await deps.checkRateLimit(db, leadNumberKey(phone),
      "joinWaitlistLeadNumber", LEAD_NUMBER_LIMIT);
  } catch (error) {
    if (rateLimited(error)) {
      return refused(429, "Too many requests. Please try again later.");
    }
    throw error;
  }

  // A referral credits its referrer only through a signed-in account; the
  // form alone gives a typed name and an unverified number.
  let referrer: ReferrerIdentity | null = null;
  const token = kind === "referral" ? bearerToken(request) : null;
  if (token) {
    try {
      referrer = await deps.verifyIdToken(token);
    } catch {
      return refused(401, "Please sign in again, then send the referral.");
    }
  }
  const referral = kind === "referral" ?
    payload as {hostName: string; hostLink: string; relationship: string} :
    null;

  const now = deps.now();
  const stamp = admin.firestore.Timestamp.fromDate(now);
  let isNew = false;
  let outcome = "stored" as "stored" | "replayed" | "conflict";
  await db.runTransaction(async (tx) => {
    const existing = await tx.get(intentRef);
    if (existing.exists) {
      outcome = existing.data()?.requestHash === requestHash ? "replayed" :
        "conflict";
      return;
    }
    let referralCredit: Record<string, unknown> | null = null;
    if (referral) {
      const account = referrer && !referrer.anonymous ? referrer : null;
      const deleted = account ? (await tx.get(db.collection("deletedUsers")
        .doc(account.uid))).exists : true;
      referralCredit = account && !deleted ? {
        status: "referrer_account",
        referrerUid: account.uid,
        referrerRole: await deps.isCurrentPartner(db, tx, account.uid, now) ?
          "partner" : "guest",
      } : {status: "missing_referrer_account", referrerUid: null,
        referrerRole: null};
    }
    tx.create(intentRef, {
      intentId,
      schemaVersion: 1,
      revision: 1,
      classification: "sales_private",
      source: "website",
      submissionId: lead.requestId,
      requestHash,
      waitlistId: leadWaitlistId(phone),
      status: "needs_identity_review",
      organizerId: null,
      evidenceStatus: "self_reported",
      fullName,
      email: null,
      phone,
      city,
      entryRoute: lead.sourcePage,
      alreadyJoined: false,
      // A referral names a host; partner nominations use the same fields, so
      // it becomes an intake request whose listing names the referrer.
      hostApplication: referral ? {
        organizationName: referral.hostName,
        communityLink: normalizeReferralLink(referral.hostLink),
        operatingCity: city,
        operatingNotes: referral.relationship,
      } : null,
      leadKind: kind,
      lead: {
        ...projection.lead,
        consent: {...projection.lead.consent, decidedAt: stamp},
        ...(projection.lead.newPlansConsent ? {newPlansConsent: {
          ...projection.lead.newPlansConsent, decidedAt: stamp}} : {}),
        ...(referralCredit ? {referralCredit} : {}),
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    isNew = true;
  });
  if (outcome === "conflict") return conflict;
  // The number, name and answers stay out of logs.
  logger.info("Website lead stored", {requestKind: kind,
    sourcePage: lead.sourcePage, entry: lead.entry,
    cityId: market?.marketId ?? null, isNew});
  return receipt(isNew);
}
