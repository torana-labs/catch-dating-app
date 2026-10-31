import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp, type Firestore} from "firebase-admin/firestore";
import type {BigQueryClient} from "../shared/bigQuery";
import {
  applyMilestones,
  listingChannel,
  newGrowthFacts,
  paidCampaign,
  provenanceChannel,
  recordOrganizerMilestones,
  recordOrganizerPayment,
} from "./organizerGrowthFacts";
import {
  checkoutPaymentFacts,
  nativePaymentFacts,
  organizerMilestones,
} from "./organizerGrowthTriggers";

const at = (ms: number) => Timestamp.fromMillis(ms);
const submittedAt = new Date("2026-10-01T10:00:00.000Z");
const listing = (overrides: Partial<Parameters<typeof listingChannel>[0]>) =>
  listingChannel({requestId: "req_1", kind: "nomination",
    submittedBy: {role: "associate", uid: "riya"}, submittedAt,
    originKind: "admin_nomination", intent: null, ...overrides});

test("a listing's front door decides its one channel", () => {
  assert.equal(listing({}).channel, "sales_associate");
  assert.deepEqual(listing({}).nominator,
    {uid: "riya", role: "associate", nominatedAt: submittedAt});
  assert.equal(listing({submittedBy: {role: "partner", uid: "neha"}}).channel,
    "partner");
  assert.equal(listing({kind: "discovery",
    submittedBy: {role: "system", uid: null}}).channel, "imported");
  assert.equal(listing({kind: "self_submission",
    submittedBy: {role: "organizer", uid: null}}).channel, "came_to_us");
  // A partner enquiry credits the partner who sent it.
  const partner = listing({originKind: "sales_inbound_intent",
    submittedBy: {role: "system", uid: null},
    intent: {source: "partner", partnerUid: "tara"}});
  assert.equal(partner.channel, "partner");
  assert.equal(partner.nominator?.uid, "tara");
  assert.equal(partner.channelSource.requestId, "req_1");
});

test("a website enquiry after a paid campaign is ads, else came to us", () => {
  const touch = (medium: string) => ({firstTouch: null, lastTouch: {
    values: {utm_medium: medium, utm_campaign: "launch_2026"}}});
  const ads = listing({originKind: "sales_inbound_intent",
    submittedBy: {role: "system", uid: null},
    intent: {source: "website", acquisitionAttribution: touch("paid_social")}});
  assert.equal(ads.channel, "ads");
  assert.equal(ads.channelSource.campaign, "launch_2026");
  assert.equal(ads.nominator, null);
  assert.equal(listing({originKind: "sales_inbound_intent",
    submittedBy: {role: "system", uid: null}, intent: {source: "website",
      acquisitionAttribution: touch("referral")}}).channel, "came_to_us");
  assert.equal(paidCampaign(undefined), null);
  assert.equal(paidCampaign({firstTouch: {values: {utm_medium: "cpc"}}}),
    "cpc");
});

test("an organizer made outside a listing takes its channel from provenance",
  () => {
    assert.equal(provenanceChannel({provenance: {origin: "userCreated"}})
      .channel, "came_to_us");
    assert.equal(provenanceChannel({ownership: {state: "userCreated"}})
      .channel, "came_to_us");
    assert.equal(provenanceChannel({provenance: {origin: "scraper"}}).channel,
      "imported");
    assert.equal(provenanceChannel(undefined).channelSource.kind,
      "provenance");
  });

test("steps keep the earliest time and never move later", () => {
  const facts = newGrowthFacts("org", "mumbai", listing({}), at(1));
  const first = applyMilestones(facts, {listedAt: at(100),
    firstEventAt: at(500)}, "event_b");
  assert.deepEqual(first.changed, ["listedAt", "firstEventAt"]);
  assert.equal(first.facts.firstEventId, "event_b");
  const later = applyMilestones(first.facts, {listedAt: at(200),
    firstEventAt: at(900)}, "event_c");
  assert.deepEqual(later.changed, []);
  const earlier = applyMilestones(first.facts, {firstEventAt: at(300)},
    "event_a");
  assert.deepEqual(earlier.changed, ["firstEventAt"]);
  assert.equal(earlier.facts.firstEventId, "event_a");
  assert.equal(newGrowthFacts("org", "Not A Market", listing({}), at(1))
    .marketId, null);
});

