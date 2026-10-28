/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Read model holding what the website shows for one city, stored at cityPlans/{citySlug}: the plans starting in the next 14 days, how many there are of each format, the organisers behind them and whether the city is live or launching soon. Functions build it from the published organizer page read models (and, for cities that have not launched, from published organizers), so it adds no publication rule of its own. It never holds contact details, owner identities, rosters or dating fields. Only the Admin SDK reads it.
 */
export interface CityPlansDocument {
  schemaVersion: 1;
  citySlug: string;
  cityLabel: string;
  /**
   * The market's launch status in functions/src/locations/marketConfig.ts.
   */
  marketStatus: "launched" | "planned";
  /**
   * live when the market has launched and has enough plans in the window to fill a page; otherwise launchingSoon, so a thin city never renders a sparse page.
   */
  status: "live" | "launchingSoon";
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  builtAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  /**
   * When the build read its sources. Plans that ended before this are left out.
   */
  windowStart: string;
  /**
   * Fourteen days after windowStart. Plans starting at or after this are left out.
   */
  windowEnd: string;
  /**
   * Every plan in the window, which may be more than plans holds.
   */
  planCount: number;
  /**
   * Plans in the window by format.
   */
  formatCounts: {
    runClubs: number;
    dinners: number;
    gamesAndQuizzes: number;
    pickleball: number;
    nightsOut: number;
    other: number;
  };
  /**
   * Plans in the window, soonest first.
   *
   * @maxItems 120
   */
  plans: {
    source: "catch" | "external";
    eventId: string;
    path: string;
    title: string;
    /**
     * The homepage format a plan's activity belongs to.
     */
    format:
      | "runClubs"
      | "dinners"
      | "gamesAndQuizzes"
      | "pickleball"
      | "nightsOut"
      | "other";
    activityKind: string;
    startTime: string;
    endTime: string | null;
    date: string;
    location: string;
    priceLabel: string;
    photoUrl: string | null;
    /**
     * Places left on a Catch plan; null for an imported plan, which books on its source.
     */
    spotsLeft: number | null;
    organizer: {
      organizerId: string;
      name: string;
      path: string;
    };
  }[];
  /**
   * Organisers in the city: those with a plan in the window first, soonest plan first, then by followers.
   *
   * @maxItems 24
   */
  organizers: {
    organizerId: string;
    name: string;
    /**
     * The organiser page, or null while the city has not launched and the organiser has no public page yet.
     */
    path: string | null;
    category: string;
    logo: {
      mode: "monogram";
      text: string;
      status: string;
    };
    /**
     * Formats the organiser runs, from its plans and its listed formats.
     *
     * @maxItems 6
     */
    formats: (
      | "runClubs"
      | "dinners"
      | "gamesAndQuizzes"
      | "pickleball"
      | "nightsOut"
      | "other"
    )[];
    followerCount: number;
    claimState: "unclaimed" | "claimPending" | "claimed" | "verified";
    /**
     * The organiser's plans in the window.
     */
    upcomingPlanCount: number;
    nextPlan: {
      eventId: string;
      path: string;
      title: string;
      startTime: string;
      date: string;
    } | null;
  }[];
}
