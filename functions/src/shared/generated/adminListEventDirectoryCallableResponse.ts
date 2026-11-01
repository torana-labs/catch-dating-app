/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * One page of the Admin Events directory: events made in Catch and events imported from other platforms in one table, each row naming its source. views are exact counts of every event in each view, ignoring the other filters; total counts the rows the request's filters match, and each facet what its chip would show with every other filter applied. The view is read up to a bounded number of events; scan.complete is false when there were more, so total and facets then cover only what was read.
 */
export interface AdminListEventDirectoryCallableResponse {
  generatedAt: string;
  total: number;
  views: {
    upcoming: number;
    past: number;
    cancelled: number;
  };
  facets: {
    catch: number;
    imported: number;
    needsCheck: number;
    thisWeek: number;
    /**
     * @maxItems 60
     */
    cities: {
      value: string;
      label: string;
      count: number;
    }[];
  };
  scan: {
    complete: boolean;
    scanned: number;
  };
  /**
   * @maxItems 100
   */
  rows: {
    key: string;
    eventId: string;
    source: "catch" | "imported";
    /**
     * The platform an imported event came from; null for events made in Catch.
     */
    platform:
      | "bookMyShow"
      | "district"
      | "luma"
      | "partiful"
      | "sortMyScene"
      | null;
    title: string;
    organizerId: string | null;
    organizerName: string | null;
    startTime: string | null;
    citySlug: string | null;
    cityLabel: string | null;
    /**
     * live (bookable or public), full, draft (a Catch event not published yet), needsCheck (an imported event not public yet), cancelled, or removed (an imported event taken down or archived).
     */
    status: "live" | "full" | "draft" | "needsCheck" | "cancelled" | "removed";
    bookedCount: number | null;
    capacityLimit: number | null;
  }[];
  nextCursor: string | null;
}
