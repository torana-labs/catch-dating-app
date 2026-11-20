import * as path from "node:path";
import {pathToFileURL} from "node:url";
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import {anthropicFederationConfig, tokenSourceFor} from
  "../../programs/assistant/provider";
import {
  AiFallbackRefusal,
  type AiFallbackRefusalReason,
  type AiFallbackReservation,
  type LedgerDeps,
  monthKeyOf,
  reserveAiRead,
  settleAiRead,
} from "./ledger";
import {
  readAiFallbackOverride,
  readyAiFallbackPolicy,
  type ReadyAiFallbackPolicy,
} from "./policy";

// One AI fallback read: the operations GuardedModelRunner (schema-checked
// output, cache, bounded budgets) over the Anthropic Messages adapter,
// authenticated by the programme assistant's Workload Identity Federation
// token (no stored key). The runner's cache is aiFallbackResults, keyed by
// the hash of task, prompt version, model, input and output schema, so a
// preview and its apply share one paid call. Its beforeUse hook reserves
// the durable allowance only when the cache misses. Every paid or failed
// call writes one aiFallbackAudit row: command, task, outcome, tokens and
// cost; never the input, the output, a uid or a name.

export const AI_FALLBACK_RESULTS = "aiFallbackResults";
export const AI_FALLBACK_AUDIT = "aiFallbackAudit";
/** A reference the federation port resolves; there is no stored key. */
export const AI_FALLBACK_CREDENTIAL_REF =
  "anthropic/workload-identity-federation";
const RESULT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Input, prompt and schema must render under the provider's 32 KiB. */
const MAX_INPUT_BYTES = 20_000;
const MAX_PROMPT_BYTES = 6_000;
const PROVIDER_MAX_BYTES = 32_768;
const TIMEOUT_MS = 60_000;

export interface AiFallbackRequest {
  uid: string;
  /** The catalog command reading, e.g. guests.import-list. */
  commandId: string;
  /** A bounded task id, e.g. guest-column-mapping. */
  task: string;
  promptVersion: string;
  prompt: string;
  /** Public data only: page text, or headers and column shapes. */
  input: Record<string, unknown>;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  maxOutputTokens: number;
  /** The caller's own ceiling for one call; above it, the read refuses. */
  maxCostMicros: number;
}

export type AiFallbackResult =
  | {status: "off"}
  | {status: "read"; output: unknown; cacheHit: boolean}
  | {status: "refused"; reason: AiFallbackRefusalReason};

interface ModelModules {
  GuardedModelRunner: new (options: Record<string, unknown>) => {
    run: (request: Record<string, unknown>) => Promise<{output: unknown;
      provenance: {cacheHit: boolean; metadata?: {tokens?: Tokens}}}>;
  };
  BudgetLedger: new (options: {limits: Record<string, number>}) => unknown;
  createAnthropicProvider: (options: Record<string, unknown>) =>
    {run: (request: Record<string, unknown>) => Promise<unknown>};
  attemptCostMicros: (attempt: Record<string, unknown>) => number;
  stepCeilingMicros: (step: Record<string, unknown>) => number;
}

interface Tokens {
  ordinaryInput: number;
  cacheRead: number | null;
  cacheWrite: number | null;
  outputTotal: number;
}

export interface AiFallbackDeps extends LedgerDeps {
  policy: () => Promise<ReadyAiFallbackPolicy | null>;
  modules: () => Promise<ModelModules>;
  /** A short-lived federation access token. */
  accessToken: () => Promise<string>;
  transport: typeof fetch;
}

/** Loads the operations runtime the Functions build copies into lib. */
export async function packagedModelModules(): Promise<ModelModules> {
  const load = (relative: string) => import(pathToFileURL(path.resolve(
    __dirname, "../../operations/src", relative)).href);
  const [runner, budget, anthropic, prices] = await Promise.all([
    load("platform/model/guarded-model-runner.mjs"),
    load("platform/budget.mjs"),
    load("platform/model/anthropic-provider.mjs"),
    load("platform/model/price-book.mjs"),
  ]);
  return {GuardedModelRunner: runner.GuardedModelRunner,
    BudgetLedger: budget.BudgetLedger,
    createAnthropicProvider: anthropic.createAnthropicProvider,
    attemptCostMicros: prices.attemptCostMicros,
    stepCeilingMicros: prices.stepCeilingMicros};
}

