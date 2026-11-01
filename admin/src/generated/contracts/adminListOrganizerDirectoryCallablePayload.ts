/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Callable payload accepted by adminListOrganizerDirectory, the Admin Organizers directory. view picks one of the directory's views; the other fields narrow it. mine keeps organizers whose Sales account the caller owns. cursor is the opaque nextCursor of the previous page.
 */
export interface AdminListOrganizerDirectoryCallablePayload {
  view?: "all" | "live" | "unclaimed" | "hidden";
  query?: string | null;
  citySlug?: string | null;
  kind?: string | null;
  claimState?: "unclaimed" | "claimPending" | "claimed" | null;
  mine?: boolean;
  cursor?: string | null;
  limit?: number;
}
