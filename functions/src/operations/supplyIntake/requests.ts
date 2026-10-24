/* eslint-disable max-len */
import {createHash} from "node:crypto";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import {marketForIdOrAlias} from "../../locations/marketConfig";
import type {SupplyIntakeRequest} from "../../shared/generated/supplyIntakeRequest";
import {validateSupplyIntakeRequest} from "../../shared/generated/validators/supplyIntakeRequest";
import {supplyIntakeCollections} from "./worker";

// Every front door creates intake requests through this one service, inside
// the caller's transaction. Request ids are deterministic per front door, so
// a retried submission finds its own request instead of creating another,
// and the same id with different content is refused rather than overwritten.

const UNMAPPED_MARKET = "unassigned";

export function supplyIntakeRequestId(prefix: "nom" | "intent" | "discovery", parts: readonly string[]): string {
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

export async function createSupplyIntakeRequest(tx: Transaction, db: Firestore, request: SupplyIntakeRequest, now: Date):
  Promise<{requestId: string; created: boolean}> {
  if (!validateSupplyIntakeRequest(request)) {
    throw new HttpsError("invalid-argument", "The intake request does not satisfy its contract.");
  }
  const ref = db.collection(supplyIntakeCollections.requests).doc(request.requestId);
  const existing = await tx.get(ref);
  if (existing.exists) {
    if (canonical((existing.data() as {request?: unknown}).request) !== canonical(request)) {
      throw new HttpsError("already-exists", "This intake request id already holds a different request.");
    }
    return {requestId: request.requestId, created: false};
  }
  const at = now.toISOString();
  tx.create(ref, {schemaVersion: 1, requestId: request.requestId, request, status: "queued", attempts: 0,
    leaseUntil: null, result: null, failure: null, approval: null, createdAt: at, updatedAt: at});
  return {requestId: request.requestId, created: true};
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
