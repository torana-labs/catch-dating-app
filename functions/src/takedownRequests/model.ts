import {createHash} from "node:crypto";
import type {ListingRequestHTTPRequest} from
  "../shared/generated/listingRequestHTTPRequest";
import type {TakedownRequestDocument} from
  "../shared/generated/firestoreAdminTypes";
import {staffReviewMethod} from
  "../organizers/identityVerification/staffReviewMethods";

/**
 * Structured listing requests: the fixed menu behind /listings/request/.
 * Each type has fixed fields, a fixed set of remedies and a fixed timeline,
 * so a request can only ask for what the policy offers. These functions are
 * pure; the intake, the Admin actions and the Inbox projection use them.
 * Removing a listing and the do-not-list registry belong to the organiser
 * takedown tool: a request records the case id that tool ran under.
 */

export const TAKEDOWN_REQUESTS_COLLECTION = "takedownRequests";

export const REQUEST_TYPES = ["claim", "correctFact", "removeAndDoNotList",
  "trademark", "copyright", "privacy", "impersonation", "legalOrder"] as const;
export type RequestType = typeof REQUEST_TYPES[number];

export type RequestStatus = TakedownRequestDocument["status"];
export type RequestOutcome = NonNullable<TakedownRequestDocument["outcome"]>;
export type DeclineReason =
  NonNullable<TakedownRequestDocument["declineReason"]>;
export type RequesterRole = TakedownRequestDocument["requester"]["role"];

const hour = 60 * 60 * 1000;
const day = 24 * hour;

/** Every request is acknowledged within 24 hours (IT Rules 2021, r.3(2)). */
export const ACK_WITHIN_MS = day;
/** One appeal, within 30 days of the decision, decided within 7 days. */
export const APPEAL_WINDOW_MS = 30 * day;
export const APPEAL_DECIDE_WITHIN_MS = 7 * day;

export interface RequestPolicy {
  /** Who may file this type. */
  roles: readonly RequesterRole[];
  /** The interim step's deadline (suspend, disable or comply), if any. */
  actionWithinMs: number | null;
  /** When the request must be resolved. */
  resolveWithinMs: number;
  /** The remedies an actioned request of this type may record. */
  outcomes: readonly RequestOutcome[];
  /** Whether the good-faith declaration is required. */
  goodFaith: boolean;
}

const speaksForOrganisation: readonly RequesterRole[] =
  ["owner", "staff", "authorisedAgent"];

/**
 * The fixed table (takedown plan, section 7). Timelines marked [counsel] in
 * the policy drafts are proposals until counsel confirms them.
 */
export const REQUEST_POLICIES: Record<RequestType, RequestPolicy> = {
  claim: {roles: speaksForOrganisation, actionWithinMs: null,
    resolveWithinMs: 2 * day, outcomes: ["claimGranted"], goodFaith: false},
  correctFact: {roles: [...speaksForOrganisation, "memberOfPublic"],
    actionWithinMs: null, resolveWithinMs: 7 * day,
    outcomes: ["factCorrected", "factFlagged"], goodFaith: false},
  removeAndDoNotList: {roles: speaksForOrganisation, actionWithinMs: day,
    resolveWithinMs: 7 * day, outcomes: ["removedAndSuppressed"],
    goodFaith: false},
  trademark: {roles: ["rightsHolder", "authorisedAgent", "owner"],
    actionWithinMs: null, resolveWithinMs: 7 * day,
    outcomes: ["removed", "relabelled"], goodFaith: true},
  copyright: {roles: ["rightsHolder", "authorisedAgent", "owner"],
    actionWithinMs: 36 * hour, resolveWithinMs: 7 * day,
    outcomes: ["materialRemoved"], goodFaith: true},
  privacy: {roles: ["affectedIndividual", "nominee"], actionWithinMs: null,
    resolveWithinMs: 7 * day,
    outcomes: ["personalDataRemoved", "personalDataRedacted", "factCorrected"],
    goodFaith: false},
  impersonation: {roles: speaksForOrganisation, actionWithinMs: day,
    resolveWithinMs: 7 * day, outcomes: ["pageSuspended"], goodFaith: true},
  legalOrder: {roles: ["authority", "authorisedAgent"],
    actionWithinMs: 3 * hour, resolveWithinMs: 7 * day,
    outcomes: ["orderComplied"], goodFaith: false},
};

