import * as logger from "firebase-functions/logger";
import {Timestamp} from "firebase-admin/firestore";
import {type BigQueryClient, defaultBigQueryClient} from "../shared/bigQuery";
import type {OrganizerGrowthFactsDocument} from
  "../shared/generated/firestoreAdminTypes";
import type {OrganizerGrowthEvent} from
  "../shared/generated/organizerGrowthEvent";
import {
  type GrowthDeps,
  type GrowthMilestone,
  growthEventsDataset,
  growthEventsTable,
  growthFactsCollection,
  milestoneEvent,
  paymentEvent,
  paymentEventId,
  type PaymentFact,
} from "./organizerGrowthFacts";
import {
  checkoutPaymentFacts,
  nativePaymentFacts,
} from "./organizerGrowthTriggers";

/**
 * Firestore holds every growth fact; BigQuery's copy is streamed once and a
 * failed insert is only logged. Each night this works out the rows Firestore
 * implies, asks BigQuery which ids it has, and sends only the missing ones.
 *
 * Why a row can't be sent twice:
 * - A fact's id comes from the same builders the live path uses, so a row
 *   the live path sent is recognised as already there.
 * - Anything that can't be read completely stops the replay before it sends.
 * - A record written in the last hour is left for the next run, so a trigger
 *   still handling that write can't be sending the same row.
 * - The schedule allows one run at a time, and each run reads BigQuery first.
 * - A retried or unanswered insert uses the growth event id as its insert id,
 *   and the next run sees whatever landed.
 */
type Raw = Record<string, unknown>;
type CheckoutSource = "publicEventPayments" | "organizerEventOfferPayments" |
  "organizerFormPayments";

const settleMillis = 60 * 60 * 1000;
const sourceLimit = 10_000;
const insertBatchSize = 500;
const milestones: GrowthMilestone[] = ["listedAt", "claimRequestedAt",
  "claimedAt", "firstEventAt", "firstPaidBookingAt"];
const checkoutSources: CheckoutSource[] = ["publicEventPayments",
  "organizerEventOfferPayments", "organizerFormPayments"];
const checkoutFields = ["organizerId", "eventId", "currency", "amountPaise",
  "capturedAt", "refundedAmountPaise", "providerFees", "updatedAt",
  "createdAt"];
const nativeFields = ["eventId", "currency", "amount", "amountMinor", "status",
  "completedAt", "providerFees", "updatedAt", "createdAt"];

export interface ReplaySources {
  facts: OrganizerGrowthFactsDocument[];
  checkouts: Array<{source: CheckoutSource; id: string; data: Raw}>;
  nativePayments: Array<{id: string; organizerId: string | null; data: Raw}>;
}

/** Growth event ids BigQuery has, with each row's amount. */
export type KnownRows = Map<string, number>;

export interface ReplayCounts {
  known: number;
  missing: number;
  sent: number;
}

const tableDescription = "Organizer growth facts: dated steps (listed, " +
  "claim asked, claimed, first event, first paid booking), paid bookings, " +
  "refunds and form payments, each with one acquisition channel per " +
  "organizer. Firestore organizerGrowthFacts holds the steps.";

/**
 * The statement that creates the growth table. It matches
 * analytics/sql/ddl/organizer_growth_events.sql; a test keeps them together.
 * @param {string} dataset Dataset id.
 * @param {string} table Table id.
 * @return {string} Create statement.
 */
export function createGrowthEventsTableSql(dataset: string, table: string):
  string {
  return `
CREATE TABLE IF NOT EXISTS \`${dataset}.${table}\` (
  growth_event_id STRING NOT NULL,
  organizer_id STRING NOT NULL,
  event_name STRING NOT NULL,
  occurred_at TIMESTAMP NOT NULL,
  event_date DATE NOT NULL,
  channel STRING NOT NULL,
  market_id STRING,
  nominator_role STRING,
  booking_event_id STRING,
  payment_source STRING,
  payment_id STRING,
  currency STRING,
  amount_minor INT64,
  provider_fee_minor INT64,
  provider_tax_minor INT64,
  ingested_at TIMESTAMP NOT NULL
)
PARTITION BY event_date
CLUSTER BY organizer_id, event_name
OPTIONS(
  description = '${tableDescription}'
)
`;
}

