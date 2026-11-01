import type {AdminRoleClaim, DataMode} from "../shared/types/adminTypes";

/**
 * The three Admin jobs (owner decision, 1 Nov). Each job has its own navigation; the role claims
 * still decide which areas a person may open. The retired finance and analytics viewer claims
 * folded into owner.
 */
export type AdminJob = "owner" | "sales" | "ops";

export const adminJobLabels: Record<AdminJob, string> = {
  owner: "Owner",
  sales: "Sales associate",
  ops: "Ops and support",
};

const jobClaims: Array<[AdminJob, readonly AdminRoleClaim[]]> = [
  ["owner", ["adminOwner"]],
  ["ops", ["admin", "support", "safetyReviewer"]],
  ["sales", ["salesStaff"]],
];

/** The job whose navigation a person sees. Sample data can preview any job with ?as=sales or ?as=ops. */
export function adminJobFor(roles: readonly string[], mode: DataMode, search = ""): AdminJob {
  if (mode === "sample") {
    const preview = new URLSearchParams(search).get("as");
    return preview === "sales" || preview === "ops" ? preview : "owner";
  }
  return jobClaims.find(([, claims]) => claims.some((claim) => roles.includes(claim)))?.[0] ?? "ops";
}
