// The model fallback for guest-list columns no converter recognised (owner
// decision, 18 Nov 2026): built now, switched off until go-live. The policy
// below is disabled with every budget at zero, so the command answers "map
// the columns yourself". Reads go through the shared try-it AI fallback
// (commands/aiFallback, #2062): its GuardedModelRunner, durable monthly cap
// and per-visitor daily limit, result cache and audit. Both this policy and
// the shared one must be on before a model sees anything.
//
// The model sees headers and one value shape per column, never a cell value
// (decision on #2061): the guarded runner's rules forbid sending a guest
// list to a model. Its proposal goes through proposeHostRosterMapping
// (hostRosterIntakeCore.ts), which validates it, and every field it chose
// is stored with origin modelProposal for the host to review.

import type {HostRosterMappingProposalProvider} from
  "../events/hostRosterIntakeCore";
import type {ColumnShape} from "./columnShapes";
import {runAiFallback, type AiFallbackDeps} from
  "../commands/aiFallback/runner";

export interface GuestMappingModelPolicy {
  schemaVersion: 1;
  policyVersion: string;
  provider: {
    enabled: boolean;
    modelId: string | null;
    promptVersion: string;
    policyGapId: string;
    decisionId: string | null;
  };
  budgets: {
    maxModelCallsPerProfilePerMonth: number;
    maxModelCallsPerMonth: number;
    maxInputTokensPerCall: number;
    maxOutputTokensPerCall: number;
    /** The ceiling for one call; the shared fallback refuses above it. */
    maxCostMicrosPerCall: number;
    maxCostMicrosPerMonth: number;
  };
}

/** Off until go-live: no model, no decision, zero budgets. */
export const GUEST_MAPPING_MODEL_POLICY: GuestMappingModelPolicy =
  Object.freeze({
    schemaVersion: 1,
    policyVersion: "guest-mapping-disabled-v1",
    provider: Object.freeze({
      enabled: false,
      modelId: null,
      promptVersion: "guest-column-mapping-v1",
      policyGapId: "guest_import_mapping_fallback_policy",
      decisionId: null,
    }),
    budgets: Object.freeze({
      maxModelCallsPerProfilePerMonth: 0,
      maxModelCallsPerMonth: 0,
      maxInputTokensPerCall: 0,
      maxOutputTokensPerCall: 0,
      maxCostMicrosPerCall: 0,
      maxCostMicrosPerMonth: 0,
    }),
  }) as GuestMappingModelPolicy;

/** The part of GuardedModelRunner this fallback uses. */
export interface GuestMappingModelRunner {
  run(request: {
    task: string;
    promptVersion: string;
    input: unknown;
    outputSchema: Record<string, unknown>;
    estimatedInputTokens: number;
    maxOutputTokens: number;
    maxCostMicros: number;
    maxNetworkRequests: number;
  }): Promise<{output: unknown}>;
}

const SHAPES: readonly ColumnShape[] = ["empty", "phone-like", "email-like",
  "date-like", "number", "text"];
const MAPPABLE = ["displayName", "phone", "email", "externalReference",
  "arrivalGroup", "ticketType", "status"] as const;

/**
 * What the model must return: a column index per field it is sure of.
 * Anthropic structured outputs take no numeric ranges, so the index and
 * confidence bounds are checked by proposeHostRosterMapping instead.
 */
export const GUEST_MAPPING_OUTPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["mapping", "confidence"],
  properties: {
    mapping: {
      type: "object",
      additionalProperties: false,
      properties: Object.fromEntries(MAPPABLE.map((field) =>
        [field, {type: "integer"}])),
    },
    confidence: {type: "number"},
  },
};

/**
 * The proposal provider for proposeHostRosterMapping, or null while the
 * policy is off (the host maps the columns). An enabled policy without the
 * owner's accepted decision, or without a bound runner, is refused.
 * @return {HostRosterMappingProposalProvider|null} The provider.
 */
