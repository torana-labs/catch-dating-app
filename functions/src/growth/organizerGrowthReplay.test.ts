import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {BigQueryClient} from "../shared/bigQuery";
import type {OrganizerGrowthFactsDocument} from
  "../shared/generated/firestoreAdminTypes";
import {
  milestoneEvent,
  newGrowthFacts,
  paymentEvent,
  provenanceChannel,
} from "./organizerGrowthFacts";
import {reconcileOrganizerGrowthDaily} from "./organizerGrowthReconcile";
import {
  createGrowthEventsTableSql,
  ensureGrowthEventsTable,
  missingGrowthRows,
  type ReplaySources,
  sendMissingRows,
} from "./organizerGrowthReplay";
import {
  checkoutPaymentFacts,
  nativePaymentFacts,
} from "./organizerGrowthTriggers";

const hour = 60 * 60 * 1000;
const nowMs = 1_000 * hour;
const now = new Date(nowMs);
const at = (ms: number) => Timestamp.fromMillis(ms);
const old = at(nowMs - 2 * hour);
const justNow = at(nowMs - hour / 2);

function facts(organizerId: string, updatedAt = old):
  OrganizerGrowthFactsDocument {
  const base = newGrowthFacts(organizerId, null, provenanceChannel({}), old);
  return {...base, updatedAt, firstEventId: "ev",
    milestones: {...base.milestones, listedAt: at(1_000), claimedAt: at(2_000),
      firstEventAt: at(3_000)}};
}

const captured = {organizerId: "org", eventId: "ev", currency: "INR",
  amountPaise: 50_000, capturedAt: at(4_000), refundedAmountPaise: 0,
  providerFees: {feePaise: 1_180, taxPaise: 180}, updatedAt: old};
const completed = {eventId: "ev", currency: "INR", amount: 30_000,
  amountMinor: 30_000, status: "refunded", completedAt: at(5_000),
  updatedAt: old};

function everySource(): ReplaySources {
  return {
    facts: [facts("org")],
    checkouts: [
      {source: "publicEventPayments", id: "pp_1",
        data: {...captured, refundedAmountPaise: 20_000}},
      {source: "organizerEventOfferPayments", id: "of_1", data: captured},
      {source: "organizerFormPayments", id: "fm_1",
        data: {...captured, eventId: undefined, refundedAmountPaise: 50_000}},
    ],
    nativePayments: [{id: "pay_1", organizerId: "org", data: completed}],
  };
}

/** A table that answers the replay's read from the rows it holds. */
function fakeTable(seed: Array<Record<string, unknown>> = []) {
  const rows = [...seed];
  const calls = {inserts: 0};
  const client: BigQueryClient = {
    query: async <T>() => {
      const known = new Map(rows.map((row) => [row.growth_event_id,
        row.amount_minor === null || row.amount_minor === undefined ? null :
          String(row.amount_minor)]));
      return [...known].map(([id, amount]) =>
        ({growth_event_id: id, amount_minor: amount})) as T[];
    },
    insertRows: async (_dataset, _table, batch) => {
      calls.inserts++;
      for (const row of batch) {
        assert.equal(row.insertId, row.json.growth_event_id);
        rows.push(row.json);
      }
    },
  };
  return {client, rows, calls};
}

const idsOf = (rows: Array<Record<string, unknown>>) =>
  rows.map((row) => String(row.growth_event_id));
const assertNoDuplicates = (rows: Array<Record<string, unknown>>) =>
  assert.equal(new Set(idsOf(rows)).size, rows.length,
    `duplicate ids in ${idsOf(rows).join(", ")}`);
const send = (client: BigQueryClient, sources = everySource(), when = now) =>
  sendMissingRows(client, async () => sources, when);

