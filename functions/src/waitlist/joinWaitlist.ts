import {randomUUID} from "node:crypto";
import * as admin from "firebase-admin";
import type {Request, Response} from "express";
import * as logger from "firebase-functions/logger";
import {HttpsError, onRequest} from "firebase-functions/v2/https";
import {checkIpRateLimit} from "../shared/rateLimit";
import type {JoinWaitlistHTTPResponse} from
  "../shared/generated/joinWaitlistHttpResponse";
import {schemaErrorMessages} from "../shared/generated/schemaValidationRuntime";
import {
  validateJoinWaitlistHTTPRequest,
} from "../shared/generated/validators/joinWaitlistHttpRequest";
import {
  validateJoinWaitlistHTTPResponse,
} from "../shared/generated/validators/joinWaitlistHttpResponse";

import {hostSalesIntentReplay, prepareHostSalesIntent} from "./hostSalesIntent";
import {hostConsentKey} from "../acquisition/consentPolicy";
import {prepareHostAttribution} from "../acquisition/attribution";
import {HOST_CONSENT_COLLECTION} from "../acquisition/consentStore";
import {
  hostConsentAllowedOrigin, hostServerMeasurementEnabled,
} from "../acquisition/consentHttp";
import {
  HOST_DELIVERY_COLLECTION, prepareHostMetaDelivery,
} from "../acquisition/metaDelivery";

interface NormalizedMarketingAnalytics {
  consent: Record<string, unknown> | null;
  eventId: string | null;
  formVariant: string | null;
  pagePath: string | null;
  pageTitle: string | null;
  submittedAt: string | null;
}

const allowedRoles = new Set(["member", "runner", "host", "both"]);
const localOrigins = [
  "http://localhost:5000",
  "http://localhost:5175",
  "http://localhost:8123",
  "http://localhost:4187",
  "http://127.0.0.1:5000",
  "http://127.0.0.1:5175",
  "http://127.0.0.1:8123",
  "http://127.0.0.1:4187",
];

const attributionValueKeys = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "gbraid",
  "wbraid",
  "fbclid",
  "ttclid",
  "msclkid",
  "li_fat_id",
  "rdt_cid",
]);

/**
 * Returns the browser origins allowed to submit launch waitlist requests.
 * @param {string} projectId The active Google Cloud project id.
 * @return {Set<string>} Allowed origins for the project.
 */
export function waitlistAllowedOrigins(projectId: string): Set<string> {
  const firebaseHostingOrigins = [
    `https://${projectId}.web.app`,
    `https://${projectId}.firebaseapp.com`,
  ];

  if (projectId === "catch-dating-app-64e51") {
    return new Set([
      "https://catchdates.com",
      "https://www.catchdates.com",
      ...firebaseHostingOrigins,
      ...localOrigins,
    ]);
  }

  return new Set([
    ...firebaseHostingOrigins,
    ...localOrigins,
  ]);
}

/**
 * Resolves a request origin to a CORS response origin when allowed.
 * @param {string|undefined} origin The request Origin header.
 * @param {string} projectId The active Google Cloud project id.
 * @return {string|null} The allowed origin, or null.
 */
export function resolveWaitlistCorsOrigin(
  origin: string | undefined,
  projectId: string
): string | null {
  if (!origin) {
    return null;
  }

  return waitlistAllowedOrigins(projectId).has(origin) ? origin : null;
}

/**
 * Parses the incoming request body regardless of whether it arrives as JSON
 * text or an already-decoded object.
 * @param {unknown} rawBody The raw request body.
 * @return {JoinWaitlistBody} The parsed body.
 */