/**
 * The types whose interim step may suspend the organiser page they name
 * (adminUpdateTakedownRequest's suspendOrganizer). A claim or a fact
 * correction never takes a page down.
 */
export const SUSPEND_REQUEST_TYPES: readonly RequestType[] = [
  "removeAndDoNotList", "trademark", "copyright", "privacy", "impersonation",
  "legalOrder"];

/** Publish states in which an organiser page is already off the site. */
export const SUSPENDED_PUBLISH_STATUSES: readonly string[] =
  ["suppressed", "removed"];

/** The outcomes that need the takedown tool's case id. */
export const CASE_OUTCOMES: readonly RequestOutcome[] =
  ["removedAndSuppressed", "removed", "pageSuspended", "orderComplied"];

export interface RequestDeadlines {
  ackDueAt: Date;
  actionDueAt: Date | null;
  resolveDueAt: Date;
}

export function deadlinesFor(type: RequestType, receivedAt: Date):
  RequestDeadlines {
  const policy = REQUEST_POLICIES[type];
  const at = receivedAt.getTime();
  return {
    ackDueAt: new Date(at + ACK_WITHIN_MS),
    actionDueAt: policy.actionWithinMs === null ? null :
      new Date(at + policy.actionWithinMs),
    resolveDueAt: new Date(at + policy.resolveWithinMs),
  };
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** One request per requester email and client request id. */
export function takedownRequestId(email: string, clientRequestId: string):
  string {
  return `lr-${sha256(JSON.stringify([email.toLowerCase(), clientRequestId]))
    .slice(0, 40)}`;
}

const referenceAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** The short reference a requester quotes, derived from the request id. */
export function takedownReference(requestId: string): string {
  const bytes = createHash("sha256").update(requestId).digest();
  let reference = "";
  for (let index = 0; index < 8; index++) {
    reference += referenceAlphabet[bytes[index] % referenceAlphabet.length];
  }
  return `LR-${reference}`;
}

/** Hashed identities, so rate-limit rows never hold an address or email. */
export function requestNetworkKey(address: string): string {
  return `listing_request_ip_${sha256(address).slice(0, 40)}`;
}

export function requestEmailKey(email: string): string {
  return `listing_request_email_${sha256(email.toLowerCase()).slice(0, 40)}`;
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function requestHash(value: unknown): string {
  return sha256(canonicalJson(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function compact(value: unknown): unknown {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") :
    value;
}

/**
 * Trims every text answer and drops ones left empty, lowercases the email
 * and the official domain and strips @ from a handle, so a blank optional
 * field never fails the contract and the replay hash only covers what was
 * said.
 * @param {Record<string, unknown>} body The parsed request body.
 * @return {Record<string, unknown>} The body to validate and store.
 */
export function normalizeRequestBody(body: Record<string, unknown>):
  Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (isRecord(value)) {
      const child: Record<string, unknown> = {};
      for (const [field, answer] of Object.entries(value)) {
        const text = Array.isArray(answer) ? answer.map(compact) :
          compact(answer);
        if (text !== "") child[field] = text;
      }
      normalized[key] = child;
    } else {
      const text = compact(value);
      if (text !== "") normalized[key] = text;
    }
  }
  const requester = isRecord(normalized.requester) ?
    normalized.requester : null;
  if (requester && typeof requester.email === "string") {
    requester.email = requester.email.toLowerCase();
  }
  if (requester && typeof requester.phone === "string") {
    requester.phone = requester.phone.replace(/[\s()-]/g, "");
  }
  const verification = isRecord(normalized.verification) ?
    normalized.verification : null;
  if (verification && typeof verification.officialDomain === "string") {
    verification.officialDomain = verification.officialDomain.toLowerCase()
      .replace(/^https?:\/\//u, "").replace(/^www\./u, "").replace(/\/.*$/u,
        "");
  }
  if (verification && typeof verification.officialHandle === "string") {
    verification.officialHandle = verification.officialHandle
      .replace(/^@/u, "");
  }
  return normalized;
}

/** The hosts a target URL may name: Catch's own website only. */
export function ownWebsiteHosts(origin: string): Set<string> {
  const host = new URL(origin).hostname;
  return new Set([host, host.startsWith("www.") ? host.slice(4) :
    `www.${host}`]);
}

export type StoredTarget = TakedownRequestDocument["target"];

/**
 * The stored target, or null when a URL is not a page on Catch's website.
 * @param {ListingRequestHTTPRequest["target"]} target The requested target.
 * @param {string} origin Catch's website origin.
 * @return {StoredTarget|null} The stored target.
 */
export function storedTarget(target: ListingRequestHTTPRequest["target"],
  origin: string): StoredTarget | null {
  if (target.kind === "organizer") {
    return {kind: "organizer", id: target.organizerId, path: null};
  }
  if (target.kind === "event") {
    return {kind: "event", id: target.eventId, path: null};
  }
  try {
    const url = new URL(target.url);
    if (url.protocol !== "https:" ||
        !ownWebsiteHosts(origin).has(url.hostname) || url.username ||
        url.password) {
      return null;
    }
    const path = url.pathname || "/";
    const organizer = /^\/organizers\/([A-Za-z0-9_-]{1,128})\/?$/u
      .exec(path)?.[1];
    if (organizer) return {kind: "organizer", id: organizer, path};
    const event = /^\/events\/([A-Za-z0-9_-]{1,160})\/?$/u.exec(path)?.[1];
    if (event) return {kind: "event", id: event, path};
    return {kind: "url", id: null, path};
  } catch {
    return null;
  }
}

/** The problems the intake words for the website. */
export type TypeRuleProblem =
  | "role" | "handle" | "domain" | "domainEmail" | "trademarkRegistered"
  | "trademarkUnregistered" | "goodFaith" | "notLicensed";

/**
 * The rules a schema cannot say: who may file each type, the official
 * channel a channel proof names, the fields a trademark basis needs and the
 * extra declarations IP and impersonation requests carry.
 * @param {ListingRequestHTTPRequest} request A schema-valid request.
 * @return {TypeRuleProblem|null} The first problem, or null.
 */
export function typeRuleProblem(request: ListingRequestHTTPRequest):
  TypeRuleProblem | null {
  const policy = REQUEST_POLICIES[request.requestType];
  if (!policy.roles.includes(request.requester.role)) return "role";
  if (policy.goodFaith && request.declarations.goodFaith !== true) {
    return "goodFaith";
  }
  switch (request.requestType) {
  case "claim":
  case "removeAndDoNotList":
  case "impersonation": {
    // The channel proofs live in the one verification registry.
    const proof = request.verification;
    return staffReviewMethod(proof.proofMethod).requestProblem({
      officialHandle: proof.officialHandle,
      officialDomain: proof.officialDomain,
      requesterEmail: request.requester.email,
    });
  }
  case "trademark": {
    const mark = request.verification;
    if (mark.basis === "registered" && (!mark.registrationNumber ||
        mark.registrationClass === undefined || !mark.jurisdiction)) {
      return "trademarkRegistered";
    }
    if (mark.basis === "unregistered" &&
        (mark.firstUseYear === undefined || !mark.evidenceUrl)) {
      return "trademarkUnregistered";
    }
    return null;
  }
  case "copyright":
    return request.declarations.notLicensed === true ? null : "notLicensed";
  default:
    return null;
  }
}

/** Statuses a person still has to act on. */
export const OPEN_STATUSES: readonly RequestStatus[] =
  ["received", "acknowledged", "verifying", "appealed"];

export function isOpenStatus(status: RequestStatus): boolean {
  return OPEN_STATUSES.includes(status);
}

export const requestTypeLabels: Record<RequestType, string> = {
  claim: "Claim this page",
  correctFact: "Correct a fact",
  removeAndDoNotList: "Remove and don't list again",
  trademark: "Trademark or branding",
  copyright: "Copyright",
  privacy: "Privacy or personal data",
  impersonation: "Impersonation",
  legalOrder: "Court or government order",
};
