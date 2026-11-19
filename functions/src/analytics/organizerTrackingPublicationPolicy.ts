/**
 * Publication policy for organiser-owned Meta Pixel and GA4 IDs on public
 * organiser pages (issue #2063, docs/ads_conversion_spec.md, "Organiser-owned
 * tags").
 *
 * This record is code-owned and versioned. Saved IDs, organiser settings,
 * claim approval and deploy configuration cannot lift it: only a reviewed
 * change to this file that adds a new version and cites the owner's policy
 * sign-off can. The current version records the owner's 18 Nov 2026 decision
 * (the technical checklist belongs to the command layer; the owner does the
 * final policy sign-off), and publication stays disabled until that sign-off.
 */

export interface OrganizerTrackingOwnerDecision {
  /** Where the decision is recorded. */
  readonly reference: string;
  /** ISO date of the decision. */
  readonly decidedOn: string;
  readonly summary: string;
}

export interface OrganizerTrackingPublicationPolicy {
  readonly version: number;
  /**
   * Whether organiser IDs may reach a public page. `false` is the only value
   * the type admits until a reviewed version with the owner's policy sign-off
   * widens it together with the public response contract.
   */
  readonly publicationAllowed: false;
  /** Why publication is not allowed, as the owner settings show it. */
  readonly blockedReason: "policyReviewRequired";
  readonly ownerDecision: OrganizerTrackingOwnerDecision;
  /** Checklist items on #2063 that must be evidenced before a new version. */
  readonly outstandingChecks: readonly string[];
  /** Canonical activity kinds that never carry organiser tags. */
  readonly excludedActivityKinds: readonly string[];
  /** Canonical interaction models that never carry organiser tags. */
  readonly excludedInteractionModels: readonly string[];
}

export const organizerTrackingPublicationPolicy:
  OrganizerTrackingPublicationPolicy = Object.freeze({
    version: 1,
    publicationAllowed: false,
    blockedReason: "policyReviewRequired",
    ownerDecision: Object.freeze({
      reference: "torana-labs/catch-dating-app#2063",
      decidedOn: "2026-11-18",
      summary: "The command layer owns the technical checklist; the owner " +
        "does the final policy sign-off. Publication stays off until then.",
    }),
    outstandingChecks: Object.freeze([
      "separation", "consentGate", "eligibleRoutes", "eventMap",
      "ownerSettings", "testReceipts", "docs", "ownerPolicySignOff",
    ]),
    excludedActivityKinds: Object.freeze(
      ["socialRun", "singlesMixer", "barCrawl", "dinner"]),
    excludedInteractionModels: Object.freeze(
      ["pairedRotations", "seatedTable", "freeFormMixer", "routeStops"]),
  });

export type OrganizerTrackingEventPolicyReason =
  "policyReviewRequired" | "sensitiveEvent" | "eventClassificationUnavailable";

/**
 * Why an event's page carries no organiser tags. Classification is the
 * canonical `eventFormat`, never free-text names or answers; a missing or
 * unknown version fails closed.
 */
export function organizerTrackingEventPolicyReason(
  event: Record<string, unknown>,
  policy: OrganizerTrackingPublicationPolicy =
  organizerTrackingPublicationPolicy
): OrganizerTrackingEventPolicyReason {
  const format = event.eventFormat as Record<string, unknown> | undefined;
  if (!format || format.version !== 1 ||
      typeof format.activityKind !== "string" ||
      typeof format.interactionModel !== "string") {
    return "eventClassificationUnavailable";
  }
  if (policy.excludedActivityKinds.includes(format.activityKind) ||
      policy.excludedInteractionModels.includes(format.interactionModel)) {
    return "sensitiveEvent";
  }
  return policy.blockedReason;
}