test("an organizer write yields listed, claim asked and claimed steps", () => {
  const now = at(5_000);
  const created = organizerMilestones(undefined, {createdAt: at(1_000),
    publicPage: {publishStatus: "published"},
    ownership: {state: "programmatic", claimedAt: null},
    claim: {state: "unclaimed"}}, now);
  assert.deepEqual(created, {listedAt: at(1_000)});
  const pending = organizerMilestones({claim: {state: "unclaimed"},
    publicPage: {publishStatus: "published"}}, {claim: {state: "claimPending"},
    publicPage: {publishStatus: "published"}}, now);
  assert.deepEqual(pending, {claimRequestedAt: now});
  const claimed = organizerMilestones({ownership: {state: "programmatic"}},
    {ownership: {state: "claimed", claimedAt: at(4_000)}}, now);
  assert.deepEqual(claimed, {claimedAt: at(4_000)});
  assert.deepEqual(organizerMilestones({publicPage: {publishStatus:
    "published"}}, {publicPage: {publishStatus: "published"}}, now), {});
  assert.deepEqual(organizerMilestones({}, undefined, now), {});
});

test("checkout payments yield one paid booking and refund deltas", () => {
  const captured = {organizerId: "org", eventId: "ev", currency: "INR",
    amountPaise: 50_000, capturedAt: at(10_000), refundedAmountPaise: 0,
    providerFees: {feePaise: 1_180, taxPaise: 180}, updatedAt: at(10_000)};
  const facts = checkoutPaymentFacts("publicEventPayments", "pp_1",
    {capturedAt: null, refundedAmountPaise: 0}, captured);
  assert.equal(facts.length, 1);
  assert.deepEqual({...facts[0], occurredAt: facts[0].occurredAt.getTime()}, {
    source: "publicEventPayments", paymentId: "pp_1", eventId: "ev",
    currency: "INR", feeMinor: 1_180, taxMinor: 180, kind: "paid_booking",
    occurredAt: 10_000, amountMinor: 50_000});
  assert.deepEqual(checkoutPaymentFacts("publicEventPayments", "pp_1",
    captured, captured), []);
  const refund = checkoutPaymentFacts("publicEventPayments", "pp_1", captured,
    {...captured, refundedAmountPaise: 20_000, updatedAt: at(12_000)});
  assert.equal(refund.length, 1);
  assert.equal(refund[0].kind, "refund");
  assert.equal(refund[0].amountMinor, 20_000);
});

test("native payments yield a paid booking when completed", () => {
  const completed = {eventId: "ev", currency: "INR", amount: 30_000,
    amountMinor: 30_000, status: "completed", completedAt: at(7_000),
    providerFees: {feePaise: 708, taxPaise: 108}};
  const [paid] = nativePaymentFacts("pay_1", {status: "pending"}, completed);
  assert.equal(paid.kind, "paid_booking");
  assert.equal(paid.feeMinor, 708);
  assert.equal(paid.occurredAt.getTime(), 7_000);
  const [refund] = nativePaymentFacts("pay_1", completed,
    {...completed, status: "refunded"});
  assert.equal(refund.kind, "refund");
  assert.equal(refund.amountMinor, 30_000);
  assert.deepEqual(nativePaymentFacts("pay_1", completed, completed), []);
});

