/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import {FakeFirestore} from "../../shared/testing/programFirestore";
import {ANTHROPIC_MESSAGES_URL, createAnthropicProvider} from "./provider";
import {
  ANTHROPIC_TOKEN_URL,
  GOOGLE_IDENTITY_URL,
  TOKEN_REFRESH_MARGIN_MS,
  createAnthropicTokenSource,
  parseFederationConfig,
} from "../../platform/anthropicIdentity";
import {buildRequestBody} from "./prompt";
import {completeRun, normalizeDailyTokenBudget, remainingTokens, reserveRun} from "./budget";
import {assistantRunId, budgetDay, type ProgramAssistantRun} from "./runs";
import {contractValidator} from "../../shared/contractTestValidators";

const validateRun = contractValidator("ProgramAssistantRunDocument");
const validateBudget = contractValidator("ProgramAssistantBudgetDocument");

const body = buildRequestBody({language: "en", tone: "warm", factText: "Wedding: X",
  history: [{direction: "inbound", text: "When is the haldi?"}]});

function reply(status: number, json: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(json), {status, headers});
}

const ok = {content: [{type: "thinking", thinking: ""},
  {type: "text", text: "{\"action\":\"answer\",\"text\":\"10 AM\"}"}],
stop_reason: "end_turn", usage: {input_tokens: 900, output_tokens: 40,
  cache_read_input_tokens: 100}};

test("the provider posts the pinned model with the bearer token and reads the text block", async () => {
  const calls: Array<{url: string; init: RequestInit}> = [];
  const provider = createAnthropicProvider({accessToken: "sk-ant-oat01-test", fetch: async (url, init) => {
    calls.push({url: String(url), init: init!});
    return reply(200, ok);
  }});
  const result = await provider.complete(body);
  assert.deepEqual(result, {ok: true, text: "{\"action\":\"answer\",\"text\":\"10 AM\"}",
    inputTokens: 1000, outputTokens: 40, attempts: 1, status: 200});
  assert.equal(calls[0].url, ANTHROPIC_MESSAGES_URL);
  const headers = calls[0].init.headers as Record<string, string>;
  assert.equal(headers.authorization, "Bearer sk-ant-oat01-test");
  assert.equal(headers["x-api-key"], undefined);
  assert.equal(headers["anthropic-version"], "2023-06-01");
  assert.equal(headers["anthropic-beta"], "oauth-2025-04-20");
  const sent = JSON.parse(String(calls[0].init.body));
  assert.equal(sent.model, "claude-sonnet-5-5");
  assert.equal(sent.max_tokens, 1200);
});

test("429 and 5xx retry once, honouring retry-after; a second failure gives up", async () => {
  const slept: number[] = [];
  let n = 0;
  const flaky = createAnthropicProvider({accessToken: "t", sleep: async (ms) => {
    slept.push(ms);
  }, fetch: async () => (++n === 1 ? reply(429, {}, {"retry-after": "2"}) : reply(200, ok))});
  const first = await flaky.complete(body);
  assert.equal(first.ok, true);
  assert.equal(first.attempts, 2);
  assert.deepEqual(slept, [2000]);
  const down = createAnthropicProvider({accessToken: "t", sleep: async () => undefined,
    fetch: async () => reply(529, {})});
  assert.deepEqual(await down.complete(body), {ok: false, failure: "unavailable",
    attempts: 2, status: 529, billedUncertain: false, inputTokens: 0, outputTokens: 0});
});

