import type {HomeCityPlans, HomeOrganizer, HomePlan} from "../home/homeTypes";

/**
 * The city-by-format taxonomy of the cityPlans read model
 * (contracts/firestore/city_plans.schema.json, built by
 * functions/src/cityPlans/discoveryFormats.ts). The website does not decide
 * which formats exist or what their URL segment is: this mirrors the
 * contract's `discoveryFormat` and `formatPage.slug` enums, and
 * discoveryModel.test.ts holds the two lists to the schema.
 */
export const discoveryFormatKeys = [
  "runClubs", "racketSports", "pickleball", "padel", "tennis", "badminton", "supper", "quizNights",
  "nightlife", "studios", "workshops", "books", "outdoors",
] as const;
export type DiscoveryFormatKey = (typeof discoveryFormatKeys)[number];

export const discoveryFormatSlugs = [
  "run-clubs", "racket-sports", "pickleball", "padel", "tennis", "badminton", "supper-clubs", "quiz-nights",
  "nightlife", "studios", "workshops", "book-clubs", "outdoors",
] as const;
export type DiscoveryFormatSlug = (typeof discoveryFormatSlugs)[number];

/** One city-by-format page's counts and indexing decision: `formatPage` in the contract. */
export interface DiscoveryFormatPage {
  slug: DiscoveryFormatSlug;
  /** Organisers in the city that run the format; not capped by the organiser list. */
  organizerCount: number;
  /** Listed plans in the format that start in the next 30 days. */
  upcomingEventCount: number;
  /** Those plans that are free. */
  freeEventCount: number;
  /** The backend's decision (formatPageIndexingFor): index at 3+ organisers or 5+ plans, launched or not (owner, 16 and 17 Nov 2026). */
  indexing: "index, follow" | "noindex, follow";
}

/**
 * The 30-day and city-by-format fields of a cityPlans document. Optional
 * here because a city read from the public catalog instead of its document
 * (features/home/cityPlansFromListings.ts) does not have them, and a page
 * must not invent them: an absent field reads as unknown.
 */
export interface DiscoveryCityFields {
  monthWindowEnd?: string;
  upcomingEvents30d?: number;
  hasUpcomingMonth?: boolean;
  monthCountsComplete?: boolean;
  /** Women-led plans in the 14-day window, not capped by the plan list. */
  womenLedPlanCount?: number;
  formatPages?: Partial<Record<DiscoveryFormatKey, DiscoveryFormatPage>>;
}

/** The read model's discovery tags on a plan or organiser: the format pages it counts toward, and its resolved women-led label. */
interface DiscoveryTags {
  discoveryFormats?: readonly DiscoveryFormatKey[];
  womenLed?: boolean;
}
export type DiscoveryPlan = HomePlan & DiscoveryTags;
export type DiscoveryOrganizer = HomeOrganizer & DiscoveryTags;

/** A city's read model as the discovery pages read it: the homepage shape plus the fields above. */
export type DiscoveryCityPlans = HomeCityPlans & DiscoveryCityFields;
