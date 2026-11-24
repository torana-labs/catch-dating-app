/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import {FakeFirestore} from "../../operations/testFirestore";
import {contractValidator} from "../../shared/contractTestValidators";
import {
  AI_FALLBACK_POLICY,
  readyAiFallbackPolicy,
  type ReadyAiFallbackPolicy,
} from "./policy";
import {readerDayDocId} from "./ledger";
import {
  packagedModelModules,
  runAiFallback,
  type AiFallbackDeps,
  type AiFallbackRequest,
} from "./runner";
import {aiFallbackGuestMappingRunner, GUEST_MAPPING_OUTPUT_SCHEMA} from "../../guestImport/mappingFallback";

// Every header and value below is fictional; no real provider is called.

const NOW = new Date("2026-11-20T10:00:00.000Z");
const READY: ReadyAiFallbackPolicy = {...AI_FALLBACK_POLICY, enabled: true,
  decisionId: "issue-2062-comment-7045984815",
  privacyNoticeRef: "website-legal-ai-reading-2231"};

const validate = {
  usage: contractValidator("AiFallbackUsageDocument"),
  results: contractValidator("AiFallbackResultDocument"),
  audit: contractValidator("AiFallbackAuditDocument"),
};

const stamp = (millis: number) => ({_seconds: Math.floor(millis / 1000), _nanoseconds: 0});

function valid(validator: ReturnType<typeof contractValidator>, value: unknown, label: string) {
  assert.equal(validator(value), true, `${label}: ${JSON.stringify(validator.errors)}`);
}

const output = {mapping: {displayName: 0}, confidence: 0.7};

function wire(overrides: Record<string, unknown> = {}) {
  return {id: "msg_fixture_1", type: "message", model: "claude-haiku-5-5", role: "assistant",
    stop_reason: "end_turn", stop_details: null, stop_sequence: null,
    content: [{type: "text", text: JSON.stringify(output)}],
    usage: {input_tokens: 300, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, output_tokens: 40},
    ...overrides};
}

function harness(options: {policy?: ReadyAiFallbackPolicy | null; status?: number} = {}) {
  const db = new FakeFirestore();
  const calls: Array<{url: string; headers: Record<string, string>; body: Record<string, unknown>}> = [];
  let tokens = 0;
  const deps: AiFallbackDeps = {
    db: db as unknown as FirebaseFirestore.Firestore,
    now: () => NOW,
    // Timestamps in the stored shape the Firestore contracts describe.
    serverTimestamp: () => stamp(NOW.getTime()) as unknown as FirebaseFirestore.FieldValue,
    timestampFromMillis: (millis) => stamp(millis) as unknown as FirebaseFirestore.Timestamp,
    policy: async () => options.policy === undefined ? READY : options.policy,
    modules: packagedModelModules,
    accessToken: async () => {
      tokens++;
      return "fixture-federation-token";
    },
    transport: (async (url: string, init: {headers: Record<string, string>; body: string}) => {
      calls.push({url, headers: init.headers, body: JSON.parse(init.body)});
      return new Response(JSON.stringify(wire()), {status: options.status ?? 200});
    }) as unknown as typeof fetch,
  };
  return {db, deps, calls, tokens: () => tokens};
}

function request(overrides: Partial<AiFallbackRequest> = {}): AiFallbackRequest {
  return {uid: "visitor-1", commandId: "guests.import-list", task: "guest-column-mapping",
    promptVersion: "guest-column-mapping-v1", prompt: "Map fictional columns.",
    input: {headers: ["Attendee", "Seat"], columnShapes: ["text", "text"]},
    inputSchema: {type: "object", additionalProperties: false, required: ["headers", "columnShapes"],
      properties: {headers: {type: "array", items: {type: "string"}}, columnShapes: {type: "array", items: {type: "string"}}}},
    outputSchema: GUEST_MAPPING_OUTPUT_SCHEMA, maxOutputTokens: 200, maxCostMicros: 100_000, ...overrides};
}

