import assert from "node:assert/strict";
import test from "node:test";
import {BudgetLedger} from "../src/platform/budget.mjs";
import {GuardedAgentRunner, agentBudgetLedgers} from "../src/platform/model/guarded-agent-runner.mjs";
import {ANTHROPIC_PRICE_BOOK, attemptCostMicros, stepCeilingMicros} from "../src/platform/model/price-book.mjs";

const usage = (overrides = {}) => ({input_tokens: 1_000, output_tokens: 200, cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0, ...overrides});
const message = (content, stopReason, extra = {}) => ({id: "msg_1", type: "message", role: "assistant",
  model: "claude-opus-5-5", content, stop_reason: stopReason, stop_details: null, usage: usage(), ...extra});
const thinking = {type: "thinking", thinking: "", signature: "sig-abc"};
const toolUse = (id, name, input) => ({type: "tool_use", id, name, input});

function scripted(responses) {
  const requests = [];
  const transport = async (url, init) => {
    requests.push({url, headers: init.headers, body: JSON.parse(init.body)});
    const next = responses.shift();
    if (typeof next === "function") return next(init);
    const bytes = new TextEncoder().encode(JSON.stringify(next));
    return {status: 200, redirected: false, body: new Blob([bytes]).stream()};
  };
  return {transport, requests};
}

const fetchTool = {
  name: "fetch_page",
  description: "Read one public page.",
  inputSchema: {type: "object", additionalProperties: false, required: ["url"],
    properties: {url: {type: "string", minLength: 1}}},
  handler: async ({url}) => ({url, title: "Afterfly"}),
};
const finishTool = {
  name: "finish",
  description: "Report the research result.",
  inputSchema: {type: "object", additionalProperties: false, required: ["summary"],
    properties: {summary: {type: "string"}}},
};
const limits = {maxModelCalls: 20, maxInputTokens: 10_000_000, maxOutputTokens: 1_000_000, maxCostMicros: 2_000_000};

function runner({transport, month = agentBudgetLedgers({limits: {...limits, maxCostMicros: 50_000_000}}),
  run = agentBudgetLedgers({limits}), ...options} = {}) {
  return {
    agent: new GuardedAgentRunner({enabled: true, modelId: "claude-opus-5-5", serverSecretRef: "anthropic/supply-agent",
      resolveSecret: async () => "test-key", transport, runBudget: run, monthlyBudget: month, ...options}),
    run,
    month,
  };
}

const job = {task: "organizer_research", promptVersion: "organizer-research-v1", system: "Research organizers.",
  prompt: "Find Afterfly.", tools: [fetchTool], finishTool, webSearch: {}};

test("the agent ships disabled and refuses unreviewed models or missing ports", async () => {
  const run = agentBudgetLedgers({limits});
  const base = {modelId: "claude-opus-5-5", serverSecretRef: "anthropic/supply-agent", runBudget: run, monthlyBudget: run};
  await assert.rejects(new GuardedAgentRunner(base).run(job), {code: "MODEL_PROVIDER_DISABLED"});
  await assert.rejects(new GuardedAgentRunner({...base, enabled: true}).run(job), {code: "MODEL_PROVIDER_PORT_REQUIRED"});
  assert.throws(() => new GuardedAgentRunner({...base, modelId: "claude-sonnet-5-5"}), {code: "MODEL_PROVIDER_CONFIG_INVALID"});
  assert.throws(() => new GuardedAgentRunner({...base, runBudget: null}), {code: "MODEL_BUDGET_REQUIRED"});
  const {agent} = runner({transport: async () => assert.fail("no call")});
  await assert.rejects(agent.run({...job, tools: [{...fetchTool, inputSchema: {type: "object"}}]}),
    {code: "INVALID_AGENT_TOOL"});
});

