import * as logger from "firebase-functions/logger";
import {Timestamp} from "firebase-admin/firestore";
import {BigQueryClient, defaultBigQueryClient} from "../shared/bigQuery";
import type {OrganizerGrowthFactsDocument} from
  "../shared/generated/firestoreAdminTypes";
import type {OrganizerGrowthEvent} from
  "../shared/generated/organizerGrowthEvent";

/**
 * Growth facts: one acquisition channel per organizer, set when its listing
 * is made, and the dated steps it reached. A step keeps the earliest time
 * observed, so retries and late triggers never move it later.
 */
export const growthFactsCollection = "organizerGrowthFacts";

export type GrowthChannel = OrganizerGrowthFactsDocument["channel"];
export type GrowthMilestone = keyof OrganizerGrowthFactsDocument["milestones"];
type ChannelSource = OrganizerGrowthFactsDocument["channelSource"];
type NominatorRole = NonNullable<
  OrganizerGrowthFactsDocument["nominator"]>["role"];

export interface ChannelDecision {
  channel: GrowthChannel;
  channelSource: ChannelSource;
  nominator: {uid: string; role: NominatorRole; nominatedAt: Date} | null;
}

const milestoneEvents: Record<GrowthMilestone,
  OrganizerGrowthEvent["event_name"]> = {
    listedAt: "listed",
    claimRequestedAt: "claim_requested",
    claimedAt: "claimed",
    firstEventAt: "first_event",
    firstPaidBookingAt: "first_paid_booking",
  };

// Reviewed paid campaign mediums; anything else on a website application is
// the organizer coming to us.
const paidMediums = new Set(["cpc", "paid_social"]);

/** The listing's front door, as Supply Intake recorded it. */
export interface ListingChannelInput {
  requestId: string;
  kind: "nomination" | "self_submission" | "discovery";
  submittedBy: {role: string; uid: string | null};
  submittedAt: Date;
  originKind: string | null;
  intent: {
    source?: unknown; partnerUid?: unknown; acquisitionAttribution?: unknown;
  } | null;
}

/**
 * The channel of an organizer listed through Supply Intake. The request is
 * the first touch: a nomination made before an ad click keeps the
 * nomination. A partner enquiry credits its partner.
 * @param {ListingChannelInput} input The approved listing's request.
 * @return {ChannelDecision} Channel, its source and the first nominator.
 */
export function listingChannel(input: ListingChannelInput): ChannelDecision {
  const source = (channel: GrowthChannel, campaign: string | null = null):
    ChannelDecision => ({channel, nominator: null, channelSource: {
    kind: "supply_intake", requestId: input.requestId,
    originKind: input.originKind, campaign}});
  const nominated = (channel: GrowthChannel, uid: string | null,
    role: NominatorRole): ChannelDecision => ({...source(channel),
    nominator: uid ? {uid, role, nominatedAt: input.submittedAt} : null});
  const intent = input.intent;
  if (intent?.source === "partner") {
    const uid = typeof intent.partnerUid === "string" ?
      intent.partnerUid : input.submittedBy.uid;
    return nominated("partner", uid, "partner");
  }
  if (input.kind === "discovery") return source("imported");
  if (input.kind === "self_submission" || intent) {
    const campaign = paidCampaign(intent?.acquisitionAttribution);
    return campaign ? source("ads", campaign) : source("came_to_us");
  }
  const role = input.submittedBy.role;
  if (role === "partner") {
    return nominated("partner", input.submittedBy.uid, "partner");
  }
  if (role === "guest" || role === "organizer") {
    return nominated(role, input.submittedBy.uid, role);
  }
  if (role === "associate") {
    return nominated("sales_associate", input.submittedBy.uid, "associate");
  }
  return source("imported");
}

/**
 * The paid campaign an enquiry's first touch came from, if any.
 * @param {unknown} attribution Stored host acquisition attribution snapshot.
 * @return {string|null} Campaign label, or null for unpaid traffic.
 */
export function paidCampaign(attribution: unknown): string | null {
  const snapshot = record(attribution);
  for (const touch of [snapshot?.firstTouch, snapshot?.lastTouch]) {
    const values = record(record(touch)?.values);
    const medium = values?.utm_medium;
    if (typeof medium === "string" && paidMediums.has(medium)) {
      const campaign = values?.utm_campaign;
      return typeof campaign === "string" ? campaign : medium;
    }
  }
  return null;
}

/**
 * The channel of an organizer created outside a Supply Intake listing:
 * an organizer who set itself up came to us; everything else was imported.
 * @param {Record<string, unknown>|undefined} organizer Organizer document.
 * @return {ChannelDecision} Channel decided from provenance.
 */
