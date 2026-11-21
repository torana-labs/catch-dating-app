// The AI fallback for the try-it import tools (#2062; owner decisions,
// 20 Nov 2026): when a command's own parser cannot read a link or file, a
// model reads it and fills the same draft for the host to check. This
// policy is OFF. Turning it on is a code change that must name both the
// owner's decision and the published privacy-policy line; until both are
// set, an enabled policy throws ai_fallback_policy_not_ready and nothing is
// sent to a model.
//
// The live cap and per-visitor limit can be changed without a deploy in
// aiFallbackPolicies/current, which can also switch the fallback off, but
// never on: an override only lowers or raises the numbers below.

/**
 * The model for this path, priced in the reviewed price book. Claude Haiku
 * 5.5 since 21 Nov 2026 (owner's choice): on a 22-case comparison of these
 * prompts it read events, organisers, forms and column maps as well as
 * Claude Opus 5.5, faster and at about 1/35 of the cost per read.
 */
export const AI_FALLBACK_MODEL_ID = "claude-haiku-5-5";
/** No override may raise the monthly cap above US$1,000. */
export const AI_FALLBACK_MAX_MONTHLY_CAP_MICROS = 1_000_000_000;
export const AI_FALLBACK_MAX_DAILY_READS = 100;
export const AI_FALLBACK_POLICIES = "aiFallbackPolicies";
export const AI_FALLBACK_POLICY_DOC = "current";

export interface AiFallbackPolicy {
  schemaVersion: 1;
  enabled: boolean;
  modelId: typeof AI_FALLBACK_MODEL_ID;
  /** Worst-case reservations plus settled spend may not pass this. */
  monthlyCapMicros: number;
  /** Paid model reads per signed-in visitor per UTC day. */
  perUidDailyReads: number;
  /** The owner's decision record for the cap, model, credential and data. */
  decisionId: string | null;
  /**
   * The published privacy-policy line naming the provider and the AI
   * processing, e.g. "website-legal-ai-reading-2231" once that website PR
   * is merged and live. Null keeps the fallback off.
   */
  privacyNoticeRef: string | null;
}

/** Off. The cap, limit and decision are the owner's (20 Nov 2026). */
export const AI_FALLBACK_POLICY: AiFallbackPolicy = Object.freeze({
  schemaVersion: 1,
  enabled: false,
  modelId: AI_FALLBACK_MODEL_ID,
  monthlyCapMicros: 50_000_000,
  perUidDailyReads: 5,
  decisionId: "issue-2062-comment-7045984815",
  privacyNoticeRef: null,
});

/** The no-deploy override: numbers and an off switch only. */
export interface AiFallbackPolicyOverride {
  disabled?: boolean;
  monthlyCapMicros?: number;
  perUidDailyReads?: number;
}

export type ReadyAiFallbackPolicy = Omit<AiFallbackPolicy,
  "decisionId" | "privacyNoticeRef"> & {
  enabled: true;
  decisionId: string;
  privacyNoticeRef: string;
};

const REF = /^[a-z0-9][a-z0-9._-]{2,127}$/u;

const boundedInteger = (value: unknown, max: number): number | null =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 1 &&
    value <= max ? value : null;

/**
 * The policy in force: null while off (in code or by override), the ready
 * policy when every precondition holds. An enabled policy missing its
 * decision, its privacy notice or a usable cap throws, so a half-finished
 * switch-on fails closed instead of reading files with a model.
 * @return {ReadyAiFallbackPolicy|null} The policy, or null while off.
 */
export function readyAiFallbackPolicy(
  policy: AiFallbackPolicy = AI_FALLBACK_POLICY,
  override: AiFallbackPolicyOverride | null = null
): ReadyAiFallbackPolicy | null {
  if (!policy.enabled || override?.disabled === true) return null;
  const monthlyCapMicros = override?.monthlyCapMicros !== undefined ?
    boundedInteger(override.monthlyCapMicros,
      AI_FALLBACK_MAX_MONTHLY_CAP_MICROS) :
    boundedInteger(policy.monthlyCapMicros,
      AI_FALLBACK_MAX_MONTHLY_CAP_MICROS);
  const perUidDailyReads = override?.perUidDailyReads !== undefined ?
    boundedInteger(override.perUidDailyReads, AI_FALLBACK_MAX_DAILY_READS) :
    boundedInteger(policy.perUidDailyReads, AI_FALLBACK_MAX_DAILY_READS);
  if (policy.modelId !== AI_FALLBACK_MODEL_ID ||
      !policy.decisionId || !REF.test(policy.decisionId) ||
      !policy.privacyNoticeRef || !REF.test(policy.privacyNoticeRef) ||
      monthlyCapMicros === null || perUidDailyReads === null) {
    throw new Error("ai_fallback_policy_not_ready");
  }
  return {...policy, enabled: true, decisionId: policy.decisionId,
    privacyNoticeRef: policy.privacyNoticeRef, monthlyCapMicros,
    perUidDailyReads};
}

/**
 * Reads the override document; a missing or unreadable one changes nothing
 * except that an unreadable one keeps the fallback off.
 * @return {Promise<AiFallbackPolicyOverride|null>} The override.
 */
export async function readAiFallbackOverride(
  db: FirebaseFirestore.Firestore
): Promise<AiFallbackPolicyOverride | null> {
  try {
    const snap = await db.collection(AI_FALLBACK_POLICIES)
      .doc(AI_FALLBACK_POLICY_DOC).get();
    if (!snap.exists) return null;
    const data = snap.data() ?? {};
    return {disabled: data.disabled === true,
      monthlyCapMicros: typeof data.monthlyCapMicros === "number" ?
        data.monthlyCapMicros : undefined,
      perUidDailyReads: typeof data.perUidDailyReads === "number" ?
        data.perUidDailyReads : undefined};
  } catch {
    return {disabled: true};
  }
}
