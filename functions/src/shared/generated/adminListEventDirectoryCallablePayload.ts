/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Callable payload accepted by adminListEventDirectory, the Admin Events directory. Events made in Catch and events imported from other platforms are one table; source narrows it to one of them. needsCheck keeps imported events not yet public; thisWeek keeps events starting in the next seven days. cursor is the opaque nextCursor of the previous page.
 */
export interface AdminListEventDirectoryCallablePayload {
  view?: "upcoming" | "past" | "cancelled";
  query?: string | null;
  citySlug?: string | null;
  source?: "catch" | "imported" | null;
  organizerId?: string | null;
  needsCheck?: boolean;
  thisWeek?: boolean;
  cursor?: string | null;
  limit?: number;
}