function parseBody(rawBody: unknown): Record<string, unknown> {
  if (typeof rawBody === "string" && rawBody.trim()) {
    try {
      const parsed: unknown = JSON.parse(rawBody);
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return isRecord(rawBody) ? rawBody : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sendWaitlistJson(
  response: {
    status: (status: number) => {
      json: (body: JoinWaitlistHTTPResponse) => unknown;
    };
  },
  status: number,
  body: JoinWaitlistHTTPResponse
): void {
  if (!validateJoinWaitlistHTTPResponse(body)) {
    throw new Error(
      "joinWaitlist produced an invalid response: " +
      schemaErrorMessages(validateJoinWaitlistHTTPResponse).join("; ")
    );
  }
  response.status(status).json(body);
}

/**
 * Trims and collapses repeated whitespace in a user-provided string.
 * @param {unknown} value The raw value.
 * @return {string} The normalized string value.
 */
function normalizeText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ");
}

/**
 * Normalizes an email address for deduplication.
 * @param {unknown} value The raw email value.
 * @return {string} A lower-cased email string.
 */
function normalizeEmail(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

/**
 * Validates a simple email shape for waitlist submissions.
 * @param {string} email The normalized email address.
 * @return {boolean} Whether the email looks valid.
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validates the submitted city value.
 * @param {string} city The submitted city.
 * @return {boolean} Whether the city is usable.
 */
function isValidCity(city: string): boolean {
  return city.length >= 2 && city.length <= 80;
}

/**
 * Normalizes an optional Instagram handle.
 * @param {unknown} value The raw handle value.
 * @return {string|null} The normalized handle, or null when absent.
 */
function normalizeInstagram(value: unknown): string | null {
  const handle = normalizeText(value).replace(/\s+/g, "");
  if (!handle) {
    return null;
  }

  return handle.startsWith("@") ? handle : `@${handle}`;
}

/**
 * Normalizes launch waitlist roles from current and legacy marketing forms.
 * @param {string} role The submitted role.
 * @return {string} Canonical role stored in Firestore.
 */
export function normalizeWaitlistRole(role: string): string {
  return role === "runner" ? "member" : role;
}

/**
 * Normalizes a bounded optional marketing text field.
 * @param {unknown} value The raw field value.
 * @param {number} maxLength Maximum accepted length.
 * @return {string|null} The normalized text, or null.
 */
function normalizeOptionalMarketingText(
  value: unknown,
  maxLength = 512
): string | null {
  const text = normalizeText(value);
  if (!text) {
    return null;
  }
  return text.slice(0, maxLength);
}

/**
 * Normalizes a bounded string array from a marketing form.
 * @param {unknown} value Raw array payload.
 * @param {number} maxItems Maximum accepted values.
 * @param {number} maxLength Maximum length per value.
 * @return {string[]} Sanitized string values.
 */
function normalizeMarketingStringArray(
  value: unknown,
  maxItems = 12,
  maxLength = 120
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = value
    .map((item) => normalizeOptionalMarketingText(item, maxLength))
    .filter((item): item is string => Boolean(item));
  return [...new Set(normalized)].slice(0, maxItems);
}

/**
 * Normalizes the richer host application packet from the marketing site.
 * @param {unknown} value Raw host application payload.
 * @return {Record<string, unknown>|null} Sanitized host application payload.
 */
export function normalizeHostApplication(
  value: unknown
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const application = {
    organizationName: normalizeOptionalMarketingText(
      raw.organizationName,
      140
    ),
    organizationType: normalizeOptionalMarketingText(
      raw.organizationType,
      80
    ),
    operatingCity: normalizeOptionalMarketingText(raw.operatingCity, 80),
    communityLink: normalizeOptionalMarketingText(raw.communityLink, 512),
    formats: normalizeMarketingStringArray(raw.formats, 10, 80),
    eventCadence: normalizeOptionalMarketingText(raw.eventCadence, 80),
    // Preserve old normalized packets (and their replay hashes) when the
    // optional new question was absent in an older client submission.
    ...(raw.eventPricing === undefined ? {} : {
      eventPricing: normalizeOptionalMarketingText(raw.eventPricing, 20),
    }),
    nextEventName: normalizeOptionalMarketingText(raw.nextEventName, 160),
    nextEventDate: normalizeOptionalMarketingText(raw.nextEventDate, 80),
    eventLocation: normalizeOptionalMarketingText(raw.eventLocation, 180),
    expectedCapacity: normalizeOptionalMarketingText(
      raw.expectedCapacity,
      40
    ),
    bookingPlatform: normalizeOptionalMarketingText(raw.bookingPlatform, 120),
    guestListFormat: normalizeOptionalMarketingText(raw.guestListFormat, 120),
    priceRange: normalizeOptionalMarketingText(raw.priceRange, 80),
    admissionModel: normalizeOptionalMarketingText(raw.admissionModel, 80),
    waitlistPlan: normalizeOptionalMarketingText(raw.waitlistPlan, 80),
    paymentReadiness: normalizeOptionalMarketingText(
      raw.paymentReadiness,
      120
    ),
    eventSuccessModules: normalizeMarketingStringArray(
      raw.eventSuccessModules,
      16,
      120
    ),
    hostGoals: normalizeOptionalMarketingText(raw.hostGoals, 1000),
    operatingNotes: normalizeOptionalMarketingText(raw.operatingNotes, 1000),
  };

  const hasValue = Object.values(application).some((item) =>
    Array.isArray(item) ? item.length > 0 : Boolean(item)
  );
  return hasValue ? application : null;
}

/**
 * Normalizes a bounded string map while allowing only known attribution keys.
 * @param {unknown} value Raw attribution values object.
 * @return {Record<string, string>} Sanitized attribution values.
 */
function normalizeAttributionValues(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const result: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!attributionValueKeys.has(key)) continue;
    const normalized = normalizeOptionalMarketingText(raw, 240);
    if (normalized) {
      result[key] = normalized;
    }
  }
  return result;
}

/**
 * Normalizes a first-touch or last-touch attribution block.
 * @param {unknown} value Raw touch payload.
 * @return {Record<string, unknown>|null} Sanitized touch payload.
 */
function normalizeAttributionTouch(
  value: unknown
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  return {
    capturedAt: normalizeOptionalMarketingText(raw.capturedAt, 80),
    landingPath: normalizeOptionalMarketingText(raw.landingPath, 512),
    landingUrl: normalizeOptionalMarketingText(raw.landingUrl, 1024),
    referrer: normalizeOptionalMarketingText(raw.referrer, 1024),
    values: normalizeAttributionValues(raw.values),
  };
}

/**
 * Normalizes attribution from the marketing website.
 * @param {unknown} value Raw attribution payload.
 * @return {Record<string, unknown>|null} Sanitized attribution payload.
 */
export function normalizeMarketingAttribution(
  value: unknown
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const firstTouch = normalizeAttributionTouch(raw.firstTouch);
  const lastTouch = normalizeAttributionTouch(raw.lastTouch);
  if (!firstTouch && !lastTouch) {
    return null;
  }

  return {
    firstTouch,
    lastTouch,
  };
}

/**
 * Normalizes consent details sent by the marketing website.
 * @param {unknown} value Raw consent payload.
 * @return {Record<string, unknown>|null} Sanitized consent payload.
 */
function normalizeMarketingConsent(
  value: unknown
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  return {
    analytics: raw.analytics === true,
    choice: normalizeOptionalMarketingText(raw.choice, 40),
    marketing: raw.marketing === true,
    updatedAt: normalizeOptionalMarketingText(raw.updatedAt, 80),
  };
}

/**
 * Normalizes analytics metadata from the marketing website.
 * @param {unknown} value Raw analytics payload.
 * @return {NormalizedMarketingAnalytics|null} Sanitized analytics payload.
 */
export function normalizeMarketingAnalytics(
  value: unknown
): NormalizedMarketingAnalytics | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  return {
    consent: normalizeMarketingConsent(raw.consent),
    eventId: normalizeOptionalMarketingText(raw.eventId, 160),
    formVariant: normalizeOptionalMarketingText(raw.formVariant, 40),
    pagePath: normalizeOptionalMarketingText(raw.pagePath, 512),
    pageTitle: normalizeOptionalMarketingText(raw.pageTitle, 240),
    submittedAt: normalizeOptionalMarketingText(raw.submittedAt, 80),
  };
}

