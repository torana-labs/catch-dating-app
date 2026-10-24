import Ajv from "ajv";
import {performance} from "node:perf_hooks";
import {BudgetLedger} from "../budget.mjs";
import {hashValue} from "../canonical-json.mjs";
import {OperationsError, invariant} from "../errors.mjs";
import {
  ANTHROPIC_AGENT_ENDPOINT,
  ANTHROPIC_AGENT_MODELS,
  anthropicAgentHeaders,
  buildAgentBody,
  parseAgentResponse,
} from "./anthropic-agent-protocol.mjs";
import {ANTHROPIC_PRICE_BOOK, attemptCostMicros, stepCeilingMicros} from "./price-book.mjs";

// A bounded tool-use loop. The caller supplies trusted tools and a finish
// tool; the runner owns the model calls and every ceiling:
//   - each step reserves its worst-case cost in the run and monthly ledgers
//     before anything is sent, and settles to the priced attempts after;
//   - a response that cannot be priced keeps its whole reservation charged;
//   - steps, tool calls and web searches are capped per run;
//   - one deadline covers each provider request, and nothing is retried
//     after a request may have been billed;
//   - the transcript only grows, so thinking blocks stay valid.
// It never publishes: results are proposals for the calling workflow.

export const AGENT_STOP_REASONS = Object.freeze([
  "finished",
  "ended_without_finish",
  "step_limit",
  "tool_call_limit",
  "budget_exhausted",
  "max_tokens",
  "refusal",
  "provider_error",
  "cancelled",
]);

const TOOL_RESULT_MAX_BYTES = 24_000;
const MAX_REQUEST_BYTES = 1_000_000;
const MAX_RESPONSE_BYTES = 2_000_000;
const INPUT_OVERHEAD_TOKENS = 4_000;

export function agentBudgetLedgers({limits, consumed = {}}) {
  return new BudgetLedger({
    limits: {modelCalls: limits.maxModelCalls, modelInputTokens: limits.maxInputTokens,
      modelOutputTokens: limits.maxOutputTokens, modelCostMicros: limits.maxCostMicros},
    consumed: {modelCalls: consumed.modelCalls ?? 0, modelInputTokens: consumed.modelInputTokens ?? 0,
      modelOutputTokens: consumed.modelOutputTokens ?? 0, modelCostMicros: consumed.modelCostMicros ?? 0},
  });
}

export class GuardedAgentRunner {
  constructor({
    enabled = false,
    modelId,
    effort = "medium",
    serverSecretRef,
    resolveSecret,
    transport,
    runBudget,
    monthlyBudget,
    limits = {},
    priceBook = ANTHROPIC_PRICE_BOOK,
  } = {}) {
    invariant(ANTHROPIC_AGENT_MODELS.includes(modelId), "MODEL_PROVIDER_CONFIG_INVALID",
      "The agent model must be a reviewed model.", {modelId: modelId ?? null});
    invariant(typeof serverSecretRef === "string" && /^[a-z0-9][a-z0-9._/-]{0,127}$/iu.test(serverSecretRef),
      "MODEL_PROVIDER_CONFIG_INVALID", "A server secret reference is required.");
    invariant(runBudget instanceof BudgetLedger && monthlyBudget instanceof BudgetLedger,
      "MODEL_BUDGET_REQUIRED", "The agent requires run and monthly ledgers.");
    this.config = {
      maxSteps: bounded(limits.maxSteps, 12, 30),
      maxToolCalls: bounded(limits.maxToolCalls, 24, 60),
      maxWebSearches: bounded(limits.maxWebSearches, 5, 20),
      maxOutputTokensPerStep: bounded(limits.maxOutputTokensPerStep, 4_096, 16_000),
      stepTimeoutMs: bounded(limits.stepTimeoutMs, 180_000, 600_000),
    };
    Object.assign(this, {enabled, modelId, effort, serverSecretRef, resolveSecret, transport,
      runBudget, monthlyBudget, priceBook});
  }