test("a research loop runs tools, passes thinking back unchanged and stops at the finish tool", async () => {
  const {transport, requests} = scripted([
    message([thinking, toolUse("toolu_1", "fetch_page", {url: "https://lu.ma/afterfly"}),
      toolUse("toolu_2", "fetch_page", {url: 42})], "tool_use"),
    message([thinking, {type: "server_tool_use", id: "srvtoolu_1", name: "web_search", input: {query: "Afterfly"}}],
      "pause_turn", {usage: usage({server_tool_use: {web_search_requests: 1}})}),
    message([toolUse("toolu_3", "finish", {summary: "Afterfly runs weekly in Mumbai."})], "tool_use",
      {usage: usage({cache_read_input_tokens: 900, input_tokens: 300})}),
  ]);
  const {agent, run, month} = runner({transport});
  const result = await agent.run(job);
  assert.equal(result.status, "completed");
  assert.equal(result.stopReason, "finished");
  assert.deepEqual(result.finishInput, {summary: "Afterfly runs weekly in Mumbai."});
  assert.deepEqual(result.toolCalls.map((call) => [call.name, call.ok]),
    [["fetch_page", true], ["fetch_page", false], ["finish", true]]);

  const [first, second, third] = requests;
  assert.equal(first.headers["anthropic-beta"], "server-side-fallback-2026-07-01");
  assert.equal(first.body.model, "claude-opus-5-5");
  assert.equal("thinking" in first.body, false, "Claude Opus 5.5 thinking is omitted, never disabled");
  assert.deepEqual(first.body.tool_choice, {type: "auto"});
  assert.deepEqual(first.body.output_config, {effort: "medium"});
  assert.equal(first.body.fallbacks, "default");
  assert.ok(first.body.tools.every((tool) => tool.strict === true || tool.type === "web_search_20260209"));
  assert.equal(first.body.tools.find((tool) => tool.name === "web_search").max_uses, 5);
  // Both results return in one user message, the bad input as an error.
  assert.deepEqual(second.body.messages.at(-1).content.map((block) => [block.tool_use_id, block.is_error ?? false]),
    [["toolu_1", false], ["toolu_2", true]]);
  assert.deepEqual(second.body.messages.at(-2).content[0], thinking);
  // pause_turn continues with the assistant turn as-is, and spent searches shrink the allowance.
  assert.equal(third.body.messages.at(-1).role, "assistant");
  assert.equal(third.body.tools.find((tool) => tool.name === "web_search").max_uses, 4);
  assert.deepEqual(third.body.messages.slice(0, second.body.messages.length), second.body.messages,
    "the transcript only grows");

  const opus = ANTHROPIC_PRICE_BOOK.models["claude-opus-5-5"];
  const expected = 2 * (Math.ceil(1_000 * opus.inputPerMTok / 1e6) + Math.ceil(200 * opus.outputPerMTok / 1e6)) +
    10_000 + Math.ceil(300 * opus.inputPerMTok / 1e6) + Math.ceil(200 * opus.outputPerMTok / 1e6) +
    Math.ceil(900 * opus.cacheReadPerMTok / 1e6);
  assert.equal(result.usage.costMicros, expected);
  assert.equal(run.snapshot().consumed.modelCostMicros, expected);
  assert.equal(month.snapshot().consumed.modelCostMicros, expected);
  assert.equal(run.snapshot().consumed.modelCalls, 3);
});

test("a fallback attempt is priced at its own model, and an unknown model at the ceiling", () => {
  const attempt = {inputTokens: 10_000, outputTokens: 1_000, cacheReadTokens: 0, cacheWriteTokens: 0};
  assert.equal(attemptCostMicros({...attempt, model: "claude-opus-5-5"}), 40_000 + 20_000);
  assert.equal(attemptCostMicros({...attempt, model: "claude-opus-4-8"}), 50_000 + 25_000);
  assert.equal(attemptCostMicros({...attempt, model: "claude-new-model"}), 100_000 + 50_000);
  // The reservation covers the requested model plus a fallback at the ceiling.
  assert.equal(stepCeilingMicros({modelId: "claude-opus-5-5", inputTokens: 10_000, maxOutputTokens: 1_000,
    maxWebSearches: 2}), (50_000 + 20_000) + (125_000 + 50_000) + 20_000);
});

test("iterations from a server-side fallback are each charged", async () => {
  const {transport} = scripted([message([toolUse("toolu_1", "finish", {summary: "done"})], "tool_use", {
    model: "claude-opus-4-8",
    usage: usage({iterations: [
      {type: "message", model: "claude-opus-5-5", ...usage({output_tokens: 10})},
      {type: "fallback_message", model: "claude-opus-4-8", ...usage()},
    ]}),
  })]);
  const {agent, month} = runner({transport});
  const result = await agent.run(job);
  assert.equal(result.stopReason, "finished");
  assert.equal(month.snapshot().consumed.modelCostMicros, (4_000 + 200) + (5_000 + 5_000));
});

