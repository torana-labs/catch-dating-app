// The model fallback for guest-list columns no converter recognised (owner
// decision, 18 Nov 2026): built now, switched off until go-live. The policy
// below is disabled with every budget at zero, so the command answers "map
// the columns yourself". When the owner accepts the policy gap, the policy
// names the model and budgets, and a GuardedModelRunner
// (operations/src/platform/model) is bound here with the per-profile and
// monthly budgets.
//
// The model sees headers and one value shape per column, never a cell value
// (decision on #2061): the guarded runner's rules forbid sending a guest
// list to a model. Its proposal goes through proposeHostRosterMapping
// (hostRosterIntakeCore.ts), which validates it, and every field it chose
// is stored with origin modelProposal for the host to review.

import type {HostRosterMappingProposalProvider} from
  "../events/hostRosterIntakeCore";
import type {ColumnShape} from "./columnShapes";

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

/** What the model must return: a column index per field it is sure of. */
export const GUEST_MAPPING_OUTPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["mapping", "confidence"],
  properties: {
    mapping: {
      type: "object",
      additionalProperties: false,
      properties: Object.fromEntries(MAPPABLE.map((field) =>
        [field, {type: "integer", minimum: 0, maximum: 39}])),
    },
    confidence: {type: "number", minimum: 0, maximum: 1},
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
      policy.budgets.maxModelCallsPerProfilePerMonth < 1 || !params.runner) {
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
        maxCostMicros: policy.budgets.maxCostMicrosPerMonth,
        maxNetworkRequests: 1,
      });
      const proposal = output as {mapping: Record<string, number>;
        confidence: number};
      return {mapping: {...proposal.mapping},
        confidence: proposal.confidence};
    },
  };
}