export function provenanceChannel(
  organizer: Record<string, unknown> | undefined): ChannelDecision {
  const origin = record(organizer?.provenance)?.origin;
  const ownership = record(organizer?.ownership)?.state;
  const cameToUs = origin === "userCreated" || ownership === "userCreated";
  return {channel: cameToUs ? "came_to_us" : "imported", nominator: null,
    channelSource: {kind: "provenance", requestId: null,
      originKind: typeof origin === "string" ? origin : null, campaign: null}};
}

/**
 * A new facts document with no steps reached yet.
 * @param {string} organizerId Organizer id.
 * @param {string|null} marketId Organizer launch market.
 * @param {ChannelDecision} decision Channel decision.
 * @param {Timestamp} now Write time.
 * @return {OrganizerGrowthFactsDocument} Facts document.
 */
export function newGrowthFacts(organizerId: string, marketId: string | null,
  decision: ChannelDecision, now: Timestamp): OrganizerGrowthFactsDocument {
  return {schemaVersion: 1, organizerId,
    marketId: marketId && /^[a-z][a-z0-9-]{1,49}$/u.test(marketId) ?
      marketId : null,
    channel: decision.channel, channelSource: decision.channelSource,
    nominator: decision.nominator ? {uid: decision.nominator.uid,
      role: decision.nominator.role,
      nominatedAt: Timestamp.fromDate(decision.nominator.nominatedAt)} : null,
    milestones: {listedAt: null, claimRequestedAt: null, claimedAt: null,
      firstEventAt: null, firstPaidBookingAt: null},
    firstEventId: null, createdAt: now, updatedAt: now};
}

export type ObservedMilestones = Partial<Record<GrowthMilestone, Timestamp>>;

/**
 * Applies observed steps, keeping the earliest time of each.
 * @param {OrganizerGrowthFactsDocument} facts Current facts.
 * @param {ObservedMilestones} observed Steps seen now.
 * @param {string|null} firstEventId Event behind an observed first event.
 * @return {object} Updated facts and the steps that moved.
 */
export function applyMilestones(facts: OrganizerGrowthFactsDocument,
  observed: ObservedMilestones, firstEventId: string | null = null):
  {facts: OrganizerGrowthFactsDocument; changed: GrowthMilestone[]} {
  const milestones = {...facts.milestones};
  const changed: GrowthMilestone[] = [];
  let eventId = facts.firstEventId;
  for (const key of Object.keys(milestoneEvents) as GrowthMilestone[]) {
    const at = observed[key];
    const current = milestones[key];
    if (!at || current && current.toMillis() <= at.toMillis()) continue;
    milestones[key] = at;
    changed.push(key);
    if (key === "firstEventAt") eventId = firstEventId;
  }
  return {facts: {...facts, milestones, firstEventId: eventId}, changed};
}

export interface GrowthDeps {
  db: FirebaseFirestore.Firestore;
  bigQuery?: BigQueryClient;
  now?: () => Date;
}

/**
 * Records observed steps for one organizer. Creates its facts document from
 * provenance when the listing did not create one, then streams the steps
 * that moved to BigQuery.
 * @param {GrowthDeps} deps Firestore and BigQuery.
 * @param {string} organizerId Organizer id.
 * @param {ObservedMilestones} observed Steps seen now.
 * @param {string|null} firstEventId Event behind an observed first event.
 * @return {Promise<GrowthMilestone[]>} Steps that moved.
 */
export async function recordOrganizerMilestones(deps: GrowthDeps,
  organizerId: string, observed: ObservedMilestones,
  firstEventId: string | null = null): Promise<GrowthMilestone[]> {
  if (!Object.values(observed).some(Boolean)) return [];
  const {db} = deps;
  const now = Timestamp.fromDate((deps.now ?? (() => new Date()))());
  const ref = db.collection(growthFactsCollection).doc(organizerId);
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    let facts = snap.data() as OrganizerGrowthFactsDocument | undefined;
    if (!facts) {
      const organizer = (await tx.get(
        db.collection("organizers").doc(organizerId))).data();
      // Steps for an organizer that no longer exists are not recorded.
      if (!organizer) return null;
      facts = newGrowthFacts(organizerId, marketOf(organizer),
        provenanceChannel(organizer), now);
    }
    const next = applyMilestones(facts, observed, firstEventId);
    if (!next.changed.length && snap.exists) return null;
    const written = {...next.facts, updatedAt: now};
    tx.set(ref, written);
    return {facts: written, changed: next.changed};
  });
  if (!result) return [];
  await streamGrowthEvents(deps, result.changed.map((milestone) =>
    milestoneEvent(result.facts, milestone, now.toDate())));
  return result.changed;
}

