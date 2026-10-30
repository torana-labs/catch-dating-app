import type {CommercialTerms} from "../../generated/contracts/commercialTerms";

/**
 * The owner's 30 Oct 2026 decision on Catch's commercial terms
 * (catch-knowledge decisions/2026-10-30-membership-money-flow-and-commercial-terms.md).
 * The Admin console offers it as a starting draft while platform terms are
 * unsaved; nothing reads it at payment time. An operator still reviews the
 * preview and saves it with a reason, so the server records who applied it.
 *
 * Catch is not merchant of record, so nothing is deducted at source for any
 * purpose; the commission is billed to the host afterwards. Catch holds no
 * GSTIN, so amounts are before GST and no GST is added for now.
 */
export const ownerDecisionCommercialTerms: Readonly<CommercialTerms> = {
  currency: "INR",
  commission: {
    rateBasisPoints: 500,
    capMinor: 1_000_000,
    cycleDays: 30,
    cycleAnchor: "trialEnd",
    base: "netOfRefunds",
    taxTreatment: "exclusive",
  },
  trial: {days: 30, anchor: "firstEvent"},
  toolsOnly: {feeMinor: 500_000},
  gatewayFeeBearer: "host",
  purposes: {
    eventAdmission: {countsTowardCommission: true, atSourceFeeBasisPoints: 0},
    formFee: {countsTowardCommission: true, atSourceFeeBasisPoints: 0},
    hostMembership: {countsTowardCommission: true, atSourceFeeBasisPoints: 0},
  },
};

export const ownerDecisionCommercialTermsReason =
  "Owner decision 2026-10-30: membership money flow and commercial terms";
