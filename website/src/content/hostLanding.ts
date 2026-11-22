// Copy for the host landing (/host/), from the owner's PlaybookHosts board
// (design/source_packs/website-playbook/oneoff/PlaybookHosts.dc.html). Copy is
// the owner's: change it on the board first. Every price comes from the
// shared fee model in ./pricing.ts. Capture slot ids name entries in
// tool/marketing/capture_manifest.json.
import type {CatchFormat} from "@catch/web-ui";
import {brand} from "./brand.ts";
import {interpolateContent as fill} from "./interpolate.ts";
// The active market pack, by its file: Node smoke scripts import this module directly.
import {inMarket as activeMarket} from "./markets/in.ts";
import {hostFeeExample, hostLandingFeeExamples, hostPricingFacts, hostPricingLines} from "./pricing.ts";
import {hostWalkthroughHref, whatsappChatCopy} from "./site.ts";

/** An event property each night moment relies on, named on its badge. */
export type HostNightProperty = "phones" | "groups" | "rhythm" | "tracks" | "ends";

/** One moment of a followed evening: when, the property it relies on, the screen and the words. */
export interface HostNightMoment {
  time: string;
  property: HostNightProperty;
  title: string;
  /** The capture slot the phone shows. */
  slot: string;
  body: string;
}

export interface HostNightFormat {
  format: CatchFormat;
  accent: "coral" | "pink" | "yellow" | "mint" | "magenta";
  /** The format's short name, in the night scene's picker. */
  title: string;
  /** The format tile's name, for every host who runs that kind of night. */
  tileTitle: string;
  /** The format tile's line. */
  tile: string;
  /** A photo for the format tile, when the site has one. */
  photo?: string;
  /** The format's own page for hosts (/host/<type>/), which the tile links to. */
  page: string;
  /** The tile's link, naming that page. */
  pageLink: string;
  event: string;
  where: string;
  lead: string;
  /** Each property phrased as a fact about this event, the badge on the focused moment. */
  badges: Record<HostNightProperty, string>;
  moments: readonly HostNightMoment[];
}

const startTrial = "Start free trial";
const facts = hostPricingFacts;
const liveCities = new Intl.ListFormat(activeMarket.locale, {style: "long", type: "conjunction"}).format(activeMarket.cities.filter((city) => city.status === "live").map((city) => city.label));

/** Where a link on the page goes: a band on this page, or a WhatsApp chat with the message typed. */
export type HostLandingTarget = {anchor: string} | {whatsapp: string} | {href: string};