test("timeouts never retry and count as possibly billed; 4xx and refusals do not retry", async () => {
  let calls = 0;
  const hung = createAnthropicProvider({accessToken: "t", fetch: async () => {
    calls++;
    throw new DOMException("timed out", "TimeoutError");
  }});
  const timeout = await hung.complete(body);
  assert.equal(calls, 1);
  assert.equal(timeout.ok, false);
  assert.equal(!timeout.ok && timeout.failure, "timeout");
  assert.equal(!timeout.ok && timeout.billedUncertain, true);
  const bad = createAnthropicProvider({accessToken: "t", fetch: async () => reply(401, {})});
  const rejected = await bad.complete(body);
  assert.equal(!rejected.ok && rejected.failure, "rejected");
  assert.equal(rejected.attempts, 1);
  const refusing = createAnthropicProvider({accessToken: "t", fetch: async () =>
    reply(200, {content: [], stop_reason: "refusal", usage: {input_tokens: 5, output_tokens: 0}})});
  const refused = await refusing.complete(body);
  assert.equal(!refused.ok && refused.failure, "refused");
  const truncated = createAnthropicProvider({accessToken: "t", fetch: async () =>
    reply(200, {...ok, stop_reason: "max_tokens"})});
  assert.equal((await truncated.complete(body)).ok, false);
});

test("only a well-formed federation rule id and organization UUID switch federation on", () => {
  const organization = "0e1d2c3b-4a59-4687-9a1b-2c3d4e5f6a7b";
  assert.deepEqual(parseFederationConfig(" fdrl_01AbCdEf ", organization.toUpperCase()),
    {federationRuleId: "fdrl_01AbCdEf", organizationId: organization.toUpperCase()});
  assert.equal(parseFederationConfig("", organization), null);
  assert.equal(parseFederationConfig("fdrl_01AbCdEf", ""), null);
  for (const bad of ["fdrl_", "fdis_01AbCdEf", "fdrl_01-Ab", "01AbCdEf"]) {
    assert.equal(parseFederationConfig(bad, organization), null);
  }
  assert.equal(parseFederationConfig("fdrl_01AbCdEf", "not-a-uuid"), null);
});

const RULE = "fdrl_01AbCdEf";
const ORG = "0e1d2c3b-4a59-4687-9a1b-2c3d4e5f6a7b";
const SECRET_TOKEN = "sk-ant-oat01-very-secret";

/** A fake metadata server and token endpoint; each identity fetch mints a new JWT. */
function federationFake(exchange: (call: number) => Response | Promise<Response> =
() => reply(200, {access_token: SECRET_TOKEN, token_type: "Bearer", expires_in: 3600,
  scope: "workspace:inference"})) {
  const calls: Array<{url: string; init: RequestInit}> = [];
  let identities = 0;
  let exchanges = 0;
  const fetch = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({url: String(url), init: init ?? {}});
    if (String(url) === GOOGLE_IDENTITY_URL) {
      return new Response(`eyJ.jwt-${++identities}.sig\n`, {status: 200});
    }
    if (String(url) === ANTHROPIC_TOKEN_URL) return exchange(++exchanges);
    throw new Error(`unexpected ${String(url)}`);
  };
  return {calls, fetch, exchanges: () => exchanges};
}

