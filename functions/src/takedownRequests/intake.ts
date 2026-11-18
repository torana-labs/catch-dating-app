import * as admin from "firebase-admin";
import type {Request, Response} from "express";
import * as logger from "firebase-functions/logger";
import {HttpsError, onRequest} from "firebase-functions/v2/https";
import type {ListingRequestHTTPRequest} from
  "../shared/generated/listingRequestHTTPRequest";
import type {ListingRequestHTTPResponse} from
  "../shared/generated/listingRequestHTTPResponse";
import {schemaErrorMessages} from "../shared/generated/schemaValidationRuntime";
import {
  validateListingRequestHTTPRequest,
} from "../shared/generated/validators/listingRequestHTTPRequest";
import {
  validateListingRequestHTTPResponse,
} from "../shared/generated/validators/listingRequestHTTPResponse";
import {BRAND} from "../shared/generated/brand";
import {enforceAppCheckForRuntime} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {resolveWaitlistCorsOrigin} from "../waitlist/joinWaitlist";
import {
  TAKEDOWN_REQUESTS_COLLECTION, type TypeRuleProblem, deadlinesFor,
  normalizeRequestBody, requestEmailKey, requestHash, requestNetworkKey,
  storedTarget, takedownReference, takedownRequestId, typeRuleProblem,
} from "./model";

/**
 * The public intake for /listings/request/. It follows the website lead
 * intake (functions/src/waitlist/websiteLead.ts): App Check and a hashed
 * network limit before anything is parsed, a honeypot, a contract check,
 * a retry of a stored request answered with its receipt before the email's
 * limit is spent, and one transaction keyed by the requester's email and
 * the client request id. It writes takedownRequests only: never a Sales
 * record, and nothing is sent. Staff acknowledge within 24 hours from the
 * Admin Inbox.
 */

/** A few requests an hour per network and per email address. */
export const REQUEST_NETWORK_LIMIT =
  {maxRequests: 10, windowMs: 60 * 60 * 1000};
export const REQUEST_EMAIL_LIMIT = {maxRequests: 5, windowMs: 60 * 60 * 1000};

export interface ListingRequestDeps {
  db: () => FirebaseFirestore.Firestore;
  now: () => Date;
  enforceAppCheck: boolean;
  /** Resolves when the App Check token is valid; throws otherwise. */
  verifyAppCheck: (token: string) => Promise<void>;
  checkRateLimit: typeof checkRateLimit;
  /** Catch's website origin; target URLs must be on it. */
  origin: string;
}

export const defaultListingRequestDeps: ListingRequestDeps = {
  db: () => admin.firestore(),
  now: () => new Date(),
  enforceAppCheck: enforceAppCheckForRuntime(process.env),
  verifyAppCheck: async (token) => {
    await admin.appCheck().verifyToken(token);
  },
  checkRateLimit,
  origin: BRAND.web.origin,
};

export interface ListingRequestResult {
  status: number;
  body: ListingRequestHTTPResponse;
}

const refused = (status: number, error: string): ListingRequestResult =>
  ({status, body: {error}});