/**
 * Sets CORS headers for the waitlist endpoint.
 * @param {Object} request The request-like object.
 * @param {Object} response The response-like object.
 * @return {boolean} Whether the request origin is allowed.
 */
function setCorsHeaders(request: {
  get: (header: string) => string | undefined;
}, response: {
  set: (header: string, value: string) => void;
}): boolean {
  const origin = request.get("origin");
  const projectId = process.env.GCLOUD_PROJECT ?? process.env.GCP_PROJECT ?? "";
  const allowedOrigin = resolveWaitlistCorsOrigin(origin, projectId);

  if (allowedOrigin) {
    response.set("Access-Control-Allow-Origin", allowedOrigin);
  }

  response.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.set("Access-Control-Allow-Headers", "Content-Type");
  response.set("Vary", "Origin");

  return !origin || allowedOrigin !== null;
}

/**
 * Stores a waitlist submission for catchdates.com launch access.
 */
/**
 * The WhatsApp launch-notice key: one request per number and city, so
 * asking again for the same city updates it and another city adds one.
 * @param {string} phone The E.164 number.
 * @param {string} city The city as submitted.
 * @return {string} The launchWaitlist document id.
 */
export function whatsappLaunchNoticeId(phone: string, city: string): string {
  return `whatsapp_${Buffer.from(`${phone}|${city.toLowerCase()}`)
    .toString("base64url")}`;
}

