import type {CatchFormat} from "@catch/web-ui";

/**
 * The homepage's view of one city: the cityPlans read model
 * (contracts/firestore/city_plans.schema.json) without its build stamp, so the
 * server can hand it to the page. The server reader maps the document onto
 * this shape; a type error there means the two have drifted.
 */
export type HomeFormat = CatchFormat | "other";

export interface HomePlan {
  source: "catch" | "external";
  eventId: string;
  path: string;
  title: string;
  format: HomeFormat;
  activityKind: string;
  startTime: string;
  endTime: string | null;
  date: string;
  location: string;
  priceLabel: string;
  photoUrl: string | null;
  spotsLeft: number | null;
  organizer: {organizerId: string; name: string; path: string};
}

export interface HomeOrganizer {
  organizerId: string;
  name: string;
  path: string | null;
  category: string;
  logo: {mode: "monogram"; text: string; status: string};
  formats: HomeFormat[];
  followerCount: number;
  claimState: "unclaimed" | "claimPending" | "claimed" | "verified";
  upcomingPlanCount: number;
  nextPlan: {eventId: string; path: string; title: string; startTime: string; date: string} | null;
}

export interface HomeCityPlans {
  citySlug: string;
  cityLabel: string;
  marketStatus: "launched" | "planned";
  status: "live" | "launchingSoon";
  windowStart: string;
  windowEnd: string;
  planCount: number;
  formatCounts: Record<HomeFormat, number>;
  plans: HomePlan[];
  organizers: HomeOrganizer[];
}

/** A city in the picker and the footer. */
export interface HomeCity {
  /** The website's city slug, used in links. */
  slug: string;
  /** The canonical market slug that names the city's read model. */
  marketSlug: string;
  label: string;
  status: HomeCityPlans["status"];
  /** Plans in the next seven days. */
  weekPlanCount: number;
  timezone: string;
}

export interface HomeCatalog {
  readAt: number;
  cities: HomeCity[];
  selected: HomeCity;
  plans: HomeCityPlans;
  /** The busiest live city other than the selected one, for a launching-soon page. */
  liveCity: HomeCity | null;
  /** Set when the selected city's plans could not be read at all. */
  phase?: "unavailable";
}