test("the replay sends every missing row once, and nothing on later runs",
  async () => {
    const table = fakeTable();
    const first = await send(table.client);
    assert.deepEqual(idsOf(table.rows).sort(), [
      "org:claimed", "org:first_event", "org:listed",
      "organizerEventOfferPayments:of_1:captured",
      "organizerFormPayments:fm_1:captured",
      "organizerFormPayments:fm_1:refund:50000",
      "payments:pay_1:captured", "payments:pay_1:refund:30000",
      "publicEventPayments:pp_1:captured",
      "publicEventPayments:pp_1:refund:20000",
    ].sort());
    assert.equal(first?.sent, 10);
    for (let run = 0; run < 5; run++) {
      const again = await send(table.client);
      assert.deepEqual(again, {known: 10, missing: 0, sent: 0});
    }
    assert.equal(table.calls.inserts, 1);
    assertNoDuplicates(table.rows);
  });

test("a row the live path sent is never sent again", async () => {
  // These are the rows the triggers stream, built the way they build them.
  const live = facts("org");
  const sources = everySource();
  const rows: Array<Record<string, unknown>> = [
    milestoneEvent(live, "listedAt", now),
    milestoneEvent(live, "claimedAt", now),
    milestoneEvent(live, "firstEventAt", now),
  ] as unknown as Array<Record<string, unknown>>;
  const before = {...captured};
  const liveFacts = [
    ...checkoutPaymentFacts("publicEventPayments", "pp_1", undefined,
      before),
    ...checkoutPaymentFacts("publicEventPayments", "pp_1", before,
      {...before, refundedAmountPaise: 20_000}),
    ...checkoutPaymentFacts("organizerEventOfferPayments", "of_1", undefined,
      captured),
    ...checkoutPaymentFacts("organizerFormPayments", "fm_1", undefined,
      {...captured, eventId: undefined, refundedAmountPaise: 50_000}),
    ...nativePaymentFacts("pay_1", {status: "pending"},
      {...completed, status: "completed"}),
    ...nativePaymentFacts("pay_1", {status: "completed"}, completed),
  ];
  rows.push(...liveFacts.map((fact) => paymentEvent(live, fact, now)) as
    unknown as Array<Record<string, unknown>>);
  const table = fakeTable(rows);
  assert.deepEqual(await send(table.client, sources),
    {known: 10, missing: 0, sent: 0});
  assert.equal(table.calls.inserts, 0);
});

test("nothing is sent when BigQuery or Firestore can't be read", async () => {
  const table = fakeTable();
  const blind: BigQueryClient = {...table.client, query: async () => {
    throw new Error("BigQuery query did not finish.");
  }};
  assert.equal(await send(blind), null);
  assert.equal(await sendMissingRows(table.client, async () => {
    throw new Error("Firestore is down");
  }, now), null);
  assert.equal(table.calls.inserts, 0);
});

test("a record written in the last hour waits for the next run", async () => {
  const table = fakeTable();
  const sources: ReplaySources = {
    facts: [facts("org", justNow)],
    checkouts: [{source: "publicEventPayments", id: "pp_1",
      data: {...captured, updatedAt: justNow}}],
    nativePayments: [{id: "pay_1", organizerId: "org",
      data: {...completed, updatedAt: justNow}}],
  };
  assert.deepEqual(await send(table.client, sources),
    {known: 0, missing: 0, sent: 0});
  await send(table.client, sources, new Date(nowMs + hour));
  assert.equal(table.rows.length, 6);
  assertNoDuplicates(table.rows);
});

test("a failed batch is left for the next run, which sends only that",
  async () => {
    const organizers = Array.from({length: 400}, (_, index) =>
      facts(`org${index}`));
    const sources: ReplaySources =
      {facts: organizers, checkouts: [], nativePayments: []};
    const table = fakeTable();
    let calls = 0;
    const flaky: BigQueryClient = {...table.client,
      insertRows: async (dataset, name, batch) => {
        if (++calls === 2) throw new Error("503");
        await table.client.insertRows(dataset, name, batch);
      }};
    assert.deepEqual(await send(flaky, sources),
      {known: 0, missing: 1_200, sent: 700});
    assert.deepEqual(await send(table.client, sources),
      {known: 700, missing: 500, sent: 500});
    assert.equal(table.rows.length, 1_200);
    assertNoDuplicates(table.rows);
  });