export function guestMappingProposalProvider(params: {
  policy?: GuestMappingModelPolicy;
  runner?: GuestMappingModelRunner | null;
} = {}): HostRosterMappingProposalProvider | null {
  const policy = params.policy ?? GUEST_MAPPING_MODEL_POLICY;
  if (!policy.provider.enabled) return null;
  if (!policy.provider.decisionId || !policy.provider.modelId ||
      policy.budgets.maxModelCallsPerMonth < 1 ||
      policy.budgets.maxModelCallsPerProfilePerMonth < 1 ||
      policy.budgets.maxOutputTokensPerCall < 1 ||
      policy.budgets.maxCostMicrosPerCall < 1 || !params.runner) {
    throw new Error("guest_mapping_policy_not_ready");
  }
  const runner = params.runner;
  return {
    async propose({headers, sampleRows}) {
      // sampleRows carries one row of column shapes, never cell values.
      const shapes = sampleRows[0] ?? [];
      if (shapes.length !== headers.length ||
          shapes.some((shape) => !SHAPES.includes(shape as ColumnShape))) {
        throw new Error("Guest mapping input must be column shapes only.");
      }
      const {output} = await runner.run({
        task: "guest-column-mapping",
        promptVersion: policy.provider.promptVersion,
        input: {headers, columnShapes: shapes},
        outputSchema: GUEST_MAPPING_OUTPUT_SCHEMA,
        estimatedInputTokens: Math.min(policy.budgets.maxInputTokensPerCall,
          64 + headers.join(" ").length),
        maxOutputTokens: policy.budgets.maxOutputTokensPerCall,
        // One call's ceiling, never the month's budget.
        maxCostMicros: policy.budgets.maxCostMicrosPerCall,
        maxNetworkRequests: 1,
      });
      const proposal = output as {mapping: Record<string, number>;
        confidence: number};
      return {mapping: {...proposal.mapping},
        confidence: proposal.confidence};
    },
  };
}

const GUEST_MAPPING_PROMPT = "You map a guest-list spreadsheet's columns to " +
  "Catch guest fields. You see only each column's header and the shape of " +
  "its values (empty, phone-like, email-like, date-like, number, text), " +
  "never a value. Return the zero-based column index for each field you " +
  "are sure of and leave out any field you are not; displayName is the " +
  "guest's name. confidence is how sure you are of the whole mapping.";

/** Closed input: headers and shapes only, no key a guest field could use. */
const GUEST_MAPPING_INPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["headers", "columnShapes"],
  properties: {
    headers: {type: "array", maxItems: 40,
      items: {type: "string", maxLength: 120}},
    columnShapes: {type: "array", maxItems: 40,
      items: {type: "string", enum: [...SHAPES]}},
  },
};

/**
 * The guest mapping runner over the shared AI fallback, for one visitor.
 * A refusal (cap, daily limit, unreadable) or the shared policy being off
 * throws, and the command asks the host to map the columns.
 * @return {GuestMappingModelRunner} The runner.
 */
export function aiFallbackGuestMappingRunner(params: {uid: string;
  commandId: string; deps?: () => AiFallbackDeps}): GuestMappingModelRunner {
  return {
    async run(request) {
      const result = await runAiFallback({uid: params.uid,
        commandId: params.commandId, task: request.task,
        promptVersion: request.promptVersion, prompt: GUEST_MAPPING_PROMPT,
        input: request.input as Record<string, unknown>,
        inputSchema: GUEST_MAPPING_INPUT_SCHEMA,
        outputSchema: request.outputSchema,
        maxOutputTokens: request.maxOutputTokens,
        maxCostMicros: request.maxCostMicros}, params.deps?.());
      if (result.status === "read") return {output: result.output};
      throw new Error(result.status === "off" ? "ai_fallback_off" :
        result.reason);
    },
  };
}