function fakeDb(rows: Map<string, Record<string, unknown>>) {
  return {
    collection: (name: string) => ({doc: (key: string) => ({
      path: `${name}/${key}`,
      get: async () => ({exists: rows.has(`${name}/${key}`),
        data: () => rows.get(`${name}/${key}`)}),
    })}),
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({
      get: async (ref: {path: string}) => ({exists: rows.has(ref.path),
        data: () => rows.get(ref.path)}),
      set: (ref: {path: string}, data: Record<string, unknown>) => {
        rows.set(ref.path, data);
      },
    }),
  } as unknown as Firestore;
}

function fakeBigQuery() {
  const inserted: Array<{table: string; insertId: string;
    json: Record<string, unknown>}> = [];
  const client: BigQueryClient = {
    query: async () => [],
    insertRows: async (_dataset, table, rows) => {
      for (const row of rows) inserted.push({table, ...row});
    },
  };
  return {client, inserted};
}

test("recording steps creates facts from provenance and streams them",
  async () => {
    const rows = new Map<string, Record<string, unknown>>([
      ["organizers/org", {locationMarketId: "mumbai",
        provenance: {origin: "userCreated"}}],
    ]);
    const bq = fakeBigQuery();
    const deps = {db: fakeDb(rows), bigQuery: bq.client,
      now: () => new Date(9_000)};
    assert.deepEqual(await recordOrganizerMilestones(deps, "org",
      {claimedAt: at(2_000)}), ["claimedAt"]);
    const facts = rows.get("organizerGrowthFacts/org");
    assert.equal(facts?.channel, "came_to_us");
    assert.equal(facts?.marketId, "mumbai");
    assert.deepEqual(bq.inserted.map((row) => row.insertId), ["org:claimed"]);
    assert.equal(bq.inserted[0].table, "organizer_growth_events");
    assert.equal(bq.inserted[0].json.occurred_at, "1970-01-01T00:00:02.000Z");
    // The same step again changes nothing and streams nothing.
    assert.deepEqual(await recordOrganizerMilestones(deps, "org",
      {claimedAt: at(3_000)}), []);
    assert.equal(bq.inserted.length, 1);
    // Steps for an organizer that does not exist are dropped.
    assert.deepEqual(await recordOrganizerMilestones(deps, "gone",
      {listedAt: at(1)}), []);
  });

test("a paid booking sets the first paid booking and streams the sale",
  async () => {
    const rows = new Map<string, Record<string, unknown>>([
      ["organizers/org", {provenance: {origin: "scraper"}}],
    ]);
    const bq = fakeBigQuery();
    const deps = {db: fakeDb(rows), bigQuery: bq.client,
      now: () => new Date(9_000)};
    await recordOrganizerPayment(deps, "org", {source: "publicEventPayments",
      paymentId: "pp_1", eventId: "ev", kind: "paid_booking",
      occurredAt: new Date(4_000), currency: "INR", amountMinor: 50_000,
      feeMinor: 1_180, taxMinor: 180});
    const facts = rows.get("organizerGrowthFacts/org") as {
      channel: string; milestones: {firstPaidBookingAt: Timestamp}};
    assert.equal(facts.channel, "imported");
    assert.equal(facts.milestones.firstPaidBookingAt.toMillis(), 4_000);
    assert.deepEqual(bq.inserted.map((row) => row.insertId),
      ["org:first_paid_booking", "publicEventPayments:pp_1:captured"]);
    assert.equal(bq.inserted[1].json.provider_fee_minor, 1_180);
    assert.equal(bq.inserted[1].json.amount_minor, 50_000);
  });

test("a failed BigQuery insert never fails the step", async () => {
  const rows = new Map<string, Record<string, unknown>>([
    ["organizers/org", {}],
  ]);
  const failing: BigQueryClient = {query: async () => [],
    insertRows: async () => {
      throw new Error("table missing");
    }};
  assert.deepEqual(await recordOrganizerMilestones({db: fakeDb(rows),
    bigQuery: failing}, "org", {listedAt: at(5)}), ["listedAt"]);
  assert.ok(rows.has("organizerGrowthFacts/org"));
});
