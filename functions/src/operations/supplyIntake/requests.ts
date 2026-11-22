/* eslint-disable max-len */
import {createHash} from "node:crypto";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import {logger} from "firebase-functions";
import {HttpsError} from "firebase-functions/v2/https";
import {marketForIdOrAlias} from "../../locations/marketConfig";
import {blockedIntakePatch, checkListingSuppression, suppressionModule} from "../../listingSuppressions/registry";
import type {SupplyIntakeRequest} from "../../shared/generated/supplyIntakeRequest";
import {validateSupplyIntakeRequest} from "../../shared/generated/validators/supplyIntakeRequest";
import {supplyIntakeCollections} from "./worker";

// Every front door creates intake requests through this one service, inside
// the caller's transaction. Request ids are deterministic per front door, so
// a retried submission finds its own request instead of creating another,
// and the same id with different content is refused rather than overwritten.

const UNMAPPED_MARKET = "unassigned";

export function supplyIntakeRequestId(prefix: "nom" | "intent" | "msg" | "discovery" | "refresh" | "tryit", parts: readonly string[]): string {
  return `${prefix}-${createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 40)}`;
}

/**
 * A free-text city (or market id or alias) resolves to the market slug that
 * Supply Intake keys work by, such as "mumbai"; anything else waits in
 * "unassigned" for staff to place.
 */
export function intakeMarket(value: string | null | undefined): string {
  const slug = marketForIdOrAlias(value)?.slug;
  return slug && /^[a-z][a-z0-9-]{1,49}$/u.test(slug) ? slug : UNMAPPED_MARKET;
}

export interface SupplyIntakeRequestApproval {
  approvalId: string;
  organizerId: string;
  approvedByUid: string;
  approvedAt: string;
  materialHash: string;
  salesOwnerUid: string;
}

/**
 * The private state of a request the command organizer.import-from-link
 * created (supplyIntakeRequests.tryItImport): whose workspace the link fills.
 * Everything but appliedAt is fixed at capture.
 */
export interface SupplyIntakeTryItImport {
  schemaVersion: 1;
  uid: string;
  organizerId: string;
  commandKey: string;
  link: {url: string; provider: string | null; support: "instant" | "best_effort" | "staff_follow_up"; reason: string | null};
  appliedAt: string | null;
}

/** A request the do-not-list registry refused: the case it matched, for staff, never the matched identity. */
export interface SupplyIntakeSuppression {
  caseId: string;
  reason: string;
}

export interface SupplyIntakeRequestResult {
  requestId: string;
  created: boolean;
  /** Set when a do-not-list case refused the request; nothing was written but the case's refusal count. */
  suppressed?: SupplyIntakeSuppression;
}

/**
 * Writes one queued request. An event refresh for an organizer Catch already
 * lists is created with that organizer's approval, so it never waits for
 * listing review and its events go straight to the publication policy. A
 * try-it import is created with its private import state and is never
 * approved.
 *
 * Every request is first checked against the do-not-list registry
 * (listingSuppressions): a request whose name, links, handles or target
 * match an active case is not written; the case's blockedIntakeCount is
 * incremented in this transaction and the result names the case so the
 * front door can refuse. While an active case exists and the registry key
 * is unavailable, intake fails closed with "unavailable".
 */