/** The deployed dependencies: off unless the policy and federation are. */
export function defaultAiFallbackDeps(): AiFallbackDeps {
  const db = admin.firestore();
  return {
    db,
    now: () => new Date(),
    serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
    timestampFromMillis: (millis) =>
      admin.firestore.Timestamp.fromMillis(millis),
    policy: async () => {
      const ready = readyAiFallbackPolicy(undefined,
        await readAiFallbackOverride(db));
      if (ready && !anthropicFederationConfig()) {
        throw new Error("ai_fallback_policy_not_ready");
      }
      return ready;
    },
    modules: packagedModelModules,
    accessToken: async () => {
      const config = anthropicFederationConfig();
      if (!config) throw new Error("ai_fallback_policy_not_ready");
      return tokenSourceFor(config).accessToken();
    },
    transport: (...args) => fetch(...args),
  };
}

/** The runner's cache port over aiFallbackResults. */
function resultCache(deps: AiFallbackDeps, task: string) {
  const results = deps.db.collection(AI_FALLBACK_RESULTS);
  return {
    get: async (key: string) => {
      const snap = await results.doc(key).get();
      const json = snap.data()?.recordJson;
      return typeof json === "string" ? JSON.parse(json) : null;
    },
    put: async (key: string, record: unknown) => {
      const now = deps.now().getTime();
      await results.doc(key).set({schemaVersion: 1, cacheKey: key, task,
        recordJson: JSON.stringify(record), createdAt: deps.serverTimestamp(),
        // A TTL policy on expiresAt removes cached reads after 30 days.
        expiresAt: deps.timestampFromMillis(now + RESULT_TTL_MS)});
    },
  };
}

async function audit(deps: AiFallbackDeps, request: AiFallbackRequest,
  outcome: "paid" | "failed" | "refused", usage: {inputTokens: number;
    outputTokens: number; costMicros: number}): Promise<void> {
  try {
    await deps.db.collection(AI_FALLBACK_AUDIT).add({schemaVersion: 1,
      commandId: request.commandId, task: request.task, outcome,
      inputTokens: usage.inputTokens, outputTokens: usage.outputTokens,
      costMicros: usage.costMicros, monthKey: monthKeyOf(deps.now()),
      createdAt: deps.serverTimestamp()});
  } catch (error) {
    logger.warn("AI fallback audit row was not written.",
      {task: request.task,
        error: error instanceof Error ? error.name : "error"});
  }
}

const NOTHING = {inputTokens: 0, outputTokens: 0, costMicros: 0};

/**
 * Reads one input with the model when the policy is on. Never throws for a
 * provider or budget failure: the command shows its own fallback instead.
 * Throws only when the policy is half switched on (not ready).
 * @return {Promise<AiFallbackResult>} Off, the read output, or a refusal.
 */
