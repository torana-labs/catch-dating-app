// Copy for the homepage, from the conversion playbook's homepage board
// (design/source_packs/website-playbook/oneoff/PlaybookHome.dc.html). Copy is
// the owner's: change it on the board first. The brand is named from the
// brand pack. The product is for meeting people in real life: no dating,
// singles, mixer or match wording, and no figure the page cannot read.
import type {CatchFormat} from "@catch/web-ui";
import {brand} from "./brand.ts";
import {guestAppActionLabel} from "./site.ts";

const appName = brand.stores.consumerAppName;

export const homePageCopy = {
  header: {nav: "Main", app: guestAppActionLabel,
    cityMenu: "Choose your city", allCities: "All cities", liveStatus: "{count} plans this week", liveStatusOne: "1 plan this week",
    /** A live city with no plans this week yet. */
    newStatus: "New", soonStatus: "Launching soon",
    /** A country with no city open yet, shown once instead of every city's "soon". */
    countrySoon: "Launching soon in {country}",
    /** The picker's search, shown once there are more than eight cities. */
    citySearch: {label: "Search cities", placeholder: "Search cities", clear: "Clear “{query}”", close: "Close search",
      none: "No cities found for “{query}”."},
    /** "Use my location": the browser asks for location only when this is tapped. */
    locate: {action: "Use my location", finding: "Finding your city…", region: "Your city", close: "Close",
      otherTitle: "We’re not in your area yet", otherBody: "See every city and get notified when yours opens.", otherAction: "See all cities",
      deniedTitle: "Location is off for this site", deniedBody: "Choose your city from the list instead.",
      unavailableTitle: "We couldn’t find your location", unavailableBody: "Choose your city from the list instead."}},
  /** The guest hero of an open city: busy, or thin (fewer than five plans in the next two weeks). */
  hero: {
    busyEyebrow: "In {city} this week · {count} plans",
    busyEyebrowOne: "In {city} this week · 1 plan",
    /** A busy city with nothing this week: the plans band shows the next two weeks. */
    quietEyebrow: "In {city} · plans for the next two weeks",
    thinEyebrow: "New in {city} · plans for the next two weeks",
    /** A city whose plans could not be read: no count, no claim. */
    cityEyebrow: "In {city}",
    title: "Find something worth showing up for.",
    body: "Runs, games, dinners, classes and nights out, run by hosts who bring people together. Come on your own and leave knowing a few more people.",
    busyAction: "See what’s on in {city}",
    thinAction: "See what’s coming up",
    /** A city with nothing in the next two weeks: the plans band is the WhatsApp sign-up. */
    emptyAction: "Get new plans on WhatsApp",
    hostAction: "Host an event",
    /** The plan chip over the hero's phone: where the soonest plan meets, and its places when known. */
    chipMeta: "{place} · {availability}",
    /** Until the app is on a store: the white notify card under the hero's buttons. */
    notice: {title: `The ${appName} app is on its way`, body: "Get new {city} plans on WhatsApp, and the app the day it launches."},
  },
  /** "Whoever you are": six ways in, each a link to the plans or the band it names. */
  entries: {
    eyebrow: "Start from where you are",
    title: "Whoever you are, there’s an easy first plan.",
    items: [
      {id: "new", title: "New to {city}", body: "Plans that welcome first-timers, and a group on day one."},
      {id: "solo", title: "Coming on your own", body: "Hosts plan the first ten minutes, so nobody stands alone."},
      {id: "level", title: "Find your level", body: "Runs by pace, courts by level, quizzes by team."},
      {id: "friends", title: "Bring your friends", body: "Book together and stay on the same team."},
      {id: "daytime", title: "Weekdays and daytime", body: "For remote workers, freelancers and early birds."},
      /** The two checks the safety band can stand behind (the board's "verified hosts" and "women-led plans" have nothing behind them yet). */
      {id: "safety", title: "Safety first", body: "Reviews from people who went, and a quieter way to ask."},
    ],
  },
  /** "Start with what you feel like doing": the formats, each a link to the city's plans in it. */
  formats: {
    eyebrow: "Something for every kind of evening",
    title: "Start with what you feel like doing.",
    lead: "Every plan has a host who’s there on the night.",
    cards: [
      {format: "run", title: "Runs and walks", body: "Pace groups and a first hello.", more: "Run clubs in {city}"},
      {format: "courts", title: "Racket sports", body: "Pickleball, padel, tennis, badminton.", more: "Courts in {city}"},
      {format: "dinner", title: "Dinners", body: "Long tables and new people.", more: "Supper clubs in {city}"},
      {format: "games", title: "Games and quizzes", body: "Teams, rounds and a final.", more: "Quiz nights in {city}"},
      {format: "nightsOut", title: "Nights out", body: "Crawls and socials.", more: "Nights out in {city}"},
    ],
    /** More kinds of plan: each searches the city's plans for its word. */
    chips: [
      {label: "Yoga, spin and fitness", search: "yoga"},
      {label: "Workshops and classes", search: "workshop"},
      {label: "Book clubs and open mics", search: "book club"},
      {label: "Cycling and treks", search: "cycling"},
    ],
  },
  /** The phone action bar. */
  dock: {label: "Quick actions", plans: "See plans"},
  /**
   * "Know a host": a guest introduces a host through the website's referral
   * lead (the board's two host fields, plus the referrer's name, number and
   * how they know the host, which the referral intake needs). The board's
   * "your next ticket is on us" waits for its terms.
   */
  refer: {
    eyebrow: `Bring a host to ${brand.name}`,
    title: "Know a host who’d be great here?",
    lead: "Introduce them, and we’ll take it from there.",
    action: "Introduce them",
    retry: "Try again",
    name: "Your name",
    phone: "Your WhatsApp number",
    hostName: "Host or club name",
    hostLink: "Their Instagram or website",
    relationship: "How do you know them?",
    /** Under a field left empty when Introduce them is tapped. */
    required: {
      fullName: "Enter your name.",
      hostName: "Enter the host or club’s name.",
      hostLink: "Add their Instagram handle or website.",
      relationship: "Say how you know them.",
    },
    consent: `${brand.name} will reply on WhatsApp.`,
    /** Names this wording on every stored consent; change it whenever the wording changes. */
    consentVersion: "host-referral-whatsapp-v2",
    /** The optional box, unticked: new plans in the city, stored as its own consent. */
    newPlans: "Also send me new plans in {city} on WhatsApp",
    /** Names the box's wording on its stored consent; change it whenever that wording changes. */
    newPlansConsentVersion: "host-referral-new-plans-v1",
    /** Which form on the page, as the lead records it. */
    entry: "home-refer",
    privacy: "Privacy",
    sent: "Thanks for introducing {host}. We’ll message you on WhatsApp about it.",
  },
  /** A thin week's notify bar under the plans: new plans in the city on WhatsApp (a city alerts lead). */
  alerts: {
    title: "Want to hear first?",
    body: "New {city} plans on WhatsApp, about once a week.",
    phone: "Your WhatsApp number",
    action: "Notify me",
    retry: "Try again",
    consent: `From ${brand.name}. Stop any time.`,
    /** Names this wording on every stored consent; change it whenever the wording changes. */
    consentVersion: "city-new-plans-whatsapp-v2",
    /** Which form on the page, as the lead records it. */
    entry: "home-thin-week",
    privacy: "Privacy",
    sent: "Done. We’ll message you on WhatsApp when new {city} plans go up.",
  },
  /** A city that has not opened leads with hosts. */
  launchHero: {
    eyebrow: "Launching soon in {city}",
    title: "Bring people together in {city}? Be one of the first hosts.",
    body: `The first hosts in a city shape what ${brand.name} becomes there.`,
    /** While the city's founding-host counter reads open. */
    foundingBody: `The first hosts in a city shape what ${brand.name} becomes there. Founding hosts get 90 days without ${brand.name} fees.`,
    startAction: "Start hosting free",
    hostsAction: `See ${brand.name} for hosts`,
  },
  week: {
    title: "This week in {city}",
    eyebrow: "{count} plans this week",
    eyebrowOne: "1 plan this week",
    /** An open city with nothing this week: new, not "0 plans". */
    eyebrowNew: "New in {city}",
    lead: "Hosted plans across {areas}.",
    leadNoAreas: "Hosted plans across {city}.",
    action: "See everything in {city}",
    filters: "Filter by format",
    everything: "Everything",
    note: "{shown} of {total} plans shown. Hosts set their own prices.",
    /** An open city with nothing this week shows the next two weeks instead, under these lines. */
    upcomingTitle: "Coming up in {city}",
    upcomingEyebrow: "Next two weeks",
    upcomingNote: "Nothing on this week, so here’s everything in {city} over the next two weeks: {shown} of {total} shown.",
    upcomingFilteredNote: "Showing {shown} of {total} in the next two weeks · {format}",
    upcomingEmptyFormat: "No {format} in the next two weeks. Try another format.",
    /** A thin city: fewer than five plans in the next two weeks, all of them shown, nearest first. */
    thinLead: `{city} is new on ${brand.name}, so plans are spread out for now. Here’s everything ahead, nearest first.`,
    thinAction: "See all upcoming plans",
    thinNote: "{shown} of {total} plans in the next two weeks. Hosts set their own prices.",
    /** Nothing in the whole window: point to the organisers below, never a dead end. */
    emptyWindow: "No plans in {city} in the next two weeks yet. Follow the organisers below to hear about their next one first.",
    /** Nothing in the next two weeks: the band is the WhatsApp sign-up, then a line for hosts. */
    emptyTitle: "Be first to hear when {city}’s next plans go up.",
    emptyLead: "Hosts are getting set up. We’ll send new {city} plans on WhatsApp, about once a week.",
    /** {host} is a link to the host page. */
    emptyHost: "Run plans in {city}? {host}",
    emptyHostLink: `Host on ${brand.name}`,
    /** The link to everything, under the cards: a busy city's count, or a thin city's. */
    seeAll: "See all {count} plans in {city}",
    seeAllOne: "See the plan in {city}",
    filteredNote: "Showing {shown} of {total} this week · {format}",
    emptyFormat: "No {format} this week. Try another format.",
    unavailable: "We couldn’t load this week’s plans. Please try again in a moment.",
    detail: "{host} · {place}",
    spotsLeft: "{count} left",
    full: "Full",
    free: "Free",
  },
  /** The plans band of a city that has not opened: the launch notice. */
  soon: {
    eyebrow: "Launching soon",
    title: "Here for the plans?",
    lead: "{coming} are on their way to {city}. Leave your WhatsApp number and we’ll message you when the first ones go up.",
    comingFallback: "Runs, dinners, games and nights out",
    liveCityAction: "See what’s on in {city}",
  },
  notice: {
    phone: "WhatsApp number",
    phoneHint: "98765 43210",
    marketing: "Also send me news about new hosts and plans in {city}",
    action: "Notify me",
    consent: "Tapping Notify me means we’ll send that one WhatsApp message. We only send news if you tick the box above.",
    /** Names this wording on every stored consent; change it whenever the wording changes. */
    consentVersion: "city-launch-whatsapp-v1",
    privacy: "Privacy policy",
    invalidPhone: "Enter your 10-digit mobile number.",
    failed: "That didn’t go through. Please try again in a moment.",
    joined: `Done. We’ll message you on WhatsApp the day ${brand.name} opens in {city}.`,
    alreadyJoined: "You’re already on the list for {city}. We’ve kept your latest choice.",
  },
  story: {
    eyebrow: "How a night works",
    title: "Come on your own. Leave knowing a few more people.",
    lead: "Hosts plan the first ten minutes so you don’t have to. Here’s a Tuesday quiz with Lantern Lane Social.",
    steps: [
      {title: "Find a plan", body: "Every plan shows who’s hosting, where you meet and who it suits."},
      {title: "Show up", body: "Your host has a team, a group or a game ready, and a first hello."},
      {title: "Stay in touch", body: "Your group chat stays open for a week."},
    ],
  },
  /** Proof: what is in place, and a real review when guests who booked have left one. */
  safety: {
    eyebrow: "Safety and trust",
    title: "Feel good about going on your own.",
    lead: "Here’s what’s in place before, during and after every plan.",
    checks: [
      {title: "Reviews from people who went", body: `Reviews carry “Booked on ${brand.name}” when the writer was really there.`},
      {title: "A quieter way to ask", body: "With Help me say hi, you ask the host for an introduction, privately."},
    ],
    /** The badge on a review whose writer booked the plan. */
    verified: `Booked on ${brand.name}`,
    rating: "{rating} out of 5",
  },
  organisers: {
    liveEyebrow: "Organisers in {city}",
    soonEyebrow: "Joining in {city}",
    liveTitle: "The people behind the plans.",
    soonTitle: `Follow them before ${brand.name} opens.`,
    lead: "Follow the hosts you like and hear about their next plan first.",
    next: "Next: {date} · {title}",
    nextSoon: `Next: first plan announced when ${brand.name} opens`,
    nextNone: "Next: no plan this week",
    followers: "{count} followers",
    follower: "1 follower",
    unclaimed: "Not claimed yet",
    joining: "Joining at launch",
    seePage: "See their plans",
    seePageLabel: "See their plans: {name}",
    claim: "Is this you? Claim it",
    claimBandAction: "Claim your page",
  },
  host: {
    eyebrow: "For hosts",
    title: "Bring people together? Run the whole night from one screen.",
    body: "Bookings paid upfront, the door, groups, the first hello and the follow-up. Free for 30 days, then 5% of ticket sales, capped at ₹10,000 a month. Free events stay free.",
    /** A thin or launching city while its founding-host counter reads open: the offer, without a places count. */
    foundingBody: "Founding hosts in {city}: 90 days without fees. Payment gateway fees are charged separately by the payment provider.",
    fees: "Payment gateway fees are charged separately by the payment provider.",
    trial: "Start your free trial",
    action: `See ${brand.name} for hosts`,
    whatsapp: "Talk to us on WhatsApp",
  },
  app: {
    eyebrow: "Get the app",
    title: "Your plans, your groups and your hosts, in your pocket.",
    body: "Book in a couple of taps, get reminders and directions, and keep your group chat after the night.",
    /** Until the app is on a store (guestAppLive), the band is a WhatsApp notice for the launch. */
    soonEyebrow: `The ${appName} app · coming soon`,
    soonTitle: "Be first in the app, and first to new plans.",
    /** The bento tiles around the app band's notice: what the app does, each line checkable in it. */
    tiles: {
      book: {tag: "Book", body: "Book in a couple of taps."},
      reminders: {tag: "Reminders", body: "Where to meet, and a nudge the day before."},
      chat: {tag: "Group chat", body: "Your group chat stays open after the night."},
      follow: {tag: "Follow", body: "The hosts you like, and their next plan first."},
      solo: {tag: "On your own?", body: "Hosts plan a group, a game or a first hello."},
      free: {tag: "Free to use", body: "Browsing is free. Hosts set the price of each plan."},
    },
    /** The Book tile's small card: the soonest real plan. */
    bookCard: "{when} · {price}",
    notify: {
      phone: "WhatsApp number",
      phoneHint: "98765 43210",
      newPlans: "Also send me new plans in {city} on WhatsApp, about once a week",
      action: "Notify me",
      consent: `One WhatsApp message from ${brand.name} when the app launches.`,
      /** Names this wording on every stored consent; change it whenever the wording changes. */
      consentVersion: "app-launch-whatsapp-v2",
      privacy: "Privacy",
      invalidPhone: "Enter your 10-digit mobile number.",
      failed: "That didn’t go through. Please try again in a moment.",
      joined: `Done. We’ll message you on WhatsApp the day the ${appName} app launches.`,
      alreadyJoined: "You’re already on the list. We’ve kept your latest choice.",
    },
  },
  faq: {
    eyebrow: "Questions",
    title: "Good to know before your first plan.",
    /** Each question once; the app answer follows the stores (guestAppLive). */
    items: [
      {id: "solo", question: "Can I come on my own?", answer: "Yes, and lots of people do. Hosts plan a group, a team or a first hello so nobody stands on their own."},
      {id: "app", question: "Do I need the app?",
        answer: "Not yet. You can browse and book on the website. The app is coming soon; leave your number to hear the day it launches.",
        liveAnswer: "You can browse and book on the website. The app keeps your plans, reminders, group chats and the hosts you follow in one place."},
      {id: "free", question: `Is ${brand.name} free?`, answer: "Browsing is free. Hosts set the price of each plan, and many plans are free."},
      {id: "hosts", question: "Who runs these plans?", answer: "Independent hosts, clubs and venues in your city. Each plan shows who is hosting and what to expect."},
      {id: "city", question: `What if ${brand.name} isn’t in my city yet?`,
        answer: "Leave your number and we’ll tell you when it opens. When enough people ask, we bring hosts to your city, and you hear first."},
    ],
  },

  stores: {
    appStore: {kicker: "Download on the", label: "App Store", accessibleLabel: "Download on the App Store",
      /** A store with no link yet: a chip, not the store's badge. */
      comingSoon: {kicker: "Coming soon on the", store: "App Store"}},
    googlePlay: {kicker: "Get it on", label: "Google Play", accessibleLabel: "Get it on Google Play",
      comingSoon: {kicker: "Coming soon on", store: "Google Play"}},
  },
} as const;