/**
 * A member asks for one WhatsApp message when Catch opens in their city
 * (CAT-260). The launch notice is the form's explicit purpose; marketing
 * permission is a separate choice, recorded as made and off unless chosen
 * (CAT-72). Each decision keeps the wording version and when it was made.
 * Nothing is sent here: the message on opening day is CAT-16's.
 * @param {Request} request The HTTP request.
 * @param {Response} response The HTTP response.
 * @param {Record<string, unknown>} body The parsed request body.
 * @param {object} context Fields the shared handler already normalized.
 */
async function joinByWhatsapp(
  request: Request,
  response: Response,
  body: Record<string, unknown>,
  context: {
    city: string;
    submittedRole: string;
    marketingAnalytics: ReturnType<typeof normalizeMarketingAnalytics>;
    marketingAttribution: ReturnType<typeof normalizeMarketingAttribution>;
  },
): Promise<void> {
  const {city, submittedRole, marketingAnalytics, marketingAttribution} =
    context;
  const whatsapp = isRecord(body.whatsapp) ? body.whatsapp : {};
  const phone = normalizeText(whatsapp.phone).replace(/[\s-]/g, "");
  if (!/^\+[1-9][0-9]{7,14}$/.test(phone)) {
    sendWaitlistJson(response, 400, {
      error: "Please enter a valid mobile number.",
    });
    return;
  }
  if (!isValidCity(city)) {
    sendWaitlistJson(response, 400, {
      error: "Please choose your city.",
    });
    return;
  }
  if (submittedRole !== "member" || whatsapp.launchNotice !== true ||
      !validateJoinWaitlistHTTPRequest({...body, whatsapp: {...whatsapp,
        phone}})) {
    logger.warn("WhatsApp launch notice failed schema validation", {
      errors: schemaErrorMessages(validateJoinWaitlistHTTPRequest),
    });
    sendWaitlistJson(response, 400, {
      error: "Please check your submission and try again.",
    });
    return;
  }

  const firestore = admin.firestore();
  const noticeRef = firestore.collection("launchWaitlist")
    .doc(whatsappLaunchNoticeId(phone, city));
  const decidedAt = admin.firestore.Timestamp.now();
  const decision = (purpose: string, granted: boolean) => ({
    purpose, channel: "whatsapp", granted,
    consentVersion: String(whatsapp.consentVersion),
    source: "website_launching_soon", decidedAt,
  });
  const consents = {
    launchNotice: decision("cityLaunchNotice", true),
    marketing: decision("marketing", whatsapp.marketing === true),
  };
  let alreadyJoined = false;
  await firestore.runTransaction(async (transaction) => {
    const existing = await transaction.get(noticeRef);
    const data = {
      channel: "whatsapp",
      phone,
      city,
      role: "member",
      fullName: null,
      email: null,
      consents,
      source: "catchdates.com",
      referrer: normalizeText(request.get("referer")) || null,
      userAgent: normalizeText(request.get("user-agent")) || null,
      marketingAnalytics,
      marketingAttribution,
    };
    if (existing.exists) {
      alreadyJoined = true;
      // The person's newest choice replaces the older one.
      transaction.update(noticeRef, {
        ...data,
        lastSubmittedAt: admin.firestore.FieldValue.serverTimestamp(),
        submissionCount: admin.firestore.FieldValue.increment(1),
      });
      return;
    }
    transaction.create(noticeRef, {
      ...data,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSubmittedAt: admin.firestore.FieldValue.serverTimestamp(),
      submissionCount: 1,
    });
    transaction.set(firestore.collection("marketingConversionEvents")
      .doc(noticeRef.id), {
      analytics: marketingAnalytics,
      attribution: marketingAttribution,
      city,
      consent: marketingAnalytics?.consent ?? null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      eventId: marketingAnalytics?.eventId ??
        `waitlist_${Date.now()}_${noticeRef.id}`,
      eventName: "waitlist_submitted",
      leadId: noticeRef.id,
      leadPath: noticeRef.path,
      hostApplication: null,
      role: "member",
      source: "catchdates.com",
      status: "readyForReview",
      standardEvent: "Lead",
    });
  });
  // The number stays out of logs.
  logger.info("WhatsApp launch notice stored", {city, alreadyJoined});
  sendWaitlistJson(response, 200, {ok: true, alreadyJoined});
}