test("budgets, step caps, refusals and unpriceable responses stop the run safely", async () => {
  // The monthly ceiling refuses before anything is sent.
  const nearlySpent = agentBudgetLedgers({limits: {...limits, maxCostMicros: 50_000_000},
    consumed: {modelCostMicros: 49_990_000}});
  let called = false;
  const {agent: broke} = runner({transport: async () => { called = true; }, month: nearlySpent});
  assert.equal((await broke.run(job)).stopReason, "budget_exhausted");
  assert.equal(called, false);

  const loop = () => message([toolUse(`toolu_${Math.random().toString(36).slice(2, 8)}`, "fetch_page",
    {url: "https://lu.ma/x"})], "tool_use");
  const {agent: capped} = runner({transport: scripted([loop(), loop(), loop()]).transport, limits: {maxSteps: 2}});
  assert.equal((await capped.run(job)).stopReason, "step_limit");

  const {agent: refused} = runner({transport: scripted([message([], "refusal",
    {stop_details: {type: "refusal", category: "cyber", explanation: "x"}})]).transport});
  assert.deepEqual([(await refused.run(job)).stopReason, (await refused.run(job).catch(() => null))?.stopReason],
    ["refusal", "provider_error"], "a second run has no scripted response left");

  const {agent: ended} = runner({transport: scripted([message([{type: "text", text: "All done."}], "end_turn")]).transport});
  assert.equal((await ended.run(job)).stopReason, "ended_without_finish");

  // A response missing a cache counter cannot be priced: the reservation stays charged.
  const run = agentBudgetLedgers({limits});
  const {agent: unpriced} = runner({run, transport: scripted([message([], "end_turn",
    {usage: {input_tokens: 10, output_tokens: 1}})]).transport});
  const result = await unpriced.run(job);
  assert.equal(result.stopReason, "provider_error");
  assert.equal(result.error, "MODEL_PROVIDER_USAGE_INVALID");
  assert.ok(run.snapshot().consumed.modelCostMicros > 0);
  assert.equal(run.snapshot().consumed.modelCostMicros, result.usage.costMicros);

  const {agent: failed} = runner({transport: async () => ({status: 500, body: null})});
  assert.equal((await failed.run(job)).error, "MODEL_PROVIDER_HTTP_ERROR");
});

test("each step has a deadline and cancellation stops the loop", async () => {
  const hang = (init) => new Promise((_, reject) =>
    init.signal.addEventListener("abort", () => reject(new Error("aborted")), {once: true}));
  const {agent} = runner({transport: scripted([hang]).transport, limits: {stepTimeoutMs: 20}});
  assert.equal((await agent.run(job)).stopReason, "provider_error");

  const controller = new AbortController();
  const {agent: cancellable} = runner({transport: scripted([(init) => {
    controller.abort();
    return hang(init);
  }]).transport});
  assert.equal((await cancellable.run({...job, signal: controller.signal})).stopReason, "cancelled");
});

test("tool failures and oversized results go back to the model as bounded errors", async () => {
  const {transport, requests} = scripted([
    message([toolUse("toolu_1", "fetch_page", {url: "https://a.example"}),
      toolUse("toolu_2", "explode", {})], "tool_use"),
    message([toolUse("toolu_3", "finish", {summary: "ok"})], "tool_use"),
  ]);
  const big = {...fetchTool, handler: async () => "x".repeat(100_000)};
  const {agent} = runner({transport});
  await agent.run({...job, tools: [big]});
  const results = requests[1].body.messages.at(-1).content;
  assert.ok(Buffer.byteLength(results[0].content) <= 24_000);
  assert.match(results[0].content, /\[truncated\]$/u);
  assert.deepEqual([results[1].is_error, results[1].content], [true, "Unknown tool."]);
});

test("ledgers built from policy limits reject impossible consumption", () => {
  assert.throws(() => agentBudgetLedgers({limits, consumed: {modelCostMicros: 3_000_000}}), {code: "BUDGET_CORRUPT"});
  assert.ok(agentBudgetLedgers({limits}) instanceof BudgetLedger);
});