/** Each format's filter copy, in the board's order. */
/** `coming` names the format in the launching-soon sentence, such as "Run clubs, supper clubs and game nights". */
export const homeFormats: readonly {format: CatchFormat; name: string; line: string; poster: string; coming: string}[] = [
  {format: "run", name: "Run clubs", line: "Pace groups and a first hello for every newcomer.", poster: "Run club", coming: "run clubs"},
  {format: "dinner", name: "Dinners", line: "Long tables, good food and new people.", poster: "Supper club", coming: "supper clubs"},
  {format: "games", name: "Games and quizzes", line: "Teams, rounds and a room that’s in it together.", poster: "Game night", coming: "game nights"},
  {format: "courts", name: "Pickleball", line: "Courts and partners, rotated by level.", poster: "On court", coming: "pickleball"},
  {format: "nightsOut", name: "Nights out", line: "Crawls and socials that move through the city.", poster: "Night out", coming: "nights out"},
];

/** The poster label for a plan outside the five formats. */
export const otherFormatPoster = "Hosted plan";

/** Neighbourhoods the board names for each city, by market slug. */
export const homeCityAreas: Readonly<Record<string, string>> = {
  mumbai: "Bandra, Khar, Andheri and Worli",
  pune: "Koregaon Park, Baner and Kalyani Nagar",
  bengaluru: "Indiranagar, Koramangala and HSR",
  "delhi-ncr": "Gurugram, Hauz Khas and Saket",
  hyderabad: "Jubilee Hills, Banjara Hills and Gachibowli",
};
