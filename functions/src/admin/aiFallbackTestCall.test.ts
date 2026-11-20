/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {FakeFirestore} from "../operations/testFirestore";
import {contractValidator} from "../shared/contractTestValidators";
import {AI_FALLBACK_POLICY} from "../commands/aiFallback/policy";
import {packagedModelModules, type AiFallbackDeps} from "../commands/aiFallback/runner";
import {
  adminAiFallbackTestCallHandler,
  AI_FALLBACK_TEST_COMMAND_ID,
  type AiFallbackTestDeps,
} from "./aiFallbackTestCall";

// Every header and value below is fictional; no real provider is called.

const NOW = new Date("2026-11-20T10:00:00.000Z");
const stamp = (millis: number) => ({_seconds: Math.floor(millis / 1000), _nanoseconds: 0});
const validateResponse = contractValidator("AdminAiFallbackTestCallCallableResponse");
const validateAudit = contractValidator("AiFallbackAuditDocument");

function wire() {
  return {id: "msg_fixture_test", type: "message", model: "claude-opus-5-5", role: "assistant",
    stop_reason: "end_turn", stop_details: null, stop_sequence: null,
    content: [{type: "text", text: JSON.stringify({mapping: {displayName: 0, phone: 1}, confidence: 0.9})}],
    usage: {input_tokens: 320, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, output_tokens: 30}};
}

function harness(options: {federation?: boolean; tokenError?: Error; status?: number; body?: unknown} = {}) {
  const db = new FakeFirestore();
  const calls: Array<{headers: Record<string, string>; body: Record<string, unknown>}> = [];
  let policyRead = false;
  const read: AiFallbackDeps = {
    db: db as unknown as FirebaseFirestore.Firestore,
    now: () => NOW,
    serverTimestamp: () => stamp(NOW.getTime()) as unknown as FirebaseFirestore.FieldValue,
    timestampFromMillis: (millis) => stamp(millis) as unknown as FirebaseFirestore.Timestamp,
    // The visitor policy stays off; the test call must not consult it.
    policy: async () => {
      policyRead = true;
      return null;
    },
    modules: packagedModelModules,
    accessToken: async () => {
      throw new Error("the test call passes its own exchanged token");
    },
    transport: (async (_url: string, init: {headers: Record<string, string>; body: string}) => {
      calls.push({headers: init.headers, body: JSON.parse(init.body)});
      return new Response(JSON.stringify(options.body ?? wire()), {status: options.status ?? 200});
    }) as unknown as typeof fetch,
  };
  let clock = NOW.getTime();
  const deps: AiFallbackTestDeps = {
    read: () => read,
    federation: () => options.federation === false ? null :
      {federationRuleId: "fdrl_fixture", organizationId: "00000000-0000-4000-8000-000000000000"},
    accessToken: async () => {
      if (options.tokenError) throw options.tokenError;
      return "fixture-federation-token";
    },
    nowMillis: () => (clock += 5),
  };
  return {db, deps, calls, policyRead: () => policyRead};
}

function call(data: Record<string, unknown> = {}, token: Record<string, unknown> = {adminOwner: true}) {
  return {data, auth: {uid: "admin-fixture", token}} as unknown as CallableRequest<unknown>;
}

const auditRows = (db: FakeFirestore) => db.entries().filter(([path]) => path.startsWith("aiFallbackAudit/"))
  .map(([, data]) => data as Record<string, unknown>);