/**
 * Creates the growth table if it is missing. A failure is logged, and the
 * replay that follows stops at its own read.
 * @param {GrowthDeps} deps BigQuery client.
 * @return {Promise<boolean>} Whether the table is now there.
 */
export async function ensureGrowthEventsTable(deps: GrowthDeps):
  Promise<boolean> {
  try {
    await bigQueryOf(deps).query(createGrowthEventsTableSql(
      growthEventsDataset(), growthEventsTable()));
    return true;
  } catch (error) {
    logger.warn("Organizer growth events table could not be created.",
      {error: message(error)});
    return false;
  }
}

/**
 * The rows Firestore implies and BigQuery does not have.
 * @param {ReplaySources} sources Facts and payment records.
 * @param {KnownRows} known Rows BigQuery has.
 * @param {Date} now Run time.
 * @return {OrganizerGrowthEvent[]} Missing rows, one per id.
 */
export function missingGrowthRows(sources: ReplaySources, known: KnownRows,
  now: Date): OrganizerGrowthEvent[] {
  const cutoff = now.getTime() - settleMillis;
  const settled = (at: unknown) =>
    at instanceof Timestamp && at.toMillis() <= cutoff;
  const lastWrite = (data: Raw) => data.updatedAt ?? data.capturedAt ??
    data.completedAt ?? data.createdAt;
  const missing = new Map<string, OrganizerGrowthEvent>();
  const factsOf = new Map(sources.facts.map((facts) =>
    [facts.organizerId, facts]));

  for (const facts of sources.facts) {
    if (!settled(facts.updatedAt)) continue;
    for (const milestone of milestones) {
      if (!facts.milestones[milestone]) continue;
      const row = milestoneEvent(facts, milestone, now);
      if (!known.has(row.growth_event_id)) {
        missing.set(row.growth_event_id, row);
      }
    }
  }

  const refundedSoFar = new Map<string, number>();
  for (const [id, amount] of known) {
    const end = id.lastIndexOf(":refund:");
    if (end < 0) continue;
    const payment = id.slice(0, end);
    refundedSoFar.set(payment, (refundedSoFar.get(payment) ?? 0) + amount);
  }
  const addPayment = (organizerId: unknown, fact: PaymentFact) => {
    const facts = typeof organizerId === "string" ?
      factsOf.get(organizerId) : undefined;
    if (!facts) return;
    if (fact.kind === "paid_booking") {
      if (known.has(paymentEventId(fact))) return;
      const row = paymentEvent(facts, fact, now);
      missing.set(row.growth_event_id, row);
      return;
    }
    // What the rows BigQuery has don't yet add up to. Sent only while short,
    // so a refund can never be counted past what was refunded.
    const refundedTo = fact.refundedToMinor ?? fact.amountMinor;
    const short = refundedTo -
      (refundedSoFar.get(`${fact.source}:${fact.paymentId}`) ?? 0);
    if (short <= 0) return;
    const row = paymentEvent(facts,
      {...fact, amountMinor: short, refundedToMinor: refundedTo}, now);
    if (known.has(row.growth_event_id)) {
      row.growth_event_id += `:rest:${short}`;
    }
    missing.set(row.growth_event_id, row);
  };

  for (const {source, id, data} of sources.checkouts) {
    if (!settled(lastWrite(data))) continue;
    for (const fact of checkoutPaymentFacts(source, id, undefined, data)) {
      addPayment(data.organizerId, fact);
    }
  }
  for (const {id, organizerId, data} of sources.nativePayments) {
    if (!settled(lastWrite(data))) continue;
    // A refunded payment was completed first; both rows are owed.
    for (const fact of [
      ...nativePaymentFacts(id, undefined, {...data, status: "completed"}),
      ...nativePaymentFacts(id, {status: "completed"}, data),
    ]) {
      addPayment(organizerId, fact);
    }
  }
  return [...missing.values()];
}

/**
 * Sends what BigQuery is missing. Stops without sending when anything can't
 * be read. A failed batch is left for the next run, which sees what landed.
 * @param {GrowthDeps} deps Firestore and BigQuery.
 * @return {Promise<object|null>} Counts, or null when it stopped first.
 */
