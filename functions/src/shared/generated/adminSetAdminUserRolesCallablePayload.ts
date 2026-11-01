/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

export interface AdminSetAdminUserRolesCallablePayload {
  targetUid: string;
  roles: (
    | "admin"
    | "adminOwner"
    | "safetyReviewer"
    | "support"
    | "salesStaff"
  )[];
  note: string;
}