test("one live test call uses the Bearer federation token, ignores the visitor switch, charges the cap and audits a test row", async () => {
  assert.equal(AI_FALLBACK_POLICY.enabled, false);
  const {db, deps, calls, policyRead} = harness();
  const result = await adminAiFallbackTestCallHandler(call(), deps);
  assert.equal(validateResponse(result), true, JSON.stringify(validateResponse.errors));
  assert.equal(result.ok, true);
  assert.equal(result.failedStep, null);
  assert.equal(result.modelId, "claude-opus-5-5");
  assert.equal(result.inputTokens, 320);
  assert.equal(result.outputTokens, 30);
  assert.ok(result.costMicros > 0);
  assert.equal(policyRead(), false);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].headers.Authorization, "Bearer fixture-federation-token");
  assert.equal(calls[0].headers["x-api-key"] ?? calls[0].headers["X-Api-Key"], undefined);
  // Headers and shapes only: no value of any guest reaches the model.
  assert.match(JSON.stringify(calls[0].body), /Mobile/u);
  const month = db.read("aiFallbackUsage/2026-11") as Record<string, number>;
  assert.equal(month.spentMicros, result.costMicros);
  const rows = auditRows(db);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].test, true);
  assert.equal(rows[0].commandId, AI_FALLBACK_TEST_COMMAND_ID);
  assert.equal(rows[0].outcome, "paid");
  assert.equal(validateAudit(rows[0]), true, JSON.stringify(validateAudit.errors));
  assert.doesNotMatch(JSON.stringify(result), /fixture-federation-token/u);
});

test("every test is a real call: a second test is not served from a cache", async () => {
  const {deps, calls} = harness();
  await adminAiFallbackTestCallHandler(call(), deps);
  await adminAiFallbackTestCallHandler(call(), deps);
  assert.equal(calls.length, 2);
});

test("a sixth paid test on the same day is refused at the budget step before any call", async () => {
  const {deps, calls} = harness();
  for (let index = 0; index < 5; index++) {
    assert.equal((await adminAiFallbackTestCallHandler(call(), deps)).ok, true);
  }
  const sixth = await adminAiFallbackTestCallHandler(call(), deps);
  assert.equal(sixth.ok, false);
  assert.equal(sixth.failedStep, "budget");
  assert.equal(sixth.refusal, "ai_daily_limit");
  assert.equal(calls.length, 5);
});

test("without the federation params it refuses at the config step and calls nothing", async () => {
  const {db, deps, calls} = harness({federation: false});
  const result = await adminAiFallbackTestCallHandler(call(), deps);
  assert.equal(result.ok, false);
  assert.equal(result.failedStep, "config");
  assert.equal(calls.length, 0);
  assert.equal(db.entries().length, 0);
  assert.equal(validateResponse(result), true, JSON.stringify(validateResponse.errors));
});

test("a refused exchange names the step and the status, and spends nothing", async () => {
  const {db, deps, calls} = harness({tokenError: new Error("Assistant token exchange failed (status 401, authentication_error)")});
  const result = await adminAiFallbackTestCallHandler(call(), deps);
  assert.equal(result.failedStep, "token_exchange");
  assert.equal(result.httpStatus, 401);
  assert.equal(calls.length, 0);
  assert.equal(db.entries().length, 0);
  const mint = await adminAiFallbackTestCallHandler(call(), harness({tokenError: new Error("Assistant identity token request failed (status 404)")}).deps);
  assert.equal(mint.failedStep, "token_mint");
  assert.equal(mint.httpStatus, 404);
});

test("dryRun stops after the token exchange", async () => {
  const {db, deps, calls} = harness();
  const result = await adminAiFallbackTestCallHandler(call({dryRun: true}), deps);
  assert.equal(result.ok, true);
  assert.equal(result.dryRun, true);
  assert.equal(result.costMicros, 0);
  assert.equal(calls.length, 0);
  assert.equal(db.entries().length, 0);
});

test("a Messages call the provider rejects reports its HTTP status at the messages_call step", async () => {
  const {deps} = harness({status: 401, body: {type: "error"}});
  const result = await adminAiFallbackTestCallHandler(call(), deps);
  assert.equal(result.ok, false);
  assert.equal(result.failedStep, "messages_call");
  assert.equal(result.httpStatus, 401);
});

test("an answer outside the output schema reports the schema step", async () => {
  const bad = {...wire(), content: [{type: "text", text: JSON.stringify({mapping: "column A"})}]};
  const result = await adminAiFallbackTestCallHandler(call(), harness({body: bad}).deps);
  assert.equal(result.failedStep, "schema");
});

test("only the admin owner roles may run it", async () => {
  const {deps} = harness();
  await assert.rejects(adminAiFallbackTestCallHandler(call({}, {support: true}), deps), /not authorized/u);
  await assert.rejects(adminAiFallbackTestCallHandler(call({unexpected: 1}), deps));
});