export async function createSupplyIntakeRequest(tx: Transaction, db: Firestore, request: SupplyIntakeRequest, now: Date,
  {approval = null, tryItImport = null}: {approval?: SupplyIntakeRequestApproval | null;
    tryItImport?: SupplyIntakeTryItImport | null} = {}):
  Promise<SupplyIntakeRequestResult> {
  if (!validateSupplyIntakeRequest(request)) {
    throw new HttpsError("invalid-argument", "The intake request does not satisfy its contract.");
  }
  if ((request.origin?.kind === "try_it_import") !== (tryItImport !== null) || (tryItImport !== null && approval !== null)) {
    throw new HttpsError("invalid-argument", "Only a try-it import request carries try-it import state, and it is never approved.");
  }
  const keys = (await suppressionModule()).suppressionKeysForIntakeRequest(request);
  const suppression = await checkListingSuppression(tx, db, keys);
  if (suppression.state === "unavailable") {
    logger.error("Supply intake paused: the do-not-list registry key is unavailable.",
      {originKind: request.origin?.kind ?? null});
    throw new HttpsError("unavailable", "The do-not-list check is unavailable (LISTING_SUPPRESSION_HMAC_KEY), " +
      "so Supply Intake is paused. Nothing was queued.");
  }
  if (suppression.state === "suppressed") {
    const {caseId, reason} = suppression.match;
    tx.update(suppression.match.ref, blockedIntakePatch(suppression.match, now));
    // The case id is opaque; the request's name and links stay out of logs.
    logger.warn("Supply intake request refused by the do-not-list registry.",
      {caseId, originKind: request.origin?.kind ?? null, kind: request.kind});
    return {requestId: request.requestId, created: false, suppressed: {caseId, reason}};
  }
  const ref = db.collection(supplyIntakeCollections.requests).doc(request.requestId);
  const existing = await tx.get(ref);
  if (existing.exists) {
    const stored = existing.data() as {request?: unknown; tryItImport?: Record<string, unknown> | null};
    if (canonical(stored.request) !== canonical(request) ||
        canonical(importCapture(stored.tryItImport ?? null)) !== canonical(importCapture(tryItImport as object | null))) {
      throw new HttpsError("already-exists", "This intake request id already holds a different request.");
    }
    return {requestId: request.requestId, created: false};
  }
  const at = now.toISOString();
  tx.create(ref, {schemaVersion: 1, requestId: request.requestId, request, status: "queued", attempts: 0,
    leaseUntil: null, result: null, failure: null, approval,
    ...(tryItImport ? {tryItImport} : {}),
    createdAt: at, updatedAt: at});
  return {requestId: request.requestId, created: true};
}

/** The fixed part of a try-it import: appliedAt may differ on a retry. */
function importCapture(value: object | null): unknown {
  if (!value) return null;
  const {appliedAt: _appliedAt, ...rest} = value as Record<string, unknown>; // eslint-disable-line @typescript-eslint/no-unused-vars
  return rest;
}

interface InboundIntent {
  source?: unknown;
  partnerUid?: unknown;
  city?: unknown;
  createdAt?: {toDate?: () => Date};
  hostApplication?: {
    organizationName?: unknown;
    communityLink?: unknown;
    operatingCity?: unknown;
    operatingNotes?: unknown;
  } | null;
}

/**
 * The intake request a website host application or a partner nomination
 * implies. Both arrive as salesInboundIntents; null when the intent names
 * neither an organizer nor a link to read.
 */
export function requestFromSalesInboundIntent(intentId: string, intent: InboundIntent, now: Date): SupplyIntakeRequest | null {
  const application = intent.hostApplication;
  if (!application) return null;
  const name = boundedText(application.organizationName, 160);
  const link = typeof application.communityLink === "string" && /^https?:\/\//iu.test(application.communityLink) &&
    application.communityLink.length <= 2000 ? application.communityLink : null;
  if (!name && !link) return null;
  const partner = intent.source === "partner" && typeof intent.partnerUid === "string" && intent.partnerUid.length > 0;
  const submittedAt = intent.createdAt?.toDate?.() ?? now;
  return {
    schemaVersion: 1,
    requestId: supplyIntakeRequestId("intent", [intentId]),
    kind: partner ? "nomination" : "self_submission",
    market: intakeMarket(boundedText(application.operatingCity, 160) ?? boundedText(intent.city, 160)),
    seed: {name, urls: link ? [link] : [], notes: boundedText(application.operatingNotes, 2000), categories: []},
    submittedBy: partner ?
      {role: "partner", uid: intent.partnerUid as string, partnerId: intent.partnerUid as string} :
      {role: "organizer", uid: null, partnerId: null},
    submittedAt: submittedAt.toISOString(),
    origin: {kind: "sales_inbound_intent", id: intentId},
  };
}

function boundedText(value: unknown, maximum: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, maximum) : null;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