export async function replayGrowthEvents(deps: GrowthDeps):
  Promise<ReplayCounts | null> {
  return sendMissingRows(bigQueryOf(deps), () => loadReplaySources(deps.db),
    (deps.now ?? (() => new Date()))());
}

/**
 * Reads what BigQuery has and the sources, then sends the difference.
 * @param {BigQueryClient} client BigQuery client.
 * @param {Function} load Reads the facts and payment records.
 * @param {Date} now Run time.
 * @return {Promise<object|null>} Counts, or null when it stopped first.
 */
export async function sendMissingRows(client: BigQueryClient,
  load: () => Promise<ReplaySources>, now: Date):
  Promise<ReplayCounts | null> {
  let known: KnownRows;
  let missing: OrganizerGrowthEvent[];
  try {
    known = await readKnownRows(client);
    missing = missingGrowthRows(await load(), known, now);
  } catch (error) {
    logger.warn("Organizer growth replay stopped before sending.",
      {error: message(error)});
    return null;
  }
  let sent = 0;
  for (let at = 0; at < missing.length; at += insertBatchSize) {
    const batch = missing.slice(at, at + insertBatchSize);
    try {
      await client.insertRows(growthEventsDataset(), growthEventsTable(),
        batch.map((row) => ({insertId: row.growth_event_id,
          json: row as unknown as Raw})));
    } catch (error) {
      logger.warn("Organizer growth replay skipped a failed batch.",
        {size: batch.length, error: message(error)});
      continue;
    }
    sent += batch.length;
  }
  return {known: known.size, missing: missing.length, sent};
}

/**
 * Every growth event id in BigQuery.
 * @param {BigQueryClient} client BigQuery client.
 * @return {Promise<KnownRows>} Ids with their amounts.
 */
async function readKnownRows(client: BigQueryClient): Promise<KnownRows> {
  const rows = await client.query<{
    growth_event_id: string; amount_minor: string | null;
  }>(`SELECT growth_event_id, ANY_VALUE(amount_minor) AS amount_minor
    FROM \`${growthEventsDataset()}.${growthEventsTable()}\`
    GROUP BY growth_event_id`);
  return new Map(rows.map((row) =>
    [row.growth_event_id, Number(row.amount_minor) || 0]));
}

/**
 * Reads facts and payment records. Reaching a read limit only leaves rows
 * for later, so it is logged and the replay carries on.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @return {Promise<ReplaySources>} Facts and payments.
 */
async function loadReplaySources(db: FirebaseFirestore.Firestore):
  Promise<ReplaySources> {
  const read = async (query: FirebaseFirestore.Query, name: string) => {
    const snap = await query.limit(sourceLimit).get();
    if (snap.size === sourceLimit) {
      logger.warn("Organizer growth replay hit its read limit.", {name});
    }
    return snap.docs;
  };
  const [facts, native, ...checkouts] = await Promise.all([
    read(db.collection(growthFactsCollection), growthFactsCollection),
    read(db.collection("payments").where("status", "in",
      ["completed", "refunded"]).select(...nativeFields), "payments"),
    ...checkoutSources.map((source) => read(db.collection(source)
      .where("capturedAt", "!=", null).select(...checkoutFields), source)),
  ]);
  const eventIds = [...new Set(native.map((doc) => doc.get("eventId"))
    .filter((id): id is string => typeof id === "string"))];
  const organizerOfEvent = new Map<string, string>();
  for (let at = 0; at < eventIds.length; at += 300) {
    const events = await db.getAll(...eventIds.slice(at, at + 300)
      .map((id) => db.collection("events").doc(id)),
    {fieldMask: ["organizerId"]});
    for (const event of events) {
      const organizerId = event.get("organizerId");
      if (typeof organizerId === "string") {
        organizerOfEvent.set(event.id, organizerId);
      }
    }
  }
  return {
    facts: facts.map((doc) => doc.data() as OrganizerGrowthFactsDocument),
    checkouts: checkoutSources.flatMap((source, index) =>
      checkouts[index].map((doc) => ({source, id: doc.id, data: doc.data()}))),
    nativePayments: native.map((doc) => ({id: doc.id, data: doc.data(),
      organizerId: organizerOfEvent.get(doc.get("eventId")) ?? null})),
  };
}

const bigQueryOf = (deps: GrowthDeps) => deps.bigQuery ?? defaultBigQueryClient;
const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
