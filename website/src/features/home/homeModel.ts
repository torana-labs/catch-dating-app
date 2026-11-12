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

/** The footer's note after a city: "2 plans this week", "new" or "soon". */
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
  price: string;
  availability?: string;
  photoUrl: string | null;
  posterLabel: string;
}

export function planCard(plan: HomePlan, timezone: string): PlanCardView {
  const name = formatName(plan.format);
  const when = shortWhen(plan.startTime, timezone);
  return {
    key: plan.eventId,
    href: plan.path,
    title: plan.title,
    label: name ? `${name} · ${when}` : when,
    when,
    formatLabel: name ?? "",
    format: plan.format === "other" ? null : plan.format,
    detail: fill(copy.week.detail, {host: plan.organizer.name, place: plan.location}),
    price: plan.priceLabel,
    availability: plan.spotsLeft === null ? undefined :
      plan.spotsLeft === 0 ? copy.week.full : fill(copy.week.spotsLeft, {count: plan.spotsLeft}),
    photoUrl: plan.photoUrl,
    posterLabel: homeFormats.find((item) => item.format === plan.format)?.poster ?? otherFormatPoster,
  };
}

export interface FormatTileView {
  format: CatchFormat;
  title: string;
  body: string;
  kicker: string;
  /** This week's plans in the format. */
  count: number;
  photoUrl: string | null;
}

/** One tile per format: this week's count and a real plan's photo. */
export function formatTiles(plans: HomeCityPlans, city: HomeCity, readAt: number): FormatTileView[] {
  const thisWeek = weekPlans(plans.plans, readAt);
  return homeFormats.map(({format, line, name}) => {
    const inFormat = thisWeek.filter((plan) => plan.format === format);
    return {
      format, title: name, body: line, count: inFormat.length,
      kicker: city.status === "live" ? fill(copy.formats.liveCount, {count: inFormat.length}) : fill(copy.formats.soonKicker, {city: city.label}),
      photoUrl: inFormat.find((plan) => plan.photoUrl)?.photoUrl ?? plans.plans.find((plan) => plan.format === format && plan.photoUrl)?.photoUrl ?? null,
    };
  });
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

const formatGrounds: Record<CatchFormat, CatchBandGround> = {run: "coral", dinner: "pink", games: "yellow", courts: "mint", nightsOut: "magenta"};

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
