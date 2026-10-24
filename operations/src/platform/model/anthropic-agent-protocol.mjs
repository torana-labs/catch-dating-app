import {OperationsError} from "../errors.mjs";

// Reviewed 2026-10-24: https://platform.claude.com/docs/en/build-with-claude/tool-use
// https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool
// https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback
// Native Messages API, no SDK, matching the other operations providers.
// Claude Opus 5.5 always thinks (thinking is omitted, not disabled), rejects
// forced tool choice (tools are strict and chosen automatically), and returns
// thinking blocks that must be passed back unchanged.

export const ANTHROPIC_AGENT_ENDPOINT = "https://api.anthropic.com/v1/messages";
export const ANTHROPIC_AGENT_MODELS = Object.freeze(["claude-opus-5-5"]);
export const ANTHROPIC_FALLBACK_BETA = "server-side-fallback-2026-07-01";
export const WEB_SEARCH_TOOL_TYPE = "web_search_20260209";
const EFFORTS = new Set(["low", "medium", "high"]);
const STOP_REASONS = new Set(["end_turn", "tool_use", "pause_turn", "max_tokens", "refusal"]);

export function anthropicAgentHeaders(secret) {
  return {
    "x-api-key": secret,
    "anthropic-version": "2023-06-01",
    // A classifier decline re-runs on Anthropic's recommended model for that
    // category instead of ending the step; the ledger prices each attempt.
    "anthropic-beta": ANTHROPIC_FALLBACK_BETA,
  };
}

/**
 * @param {{modelId:string, system:string, messages:unknown[], tools:Array<{name:string,
 *   description:string, inputSchema:Record<string, unknown>}>, webSearch:null|{maxUses:number,
 *   allowedDomains?:string[], blockedDomains?:string[]}, maxOutputTokens:number, effort:string}} request
 */
export function buildAgentBody({modelId, system, messages, tools, webSearch, maxOutputTokens, effort}) {
  if (!ANTHROPIC_AGENT_MODELS.includes(modelId) || !EFFORTS.has(effort)) {
    throw protocolError("MODEL_PROVIDER_CONFIG_INVALID");
  }
  return {
    model: modelId,
    max_tokens: maxOutputTokens,
    system,
    messages,
    tools: [
      ...tools.map((tool) => ({name: tool.name, description: tool.description,
        input_schema: tool.inputSchema, strict: true})),
      ...(webSearch ? [{
        type: WEB_SEARCH_TOOL_TYPE,
        name: "web_search",
        max_uses: webSearch.maxUses,
        ...(webSearch.allowedDomains?.length ? {allowed_domains: webSearch.allowedDomains} : {}),
        ...(webSearch.blockedDomains?.length ? {blocked_domains: webSearch.blockedDomains} : {}),
      }] : []),
    ],
    tool_choice: {type: "auto"},
    output_config: {effort},
    // The conversation grows by appending, so each step reads the previous
    // steps from cache.
    cache_control: {type: "ephemeral"},
    fallbacks: "default",
  };
}

/** Validates one response and returns what the runner needs, nothing more. */
export function parseAgentResponse(wire, {modelId}) {
  if (wire?.type !== "message" || wire.role !== "assistant" || !Array.isArray(wire.content) ||
      typeof wire.model !== "string" || !STOP_REASONS.has(wire.stop_reason)) {
    throw protocolError("MODEL_PROVIDER_RESULT_INVALID");
  }
  const attempts = attemptsOf(wire, modelId);
  const webSearches = wire.usage?.server_tool_use?.web_search_requests ?? 0;
  if (!Number.isSafeInteger(webSearches) || webSearches < 0) throw protocolError("MODEL_PROVIDER_USAGE_INVALID");
  const toolUses = wire.content.filter((block) => block?.type === "tool_use");
  for (const block of toolUses) {
    if (typeof block.id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/u.test(block.id) ||
        typeof block.name !== "string" || block.input === null || typeof block.input !== "object" ||
        Array.isArray(block.input)) {
      throw protocolError("MODEL_PROVIDER_RESULT_INVALID");
    }
  }
  return {
    content: wire.content,
    stopReason: wire.stop_reason,
    refusalCategory: wire.stop_reason === "refusal" && typeof wire.stop_details?.category === "string" ?
      wire.stop_details.category.slice(0, 60) : null,
    servedModel: wire.model,
    toolUses: toolUses.map((block) => ({id: block.id, name: block.name, input: block.input})),
    attempts,
    webSearches,
    requestId: typeof wire.id === "string" && /^[A-Za-z0-9_-]{1,128}$/u.test(wire.id) ? wire.id : null,
  };
}

// usage.iterations is the per-attempt bill when a fallback ran; otherwise
// top-level usage is the one attempt. Every counter is required: a missing
// cache counter would under-count, so the response is rejected and the
// runner keeps charging its full reservation instead.
function attemptsOf(wire, modelId) {
  const entries = Array.isArray(wire.usage?.iterations) && wire.usage.iterations.length > 0 ?
    wire.usage.iterations : [wire.usage];
  return entries.map((entry, index) => {
    const counters = [entry?.input_tokens, entry?.output_tokens,
      entry?.cache_read_input_tokens, entry?.cache_creation_input_tokens];
    if (!counters.every((value) => Number.isSafeInteger(value) && value >= 0)) {
      throw protocolError("MODEL_PROVIDER_USAGE_INVALID");
    }
    const isLast = index === entries.length - 1;
    return {
      model: typeof entry.model === "string" ? entry.model : isLast ? wire.model : modelId,
      inputTokens: counters[0],
      outputTokens: counters[1],
      cacheReadTokens: counters[2],
      cacheWriteTokens: counters[3],
    };
  });
}

function protocolError(code) {
  return new OperationsError(code, "The model provider response could not be accepted.");
}