const monthOf = (db: FakeFirestore) => db.read("aiFallbackUsage/2026-11") as Record<string, number>;
const inCollection = (db: FakeFirestore, collection: string) => db.entries()
  .filter(([path]) => path.startsWith(`${collection}/`)).map(([, data]) => data as Record<string, unknown>);
const auditRows = (db: FakeFirestore) => inCollection(db, "aiFallbackAudit");

test("the policy is off in code, and switching on needs the decision and the published privacy line", () => {
  assert.equal(AI_FALLBACK_POLICY.enabled, false);
  assert.equal(AI_FALLBACK_POLICY.privacyNoticeRef, null);
  assert.equal(AI_FALLBACK_POLICY.monthlyCapMicros, 50_000_000);
  assert.equal(AI_FALLBACK_POLICY.perUidDailyReads, 5);
  assert.equal(readyAiFallbackPolicy(), null);
  assert.throws(() => readyAiFallbackPolicy({...AI_FALLBACK_POLICY, enabled: true}), /ai_fallback_policy_not_ready/u);
  assert.throws(() => readyAiFallbackPolicy({...READY, decisionId: null}), /ai_fallback_policy_not_ready/u);
  assert.deepEqual(readyAiFallbackPolicy(READY), READY);
  // The no-deploy override changes the numbers or switches off, never on.
  assert.equal(readyAiFallbackPolicy(READY, {disabled: true}), null);
  assert.equal(readyAiFallbackPolicy(AI_FALLBACK_POLICY, {monthlyCapMicros: 1}), null);
  assert.equal(readyAiFallbackPolicy(READY, {monthlyCapMicros: 80_000_000})?.monthlyCapMicros, 80_000_000);
  assert.throws(() => readyAiFallbackPolicy(READY, {monthlyCapMicros: 5_000_000_000}), /ai_fallback_policy_not_ready/u);
  assert.throws(() => readyAiFallbackPolicy(READY, {perUidDailyReads: 0}), /ai_fallback_policy_not_ready/u);
});

test("while off, nothing loads, reserves or calls", async () => {
  const {db, deps, calls} = harness({policy: null});
  let loaded = false;
  const result = await runAiFallback(request(), {...deps, modules: async () => {
    loaded = true;
    return packagedModelModules();
  }});
  assert.deepEqual(result, {status: "off"});
  assert.equal(loaded, false);
  assert.equal(calls.length, 0);
  assert.equal(inCollection(db, "aiFallbackUsage").length, 0);
});

test("a paid read uses the federation token, settles priced cost, counts the read and audits counts only", async () => {
  const {db, deps, calls, tokens} = harness();
  const result = await runAiFallback(request(), deps);
  assert.deepEqual(result, {status: "read", output, cacheHit: false});
  assert.equal(calls.length, 1);
  assert.equal(tokens(), 1);
  assert.equal(calls[0].url, "https://api.anthropic.com/v1/messages");
  assert.equal(calls[0].headers.Authorization, "Bearer fixture-federation-token");
  assert.equal(calls[0].headers["x-api-key"], undefined);
  assert.equal(calls[0].body.model, "claude-haiku-5-5");
  const month = monthOf(db);
  valid(validate.usage, month, "month");
  // 300 input tokens at $0.10/M and 40 output at $0.50/M = 30 + 20 micros.
  assert.equal(month.spentMicros, 50);
  assert.equal(month.reservedMicros, 0);
  assert.equal(month.paidReads, 1);
  const day = db.read(`aiFallbackUsage/${readerDayDocId("visitor-1", NOW)}`) as Record<string, unknown>;
  valid(validate.usage, day, "reader day");
  assert.equal(day.reads, 1);
  assert.equal(JSON.stringify(day).includes("visitor-1"), false);
  const [row] = auditRows(db);
  valid(validate.audit, row, "audit");
  assert.deepEqual({...row, createdAt: null}, {schemaVersion: 1, commandId: "guests.import-list",
    task: "guest-column-mapping", outcome: "paid", inputTokens: 300, outputTokens: 40, costMicros: 50,
    monthKey: "2026-11", createdAt: null});
  const [cached] = inCollection(db, "aiFallbackResults");
  valid(validate.results, cached, "result cache");
});