export const hostLandingCopy = {
  /** The page's sections, in page order, in the bar that takes the site top bar's place once it scrolls away. */
  sections: {
    label: "On this page",
    items: [
      {id: "ways", label: `Ways to use ${brand.name}`},
      {id: "night", label: "On the night"},
      {id: "pricing", label: "Pricing"},
      {id: "faq", label: "Questions"},
    ],
    start: startTrial,
  },
  hero: {
    kicker: fill("{brand} for hosts · Free for {trialDays} days · Free events stay free", {brand: brand.name, trialDays: facts.trialDays}),
    title: "Run great events. Build a business around them.",
    body: "Guests pay upfront, the door checks itself in, newcomers get a group, and regulars come back. One app, no spreadsheets, no chasing.",
    start: startTrial,
    /** A person on WhatsApp, one tap from the headline (leak 7). */
    talk: "Talk to us on WhatsApp",
    /** Organisations ask for a walkthrough on its request page. */
    /** The line under the hero: who the walkthrough is for, then the link. */
    walkthroughLead: "Running a venue, studio or company?",
    // A non-breaking hyphen keeps "15‑minute" on one line.
    walkthrough: "Book a 15‑minute walkthrough",
    terms: hostPricingLines.terms,
  },
  ways: {
    kicker: "Find your page",
    title: "Built for whatever you bring people together for.",
    body: "Every kind of host gets a page written for their nights, with stories, pricing and questions from people like them.",
    label: "Event formats",
    /**
     * More formats after the five cards, and the organisations, each to its
     * own page (the board's chips under "By format" and "By organisation").
     */
    chips: [
      {label: "Yoga, spin and fitness studios", href: "/host/studios/", dot: "indigo"},
      {label: "Workshops and classes", href: "/host/workshops/", dot: "yellow"},
      {label: "Book clubs, language exchanges, open mics", href: "/host/communities/", dot: "pink"},
      {label: "Cycling, treks and weekend trips", href: "/host/outdoors/", dot: "mint"},
    ] satisfies readonly {label: string; href: string; dot: "indigo" | "yellow" | "pink" | "mint"}[],
    organisationsTitle: "By organisation",
    organisations: [
      {label: "Cafés, bars and breweries", href: "/host/venues/"},
      {label: "Courts, turfs and clubhouses", href: "/host/facilities/"},
      {label: "Companies, co-living and co-working", href: "/host/teams/"},
      {label: "Colleges and alumni societies", href: "/host/colleges/"},
      {label: "Creators with an audience", href: "/host/creators/"},
      {label: "Brands", href: "/host/brands/"},
      {label: "Weddings", href: "/weddings/"},
      {label: "Offsites, retreats and birthdays", href: "/programmes/"},
    ] satisfies readonly {label: string; href: string}[],
    stagesTitle: "Where you are today",
    stages: [
      {
        ground: "coral", title: "Starting something?",
        body: `Pick a format, set the price and publish your first event from ${brand.stores.hostAppName}. Your free days start at your first event.`,
        link: "Plan your first event", to: {href: "/host/first-event/"},
      },
      {
        ground: "mint", title: "Running it on WhatsApp, Forms and UPI?",
        body: "Bring your guest list across in an afternoon. Nothing changes for guests until the doors open.",
        link: "Leave the WhatsApp group behind", to: {href: "/host/switch/"},
      },
      {
        ground: "ink", title: "Several nights a week, or a team of hosts?",
        body: "Team roles and one record for every guest. A person helps you set up.",
        link: "Book a 15-minute walkthrough", to: {href: hostWalkthroughHref},
      },
    ] satisfies readonly {ground: "coral" | "mint" | "ink"; title: string; body: string; link: string; to: HostLandingTarget}[],
  },
  night: {
    kicker: "On the night",
    title: "Run the whole night from one screen.",
    lead: "Follow one evening, from the first booking to the morning after.",
    storyLabel: "{event}, moment by moment",
    pickerLabel: "Event type",
    pickerLead: "Show me a",
    timelineLabel: "Moments in the evening",
    position: "{index} of {total}",
  },
  /** Why hosts switch: the three things only we do, then the full comparison on /pricing/. */
  switch: {
    kicker: "Why hosts switch",
    title: "What WhatsApp and ticketing apps can’t do.",
    tiles: [
      {ground: "mint", title: "Runs the night for you", body: "Pace groups, quiz teams, seating and court rotations, planned for each format."},
      {ground: "yellow", title: "A first hello for every newcomer", body: "Nobody arrives alone: first-timers get a group before they walk in."},
      {ground: "indigo", title: "Every guest remembered", body: "One record per guest across all your events, so regulars come back."},
    ] satisfies readonly {ground: "mint" | "yellow" | "indigo"; title: string; body: string}[],
    compareLead: "See how ",
    compareLink: `${brand.name} compares with Luma, District and Meetup`,
    compareHref: "/pricing/#compare",
  },
  pricing: {
    kicker: "Pricing",
    rate: facts.rate,
    title: hostPricingLines.rateTitleFree,
    body: hostPricingLines.body,
    /** What the one plan includes, as the band's label pills. */
    included: ["Your page", "Bookings and waitlists", "Payments", "Check-in", "Live tools for the night", "Guest records", "Messages", "Reports"],
    start: startTrial,
    /** Every included feature, the worked examples and the pricing questions live on /pricing/. */
    full: "See full pricing",
    fullHref: "/pricing/",
    /** The band's foot: organisations and busy hosts talk to a person about their setup. */
    organisations: "Running several nights a week, or buying for a company or venue?",
    talk: "Talk to us about your setup",
    talkMessage: `Hi ${brand.name}, I run several nights a week (or buy for a venue or company) and I'd like to talk about my setup.`,
    examples: hostLandingFeeExamples.map(hostFeeExample),
  },
  talk: {
    kicker: "However you like to start",
    title: "Start now, look first, or talk to a person.",
    body: "No call needed to begin. If you’d rather see it or ask first, every route ends in the same free trial.",
    paths: [
      {ground: "coral", kicker: "Ready now", title: "Start your free trial", body: `Download ${brand.stores.hostAppName} and publish your first event tonight. No call, no application.`, link: startTrial, to: {anchor: "start"}},
      {ground: "paper", kicker: "Want to see it", title: "Follow a night", body: "Pick a format and follow its evening, from the first booking to the morning after.", link: "See a night", to: {anchor: "night"}},
      {ground: "mint", kicker: "Want a person", title: "Talk to us on WhatsApp", body: "A real person who knows hosting. We reply on WhatsApp, usually within an hour.", link: "Open WhatsApp", to: {whatsapp: whatsappChatCopy.hostQuestionMessage}},
      {ground: "ink", kicker: "Want a meeting", title: "Book a 15-minute walkthrough", body: "For venues, studios, companies and multi-day programmes. We’ll set it up with you.", link: "Book a walkthrough", to: {href: hostWalkthroughHref}},
    ] satisfies readonly {ground: "coral" | "paper" | "mint" | "ink"; kicker: string; title: string; body: string; link: string; to: HostLandingTarget}[],
  },
  faq: {
    kicker: "Questions",
    title: "A few things you might be wondering.",
    elsewhere: "Something else?",
    ask: "Ask us on WhatsApp",
    items: [
      {title: `Is ${brand.name} only for one kind of event?`, body: `No. Runs, racket sports, dinners, quizzes, nights out, classes, workshops and clubs all run on ${brand.name}, and each format gets its own tools for the night.`},
      {title: "What does the free trial include?", body: fill(
        "Everything, for {trialDays} days from your first event: bookings, payments, check-in, the live night and follow-up. No {brand} fee on what you sell in that time. Founding hosts get {foundingTrialDays} days.",
        {trialDays: facts.trialDays, brand: brand.name, foundingTrialDays: facts.foundingTrialDays},
      )},
      {title: "What happens when the trial ends?", body: fill(
        "{brand} keeps {rate} of ticket sales, net of refunds, and never more than {cap} a month. Free events stay free. Payment gateway fees are separate.",
        {brand: brand.name, rate: facts.rate, cap: facts.cap},
      )},
      {title: "Do I need to talk to anyone to start?", body: `No. Download ${brand.stores.hostAppName}, set up your page and publish when you are ready. If you would like a person, WhatsApp us or book a 15-minute walkthrough.`},
      {title: "Do my guests need to download an app?", body: `No. Guests book on your page and join live moments in their phone’s browser. Booking updates, your messages and the feedback request reach guests who use the ${brand.name} app.`},
      {title: "Do guests get a reminder before the event?", body: `Guests who use the ${brand.name} app get a push notification 15 minutes before the start. To remind guests on WhatsApp, connect your own WhatsApp sender.`},
      {title: "Can I bring my guest list from another tool?", body: "Yes. Import it from any tool. Nothing changes for your guests until the doors open."},
    ],
  },
  start: {
    kicker: fill("Free for {trialDays} days · founding hosts get {foundingTrialDays}", {trialDays: facts.trialDays, foundingTrialDays: facts.foundingTrialDays}),
    title: "Your next event. A stronger foundation.",
    body: `Download ${brand.stores.hostAppName}, set up your first event, and run it tonight if you like.`,
    steps: [
      {title: `Download ${brand.stores.hostAppName}`, body: "On iPhone, Android or iPad."},
      {title: "Set up your page and your first event", body: "Pick a format, set the price and publish when you’re ready."},
      {title: "Your free days start when doors open", body: fill("No {brand} fee on what you sell until {trialDays} days after your first event.", {brand: brand.name, trialDays: facts.trialDays})},
    ],
    /** The other ways in, as sentences under the steps: {whatsapp}, {walkthrough} and {weddings} are links. */
    personLine: "Prefer a person? {whatsapp} or {walkthrough}.",
    personWhatsapp: "WhatsApp us",
    personWalkthrough: "book a 15‑minute walkthrough",
    weddingsLine: "Running a wedding or a multi-day programme? See {weddings}",
    weddings: `${brand.name} for weddings`,
    weddingsHref: "/weddings/",
  },
  /** The phone action bar: the free trial and a person on WhatsApp. */
  dock: {
    label: "Quick actions",
    start: startTrial,
    whatsapp: "Talk to us on WhatsApp",
  },
  footer: {
    /** The footer's help band headline, as the PlaybookHosts board words it. */
    helpTitle: "Questions about hosting? A person answers.",
    tagline: fill("For hosts in {cities}. Meet people in real life, through hosts who bring them together.", {cities: liveCities}),
  },
} as const;

