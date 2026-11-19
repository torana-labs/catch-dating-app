import type {VerificationMethodId} from "./methods";

// The channel proofs a person checks (issue #2096). The listing request form
// (/listings/request/: claim, remove and impersonation requests) takes one of
// these, and staff verify it by hand. They sit beside the automated methods
// in methods.ts so every flow that verifies an organizer names its proofs
// from one place; a new kind of proof is one entry here, not a change in
// each flow.

export type StaffReviewMethodId = "instagramCode" | "domainEmail" |
  "letterhead";

/** What a request states about the channel it proves. */
export interface ChannelProofClaim {
  officialHandle?: string;
  officialDomain?: string;
  /** The address staff reply to. */
  requesterEmail: string;
}

/** Why a request's channel proof cannot be reviewed as filed. */
export type ChannelProofProblem = "handle" | "domain" | "domainEmail";

export interface StaffReviewMethod {
  id: StaffReviewMethodId;
  /** staffReview: a person checks the proof. */
  kind: "staffReview";
  /**
   * The automated method that proves the same channel, when there is one.
   * An Instagram code a person checks proves what the instagramMessage
   * method proves without one.
   */
  automatedEquivalent: VerificationMethodId | null;
  /** The first thing the request is missing for this proof, or null. */
  requestProblem: (claim: ChannelProofClaim) => ChannelProofProblem | null;
}

const instagramCode: StaffReviewMethod = {
  id: "instagramCode",
  kind: "staffReview",
  automatedEquivalent: "instagramMessage",
  requestProblem: (claim) => claim.officialHandle ? null : "handle",
};

const domainEmail: StaffReviewMethod = {
  id: "domainEmail",
  kind: "staffReview",
  automatedEquivalent: null,
  requestProblem: (claim) => {
    if (!claim.officialDomain) return "domain";
    const emailDomain = claim.requesterEmail.split("@")[1] ?? "";
    return emailDomain === claim.officialDomain ||
      emailDomain.endsWith(`.${claim.officialDomain}`) ? null : "domainEmail";
  },
};

const letterhead: StaffReviewMethod = {
  id: "letterhead",
  kind: "staffReview",
  automatedEquivalent: null,
  requestProblem: (claim) =>
    claim.officialDomain || claim.officialHandle ? null : "domain",
};

/** Every staff-review method. */
export const STAFF_REVIEW_METHODS: readonly StaffReviewMethod[] =
  [instagramCode, domainEmail, letterhead];

export function staffReviewMethod(id: string): StaffReviewMethod {
  const method = STAFF_REVIEW_METHODS.find((entry) => entry.id === id);
  if (!method) throw new Error(`Unknown staff review method: ${id}`);
  return method;
}