  /**
   * @param {{task:string, promptVersion:string, system:string, prompt:string,
   *   tools:Array<{name:string, description:string, inputSchema:Record<string, unknown>,
   *     handler:(input:any, context:{signal:AbortSignal})=>Promise<unknown>}>,
   *   finishTool:{name:string, description:string, inputSchema:Record<string, unknown>},
   *   webSearch?:null|{allowedDomains?:string[], blockedDomains?:string[]}, signal?:AbortSignal}} run
   */
  async run({task, promptVersion, system, prompt, tools, finishTool, webSearch = null, signal}) {
    invariant(this.enabled === true, "MODEL_PROVIDER_DISABLED", "The research agent is disabled by policy.");
    invariant(typeof this.transport === "function" && typeof this.resolveSecret === "function",
      "MODEL_PROVIDER_PORT_REQUIRED", "An enabled agent requires trusted transport and secret ports.");
    invariant(/^[a-z0-9][a-z0-9._-]{0,99}$/iu.test(task ?? "") &&
      /^[a-z0-9][a-z0-9._-]{0,99}$/iu.test(promptVersion ?? ""),
    "INVALID_MODEL_REQUEST", "Agent runs need a task and a versioned prompt.");
    const compiled = compileTools([...tools, {...finishTool, handler: null}]);
    const secret = await this.resolveSecret(this.serverSecretRef);
    invariant(typeof secret === "string" && secret.length > 0 && !/[\r\n]/u.test(secret),
      "MODEL_PROVIDER_SECRET_UNAVAILABLE", "The trusted secret port did not return a credential.");

    const messages = [{role: "user", content: prompt}];
    const toolCalls = [];
    const totals = {steps: 0, webSearches: 0, costMicros: 0, inputTokens: 0, outputTokens: 0};
    let lastInputTokens = null;
    let lastOutputTokens = 0;
    let addedBytes = 0;
    const finish = (stopReason, extra = {}) => ({
      schemaVersion: 1,
      status: stopReason === "finished" ? "completed" : "stopped",
      stopReason,
      task,
      promptVersion,
      modelId: this.modelId,
      finishInput: extra.finishInput ?? null,
      refusalCategory: extra.refusalCategory ?? null,
      error: extra.error ?? null,
      toolCalls,
      usage: {...totals},
      transcriptHash: hashValue(messages),
    });

    while (true) {
      if (signal?.aborted) return finish("cancelled");
      if (totals.steps >= this.config.maxSteps) return finish("step_limit");
      const remainingSearches = this.config.maxWebSearches - totals.webSearches;
      const body = buildAgentBody({modelId: this.modelId, system, messages,
        tools: compiled.definitions, effort: this.effort, maxOutputTokens: this.config.maxOutputTokensPerStep,
        webSearch: webSearch && remainingSearches > 0 ? {...webSearch, maxUses: remainingSearches} : null});
      const serialized = JSON.stringify(body);
      const bytes = Buffer.byteLength(serialized);
      if (bytes > MAX_REQUEST_BYTES) return finish("budget_exhausted");
      // A token is at least one byte, and earlier thinking is replayed as
      // input, so the next step's input is bounded by the last step's input
      // and output plus what was appended since.
      const inputBound = lastInputTokens === null ?
        bytes + INPUT_OVERHEAD_TOKENS :
        lastInputTokens + lastOutputTokens + addedBytes + INPUT_OVERHEAD_TOKENS;
      const reservation = {
        modelCalls: 1,
        modelInputTokens: inputBound * 2,
        modelOutputTokens: this.config.maxOutputTokensPerStep * 2,
        modelCostMicros: stepCeilingMicros({modelId: this.modelId, inputTokens: inputBound,
          maxOutputTokens: this.config.maxOutputTokensPerStep,
          maxWebSearches: webSearch ? remainingSearches : 0}, this.priceBook),
      };
      if (!this.runBudget.canConsume(reservation) || !this.monthlyBudget.canConsume(reservation)) {
        return finish("budget_exhausted");
      }
      this.runBudget.reserve(reservation, {reason: `${task}:step-${totals.steps + 1}`});
      this.monthlyBudget.reserve(reservation, {reason: `${task}:step-${totals.steps + 1}`});
      totals.steps += 1;

      let parsed;
      try {
        parsed = parseAgentResponse(await this.send(serialized, secret, signal), {modelId: this.modelId});
      } catch (error) {
        // The request may have been billed: the reservation stays charged.
        totals.costMicros += reservation.modelCostMicros;
        if (signal?.aborted) return finish("cancelled");
        return finish("provider_error", {error: redacted(error)});
      }
      const actual = settle(parsed, this.priceBook);
      // The reservation is a proven ceiling; if usage ever exceeds it, keep
      // the whole reservation charged and stop rather than guess.
      if (Object.keys(reservation).some((key) => actual[key] > reservation[key])) {
        totals.costMicros += reservation.modelCostMicros;
        return finish("provider_error", {error: "MODEL_USAGE_EXCEEDED_RESERVATION"});
      }
      this.runBudget.reconcileReservation(reservation, actual, {reason: task});
      this.monthlyBudget.reconcileReservation(reservation, actual, {reason: task});
      totals.costMicros += actual.modelCostMicros;
      totals.inputTokens += actual.modelInputTokens;
      totals.outputTokens += actual.modelOutputTokens;
      totals.webSearches += parsed.webSearches;
      const last = parsed.attempts.at(-1);
      lastInputTokens = last.inputTokens + last.cacheReadTokens + last.cacheWriteTokens;
      lastOutputTokens = last.outputTokens;
      addedBytes = 0;
      messages.push({role: "assistant", content: parsed.content});

      if (parsed.stopReason === "refusal") return finish("refusal", {refusalCategory: parsed.refusalCategory});
      if (parsed.stopReason === "max_tokens") return finish("max_tokens");
      if (parsed.stopReason === "pause_turn") continue;
      if (parsed.stopReason === "end_turn") return finish("ended_without_finish");

      const results = [];
      let finishInput = null;
      for (const call of parsed.toolUses) {
        if (toolCalls.length >= this.config.maxToolCalls) return finish("tool_call_limit");
        const tool = compiled.byName.get(call.name);
        const started = performance.now();
        let outcome;
        if (!tool) {
          outcome = {ok: false, content: "Unknown tool."};
        } else if (!tool.validate(call.input)) {
          outcome = {ok: false, content: "Input does not match the tool schema."};
        } else if (tool.handler === null) {
          finishInput = structuredClone(call.input);
          outcome = {ok: true, content: "Recorded."};
        } else {
          outcome = await runTool(tool, call.input, signal);
        }
        toolCalls.push({name: call.name, ok: outcome.ok, inputHash: hashValue(call.input),
          durationMs: Math.ceil(performance.now() - started)});
        const content = boundedText(outcome.content);
        addedBytes += Buffer.byteLength(content);
        results.push({type: "tool_result", tool_use_id: call.id, content, ...(outcome.ok ? {} : {is_error: true})});
      }
      if (finishInput !== null) return finish("finished", {finishInput});
      // All results go back in one message so parallel calls stay paired.
      messages.push({role: "user", content: results});
    }
  }

