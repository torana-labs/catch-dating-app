import type {CatchFormat, CatchBandGround} from "@catch/web-ui";
import {homeFormats, homePageCopy as copy, otherFormatPoster} from "@content/homePage";
import {interpolateContent as fill} from "@content/interpolate";
import {siteFooterCopy} from "@content/site";
import type {HomeCity, HomeCityPlans, HomeFormat, HomeOrganizer, HomePlan} from "./homeTypes";

const week = 7 * 24 * 60 * 60 * 1000;

/** Plans that have not ended and start within seven days of the read. */
export function weekPlans(plans: readonly HomePlan[], readAt: number): HomePlan[] {
  return plans.filter((plan) => {
    const start = Date.parse(plan.startTime);
    const end = Date.parse(plan.endTime ?? plan.startTime);
    return start < readAt + week && !(Number.isFinite(end) && end < readAt);
  });
}

const twoWeeks = 2 * week;

/**
 * Every plan that has not ended and starts within fourteen days of the read,
 * soonest first: what the homepage shows when this week is empty, and all of
 * a thin city's plans, so a quiet city never reads as an empty one.
 */
export function upcomingPlans(plans: readonly HomePlan[], readAt: number): HomePlan[] {
  return plans.filter((plan) => {
    const start = Date.parse(plan.startTime);
    const end = Date.parse(plan.endTime ?? plan.startTime);
    return start < readAt + twoWeeks && !(Number.isFinite(end) && end < readAt);
  }).sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
}

/** An open city with fewer plans than this in the next two weeks is thin (owner decision, 16 Nov). */
export const thinCityPlanCount = 5;

/**
 * How the homepage reads its city: busy (five or more plans in the next two
 * weeks), thin (an open city with fewer) or launching (not open yet). The
 * board's three states; a thin city moves the host band up.
 */
export type HomeCityState = "busy" | "thin" | "launching";

export function homeCityState(plans: HomeCityPlans, readAt: number): HomeCityState {
  if (plans.status !== "live") return "launching";
  return upcomingPlans(plans.plans, readAt).length < thinCityPlanCount ? "thin" : "busy";
}

/**
 * The picker's line under a city. A live city is open however quiet it is:
 * it shows its honest count, or "New" before its first plan this week.
 */
export function cityStatusLabel(city: HomeCity) {
  if (city.status !== "live") return copy.header.soonStatus;
  if (city.weekPlanCount === 0) return copy.header.newStatus;
  if (city.weekPlanCount === 1) return copy.header.liveStatusOne;
  return fill(copy.header.liveStatus, {count: city.weekPlanCount});
}

/** The footer's note after a city: "2 plans this week", "New" or "soon". */
export function cityFooterNote(city: HomeCity) {
  const notes = siteFooterCopy.cityNotes;
  if (city.status !== "live") return siteFooterCopy.soon;
  if (city.weekPlanCount === 0) return notes.new;
  if (city.weekPlanCount === 1) return notes.plan;
  return fill(notes.plans, {count: city.weekPlanCount});
}

const formatName = (format: HomeFormat) => homeFormats.find((item) => item.format === format)?.name;

