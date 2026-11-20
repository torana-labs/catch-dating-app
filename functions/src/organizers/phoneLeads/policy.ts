/* eslint-disable max-len */
// Shadow organizer profiles (owner decision, 20 Nov 2026): when a person signs
// into Catch Host and their verified phone matches a phone Catch already holds
// for an unclaimed organizer, Catch Host offers "Is this you?", pre-fills the
// profile from that organizer and asks only for what is missing. Ownership
// still goes through the claim request: staff approve it, or the existing
// Instagram or Luma verification approves it at once (#2096 registry).
//
// Everything ships switched off. The owner has not chosen which phone sources
// feed the index yet, so each source has its own switch and all are off.
// Turning anything on is a code change that cites the owner's decision.

export const PHONE_LEAD_SOURCES = [
  "self_verified_submitter",
  "sales_crm_verified",
  "public_page",
  "staff_entered",
] as const;
export type PhoneLeadSource = typeof PHONE_LEAD_SOURCES[number];

/** How much a source says about who answers the number. */
export const SOURCE_STRENGTH: Record<PhoneLeadSource, "strong" | "medium" | "weak"> = {
  // The person verified the number themselves while submitting the page.
  self_verified_submitter: "strong",
  // Staff confirmed the number belongs to the organizer.
  sales_crm_verified: "strong",
  // Staff typed the number in but did not confirm it.
  staff_entered: "medium",
  // Printed on a public page: often a venue's or a shared line.
  public_page: "weak",
};

export interface ShadowProfilePolicy {
  enabled: boolean;
  decisionId: string | null;
  sources: Record<PhoneLeadSource, boolean>;
}

export const SHADOW_PROFILE_POLICY: ShadowProfilePolicy = Object.freeze({
  enabled: false,
  decisionId: null,
  sources: Object.freeze({
    self_verified_submitter: false,
    sales_crm_verified: false,
    public_page: false,
    staff_entered: false,
  }),
});

/**
 * Whether a source may write to or be read from the index under [policy].
 * An enabled policy without a decision id is a programming error.
 * @return {boolean} True when the feature and the source are both on.
 */
export function sourceEnabled(source: PhoneLeadSource,
  policy: ShadowProfilePolicy = SHADOW_PROFILE_POLICY): boolean {
  if (!policy.enabled) return false;
  if (!policy.decisionId) throw new Error("shadow_profile_policy_not_ready");
  return policy.sources[source] === true;
}

/**
 * Whether the feature is on for at least one source.
 * @return {boolean} True when any source can match.
 */
export function anySourceEnabled(
  policy: ShadowProfilePolicy = SHADOW_PROFILE_POLICY): boolean {
  return PHONE_LEAD_SOURCES.some((source) => sourceEnabled(source, policy));
}