test("an insert that landed but reported failure is not sent again",
  async () => {
    const table = fakeTable();
    const lostAnswer: BigQueryClient = {...table.client,
      insertRows: async (dataset, name, batch) => {
        await table.client.insertRows(dataset, name, batch);
        throw new Error("socket hang up");
      }};
    assert.equal((await send(lostAnswer))?.sent, 0);
    assert.equal((await send(table.client))?.sent, 0);
    assert.equal(table.rows.length, 10);
    assertNoDuplicates(table.rows);
  });

test("a lost partial refund is made up, and a refund never counts past its " +
  "total", async () => {
  const live = facts("org");
  const [later] = checkoutPaymentFacts("publicEventPayments", "pp_1",
    {...captured, refundedAmountPaise: 10_000},
    {...captured, refundedAmountPaise: 25_000});
  // The 10,000 refund's row was lost; the 15,000 one after it landed.
  const table = fakeTable([{
    ...paymentEvent(live, later, now)} as unknown as Record<string, unknown>]);
  const sources: ReplaySources = {facts: [live], nativePayments: [],
    checkouts: [{source: "publicEventPayments", id: "pp_1",
      data: {...captured, refundedAmountPaise: 25_000}}]};
  const refunds = () => table.rows.filter((row) =>
    row.event_name === "refund");
  await send(table.client, sources);
  assert.deepEqual(refunds().map((row) => row.growth_event_id), [
    "publicEventPayments:pp_1:refund:25000",
    "publicEventPayments:pp_1:refund:25000:rest:10000"]);
  assert.equal(refunds().reduce((sum, row) =>
    sum + Number(row.amount_minor), 0), 25_000);
  await send(table.client, sources);
  await send(table.client, sources);
  assert.equal(refunds().length, 2);
  assertNoDuplicates(table.rows);
});

test("form payments keep their own names and never count as bookings", () => {
  const rows = missingGrowthRows({facts: [facts("org")], nativePayments: [],
    checkouts: [{source: "organizerFormPayments", id: "fm_1",
      data: {...captured, eventId: undefined, refundedAmountPaise: 5_000}}]},
  new Map(), now).filter((row) => row.payment_source);
  assert.deepEqual(rows.map((row) => row.event_name),
    ["form_payment", "form_refund"]);
  assert.equal(rows[0].provider_fee_minor, 1_180);
  assert.equal(rows[0].booking_event_id, null);
});

test("a payment without growth facts sends nothing", () => {
  assert.deepEqual(missingGrowthRows({facts: [], nativePayments:
    [{id: "pay_1", organizerId: null, data: completed}], checkouts:
    [{source: "publicEventPayments", id: "pp_1", data: captured}]},
  new Map(), now), []);
});

test("the schedule allows one run at a time", () => {
  const endpoint = (reconcileOrganizerGrowthDaily as unknown as {
    __endpoint: {concurrency?: number; maxInstances?: number};
  }).__endpoint;
  assert.equal(endpoint.maxInstances, 1);
  assert.equal(endpoint.concurrency, 1);
});

test("creating the table failing is logged, not thrown", async () => {
  const failing: BigQueryClient = {insertRows: async () => undefined,
    query: async () => {
      throw new Error("Access denied");
    }};
  assert.equal(await ensureGrowthEventsTable({db: {} as never,
    bigQuery: failing}), false);
});

test("the table the job creates matches the DDL file and the contract", () => {
  const root = path.resolve(__dirname, "../../..");
  const normal = (sql: string) => sql.replace(/\s+/gu, " ").trim();
  const ddl = readFileSync(path.join(root,
    "analytics/sql/ddl/organizer_growth_events.sql"), "utf8");
  const statement = ddl.split("\"\"\"")[1];
  const created = createGrowthEventsTableSql("%s.%s",
    "organizer_growth_events");
  assert.equal(normal(created), normal(statement));
  const contract = JSON.parse(readFileSync(path.join(root,
    "contracts/bigquery/organizer_growth_event.schema.json"), "utf8")) as
    {properties: Record<string, unknown>};
  const columns = [...created.matchAll(/^ {2}([a-z_]+) [A-Z0-9]+/gmu)]
    .map((match) => match[1]);
  assert.deepEqual(columns.sort(), Object.keys(contract.properties).sort());
});