/**
 * The five formats the page follows, in the board's order: the tile in the
 * ways band and the night scene's journey for each.
 */
export const hostNightFormats: readonly HostNightFormat[] = [
  {
    format: "run", accent: "coral", title: "Run clubs", tileTitle: "Run and walk clubs", tile: "Pace pods, a first hello, free runs stay free.", photo: "/assets/events/social-run-music-hero-960.jpg",
    page: "/host/run-clubs/", pageLink: "For run clubs",
    event: "Sunday Social Run", where: "Driftwood Bay Runners · Carter Road, Bandra",
    lead: `People are moving, so phones stay in pockets. ${brand.name} does its work before the start and after the finish.`,
    badges: {phones: "Phones away while running", groups: "Grouped by pace", rhythm: "One route, start to finish", tracks: "Counts who’s back", ends: "Ends with the finish sweep"},
    moments: [
      {time: "Thursday", property: "groups", title: "Pace groups, set before Sunday", slot: "host-formats-pods", body: `Runners give their pace before the run. ${brand.name} builds pods at a similar pace, and you can move anyone before the run.`},
      {time: "6:20 AM", property: "phones", title: "Check in, then pocket the phone", slot: "host-door-in", body: `Runners check in at the meeting point and see their pod once. While the run is on, ${brand.name} sends them nothing.`},
      {time: "6:30 AM", property: "groups", title: "A first hello at the start line", slot: "host-formats-mix", body: "Each pod gets one question to answer together before they set off, so the first kilometre already has a conversation in it."},
      {time: "7:15 AM", property: "tracks", title: "Nobody left on the road", slot: "host-live-console", body: "At the finish, you or your sweep mark each runner back. Anyone not marked stays on your list until you close the run."},
      {time: "Sunday evening", property: "ends", title: "The next run, already easier", slot: "host-post-event-report", body: `Finishers get the photos and, on the ${brand.name} app, a feedback prompt. Your report shows who came for the first time and who came back.`},
    ],
  },
  {
    format: "courts", accent: "mint", title: "Pickleball", tileTitle: "Racket sports", tile: "Pickleball, padel, tennis and badminton, rotated by level.",
    page: "/host/racket-sports/", pageLink: "For racket sports",
    event: "Pickleball Social", where: "Dink and Drink · Andheri West · 40 players, 3 courts",
    lead: `Forty players, three courts. Phones come out between games, and ${brand.name} makes sure everyone gets their share of court time.`,
    badges: {phones: "Phones out between games", groups: "Doubles on three courts", rhythm: "15-minute rounds", tracks: "Counts court time", ends: "Ends with standings"},
    moments: [
      {time: "Friday", property: "groups", title: "Levels in, courts planned", slot: "host-formats-courts-setup", body: `Players give their level before the session. ${brand.name} plans the rounds on your courts so everyone gets about the same time on court.`},
      {time: "4:45 PM", property: "phones", title: "Check in, then play", slot: "host-formats-rules", body: "Players check in at the door. Anyone arriving late joins the next round."},
      {time: "5:00 PM", property: "groups", title: "A new partner every round", slot: "host-formats-courts", body: "Between games, phones show the next court and partner. Nobody plays with the same partner twice until the rotation runs out."},
      {time: "5:40 PM", property: "tracks", title: "Court time, counted", slot: "host-live-needs", body: "You see every player’s minutes on court and on the bench. Anyone sitting out is pointed to the common area to mix."},
      {time: "That evening", property: "ends", title: "Standings, when you’re ready", slot: "host-post-event-report", body: "Record each round’s results, and reveal the final standings at the end."},
    ],
  },
  {
    format: "dinner", accent: "pink", title: "Dinners", tileTitle: "Supper clubs", tile: "Applications, seating and payment before the table is set.", photo: "/assets/marketing/home-dinner.jpg",
    page: "/host/supper-clubs/", pageLink: "For supper clubs",
    event: "Long Table Supper", where: "Khar Table · Khar West",
    lead: `Phones are within reach all evening, and the point is to leave them there. ${brand.name} sets the table, then gets out of the way.`,
    badges: {phones: "Phones barely needed", groups: "Tables of six", rhythm: "Three courses", tracks: "Knows who sits where", ends: "Ends with feedback"},
    moments: [
      {time: "Tuesday", property: "groups", title: "Tables planned from who’s coming", slot: "host-formats-rules", body: `${brand.name} suggests tables from your guest list, keeping friends who booked together side by side, and you adjust with a tap.`},
      {time: "8:00 PM", property: "phones", title: "One look at the phone, then dinner", slot: "host-door-in", body: "Guests check in and see their seat once. After that, nothing at dinner needs a phone."},
      {time: "8:20 PM", property: "tracks", title: "The whole room at a glance", slot: "host-live-console", body: "The seating map shows who’s where. Seat a late arrival or move someone with a tap, and table sizes and anyone you’ve kept apart still hold."},
      {time: "9:10 PM", property: "rhythm", title: "A new seat for dessert", slot: "host-formats-mix", body: `Between courses, ${brand.name} can re-seat the room so everyone meets a few more people. Conversation cards are there if you want them.`},
      {time: "Next morning", property: "ends", title: "Hear how it went", slot: "host-post-event-report", body: `Guests on the ${brand.name} app get a feedback prompt, and can say privately who they talked to. You see the totals, never who named whom.`},
    ],
  },
  {
    format: "games", accent: "yellow", title: "Games and quizzes", tileTitle: "Quiz and game nights", tile: "Teams, rounds and live scores that fill Tuesday.",
    page: "/host/quiz-nights/", pageLink: "For quiz nights",
    event: "Tuesday Trivia Night", where: "Lantern Lane Social · Harbour Room, Bandra West",
    lead: `Heads are down during rounds and up between them. ${brand.name} only speaks in the gaps, and keeps the scores.`,
    badges: {phones: "Phones out between rounds", groups: "Balanced teams of five", rhythm: "Six rounds", tracks: "Scores hidden till the end", ends: "Ends with the reveal"},
    moments: [
      {time: "7:00 PM", property: "groups", title: "Fair teams before the first question", slot: "host-formats-rules", body: `${brand.name} builds teams of five from who’s coming: friends who booked together stay together, and people on their own are spread across teams.`},
      {time: "7:30 PM", property: "phones", title: "A team for everyone at the door", slot: "host-door-arriving", body: "Guests check in and see their team and table on their phone."},
      {time: "8:40 PM", property: "rhythm", title: "Mix the teams between rounds", slot: "host-formats-mix", body: "If you want, people move to new tables between rounds so everyone meets someone new. Guests hear about it only at the change."},
      {time: "9:00 PM", property: "tracks", title: "Scores in, standings hidden", slot: "host-live-scores", body: "You enter each round’s scores. The standings stay hidden until you reveal them, so the last round still matters."},
      {time: "9:40 PM", property: "ends", title: "The reveal", slot: "host-live-needs", body: "Start a countdown, and the final standings appear on every guest’s phone at once."},
    ],
  },
  {
    format: "nightsOut", accent: "magenta", title: "Pub crawls", tileTitle: "Nights out", tile: "Crawls and socials, with a link for every promoter.",
    page: "/host/nightlife/", pageLink: "For nightlife",
    event: "Friday Bandra Pub Crawl", where: "Night Shift Socials · four stops in Bandra",
    lead: `The night moves, so the plan has to travel with it. Phones come out between stops, and ${brand.name} keeps count of everyone along the way.`,
    badges: {phones: "Phones out between stops", groups: "One group, with a lead and a sweep", rhythm: "Four stops", tracks: "Counts who left each stop", ends: "Ends with everyone accounted for"},
    moments: [
      {time: "Thursday", property: "rhythm", title: "Plan the route", slot: "host-formats-crawl", body: "Set the stops, and give your helpers a lead or sweep role for the night."},
      {time: "7:30 PM", property: "groups", title: "A first hello at the first bar", slot: "host-door-arriving", body: "Guests check in and get one icebreaker to do with someone in the group, so people are mixing before the first move."},
      {time: "8:42 PM", property: "phones", title: "Move between venues", slot: "host-formats-crawl-move", body: "When the group leaves a stop, your lead confirms who left and where you’re heading next."},
      {time: "10:30 PM", property: "tracks", title: "Late arrivals find the group", slot: "host-formats-crawl-move", body: "Someone arriving late is pointed to the stop you’ve confirmed you’re at, not the first one."},
      {time: "11:15 PM", property: "ends", title: "The end-of-night sweep", slot: "host-live-needs", body: "At the last stop, mark everyone accounted for. Anyone not marked stays on your list before you close the night."},
    ],
  },
];
