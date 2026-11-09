/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import {FakeFirestore} from "../../shared/testing/programFirestore";
import {
  ANTHROPIC_MESSAGES_URL,
  createAnthropicProvider,
  parseKeyVersion,
} from "./provider";
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

test("the provider posts the pinned model with the key and reads the text block", async () => {
  const calls: Array<{url: string; init: RequestInit}> = [];
  const provider = createAnthropicProvider({apiKey: "test-key", fetch: async (url, init) => {
    calls.push({url: String(url), init: init!});
    return reply(200, ok);
  }});
  const result = await provider.complete(body);
  assert.deepEqual(result, {ok: true, text: "{\"action\":\"answer\",\"text\":\"10 AM\"}",
    inputTokens: 1000, outputTokens: 40, attempts: 1, status: 200});
  assert.equal(calls[0].url, ANTHROPIC_MESSAGES_URL);
  const headers = calls[0].init.headers as Record<string, string>;
  assert.equal(headers["x-api-key"], "test-key");
  assert.equal(headers["anthropic-version"], "2023-06-01");
  const sent = JSON.parse(String(calls[0].init.body));
  assert.equal(sent.model, "claude-sonnet-5-5");
  assert.equal(sent.max_tokens, 1200);
});

test("429 and 5xx retry once, honouring retry-after; a second failure gives up", async () => {
  const slept: number[] = [];
  let n = 0;
  const flaky = createAnthropicProvider({apiKey: "k", sleep: async (ms) => {
    slept.push(ms);
  }, fetch: async () => (++n === 1 ? reply(429, {}, {"retry-after": "2"}) : reply(200, ok))});
  const first = await flaky.complete(body);
  assert.equal(first.ok, true);
  assert.equal(first.attempts, 2);
  assert.deepEqual(slept, [2000]);
  const down = createAnthropicProvider({apiKey: "k", sleep: async () => undefined,
    fetch: async () => reply(529, {})});
  assert.deepEqual(await down.complete(body), {ok: false, failure: "unavailable",
    attempts: 2, status: 529, billedUncertain: false, inputTokens: 0, outputTokens: 0});
});

test("timeouts never retry and count as possibly billed; 4xx and refusals do not retry", async () => {
  let calls = 0;
  const hung = createAnthropicProvider({apiKey: "k", fetch: async () => {
    calls++;
    throw new DOMException("timed out", "TimeoutError");
  }});
  const timeout = await hung.complete(body);
  assert.equal(calls, 1);
  assert.equal(timeout.ok, false);
  assert.equal(!timeout.ok && timeout.failure, "timeout");
  assert.equal(!timeout.ok && timeout.billedUncertain, true);
  const bad = createAnthropicProvider({apiKey: "k", fetch: async () => reply(401, {})});
  const rejected = await bad.complete(body);
  assert.equal(!rejected.ok && rejected.failure, "rejected");
  assert.equal(rejected.attempts, 1);
  const refusing = createAnthropicProvider({apiKey: "k", fetch: async () =>
    reply(200, {content: [], stop_reason: "refusal", usage: {input_tokens: 5, output_tokens: 0}})});
  const refused = await refusing.complete(body);
  assert.equal(!refused.ok && refused.failure, "refused");
  const truncated = createAnthropicProvider({apiKey: "k", fetch: async () =>
    reply(200, {...ok, stop_reason: "max_tokens"})});
  assert.equal((await truncated.complete(body)).ok, false);
});

test("only a pinned ANTHROPIC_API_KEY version in this project is accepted", () => {
  assert.equal(parseKeyVersion("projects/catch-dev/secrets/ANTHROPIC_API_KEY/versions/3", "catch-dev"),
    "projects/catch-dev/secrets/ANTHROPIC_API_KEY/versions/3");
  assert.equal(parseKeyVersion("", "catch-dev"), null);
  assert.equal(parseKeyVersion("projects/catch-prod/secrets/ANTHROPIC_API_KEY/versions/3", "catch-dev"), null);
  assert.equal(parseKeyVersion("projects/catch-dev/secrets/ANTHROPIC_API_KEY/versions/latest", "catch-dev"), null);
  assert.equal(parseKeyVersion("projects/catch-dev/secrets/OTHER/versions/1", "catch-dev"), null);
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
