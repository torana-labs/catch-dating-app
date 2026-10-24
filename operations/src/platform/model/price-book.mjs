import {invariant} from "../errors.mjs";

// Reviewed 2026-10-24 against the Claude API model table (cached 2026-10-06)
// and server tool pricing: https://platform.claude.com/docs/en/about-claude/pricing
// Prices are micro-dollars per million tokens. Cache writes use the
// five-minute TTL rate (1.25x input). Web search is $10 per 1,000 requests.
// Re-review before changing a model or enabling a new one.
export const ANTHROPIC_PRICE_BOOK = Object.freeze({
  reviewedAt: "2026-10-24",
  webSearchMicrosPerRequest: 10_000,
  models: Object.freeze({
    "claude-opus-5-5": rates(4, 20, 0.2, 5),
    // Server-side fallback targets for claude-opus-5-5 refusals.
    "claude-opus-5": rates(5, 25, 0.5, 6.25),
    "claude-opus-4-8": rates(5, 25, 0.5, 6.25),
  }),
  // An attempt served by a model outside this book is charged at a rate no
  // current model exceeds, so the ledger can only over-count.
  ceiling: rates(10, 50, 1, 12.5),
});

function rates(input, output, cacheRead, cacheWrite) {
  return Object.freeze({
    inputPerMTok: input * 1_000_000,
    outputPerMTok: output * 1_000_000,
    cacheReadPerMTok: cacheRead * 1_000_000,
    cacheWritePerMTok: cacheWrite * 1_000_000,
  });
}

/**
 * Cost of one attempt in micro-dollars, rounded up per component.
 * @param {{model:string, inputTokens:number, outputTokens:number,
 *   cacheReadTokens:number, cacheWriteTokens:number}} attempt
 */
export function attemptCostMicros(attempt, book = ANTHROPIC_PRICE_BOOK) {
  for (const key of ["inputTokens", "outputTokens", "cacheReadTokens", "cacheWriteTokens"]) {
    invariant(Number.isSafeInteger(attempt[key]) && attempt[key] >= 0, "MODEL_USAGE_INVALID",
      `Attempt ${key} must be a non-negative integer.`);
  }
  const price = book.models[attempt.model] ?? book.ceiling;
  const part = (tokens, perMTok) => Math.ceil((tokens * perMTok) / 1_000_000);
  return part(attempt.inputTokens, price.inputPerMTok) +
    part(attempt.outputTokens, price.outputPerMTok) +
    part(attempt.cacheReadTokens, price.cacheReadPerMTok) +
    part(attempt.cacheWriteTokens, price.cacheWritePerMTok);
}

/**
 * Worst-case cost of one step, reserved before the call is sent: the
 * requested model's attempt (every input token at the higher of the uncached
 * and cache-write rates, full output allowance) plus one server-side fallback
 * attempt at the ceiling rate, plus every allowed web search. Actual cost
 * cannot exceed it, so a reservation never has to be overrun.
 */
export function stepCeilingMicros({modelId, inputTokens, maxOutputTokens, maxWebSearches}, book = ANTHROPIC_PRICE_BOOK) {
  const price = book.models[modelId] ?? book.ceiling;
  const attempt = (rate) => Math.ceil((inputTokens * Math.max(rate.inputPerMTok, rate.cacheWritePerMTok)) / 1_000_000) +
    Math.ceil((maxOutputTokens * rate.outputPerMTok) / 1_000_000);
  return attempt(price) + attempt(book.ceiling) + maxWebSearches * book.webSearchMicrosPerRequest;
}