/** The words for each rule a schema cannot check. */
export const typeRuleMessages: Record<TypeRuleProblem, string> = {
  role: "Choose who you are for this kind of request.",
  handle: "Add the official Instagram handle we should send the code to.",
  domain: "Add the official website domain.",
  domainEmail: "Use an email address at the official domain, " +
    "or choose another way to prove it.",
  trademarkRegistered: "Add the registration number, class and country.",
  trademarkUnregistered: "Add the year of first use and a link that shows it.",
  goodFaith: "Confirm the good-faith declaration.",
  notLicensed: "Confirm that the use is not licensed.",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function clientAddress(request: Request): string {
  return request.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.ip ?? request.socket?.remoteAddress ?? "unknown";
}

function rateLimited(error: unknown): boolean {
  return error instanceof HttpsError && error.code === "resource-exhausted";
}

function iso(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

/**
 * Accepts one listing request.
 * @param {Request} request The HTTP request.
 * @param {Record<string, unknown>} body The parsed request body.
 * @param {ListingRequestDeps} deps Injectable services.
 * @return {Promise<ListingRequestResult>} The status and response body.
 */
export async function handleListingRequest(
  request: Request,
  body: Record<string, unknown>,
  deps: ListingRequestDeps = defaultListingRequestDeps,
): Promise<ListingRequestResult> {
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
    await deps.checkRateLimit(db, requestNetworkKey(clientAddress(request)),
      "listingRequestNetwork", REQUEST_NETWORK_LIMIT);
  } catch (error) {
    if (rateLimited(error)) {
      return refused(429, "Too many requests. Please try again later.");
    }
    throw error;
  }
  if (typeof body.website === "string" && body.website.trim()) {
    logger.info("Listing request honeypot tripped");
    return refused(400, "Please check your request and try again.");
  }

  const normalized = normalizeRequestBody(body);
  delete normalized.website;
  if (!validateListingRequestHTTPRequest(normalized)) {
    logger.warn("Listing request failed schema validation", {
      errors: schemaErrorMessages(validateListingRequestHTTPRequest),
    });
    return refused(400, "Please check your request and try again.");
  }
  const submission = normalized as ListingRequestHTTPRequest;
  const problem = typeRuleProblem(submission);
  if (problem) return refused(400, typeRuleMessages[problem]);
  const target = storedTarget(submission.target, deps.origin);
  if (!target) {
    return refused(400, "Link to the page on our website you mean.");
  }

  const email = submission.requester.email;
  const requestId = takedownRequestId(email, submission.clientRequestId);
  const reference = takedownReference(requestId);
  const projection = {
    requestType: submission.requestType,
    target,
    requester: submission.requester,
    verification: submission.verification,
    declarations: submission.declarations,
    context: submission.context ?? null,
    consent: submission.consent,
    sourcePage: submission.sourcePage,
  };
  const hash = requestHash(projection);
  const ref = db.collection(TAKEDOWN_REQUESTS_COLLECTION).doc(requestId);
  const receipt = (stored: {ackDueAt: Date; actionDueAt: Date | null;
    resolveDueAt: Date}, isNew: boolean): ListingRequestResult => ({
    status: 200,
    body: {ok: true, request: {
      requestId, reference, requestType: submission.requestType, isNew,
      ackDueAt: stored.ackDueAt.toISOString(),
      actionDueAt: iso(stored.actionDueAt),
      resolveDueAt: stored.resolveDueAt.toISOString(),
    }},
  });
  const storedDeadlines = (data: FirebaseFirestore.DocumentData) => ({
    ackDueAt: (data.ackDueAt as admin.firestore.Timestamp).toDate(),
    actionDueAt: data.actionDueAt ?
      (data.actionDueAt as admin.firestore.Timestamp).toDate() : null,
    resolveDueAt: (data.resolveDueAt as admin.firestore.Timestamp).toDate(),
  });
  const conflict = refused(409,
    "This request changed. Please review it and send it again.");

  // A retry of a stored request is answered before the email's quota is spent.
  const prior = await ref.get();
  if (prior.exists) {
    const data = prior.data() ?? {};
    return data.requestHash === hash ?
      receipt(storedDeadlines(data), false) : conflict;
  }
  try {
    await deps.checkRateLimit(db, requestEmailKey(email),
      "listingRequestEmail", REQUEST_EMAIL_LIMIT);
  } catch (error) {
    if (rateLimited(error)) {
      return refused(429, "Too many requests. Please try again later.");
    }
    throw error;
  }

  const now = deps.now();
  const deadlines = deadlinesFor(submission.requestType, now);
  const stamp = admin.firestore.Timestamp.fromDate(now);
  const timestamp = (date: Date | null) =>
    date ? admin.firestore.Timestamp.fromDate(date) : null;
  type Outcome = {kind: "stored"} | {kind: "replayed";
    data: FirebaseFirestore.DocumentData} | {kind: "conflict"};
  const result: {outcome: Outcome} = {outcome: {kind: "stored"}};
  await db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists) {
      const data = existing.data() ?? {};
      result.outcome = data.requestHash === hash ?
        {kind: "replayed", data} : {kind: "conflict"};
      return;
    }
    tx.create(ref, {
      schemaVersion: 1,
      requestId,
      reference,
      clientRequestId: submission.clientRequestId,
      requestHash: hash,
      requestType: submission.requestType,
      target,
      requester: {
        name: submission.requester.name,
        role: submission.requester.role,
        email,
        phone: submission.requester.phone ?? null,
        organisation: submission.requester.organisation ?? null,
      },
      verification: submission.verification,
      declarations: submission.declarations,
      context: submission.context ?? null,
      consent: {...submission.consent, decidedAt: stamp},
      sourcePage: submission.sourcePage,
      status: "received",
      outcome: null,
      declineReason: null,
      caseId: null,
      infoRequests: [],
      appeal: null,
      deciderUid: null,
      acknowledgedAt: null,
      ackDueAt: timestamp(deadlines.ackDueAt),
      actionDueAt: timestamp(deadlines.actionDueAt),
      resolveDueAt: timestamp(deadlines.resolveDueAt),
      decidedAt: null,
      closedAt: null,
      history: [{at: stamp, action: "received", byUid: null,
        status: "received", detail: null}],
      createdAt: stamp,
      updatedAt: stamp,
    });
  });
  const settled = result.outcome;
  if (settled.kind === "conflict") return conflict;
  if (settled.kind === "replayed") {
    return receipt(storedDeadlines(settled.data), false);
  }
  // Names, emails and targets stay out of logs.
  logger.info("Listing request stored", {requestType: submission.requestType,
    targetKind: target.kind});
  return receipt(deadlines, true);
}

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

function send(response: Response, result: ListingRequestResult): void {
  if (!validateListingRequestHTTPResponse(result.body)) {
    throw new Error("submitListingRequest produced an invalid response: " +
      schemaErrorMessages(validateListingRequestHTTPResponse).join("; "));
  }
  response.status(result.status).json(result.body);
}

export function createListingRequestHandler(
  deps: ListingRequestDeps = defaultListingRequestDeps,
) {
  return async (request: Request, response: Response): Promise<void> => {
    const origin = request.get("origin");
    const projectId = process.env.GCLOUD_PROJECT ??
      process.env.GCP_PROJECT ?? "";
    const allowedOrigin = resolveWaitlistCorsOrigin(origin, projectId);
    if (allowedOrigin) {
      response.set("Access-Control-Allow-Origin", allowedOrigin);
    }
    response.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.set("Access-Control-Allow-Headers",
      "Content-Type, X-Firebase-AppCheck");
    response.set("Vary", "Origin");
    if (origin && allowedOrigin === null) {
      send(response, refused(403, "Origin not allowed."));
      return;
    }
    if (request.method === "OPTIONS") {
      response.status(204).send("");
      return;
    }
    if (request.method !== "POST") {
      send(response, refused(405, "Method not allowed."));
      return;
    }
    send(response, await handleListingRequest(request, parseBody(request.body),
      deps));
  };
}

export const submitListingRequest = onRequest({region: "asia-south1"},
  createListingRequestHandler());