test("the exchange presents a fresh Google ID token with the federation rule and organization", async () => {
  const fake = federationFake();
  const source = createAnthropicTokenSource({federationRuleId: RULE, organizationId: ORG,
    fetch: fake.fetch, now: () => 0});
  assert.equal(await source.accessToken(), SECRET_TOKEN);
  assert.equal(fake.calls.length, 2);
  assert.equal(fake.calls[0].url,
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=https://api.anthropic.com&format=full");
  assert.deepEqual(fake.calls[0].init.headers, {"Metadata-Flavor": "Google"});
  assert.equal(fake.calls[1].url, "https://api.anthropic.com/v1/oauth/token");
  assert.equal(fake.calls[1].init.method, "POST");
  assert.equal((fake.calls[1].init.headers as Record<string, string>)["content-type"], "application/json");
  assert.deepEqual(JSON.parse(String(fake.calls[1].init.body)), {
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: "eyJ.jwt-1.sig", federation_rule_id: RULE, organization_id: ORG});
});

test("the token is reused until a minute before it expires, then re-exchanged with a new ID token", async () => {
  const fake = federationFake((call) => reply(200, {access_token: `${SECRET_TOKEN}-${call}`,
    token_type: "Bearer", expires_in: 3600, scope: "workspace:inference"}));
  let clock = 1_000_000;
  const source = createAnthropicTokenSource({federationRuleId: RULE, organizationId: ORG,
    fetch: fake.fetch, now: () => clock});
  assert.equal(await source.accessToken(), `${SECRET_TOKEN}-1`);
  clock += 3600_000 - TOKEN_REFRESH_MARGIN_MS - 1;
  assert.equal(await source.accessToken(), `${SECRET_TOKEN}-1`);
  assert.equal(fake.exchanges(), 1);
  clock += 1;
  assert.equal(await source.accessToken(), `${SECRET_TOKEN}-2`);
  assert.equal(fake.exchanges(), 2);
  const assertions = fake.calls.filter((call) => call.url === ANTHROPIC_TOKEN_URL)
    .map((call) => JSON.parse(String(call.init.body)).assertion);
  assert.deepEqual(assertions, ["eyJ.jwt-1.sig", "eyJ.jwt-2.sig"]);
});

test("concurrent callers share one exchange", async () => {
  const fake = federationFake();
  const source = createAnthropicTokenSource({federationRuleId: RULE, organizationId: ORG,
    fetch: fake.fetch, now: () => 0});
  const tokens = await Promise.all([source.accessToken(), source.accessToken(), source.accessToken()]);
  assert.deepEqual(tokens, [SECRET_TOKEN, SECRET_TOKEN, SECRET_TOKEN]);
  assert.equal(fake.exchanges(), 1);
});

test("a failed exchange throws without the JWT or a token, and the next call retries", async () => {
  const fake = federationFake((call) => call === 1 ?
    reply(401, {type: "error", error: {type: "authentication_error", message: "Authentication failed"}}) :
    reply(200, {access_token: SECRET_TOKEN, token_type: "Bearer", expires_in: 3600}));
  const source = createAnthropicTokenSource({federationRuleId: RULE, organizationId: ORG,
    fetch: fake.fetch, now: () => 0});
  await assert.rejects(source.accessToken(), (error: Error) => {
    assert.match(error.message, /token exchange failed \(status 401, authentication_error\)/);
    assert.doesNotMatch(error.message, /eyJ|jwt|sk-ant/);
    return true;
  });
  assert.equal(await source.accessToken(), SECRET_TOKEN);
});

test("malformed exchange responses fail the provider and never echo the token", async () => {
  for (const body of [{access_token: SECRET_TOKEN, token_type: "Bearer"},
    {access_token: SECRET_TOKEN, token_type: "mac", expires_in: 3600},
    {access_token: "", token_type: "Bearer", expires_in: 3600},
    {access_token: SECRET_TOKEN, token_type: "Bearer", expires_in: -1}]) {
    const source = createAnthropicTokenSource({federationRuleId: RULE, organizationId: ORG,
      fetch: federationFake(() => reply(200, body)).fetch, now: () => 0});
    await assert.rejects(source.accessToken(), (error: Error) => {
      assert.equal(error.message, "Assistant token exchange failed (malformed response)");
      assert.equal(String(error.stack).includes(SECRET_TOKEN), false);
      return true;
    });
  }
  const unreachable = createAnthropicTokenSource({federationRuleId: RULE, organizationId: ORG,
    fetch: federationFake(() => {
      throw new TypeError("fetch failed");
    }).fetch, now: () => 0});
  await assert.rejects(unreachable.accessToken(), /token exchange failed \(unreachable\)/);
});

test("a failed metadata fetch fails the provider before any exchange", async () => {
  let exchanges = 0;
  const cases: Array<[() => Promise<Response>, RegExp]> = [
    [async () => new Response("denied", {status: 403}), /identity token request failed \(status 403\)/],
    [async () => new Response("  ", {status: 200}), /identity token request failed \(empty\)/],
    [async () => {
      throw new TypeError("getaddrinfo ENOTFOUND metadata.google.internal");
    }, /identity token request failed \(unreachable\)/],
  ];
  for (const [identity, expected] of cases) {
    const source = createAnthropicTokenSource({federationRuleId: RULE, organizationId: ORG,
      now: () => 0, fetch: async (url) => {
        if (String(url) === GOOGLE_IDENTITY_URL) return identity();
        exchanges++;
        return reply(200, {});
      }});
    await assert.rejects(source.accessToken(), expected);
  }
  assert.equal(exchanges, 0);
});

test("a token never appears in a provider failure", async () => {
  const provider = createAnthropicProvider({accessToken: SECRET_TOKEN, fetch: async () => {
    throw new Error("socket hang up");
  }});
  const result = await provider.complete(body);
  assert.equal(JSON.stringify(result).includes(SECRET_TOKEN), false);
  assert.equal(!result.ok && result.failure, "timeout");
});

function intent(messageId: string, reservedTokens: number): ProgramAssistantRun {
  return {runId: assistantRunId("live", messageId), programId: "program-1",
    organizerId: "org-1", mode: "live", threadId: "program-1_hh-1", messageId,
    actorUid: null, status: "intent", reason: null, language: "en",
    model: "claude-sonnet-5-5", promptVersion: "v1", factPackVersion: "f1",
    promptHash: "0".repeat(64), factPackHash: "1".repeat(64),
    budgetDay: budgetDay(1_800_000_000_000, "Asia/Kolkata"), reservedTokens,
    inputTokens: 0, outputTokens: 0, attempts: 0, providerStatus: null,
    latencyMillis: null, createdAtMillis: 1_800_000_000_000,
    updatedAtMillis: 1_800_000_000_000};
}

test("the ledger reserves before the call, settles to actual use and refuses past the cap", async () => {
  const fake = new FakeFirestore({});
  const db = fake as unknown as FirebaseFirestore.Firestore;
  const first = await reserveRun(db, intent("m1", 3000), 5000);
  assert.equal(first.kind, "reserved");
  assert.ok(validateRun(fake.getDoc(`programAssistantRuns/${first.run.runId}`)));
  const day = first.run.budgetDay;
  assert.equal(await remainingTokens(db, "program-1", day, 5000), 2000);
  assert.equal((await reserveRun(db, intent("m1", 3000), 5000)).kind, "exists");
  const second = await reserveRun(db, intent("m2", 3000), 5000);
  assert.equal(second.kind, "exhausted");
  assert.equal(second.run.reason, "budgetExhausted");
  const done = await completeRun(db, first.run.runId, {status: "answered", reason: null,
    inputTokens: 900, outputTokens: 40, attempts: 1, providerStatus: 200,
    latencyMillis: 1200, consumedTokens: 940}, 1_800_000_001_200);
  assert.equal(done.status, "answered");
  assert.ok(validateRun(fake.getDoc(`programAssistantRuns/${first.run.runId}`)));
  const ledger = fake.getDoc(`programAssistantBudgets/program-1_${day}`)!;
  assert.ok(validateBudget(ledger));
  assert.equal(ledger.reservedTokens, 0);
  assert.equal(ledger.consumedTokens, 940);
  assert.equal(await remainingTokens(db, "program-1", day, 5000), 4060);
  // Settling twice changes nothing.
  await completeRun(db, first.run.runId, {status: "escalated", reason: "providerError",
    inputTokens: 0, outputTokens: 0, attempts: 1, providerStatus: 500, latencyMillis: 1,
    consumedTokens: 3000}, 1_800_000_002_000);
  assert.equal(fake.getDoc(`programAssistantBudgets/program-1_${day}`)!.consumedTokens, 940);
  assert.equal(normalizeDailyTokenBudget(undefined), 200_000);
  assert.equal(normalizeDailyTokenBudget(-1), 200_000);
  assert.equal(normalizeDailyTokenBudget(1e12), 5_000_000);
});