/** "Thu 7:30 PM" in the city's time zone. */
export function shortWhen(startTime: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {weekday: "short", hour: "numeric", minute: "2-digit", timeZone: timezone})
    .formatToParts(new Date(startTime));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("weekday")} ${part("hour")}:${part("minute")} ${part("dayPeriod")}`;
}

/** "Thu 27 Nov, 7:30 PM" in the city's time zone, for plans beyond this week. */
export function datedWhen(startTime: string, timezone: string) {
  const day = new Intl.DateTimeFormat("en-GB", {weekday: "short", day: "numeric", month: "short", timeZone: timezone}).format(new Date(startTime));
  const time = new Intl.DateTimeFormat("en-US", {hour: "numeric", minute: "2-digit", timeZone: timezone}).format(new Date(startTime));
  return `${day.replace(",", "")}, ${time}`;
}

/** A plan's date square: the short weekday, the day and the short month in the city's time zone, and the ISO date. */
export interface PlanDateParts {
  weekday: string;
  day: string;
  month: string;
  dateTime: string;
}

export function planDateParts(startTime: string, timezone: string): PlanDateParts {
  const parts = new Intl.DateTimeFormat("en-GB", {weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: timezone})
    .formatToParts(new Date(startTime));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  const iso = new Intl.DateTimeFormat("en-CA", {year: "numeric", month: "2-digit", day: "2-digit", timeZone: timezone}).format(new Date(startTime));
  return {weekday: part("weekday"), day: part("day"), month: part("month"), dateTime: iso};
}

export interface PlanCardView {
  key: string;
  href: string;
  title: string;
  label: string;
  /** "Thu 7:30 PM" in the city's time zone. */
  when: string;
  /** The format's name, such as "Games and quizzes"; empty for other plans. */
  formatLabel: string;
  format: CatchFormat | null;
  detail: string;
  /** Where the plan meets, such as "Khar Social". */
  place: string;
  /** The date square's parts in the city's time zone. */
  date: PlanDateParts;
  price: string;
  availability?: string;
  photoUrl: string | null;
  posterLabel: string;
}

export function planCard(plan: HomePlan, timezone: string, withDate = false): PlanCardView {
  const name = formatName(plan.format);
  const when = withDate ? datedWhen(plan.startTime, timezone) : shortWhen(plan.startTime, timezone);
  return {
    key: plan.eventId,
    href: plan.path,
    title: plan.title,
    label: name ? `${name} · ${when}` : when,
    when,
    formatLabel: name ?? "",
    format: plan.format === "other" ? null : plan.format,
    detail: fill(copy.week.detail, {host: plan.organizer.name, place: plan.location}),
    place: plan.location,
    date: planDateParts(plan.startTime, timezone),
    price: plan.priceLabel,
    availability: plan.spotsLeft === null ? undefined :
      plan.spotsLeft === 0 ? copy.week.full : fill(copy.week.spotsLeft, {count: plan.spotsLeft}),
    photoUrl: plan.photoUrl,
    posterLabel: homeFormats.find((item) => item.format === plan.format)?.poster ?? otherFormatPoster,
  };
}

/** The formats a launching-soon city's organisers run, as a sentence. */
export function comingFormats(plans: HomeCityPlans) {
  const found = homeFormats.filter(({format}) => plans.organizers.some((organizer) => organizer.formats.includes(format)));
  if (!found.length) return copy.soon.comingFallback;
  const names = found.map(({coming}, index) => (index === 0 ? coming[0].toLocaleUpperCase("en-IN") + coming.slice(1) : coming));
  return new Intl.ListFormat("en-IN", {style: "long", type: "conjunction"}).format(names);
}

export type OrganizerAction = {kind: "page"; href: string} | {kind: "claim"; href: string} | {kind: "none"};

export interface OrganizerCardView {
  key: string;
  name: string;
  subtitle: string;
  initials: string;
  monogramGround: CatchBandGround;
  href?: string;
  next: string;
  footnote: string;
  action: OrganizerAction;
  /** The logo square's format: the organiser's main format. */
  color?: CatchFormat;
  /** One line: what they run, the next plan, the footnote and, unclaimed, the claim prompt. */
  meta: string;
}

/** Each format's ground: its date squares, mats and chips. */
export const formatGrounds: Record<CatchFormat, CatchBandGround> = {run: "coral", dinner: "pink", games: "yellow", courts: "mint", nightsOut: "magenta"};

export function organizerCard(organizer: HomeOrganizer, city: HomeCity): OrganizerCardView {
  const firstFormat = organizer.formats.find((format): format is CatchFormat => format !== "other");
  const unclaimed = organizer.claimState === "unclaimed";
  const page = organizer.path ?? undefined;
  const next = organizer.nextPlan ? fill(copy.organisers.next, {date: shortWhen(organizer.nextPlan.startTime, city.timezone), title: organizer.nextPlan.title}) :
    page ? copy.organisers.nextNone : copy.organisers.nextSoon;
  const footnote = !page ? copy.organisers.joining : unclaimed ? copy.organisers.unclaimed :
    organizer.followerCount === 1 ? copy.organisers.follower : fill(copy.organisers.followers, {count: organizer.followerCount});
  return {
    key: organizer.organizerId,
    name: organizer.name,
    subtitle: organizer.category,
    initials: organizer.logo.text,
    monogramGround: firstFormat ? formatGrounds[firstFormat] : "white",
    href: page,
    next,
    footnote,
    action: !page ? {kind: "none"} : unclaimed ? {kind: "claim", href: `${page}#claim`} : {kind: "page", href: page},
    color: firstFormat,
    meta: [organizer.category, next, footnote, ...(page && unclaimed ? [copy.organisers.claim] : [])].join(" · "),
  };
}

/**
 * A published guest review the homepage may quote as proof
 * (contracts/firestore/reviews.schema.json, moderated for public pages).
 * The page quotes only reviews whose writer booked the plan on Catch.
 */
export interface HomeReview {
  reviewId: string;
  /** The writer's public display name. */
  reviewerName: string;
  /** Stars out of five. */
  rating: number;
  comment: string;
  /** The plan the writer went to. */
  eventTitle: string;
  /** verificationStatus "verified": the writer booked and attended the plan on Catch. */
  verified: boolean;
}

/** The review the proof band quotes: the first verified one with words, or none. Never a placeholder. */
export function proofReview(reviews: readonly HomeReview[]): HomeReview | null {
  return reviews.find((review) => review.verified && review.comment.trim() !== "" &&
    Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5) ?? null;
}

/** The picker searches once there are more cities than this. */
/** Every city by country, with its waitlist sign-up. */
export const citiesHref = "/cities/";

export const citySearchThreshold = 8;

/** One country's cities in the picker and on /cities/, in catalog order. */
export interface CityGroup {
  isoCode: string;
  name: string;
  /** False when no city in the country is open: it shows one "launching soon" line. */
  anyLive: boolean;
  cities: HomeCity[];
}

/** Cities grouped by country, countries in the order their first city appears. */
export function cityGroups(cities: readonly HomeCity[], countryName: (isoCode: string) => string): CityGroup[] {
  const groups = new Map<string, CityGroup>();
  for (const city of cities) {
    const group = groups.get(city.countryIsoCode) ??
      {isoCode: city.countryIsoCode, name: countryName(city.countryIsoCode), anyLive: false, cities: []};
    group.cities.push(city);
    group.anyLive ||= city.status === "live";
    groups.set(city.countryIsoCode, group);
  }
  return [...groups.values()];
}

/** The groups with only the cities whose label starts a word matching the query. */
export function filterCityGroups(groups: readonly CityGroup[], query: string): CityGroup[] {
  const needle = query.trim().toLocaleLowerCase("en");
  if (!needle) return [...groups];
  const matches = (label: string) => label.toLocaleLowerCase("en").split(/[\s-]+/u)
    .some((word, index, words) => words.slice(index).join(" ").startsWith(needle));
  return groups.map((group) => ({...group, cities: group.cities.filter((city) => matches(city.label))}))
    .filter((group) => group.cities.length > 0);
}

/**
 * A city's line in the picker. In a country with no city open, its cities
 * carry no line of their own: the country says "launching soon" once.
 */
export function cityPickerSublabel(city: HomeCity, group: CityGroup) {
  return group.anyLive ? cityStatusLabel(city) : undefined;
}
