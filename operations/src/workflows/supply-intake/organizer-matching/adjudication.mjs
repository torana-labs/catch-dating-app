import {hashValue} from "../../../platform/canonical-json.mjs";
import {OperationsError, invariant} from "../../../platform/errors.mjs";

// Model adjudication of an ambiguous organizer match, behind Supply Intake's
// one guarded extraction router (model-fallback.mjs). Ported from the legacy
// llm_source_resolution prompt payloads, which refused every model call. The
// router keeps that refusal: the checked model policy is disabled with zero
// ceilings, so a cache miss fails closed with MODEL_DISABLED. When the owner
// enables it, the answer is still a proposal for the reviewer: it never
// changes the deterministic verdict, merges organizers or approves a listing.

export const ORGANIZER_ADJUDICATION_SOURCE_PROFILE = "supply_intake_organizer_matching";
export const ORGANIZER_ADJUDICATION_MAX_CANDIDATES = 8;
const MAX_EXCERPT_CHARACTERS = 20_000;

const INSTRUCTIONS = "You review whether a new organizer listing describes an organizer Catch already lists. " +
  "Deterministic rules are primary: use only the scorecard and the facts given here and do not add facts. " +
  "Set identityResolution.status to resolved with candidateKey set to the one organizerId it duplicates, " +
  "or ambiguous with candidateKey null when it cannot tell, or not_applicable when it is a new organizer. " +
  "Return no extracted fields.";

/**
 * The router request for one ambiguous verdict. A match or a none verdict is
 * already decided deterministically and is refused here.
 */
export function organizerAdjudicationRequest({result, observedAt, estimatedInputTokens = 2_000,
  maxOutputTokens = 512, maxCostMicros = 10_000}) {
  invariant(result?.policyId && Array.isArray(result.candidates), "INVALID_ORGANIZER_ADJUDICATION",
    "Adjudication requires an organizer match result.");
  if (result.verdict !== "ambiguous") {
    throw new OperationsError("ORGANIZER_ADJUDICATION_NOT_ELIGIBLE",
      "Only an ambiguous organizer match can be sent for model adjudication.", {details: {verdict: result.verdict}});
  }
  invariant(typeof observedAt === "string" && Number.isFinite(Date.parse(observedAt)),
    "INVALID_ORGANIZER_ADJUDICATION", "Adjudication requires the listing's observation time.");
  const candidates = result.candidates.slice(0, ORGANIZER_ADJUDICATION_MAX_CANDIDATES).map((candidate) => ({
    organizerId: candidate.organizerId,
    name: candidate.name,
    markets: candidate.markets,
    score: candidate.score,
    signals: candidate.signals.map((signal) => ({code: signal.code, detail: signal.detail})),
    conflicts: candidate.conflicts.map((conflict) => ({code: conflict.code, detail: conflict.detail})),
  }));
  const payload = {
    task: "adjudicate_organizer_duplicate",
    instructions: INSTRUCTIONS,
    policyId: result.policyId,
    deterministic: {verdict: result.verdict, reasons: result.reasons},
    listing: {
      names: result.subject.names,
      markets: result.subject.markets,
      identityKeys: result.subject.identityKeys,
    },
    candidates,
  };
  const excerpt = JSON.stringify(payload);
  invariant(excerpt.length <= MAX_EXCERPT_CHARACTERS, "INVALID_ORGANIZER_ADJUDICATION",
    "The adjudication payload exceeds the router's excerpt cap.");
  return {
    sourceProfileId: ORGANIZER_ADJUDICATION_SOURCE_PROFILE,
    artifactHash: hashValue({subjectHash: result.subjectHash, inventoryHash: result.inventoryHash,
      policyId: result.policyId}),
    observedAt,
    reason: "ambiguous_identity",
    sourceUrl: null,
    deterministic: {
      attempted: true,
      resolved: false,
      profileFound: true,
      identityScorecard: result.identityScorecard,
      evidence: {
        policyId: result.policyId,
        verdict: result.verdict,
        candidates: candidates.map((candidate) => ({organizerId: candidate.organizerId, score: candidate.score})),
      },
    },
    input: {excerpt},
    estimatedInputTokens,
    maxOutputTokens,
    maxCostMicros,
  };
}

/**
 * Sends an ambiguous verdict through the injected extraction router. The
 * result is a proposal beside the unchanged deterministic verdict; a proposal
 * naming an organizer outside the candidates is discarded.
 */
export async function adjudicateOrganizerMatch({result, router, observedAt, ...ceilings}) {
  invariant(router && typeof router.resolve === "function", "MODEL_RUNNER_REQUIRED",
    "Organizer adjudication requires Supply Intake's guarded extraction router.");
  const request = organizerAdjudicationRequest({result, observedAt, ...ceilings});
  const routed = await router.resolve(request);
  const proposal = routed.output?.identityResolution ?? null;
  const known = new Set(result.candidates.map((candidate) => candidate.organizerId));
  const valid = proposal !== null && (proposal.status !== "resolved" || known.has(proposal.candidateKey));
  return {
    authority: "proposal_only",
    reviewRequired: true,
    verdict: result.verdict,
    route: routed.route,
    proposal: valid ? {status: proposal.status, organizerId: proposal.status === "resolved" ? proposal.candidateKey : null,
      rationale: proposal.rationale ?? null} : null,
    proposalRejected: valid ? null : "candidate_not_in_scorecard",
  };
}