export function createJoinWaitlistHandler(options: {
  measurementEnabled: boolean;
}) {
  return async (request: Request, response: Response): Promise<void> => {
    if (!setCorsHeaders(request, response)) {
      sendWaitlistJson(response, 403, {error: "Origin not allowed."});
      return;
    }

    if (request.method === "OPTIONS") {
      response.status(204).send("");
      return;
    }

    if (request.method !== "POST") {
      sendWaitlistJson(response, 405, {error: "Method not allowed."});
      return;
    }

    const body = parseBody(request.body);
    const fullName = normalizeText(body.fullName);
    const email = normalizeEmail(body.email);
    const city = normalizeText(body.city);
    const submittedRole = normalizeText(body.role).toLowerCase();
    const role = normalizeWaitlistRole(submittedRole);
    const instagram = normalizeInstagram(body.instagram);
    const honeypot = normalizeText(body.website);
    const hostApplication = normalizeHostApplication(body.hostApplication);
    // Host acquisition uses only the consent-bound immutable receipt below.
    // The legacy mutable field remains available for consumer submissions.
    const marketingAttribution = role === "host" || role === "both" ? null :
      normalizeMarketingAttribution(body.attribution);
    const marketingAnalytics = normalizeMarketingAnalytics(body.analytics);

    const clientIp = request.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.ip ??
      "unknown";

    if (!checkIpRateLimit(clientIp)) {
      sendWaitlistJson(response, 429, {
        error: "Too many requests. Please try again later.",
      });
      return;
    }

    if (honeypot) {
      logger.info("Waitlist honeypot tripped", {email});
      sendWaitlistJson(response, 200, {ok: true, alreadyJoined: false});
      return;
    }

    if (body.whatsapp !== undefined) {
      await joinByWhatsapp(request, response, body, {
        city, submittedRole, marketingAnalytics, marketingAttribution,
      });
      return;
    }

    if (fullName.length < 2 || fullName.length > 100) {
      sendWaitlistJson(response, 400, {
        error: "Please enter your full name.",
      });
      return;
    }

    if (!isValidEmail(email)) {
      sendWaitlistJson(response, 400, {
        error: "Please enter a valid email.",
      });
      return;
    }

    if (!isValidCity(city)) {
      sendWaitlistJson(response, 400, {
        error: "Please tell us which city you event in.",
      });
      return;
    }

    if (!allowedRoles.has(submittedRole)) {
      sendWaitlistJson(response, 400, {
        error: "Please choose how you're joining.",
      });
      return;
    }

    if (!validateJoinWaitlistHTTPRequest(body)) {
      logger.warn("Waitlist request failed schema validation", {
        errors: schemaErrorMessages(validateJoinWaitlistHTTPRequest),
      });
      sendWaitlistJson(response, 400, {
        error: "Please check your submission and try again.",
      });
      return;
    }

    const waitlistRef = admin
      .firestore()
      .collection("launchWaitlist")
      .doc(Buffer.from(email).toString("base64url"));

    const referrer = normalizeText(request.get("referer"));
    const userAgent = normalizeText(request.get("user-agent"));
    const conversionEventId = marketingAnalytics?.eventId ??
      `waitlist_${Date.now()}_${waitlistRef.id}`;
    const conversionName =
      marketingAnalytics?.formVariant === "host" || role === "host" ?
        "host_lead_submitted" :
        "waitlist_submitted";
    // Key the conversion doc by the lead (email-derived waitlist id), not the
    // client-supplied analytics eventId, so two leads sharing a client eventId
    // can't clobber each other. The client eventId stays in the eventId field.
    const conversionRef = admin
      .firestore()
      .collection("marketingConversionEvents")
      .doc(waitlistRef.id);
    const intent = prepareHostSalesIntent({
      waitlistId: waitlistRef.id,
      requestId: marketingAnalytics?.eventId ?? null,
      fullName, email, city, role, hostApplication,
      entryRoute: marketingAnalytics?.pagePath?.split(/[?#]/)[0] ?? null,
    });
    const intentRef = intent ? admin.firestore()
      .collection("salesInboundIntents").doc(intent.intentId) : null;
    let alreadyJoined = false;
    let hostLead: {eventId: string; isNew: boolean} | undefined;
    // Generate outside the transaction so Firestore retries keep one identity.
    const proposedHostEventId = `host_lead_${Date.now()}_${randomUUID()}`;
    // Old analytics metadata never grants server advertising permission.
    // Do not retain the raw capability in intake, Sales or diagnostics.
    const measurement = options.measurementEnabled && intent &&
      hostConsentAllowedOrigin(request.get("origin"),
        process.env.GCLOUD_PROJECT ?? process.env.GCP_PROJECT ?? "") ?
      body.hostMeasurement : undefined;
    const consentId = measurement ?
      hostConsentKey(measurement.capability) : null;

    try {
      await admin.firestore().runTransaction(async (transaction) => {
        const existing = await transaction.get(waitlistRef);
        const priorIntent = intentRef ? await transaction.get(intentRef) : null;
        const priorLead = existing.data()?.hostLead as
          {eventId: string; isNew: boolean} | undefined;
        // Legacy Host enquiries predate receipts. Do not turn them into new
        // acquisitions, even if a later member submission changed their role.
        const legacyHost = intent && existing.exists && !priorLead ?
          await transaction.get(admin.firestore()
            .collection("salesInboundIntents")
            .where("waitlistId", "==", waitlistRef.id).limit(1)) : null;
        const permission = consentId ? await transaction.get(admin.firestore()
          .collection(HOST_CONSENT_COLLECTION).doc(consentId)) : null;
        if (intent && intentRef) {
          const replay = hostSalesIntentReplay(priorIntent?.data(), intent);
          if (replay !== null) {
            alreadyJoined = replay;
            hostLead = priorIntent?.data()?.hostLead;
            return;
          }
          hostLead = {
            eventId: priorLead?.eventId ?? proposedHostEventId,
            isNew: !priorLead && !legacyHost?.size &&
              !["host", "both"].includes(existing.data()?.role),
          };
          const delivery = measurement && consentId ?
            prepareHostMetaDelivery({
              enabled: options.measurementEnabled,
              ...hostLead, intentId: intent.intentId, consentId,
              consentDocument: permission?.data(),
              context: {clientId: measurement.clientId, userAgent,
                ...(measurement.fbclid ? {fbclid: measurement.fbclid} : {}),
                ...(measurement.clickCapturedAt ?
                  {clickCapturedAt: measurement.clickCapturedAt} : {})},
              now: Date.now(),
            }) : null;
          if (delivery) {
            transaction.create(admin.firestore()
              .collection(HOST_DELIVERY_COLLECTION).doc(delivery.eventId),
            delivery);
          }
          const acquisitionAttribution = measurement && consentId ?
            prepareHostAttribution({enabled: options.measurementEnabled,
              ...hostLead, consentId, consentDocument: permission?.data(),
              attribution: body.attribution, now: Date.now()}) : null;
          transaction.create(intentRef, {
            ...intent,
            hostLead,
            ...(acquisitionAttribution ? {acquisitionAttribution} : {}),
            alreadyJoined: existing.exists,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
        const baseData = {
          fullName,
          email,
          city,
          role,
          instagram,
          source: "catchdates.com",
          referrer: referrer || null,
          userAgent: userAgent || null,
          hostApplication,
          marketingAnalytics,
          marketingAttribution,
          ...(hostLead ? {hostLead} : {}),
        };

        if (existing.exists) {
          alreadyJoined = true;
          transaction.update(waitlistRef, {
            ...baseData,
            lastSubmittedAt: admin.firestore.FieldValue.serverTimestamp(),
            submissionCount: admin.firestore.FieldValue.increment(1),
          });
          return;
        }

        transaction.create(waitlistRef, {
          ...baseData,
          status: "pending",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          lastSubmittedAt: admin.firestore.FieldValue.serverTimestamp(),
          submissionCount: 1,
        });

        transaction.set(conversionRef, {
          analytics: marketingAnalytics,
          attribution: marketingAttribution,
          city,
          consent: marketingAnalytics?.consent ?? null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          eventId: conversionEventId,
          eventName: conversionName,
          leadId: waitlistRef.id,
          leadPath: waitlistRef.path,
          hostApplication,
          role,
          source: "catchdates.com",
          status: "readyForReview",
          standardEvent: "Lead",
        });
      });
    } catch (error) {
      if (error instanceof HttpsError && error.code === "already-exists") {
        sendWaitlistJson(response, 409, {
          error: "This submission changed. Please review it and submit again.",
        });
        return;
      }
      throw error;
    }

    logger.info("Waitlist submission stored", {
      email,
      city,
      role,
      alreadyJoined,
    });

    sendWaitlistJson(response, 200, {
      ok: true,
      alreadyJoined,
      ...(hostLead ? {hostLead} : {}),
    });
  };
}

export const joinWaitlist = onRequest({region: "asia-south1"},
  createJoinWaitlistHandler({
    measurementEnabled: hostServerMeasurementEnabled,
  }));
