import type {AdminRoleClaim} from "../../../shared/types/adminTypes";

/**
 * Roles are three jobs (owner decision, 1 Nov 2026): owner, sales associate,
 * and ops and support. Each job is one role claim; the older `admin` and
 * `safetyReviewer` claims still read as ops until they are reassigned.
 */
export type TeamJob = "owner" | "sales" | "ops" | "none";

export const TEAM_JOBS: Array<{job: TeamJob; title: string;
  subtitle: string}> = [
  {job: "owner", title: "Owner",
    subtitle: "Everything, including money, settings and the team. " +
      "Approves claims."},
  {job: "sales", title: "Sales associate",
    subtitle: "Their hosts, tasks and deals; their own nominations; the " +
      "organizer and event directories, read only."},
  {job: "ops", title: "Ops and support",
    subtitle: "The inbox (approves listings and events, recommends " +
      "claims), safety, support and people search."},
  {job: "none", title: "No access",
    subtitle: "Removes every Admin role. Their Catch account stays."},
];

export function jobOf(roles: readonly AdminRoleClaim[]): TeamJob {
  if (roles.includes("adminOwner")) return "owner";
  if (roles.some((role) => role === "admin" || role === "support" ||
    role === "safetyReviewer")) return "ops";
  if (roles.includes("salesStaff")) return "sales";
  return "none";
}

export function rolesForJob(job: TeamJob): AdminRoleClaim[] {
  if (job === "owner") return ["adminOwner"];
  if (job === "sales") return ["salesStaff"];
  if (job === "ops") return ["support"];
  return [];
}

export function jobTitle(job: TeamJob): string {
  return TEAM_JOBS.find((item) => item.job === job)?.title ?? "No access";
}
