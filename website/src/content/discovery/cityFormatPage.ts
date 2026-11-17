import {brand} from "../brand.ts";

/**
 * Copy for the city-by-format pages (/<city>/<format>/, the redesign's
 * PlaybookCityFormat board). `{format}` is the format's name from
 * discoveryFormats.ts, lower-cased where it sits mid-sentence as
 * `{formatLower}`; `{organisers}` and `{plans}` are its nouns, already
 * counted. Counts come from the city's read model only: the 30-day window
 * the backend counts, never a figure written here.
 */
export const cityFormatPageCopy = {
  hero: {
    kicker: "{city} / {format}",
    title: "{format} in {city}",
  },
  /** Each stat is a figure (the backend's count) over its line: "23" over "runs in the next 30 days". */
  stats: {
    upcoming: "{plans} in the next 30 days",
    free: "free to join",
    /** A count that may be higher: the read model marks it a floor. */
    atLeast: "{count}+",
  },
  plans: {
    kicker: "This week and next",
    title: "Upcoming {plans}",
    filtersLabel: "Show",
    filters: {all: "All", free: "Free", weekend: "Weekends"},
    empty: "No {plans} in the next two weeks yet.",
    emptyBody: "New plans go up as hosts add them. Get them on WhatsApp below, or see everything else on in {city}.",
    filteredEmpty: "No {plans} match this filter.",
    filteredEmptyBody: "Try another filter, or see them all.",
    clear: "Show all",
    seeAll: "See everything in {city}",
  },
  organisers: {
    kicker: "The {organisers}",
    title: "Who runs them",
    lead: "Follow one and you’ll hear about their next plan first.",
  },
  thin: {
    lead: `${brand.name} is just getting started with {formatLower} in {city}. Here’s what’s on so far, and what else is happening in the city.`,
    /** One organiser in the format so far, with their next plan. */
    organiserNext: "{name} · next: {when}",
    organiserNoPlan: "{name} · no plan listed yet",
    noneYet: "No {organisers} listed here yet.",
    later: "We’ll make this a full page once there are more {organisers} and plans to show.",
    seeOrganiser: "See {name}",
    tellUs: "Know one? Tell us",
    tellUsMessage: "Hi, I know a {formatLower} organiser in {city} who should be on the site.",
    popularTitle: "Popular in {city} this month",
    popularRow: "{count} plans",
  },
  more: {
    kicker: "More in the city",
    title: "Other things to do",
    newToCity: "New to the city",
  },
  faq: {
    kicker: "{format} in {city}",
    title: "{format} in {city}: common questions",
    freeQuestion: "Are {formatLower} in {city} free?",
    /** When some of the next 30 days’ plans are free. */
    freeSome: "Some are. {free} of the {upcoming} {plans} in the next 30 days are free. Each listing shows its price before you book.",
    freeNone: "Each listing shows its price before you book. Free {plans} show Free on the card.",
    soloQuestion: "Can I come on my own?",
    soloAnswer: "Yes. Book a place for yourself; the host knows to expect you and sends where to be before the day.",
    bookFreeQuestion: "Why book a free {plan}?",
    bookFreeAnswer: "So the host knows to expect you, and you get where to be and any change of plan before the day.",
    startQuestion: "How do I start one?",
    startAnswer: `Start a free trial on ${brand.name}. Take bookings, check guests in and see who keeps coming back.`,
  },
  notify: {
    kicker: "Hear about new {plans} first",
    title: "Get new plans on WhatsApp.",
  },
  meta: {
    title: `{format} in {city} | ${brand.name}`,
    description: "{format} in {city}: upcoming {plans}, the {organisers} who run them and how to join.",
  },
} as const;
