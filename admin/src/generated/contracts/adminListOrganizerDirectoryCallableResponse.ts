/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * One page of the Admin Organizers directory with real totals. views counts every organizer in each view, ignoring the other filters; total counts the rows the request's filters match; each facet counts what its chip would show with every other filter applied. scan says whether every organizer was read: the directory reads at most a bounded number of organizers, and complete is false when there were more, so totals then cover only what was read.
 */
export interface AdminListOrganizerDirectoryCallableResponse {
  generatedAt: string;
  total: number;
  views: {
    all: number;
    live: number;
    unclaimed: number;
    hidden: number;
  };
  facets: {
    /**
     * @maxItems 60
     */
    cities: {
      value: string;
      label: string;
      count: number;
    }[];
    /**
     * @maxItems 60
     */
    kinds: {
      value: string;
      label: string;
      count: number;
    }[];
    /**
     * @maxItems 3
     */
    claimStates: {
      value: string;
      label: string;
      count: number;
    }[];
    mine: number;
  };
  scan: {
    complete: boolean;
    scanned: number;
  };
  /**
   * @maxItems 100
   */
  rows: {
    organizerId: string;
    name: string;
    kindLabel: string | null;
    citySlug: string | null;
    cityLabel: string | null;
    area: string | null;
    /**
     * The public page and app listing in one word: live (published, in search and in the app), hiddenFromSearch (published, not indexed), hiddenInApp (published, hidden in the app), draft (draft or qa), suppressed or removed.
     */
    pageState:
      | "live"
      | "hiddenFromSearch"
      | "hiddenInApp"
      | "draft"
      | "suppressed"
      | "removed";
    claimState:
      | "unclaimed"
      | "claimPending"
      | "claimed"
      | "verified"
      | "suppressed";
    claimedByName: string | null;
    salesOwner: {
      uid: string;
      name: string | null;
    } | null;
    upcomingEventCount: number;
    listedAt: string | null;
  }[];
  nextCursor: string | null;
}