  async send(serialized, secret, signal) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, {once: true});
    const timer = setTimeout(abort, this.config.stepTimeoutMs);
    if (signal?.aborted) abort();
    // Race the transport so a port that ignores its signal cannot outlast
    // the deadline.
    let stop;
    const aborted = new Promise((_, reject) => {
      stop = () => reject(new OperationsError("MODEL_PROVIDER_TIMEOUT", "The model request did not finish in time."));
      if (controller.signal.aborted) stop();
      else controller.signal.addEventListener("abort", stop, {once: true});
    });
    try {
      const response = await Promise.race([this.transport(ANTHROPIC_AGENT_ENDPOINT, {method: "POST",
        redirect: "error", headers: {"Content-Type": "application/json", ...anthropicAgentHeaders(secret)},
        body: serialized, signal: controller.signal}), aborted]);
      if (response?.status !== 200 || response.redirected) {
        throw new OperationsError("MODEL_PROVIDER_HTTP_ERROR", "The model provider rejected the request.", {
          details: {status: Number.isInteger(response?.status) ? response.status : null}});
      }
      const text = await Promise.race([readBounded(response, MAX_RESPONSE_BYTES), aborted]);
      return JSON.parse(text);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      controller.signal.removeEventListener("abort", stop);
    }
  }
}

