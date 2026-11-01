import {
  adminRoleClaimKeys,
  type AdminRoleClaim,
} from "../../../shared/types/adminTypes";

export interface AdminRolePolicy {
  role: AdminRoleClaim;
  label: string;
  capability: string;
  risk: "standard" | "high" | "critical";
  confirmationRequired: boolean;
}

export const adminRolePolicies: Record<AdminRoleClaim, AdminRolePolicy> = {
  salesStaff: {
    role: "salesStaff",
    label: "Assigned Sales staff",
    capability: "Private Sales work on currently assigned accounts only. No owner, provider, publishing or sending authority.",
    risk: "standard",
    confirmationRequired: true,
  },
  admin: {
    role: "admin",
    label: "Admin operator",
    capability: "Broad operational access across non-owner admin workflows.",
    risk: "high",
    confirmationRequired: true,
  },
  adminOwner: {
    role: "adminOwner",
    label: "Admin owner",
    capability: "Role governance and owner-only administrative authority.",
    risk: "critical",
    confirmationRequired: true,
  },
  safetyReviewer: {
    role: "safetyReviewer",
    label: "Safety reviewer",
    capability: "Safety queue evidence, assignment, and governed case decisions.",
    risk: "high",
    confirmationRequired: true,
  },
  support: {
    role: "support",
    label: "Support",
    capability: "Support-scoped operational reads and approved support workflows.",
    risk: "standard",
    confirmationRequired: false,
  },
};

export const adminRolePolicyList = adminRoleClaimKeys.map(
  (role) => adminRolePolicies[role]
);