/**
 * The BigQuery row for one step an organizer reached.
 * @param {OrganizerGrowthFactsDocument} facts Facts after the step.
 * @param {GrowthMilestone} milestone Step reached.
 * @param {Date} ingestedAt Stream time.
 * @return {OrganizerGrowthEvent} Growth event row.
 */
export function milestoneEvent(facts: OrganizerGrowthFactsDocument,
  milestone: GrowthMilestone, ingestedAt: Date): OrganizerGrowthEvent {
  const at = facts.milestones[milestone] as Timestamp;
  const name = milestoneEvents[milestone];
  return {...rowBase(facts, `${facts.organizerId}:${name}`, name, at.toDate(),
    ingestedAt),
  booking_event_id: milestone === "firstEventAt" ? facts.firstEventId : null};
}

export interface PaymentFact {
  source: NonNullable<OrganizerGrowthEvent["payment_source"]>;
  paymentId: string;
  eventId: string | null;
  kind: "paid_booking" | "refund";
  occurredAt: Date;
  currency: string;
  amountMinor: number;
  feeMinor: number | null;
  taxMinor: number | null;
}

/**
 * Streams a paid booking or refund for an organizer's ticket sales. A paid
 * booking also records the organizer's first paid booking step.
 * @param {GrowthDeps} deps Firestore and BigQuery.
 * @param {string} organizerId Organizer id.
 * @param {PaymentFact} fact Captured payment or refund.
 * @return {Promise<void>} Resolves once recorded.
 */
export async function recordOrganizerPayment(deps: GrowthDeps,
  organizerId: string, fact: PaymentFact): Promise<void> {
  if (fact.kind === "paid_booking") {
    await recordOrganizerMilestones(deps, organizerId,
      {firstPaidBookingAt: Timestamp.fromDate(fact.occurredAt)});
  }
  const facts = (await deps.db.collection(growthFactsCollection)
    .doc(organizerId).get()).data() as OrganizerGrowthFactsDocument | undefined;
  if (!facts) return;
  const now = (deps.now ?? (() => new Date()))();
  const id = fact.kind === "paid_booking" ?
    `${fact.source}:${fact.paymentId}:captured` :
    `${fact.source}:${fact.paymentId}:refund:${fact.amountMinor}`;
  await streamGrowthEvents(deps, [{
    ...rowBase(facts, id, fact.kind, fact.occurredAt, now),
    booking_event_id: fact.eventId, payment_source: fact.source,
    payment_id: fact.paymentId, currency: fact.currency,
    amount_minor: fact.amountMinor, provider_fee_minor: fact.feeMinor,
    provider_tax_minor: fact.taxMinor}]);
}

function rowBase(facts: OrganizerGrowthFactsDocument, id: string,
  name: OrganizerGrowthEvent["event_name"], occurredAt: Date,
  ingestedAt: Date): OrganizerGrowthEvent {
  return {growth_event_id: id, organizer_id: facts.organizerId,
    event_name: name, occurred_at: occurredAt.toISOString(),
    event_date: occurredAt.toISOString().slice(0, 10),
    channel: facts.channel, market_id: facts.marketId,
    nominator_role: facts.nominator?.role ?? null,
    ingested_at: ingestedAt.toISOString()};
}

/**
 * Streams growth events. Firestore holds every step, so a failed insert is
 * logged and can be replayed from the facts; it never fails the trigger.
 * @param {GrowthDeps} deps BigQuery client.
 * @param {OrganizerGrowthEvent[]} rows Rows to insert.
 * @return {Promise<void>} Resolves once attempted.
 */
async function streamGrowthEvents(deps: GrowthDeps,
  rows: OrganizerGrowthEvent[]): Promise<void> {
  if (!rows.length) return;
  try {
    await (deps.bigQuery ?? defaultBigQueryClient).insertRows(
      growthEventsDataset(), growthEventsTable(),
      rows.map((row) => ({insertId: row.growth_event_id,
        json: row as unknown as Record<string, unknown>})));
  } catch (error) {
    logger.warn("Organizer growth events were not streamed.", {
      ids: rows.map((row) => row.growth_event_id),
      error: error instanceof Error ? error.message : String(error)});
  }
}

export function growthEventsDataset(): string {
  return process.env.GROWTH_BIGQUERY_DATASET || "catch_analytics";
}

export function growthEventsTable(): string {
  return process.env.GROWTH_EVENTS_TABLE || "organizer_growth_events";
}

/**
 * The launch market an organizer is in.
 * @param {Record<string, unknown>} organizer Organizer document.
 * @return {string|null} Market id.
 */
export function marketOf(organizer: Record<string, unknown>): string | null {
  const market = organizer.locationMarketId ?? organizer.location;
  return typeof market === "string" ? market : null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ?
    value as Record<string, unknown> : null;
}
