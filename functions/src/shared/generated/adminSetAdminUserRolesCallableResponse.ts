/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export interface AdminSetAdminUserRolesCallableResponse {
  user: {
    targetUid: string;
    email: string | null;
    displayName: string | null;
    disabled: boolean;
    roles: (
      | "admin"
      | "adminOwner"
      | "safetyReviewer"
      | "support"
      | "salesStaff"
    )[];
    assignmentPath: string;
  };
  beforeRoles: (
    | "admin"
    | "adminOwner"
    | "safetyReviewer"
    | "support"
    | "salesStaff"
  )[];
  afterRoles: (
    | "admin"
    | "adminOwner"
    | "safetyReviewer"
    | "support"
    | "salesStaff"
  )[];
}