test("apply after preview replays the cached read: no second call, read or charge", async () => {
  const {db, deps, calls} = harness();
  await runAiFallback(request(), deps);
  const again = await runAiFallback(request(), deps);
  assert.deepEqual(again, {status: "read", output, cacheHit: true});
  assert.equal(calls.length, 1);
  assert.equal(monthOf(db).spentMicros, 50);
  assert.equal((db.read(`aiFallbackUsage/${readerDayDocId("visitor-1", NOW)}`) as {reads: number}).reads, 1);
  assert.equal(auditRows(db).length, 1);
});

test("the visitor's daily reads and the monthly cap refuse before any call", async () => {
  const daily = harness({policy: {...READY, perUidDailyReads: 1}});
  await runAiFallback(request(), daily.deps);
  const second = await runAiFallback(request({input: {headers: ["Guest", "Table"], columnShapes: ["text", "text"]}}), daily.deps);
  assert.deepEqual(second, {status: "refused", reason: "ai_daily_limit"});
  assert.equal(daily.calls.length, 1);

  const capped = harness({policy: {...READY, monthlyCapMicros: 10}});
  assert.deepEqual(await runAiFallback(request(), capped.deps), {status: "refused", reason: "ai_cap_reached"});
  assert.equal(capped.calls.length, 0);
  assert.equal(auditRows(capped.db)[0].outcome, "refused");
});

test("a failed call that may have been billed keeps its whole reservation", async () => {
  const {db, deps, calls} = harness({status: 500});
  assert.deepEqual(await runAiFallback(request(), deps), {status: "refused", reason: "ai_unreadable"});
  assert.equal(calls.length, 1);
  const month = monthOf(db);
  assert.equal(month.reservedMicros, 0);
  assert.ok(month.spentMicros > 50, "the worst case stays charged");
  assert.equal(month.paidReads, 0);
  assert.equal(auditRows(db)[0].outcome, "failed");
});

test("a read above the caller's per-call ceiling refuses without reserving", async () => {
  const {db, deps, calls} = harness();
  assert.deepEqual(await runAiFallback(request({maxCostMicros: 10}), deps), {status: "refused", reason: "ai_unreadable"});
  assert.equal(calls.length, 0);
  assert.equal(inCollection(db, "aiFallbackUsage").length, 0);
});

test("the guest mapping runner reads through the shared fallback and fails closed while it is off", async () => {
  const on = harness();
  const runner = aiFallbackGuestMappingRunner({uid: "visitor-1", commandId: "guests.import-list", deps: () => on.deps});
  const result = await runner.run({task: "guest-column-mapping", promptVersion: "guest-column-mapping-v1",
    input: {headers: ["Attendee", "Seat"], columnShapes: ["text", "text"]}, outputSchema: GUEST_MAPPING_OUTPUT_SCHEMA,
    estimatedInputTokens: 100, maxOutputTokens: 200, maxCostMicros: 100_000, maxNetworkRequests: 1});
  assert.deepEqual(result, {output});
  assert.deepEqual(JSON.parse(on.calls[0].body.messages ? (on.calls[0].body.messages as Array<{content: string}>)[0].content : "{}"),
    {headers: ["Attendee", "Seat"], columnShapes: ["text", "text"]});

  const off = harness({policy: null});
  const offRunner = aiFallbackGuestMappingRunner({uid: "visitor-1", commandId: "guests.import-list", deps: () => off.deps});
  await assert.rejects(offRunner.run({task: "guest-column-mapping", promptVersion: "guest-column-mapping-v1",
    input: {headers: ["Attendee"], columnShapes: ["text"]}, outputSchema: GUEST_MAPPING_OUTPUT_SCHEMA,
    estimatedInputTokens: 100, maxOutputTokens: 200, maxCostMicros: 100_000, maxNetworkRequests: 1}), /ai_fallback_off/u);
});
