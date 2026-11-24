/* eslint-disable max-len */
import {logger} from "firebase-functions";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import type {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {spendTryItReadBudget} from "../domain/supply/pageRead";
import type {DraftLinkClassification} from "../instantDrafts/links";
import {createSupplyIntakeRequest, intakeMarket, supplyIntakeRequestId,
  type SupplyIntakeTryItImport} from "../operations/supplyIntake/requests";
import {supplyIntakeCollections} from "../operations/supplyIntake/worker";

// How a try-it command reads one public link (organizer.import-from-link,
// event.import-from-link). The first preview with an idempotency key writes a
// Supply Intake request (origin try_it_import) and the worker reads the page
// with the instant-draft page allowance; previewing again with the same key
// reads the stored request back. One reader, so every link command gets the
// same budgets, suppression check and retry rules.

type Data = Record<string, unknown>;

export interface TryItLinkReadDeps {
  now: () => Date;
  checkRateLimit: typeof defaultCheckRateLimit;
}

/** The per-command budgets a first read spends, by limiter name. */
export interface TryItLinkReadLimits {
  /** Reads per verified phone per hour. */
  phone: string;
  /** Reads per network address per hour. */
  address: string;
  /** Reads across the whole tool per day. */
  daily: string;
}

export interface TryItLinkReadParams {
  uid: string;
  phone: string;
  commandKey: string;
  requestId: string;
  link: {url: string; classification: DraftLinkClassification};
  organizerId: string;
  organizerMarketId: string | null;
  surface: string;
  limits: TryItLinkReadLimits;
}

export type TryItLinkRead =
  | {state: "running"}
  | {state: "refused"; reason: "listing_suppressed" | "link_unreadable"}
  | {state: "completed"; stored: Data};

/** The key the organizer and event imports' shared daily budget counts under. */
const TRY_IT_IMPORTS_DAILY_SCOPE = "try-it-imports";

/** The Supply Intake request id a command's key reads into. */
export function tryItReadRequestId(seed: readonly string[]): string {
  return supplyIntakeRequestId("tryit", [...seed]);
}

/**
 * Starts the read on the first preview and answers where it stands. A retried
 * key must name the same caller and link it started with.
 */
export async function readTryItLink(db: FirebaseFirestore.Firestore, deps: TryItLinkReadDeps,
  request: CallableRequest<unknown>, params: TryItLinkReadParams): Promise<TryItLinkRead> {
  const ref = db.collection(supplyIntakeCollections.requests).doc(params.requestId);
  let snap = await ref.get();
  if (!snap.exists) {
    // The same budgets every try-it link read spends (pageRead.ts), under
    // this command's own limiter names so live counters carry on.
    await spendTryItReadBudget(db, deps.checkRateLimit, request, params.phone,
      {...params.limits, dailyScope: TRY_IT_IMPORTS_DAILY_SCOPE});
    const created = await startTryItRead(db, deps, params);
    if (created === "suppressed") return {state: "refused", reason: "listing_suppressed"};
    snap = await ref.get();
  }
  const stored = snap.data() ?? {};
  assertSameTryItRead(stored, params.uid, params.link.url);
  if (stored.status === "queued" || stored.status === "running") return {state: "running"};
  if (stored.status !== "completed") return {state: "refused", reason: "link_unreadable"};
  return {state: "completed", stored};
}

/** Writes the Supply Intake request that reads the link; the worker starts at once. */
async function startTryItRead(db: FirebaseFirestore.Firestore, deps: TryItLinkReadDeps,
  params: TryItLinkReadParams): Promise<"created" | "suppressed"> {
  const now = deps.now();
  const classification = params.link.classification;
  const tryItImport: SupplyIntakeTryItImport = {schemaVersion: 1, uid: params.uid, organizerId: params.organizerId,
    commandKey: params.commandKey, link: {url: params.link.url, provider: classification.provider,
      support: classification.support, reason: classification.reason}, appliedAt: null};
  const result = await db.runTransaction((tx) => createSupplyIntakeRequest(tx, db, {
    schemaVersion: 1, requestId: params.requestId, kind: "self_submission",
    market: intakeMarket(params.organizerMarketId),
    seed: {name: null, urls: [params.link.url], notes: null, categories: []},
    submittedBy: {role: "organizer", uid: null, partnerId: null},
    submittedAt: now.toISOString(),
    origin: {kind: "try_it_import", id: params.commandKey},
  }, now, {tryItImport}));
  // The link and the account stay out of logs.
  logger.info("Try-it import requested.", {requestId: params.requestId, provider: classification.provider,
    support: classification.support, surface: params.surface, created: result.created});
  return result.suppressed ? "suppressed" : "created";
}

/** A retried key must name the same caller and link it started with. */
export function assertSameTryItRead(stored: Data, uid: string, url: string): void {
  const state = record(stored.tryItImport);
  if (!state || state.uid !== uid || record(state.link)?.url !== url) {
    throw new HttpsError("already-exists", "This request changed. Start again with a new request.", {reason: "idempotency_key_reused"});
  }
}

/** One event a read found on the page, from its work item. */
export interface TryItEvent {
  /** The event's work item id. */
  eventKey: string;
  title: string | null;
  startAt: string;
  endAt: string | null;
  venue: string | null;
  address: string | null;
  description: string | null;
  sourceUrl: string;
}

/**
 * The first [limit] events a finished read found, earliest first. Items
 * without a start time or source link are left out.
 */
export async function readTryItEvents(db: FirebaseFirestore.Firestore, stored: Data, limit: number,
  tx?: FirebaseFirestore.Transaction): Promise<TryItEvent[]> {
  const ids = (Array.isArray(record(stored.result)?.eventWorkItemIds) ?
    record(stored.result)?.eventWorkItemIds as unknown[] : [])
    .filter((id): id is string => typeof id === "string").slice(0, limit);
  const snaps = await Promise.all(ids.map((id) => {
    const ref = db.collection("operationWorkItems").doc(id);
    return tx ? tx.get(ref) : ref.get();
  }));
  return snaps.flatMap((snap, index) => {
    const event = record(record(record(record(snap.data())?.normalizedPayload)?.intake)?.event);
    return event && typeof event.startAt === "string" && typeof event.sourceUrl === "string" ? [{
      eventKey: ids[index], title: text(event.title, 300), startAt: event.startAt.slice(0, 40),
      endAt: text(event.endAt, 40), venue: text(event.venue, 300), address: text(event.address, 500),
      description: text(event.description, 4000), sourceUrl: event.sourceUrl.slice(0, 2000)}] : [];
  }).sort((left, right) => left.startAt.localeCompare(right.startAt));
}

function text(value: unknown, maxLength: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : null;
}

function record(value: unknown): Data | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Data : null;
}
