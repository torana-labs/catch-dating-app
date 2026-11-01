import type {AdminRoleClaim} from "../shared/types/adminTypes";
import {adminRoleClaimKeys} from "../shared/types/adminTypes";
import type {AdminJob} from "./adminJobs";
import type {AdminNavId} from "./adminRoutes";

const allButSales = adminRoleClaimKeys.filter((role) => role !== "salesStaff");
const owner: readonly AdminRoleClaim[] = ["adminOwner"];
const opsAndOwner: readonly AdminRoleClaim[] = ["admin", "adminOwner", "support"];

/**
 * Who may open each Admin area, by role claim. The sign-in entry reads this without loading any
 * screen; each area's label, icon and screen are in adminAreas.tsx.
 */
export const adminAreaRoles: Record<AdminNavId, readonly AdminRoleClaim[]> = {
  now: allButSales,
  more: adminRoleClaimKeys,
  "organizer-intake": opsAndOwner,
  "intake-review": opsAndOwner,
  safety: ["admin", "adminOwner", "safetyReviewer", "support"],
  support: ["adminOwner", "support"],
  sales: ["admin", "adminOwner", "salesStaff"],
  "sales-hosts": ["admin", "adminOwner", "salesStaff"],
  "sales-deals": ["admin", "adminOwner", "salesStaff"],
  nominations: ["admin", "adminOwner", "support", "salesStaff"],
  finance: owner,
  organizers: opsAndOwner,
  events: opsAndOwner,
  growth: owner,
  marketplace: owner,
  people: ["admin", "adminOwner", "safetyReviewer", "support"],
  users: owner,
  "cross-paths": ["admin", "adminOwner", "safetyReviewer", "support"],
  "marketing-ops": opsAndOwner,
  quality: owner,
  operations: opsAndOwner,
  settings: ["admin", "adminOwner", "safetyReviewer", "support"],
};

export interface AdminNavigationEntry {
  nav: AdminNavId;
  section?: string;
  /** Kept on the phone bar; everything else is under More. */
  pinned?: boolean;
  /** This job's name for the area, where it differs from the area's own. */
  label?: string;
  /** Areas with no entry of their own in this job's navigation that highlight this one. */
  alsoActive?: readonly AdminNavId[];
}

/**
 * Each job's navigation, in the order of the redesign's NAV table (catch-design-source
 * gen/admin_common.py). Areas still to be redrawn follow under "Older pages" until their
 * replacements land; each area's PR moves or removes its line here.
 */
export const adminNavigation: Record<AdminJob, AdminNavigationEntry[]> = {
  owner: [
    {nav: "now", pinned: true},
    {nav: "organizer-intake", section: "Work", pinned: true}, {nav: "safety", section: "Work"}, {nav: "support", section: "Work"},
    {nav: "sales", section: "Work", pinned: true, alsoActive: ["sales-hosts", "sales-deals"]}, {nav: "finance", section: "Work"},
    {nav: "organizers", section: "Records"}, {nav: "events", section: "Records"},
    {nav: "people", section: "Records"},
    {nav: "growth", section: "Insights"}, {nav: "marketplace", section: "Insights"},
    {nav: "settings", section: "Setup"},
    {nav: "intake-review", section: "Older pages"}, {nav: "users", section: "Older pages"},
    {nav: "cross-paths", section: "Older pages"}, {nav: "marketing-ops", section: "Older pages"},
    {nav: "quality", section: "Older pages"}, {nav: "operations", section: "Older pages"},
  ],
  sales: [
    {nav: "sales", section: "Sales", pinned: true, label: "Today"}, {nav: "sales-hosts", section: "Sales", pinned: true},
    {nav: "sales-deals", section: "Sales"}, {nav: "nominations", section: "Sales"},
    {nav: "organizers", section: "Records"}, {nav: "events", section: "Records"},
  ],
  ops: [
    {nav: "now", pinned: true},
    {nav: "organizer-intake", section: "Work", pinned: true}, {nav: "safety", section: "Work", pinned: true},
    {nav: "support", section: "Work"},
    {nav: "organizers", section: "Records"}, {nav: "events", section: "Records"},
    {nav: "people", section: "Records"},
    {nav: "settings", section: "Setup"},
    {nav: "intake-review", section: "Older pages"}, {nav: "cross-paths", section: "Older pages"},
    {nav: "marketing-ops", section: "Older pages"}, {nav: "operations", section: "Older pages"},
  ],
};