export async function runAiFallback(request: AiFallbackRequest,
  deps: AiFallbackDeps = defaultAiFallbackDeps()): Promise<AiFallbackResult> {
  const policy = await deps.policy();
  if (!policy) return {status: "off"};
  const modules = await deps.modules();
  const inputBytes = Buffer.byteLength(JSON.stringify(request.input));
  if (inputBytes > MAX_INPUT_BYTES ||
      Buffer.byteLength(request.prompt) > MAX_PROMPT_BYTES) {
    return {status: "refused", reason: "ai_unreadable"};
  }
  // Bytes bound tokens from above, so the reservation can only over-count.
  const estimatedInputTokens = inputBytes + Buffer.byteLength(request.prompt) +
    Buffer.byteLength(JSON.stringify(request.outputSchema)) + 256;
  const worstMicros = modules.stepCeilingMicros({modelId: policy.modelId,
    inputTokens: estimatedInputTokens,
    maxOutputTokens: request.maxOutputTokens, maxWebSearches: 0});
  if (worstMicros > request.maxCostMicros) {
    logger.warn("AI fallback read is above its per-call ceiling.",
      {task: request.task, worstMicros});
    return {status: "refused", reason: "ai_unreadable"};
  }
  const provider = modules.createAnthropicProvider({enabled: true,
    authScheme: "oauth_bearer", modelId: policy.modelId,
    promptVersion: request.promptVersion, prompt: request.prompt,
    inputSchema: request.inputSchema,
    serverSecretRef: AI_FALLBACK_CREDENTIAL_REF,
    resolveSecret: () => deps.accessToken(), transport: deps.transport,
    timeoutMs: TIMEOUT_MS, maxAttempts: 1, maxNetworkRequests: 1,
    maxInputBytes: PROVIDER_MAX_BYTES,
    maxOutputTokens: request.maxOutputTokens, maxCostMicros: worstMicros});
  const held: {reservation: AiFallbackReservation | null} =
    {reservation: null};
  const runner = new modules.GuardedModelRunner({enabled: true, provider,
    providerId: "anthropic", modelId: policy.modelId,
    cache: resultCache(deps, request.task),
    budget: new modules.BudgetLedger({limits: {modelCalls: 1,
      networkRequests: 1, modelInputTokens: estimatedInputTokens,
      modelOutputTokens: request.maxOutputTokens,
      modelCostMicros: worstMicros}}),
    maxInputBytes: PROVIDER_MAX_BYTES,
    beforeUse: async ({cacheHit}: {cacheHit: boolean}) => {
      if (cacheHit) return;
      held.reservation = await reserveAiRead(deps, {uid: request.uid,
        worstMicros,
        monthlyCapMicros: policy.monthlyCapMicros,
        perUidDailyReads: policy.perUidDailyReads});
    }});
  try {
    const {output, provenance} = await runner.run({task: request.task,
      promptVersion: request.promptVersion, input: request.input,
      outputSchema: request.outputSchema, estimatedInputTokens,
      maxOutputTokens: request.maxOutputTokens, maxCostMicros: worstMicros,
      maxNetworkRequests: 1});
    const reservation = held.reservation;
    if (provenance.cacheHit || !reservation) {
      return {status: "read", output, cacheHit: true};
    }
    const tokens = provenance.metadata?.tokens;
    const costMicros = tokens ? modules.attemptCostMicros({
      model: policy.modelId, inputTokens: tokens.ordinaryInput,
      outputTokens: tokens.outputTotal,
      cacheReadTokens: tokens.cacheRead ?? 0,
      cacheWriteTokens: tokens.cacheWrite ?? 0}) : worstMicros;
    await settleAiRead(deps, reservation, {actualMicros: costMicros,
      paid: true});
    await audit(deps, request, "paid", {costMicros,
      inputTokens: tokens ? tokens.ordinaryInput + (tokens.cacheRead ?? 0) +
        (tokens.cacheWrite ?? 0) : 0,
      outputTokens: tokens?.outputTotal ?? 0});
    return {status: "read", output, cacheHit: false};
  } catch (error) {
    if (error instanceof AiFallbackRefusal) {
      await audit(deps, request, "refused", NOTHING);
      return {status: "refused", reason: error.reason};
    }
    const reservation = held.reservation;
    let charged = 0;
    if (reservation) {
      // Nothing reached the provider, or it rejected the call unbilled:
      // give the money back. Anything else may have been billed: keep it.
      const outcome = (error as {details?: {outcome?: unknown}})
        ?.details?.outcome;
      charged = outcome === "not_submitted" || outcome === "rejected" ?
        0 : reservation.worstMicros;
      await settleAiRead(deps, reservation,
        {actualMicros: charged, paid: false})
        .catch(() => undefined);
    }
    logger.warn("AI fallback read did not produce a usable draft.",
      {task: request.task,
        code: (error as {code?: unknown})?.code ?? "error"});
    await audit(deps, request, "failed", {...NOTHING, costMicros: charged});
    return {status: "refused", reason: "ai_unreadable"};
  }
}