function settle(parsed, priceBook) {
  const cost = parsed.attempts.reduce((sum, attempt) => sum + attemptCostMicros(attempt, priceBook), 0) +
    parsed.webSearches * priceBook.webSearchMicrosPerRequest;
  return {
    modelCalls: 1,
    modelInputTokens: parsed.attempts.reduce((sum, attempt) =>
      sum + attempt.inputTokens + attempt.cacheReadTokens + attempt.cacheWriteTokens, 0),
    modelOutputTokens: parsed.attempts.reduce((sum, attempt) => sum + attempt.outputTokens, 0),
    modelCostMicros: cost,
  };
}

async function runTool(tool, input, signal) {
  try {
    const value = await tool.handler(structuredClone(input), {signal});
    return {ok: true, content: typeof value === "string" ? value : JSON.stringify(value)};
  } catch (error) {
    // Tool failures go back to the model as data; their text is bounded and
    // never includes a cause chain.
    return {ok: false, content: error instanceof OperationsError ? error.message : "The tool failed."};
  }
}

function compileTools(tools) {
  const ajv = new Ajv({allErrors: true, strict: false});
  const byName = new Map();
  const definitions = [];
  for (const tool of tools) {
    invariant(/^[a-z][a-z0-9_]{0,63}$/u.test(tool.name ?? "") && !byName.has(tool.name) &&
      tool.name !== "web_search" && typeof tool.description === "string" && tool.description.length > 0 &&
      tool.inputSchema?.type === "object" && tool.inputSchema.additionalProperties === false &&
      Array.isArray(tool.inputSchema.required),
    "INVALID_AGENT_TOOL", "Agent tools need a unique name, a description and a closed object schema.",
    {tool: tool.name ?? null});
    byName.set(tool.name, {validate: ajv.compile(tool.inputSchema), handler: tool.handler});
    definitions.push({name: tool.name, description: tool.description, inputSchema: tool.inputSchema});
  }
  return {byName, definitions};
}

async function readBounded(response, maximum) {
  const reader = response.body?.getReader?.();
  if (!reader) throw new OperationsError("MODEL_PROVIDER_RESULT_INVALID", "The model response had no body.");
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maximum) {
        throw new OperationsError("MODEL_PROVIDER_RESPONSE_TOO_LARGE", "The model response exceeded its cap.");
      }
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks).toString("utf8");
  } finally {
    void reader.cancel().catch(() => undefined);
  }
}

function boundedText(value) {
  const text = String(value ?? "");
  if (Buffer.byteLength(text) <= TOOL_RESULT_MAX_BYTES) return text;
  return `${Buffer.from(text).subarray(0, TOOL_RESULT_MAX_BYTES - 32).toString("utf8")}\n[truncated]`;
}

function bounded(value, fallback, maximum) {
  const resolved = value ?? fallback;
  invariant(Number.isSafeInteger(resolved) && resolved > 0 && resolved <= maximum, "MODEL_PROVIDER_CONFIG_INVALID",
    `Agent limits must be positive and at most ${maximum}.`);
  return resolved;
}

function redacted(error) {
  return typeof error?.code === "string" ? error.code : "MODEL_PROVIDER_TRANSPORT_ERROR";
}
