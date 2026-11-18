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
import {whatsappChatCopy} from "./site.ts";

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

/** A comparison cell: its text, and whether it is a plain yes, a plain no or not published. */
export interface HostCompareCell {
  text: string;
  status?: "yes" | "no" | "unknown";
}

const yes: HostCompareCell = {text: "Yes", status: "yes"};
const no: HostCompareCell = {text: "No", status: "no"};
const notPublished: HostCompareCell = {text: "Not published", status: "unknown"};

/** Where a link on the page goes: a band on this page, or a WhatsApp chat with the message typed. */
export type HostLandingTarget = {anchor: string} | {whatsapp: string};

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
    /** Organisations ask for a walkthrough on WhatsApp until walkthrough booking exists. */
    walkthrough: "Running a venue, studio or company? Book a 15-minute walkthrough",
    terms: hostPricingLines.terms,
  },
  ways: {
    kicker: "Every kind of host",
    title: "Built for whatever you bring people together for.",
    body: `A pace group, a seating plan and a group walking to the next bar are different jobs. ${brand.name} knows which one you’re running. Pick one to follow its night.`,
    label: "Event formats",
    /** Each format card's link: it picks the format and lands on its night. */
    more: "Follow its night",
    stagesTitle: "Where you are today",
    stages: [
      {
        ground: "coral", title: "Starting something?",
        body: `Pick a format, set the price and publish your first event from ${brand.stores.hostAppName}. Your free days start at your first event.`,
        link: startTrial, to: {anchor: "start"},
      },
      {
        ground: "mint", title: "Running it on WhatsApp, Forms and UPI?",
        body: "Bring your guest list across in an afternoon. Nothing changes for guests until the doors open.",
        link: "See how it compares", to: {anchor: "compare"},
      },
      {
        ground: "ink", title: "Several nights a week, or a team of hosts?",
        body: "Team roles and one record for every guest. A person helps you set up.",
        link: "Book a 15-minute walkthrough", to: {whatsapp: whatsappChatCopy.walkthroughMessage},
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
  compare: {
    kicker: "Compare",
    title: `How ${brand.name} compares with what hosts use today.`,
    body: "Most hosts start on WhatsApp, Google Forms and UPI screenshots. Others use Luma, District or Meetup. Here’s what each one does, taken from their own pages.",
    rowHeader: "What you need",
    columns: [brand.name, "WhatsApp, Forms and UPI", "Luma", "District", "Meetup"],
    rows: [
      {label: "Free events stay free", cells: [yes, yes, yes, notPublished, {text: "Organiser subscription", status: "no"}]},
      {label: "Fee on paid tickets", cells: [
        {text: fill("{rate}, never more than {cap} per billing cycle", {rate: facts.rate, cap: facts.cap})},
        {text: "None, but you chase every payment"},
        {text: "5% (0% on a US$59-a-month plan), plus card fees"},
        {text: "Negotiated per event; no public rate"},
        {text: "A service fee for attendees, plus your subscription"},
      ]},
      {label: "Paid in rupees, by UPI", cells: [yes, {text: "Screenshots to match"}, {text: "No: can’t pay hosts based in India", status: "no"}, yes, {text: "Not documented for India", status: "unknown"}]},
      {label: "Applications and waitlists", cells: [{text: "Yes, with waitlist backfill", status: "yes"}, {text: "By hand", status: "no"}, yes, notPublished, {text: "Waitlists on free events only"}]},
      {label: "Check-in at the door", cells: [{text: "QR or self check-in, phone or iPad", status: "yes"}, {text: "A printed list", status: "no"}, {text: "QR in the Luma app"}, notPublished, {text: "QR tickets"}]},
      {label: "Runs the night: pace groups, teams, seating, court rotations", cells: [{text: "Yes, for each format", status: "yes"}, no, no, no, no]},
      {label: "A first hello for every newcomer", cells: [yes, no, no, no, no]},
      {label: "Every guest remembered across events", cells: [yes, {text: "In your head", status: "no"}, {text: "Partly: calendar subscribers"}, {text: "The platform keeps them", status: "no"}, {text: "Group members"}]},
      {label: "Helps people find you", cells: [{text: fill("Growing: {cities}", {cities: liveCities}), status: "yes"}, no, {text: "Small audience in India"}, {text: "A large going-out marketplace"}, {text: "Interest groups"}]},
    ] satisfies readonly {label: string; cells: readonly HostCompareCell[]}[],
    checked: "Checked on 15 Nov 2026",
    source: "From each company’s own pages. Meetup cells and District’s payout cell come from search results. “Not published” means we found no public statement, not that the feature is missing.",
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
      {ground: "ink", kicker: "Want a meeting", title: "Book a 15-minute walkthrough", body: "For venues, studios, companies and multi-day programmes. We’ll set it up with you.", link: "Book on WhatsApp", to: {whatsapp: whatsappChatCopy.walkthroughMessage}},
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
        "{brand} keeps {rate} of ticket sales, net of refunds, and never more than {cap} per {cycleDays}-day billing cycle. Free events stay free. Payment gateway fees are separate.",
        {brand: brand.name, rate: facts.rate, cap: facts.cap, cycleDays: facts.cycleDays},
      )},
      {title: "Do I need to talk to anyone to start?", body: `No. Download ${brand.stores.hostAppName}, set up your page and publish when you are ready. If you would like a person, WhatsApp us or book a 15-minute walkthrough.`},
      {title: "Do my guests need to download an app?", body: "No. Guests book on your page and join live moments in their phone’s browser."},
      {title: "Do guests get a reminder before the event?", body: `Guests who use the ${brand.name} app get a push notification 15 minutes before the start. To remind guests on WhatsApp, connect your own WhatsApp sender.`},
      {title: "Can I bring my guest list from another tool?", body: "Yes. Import it from any tool. Nothing changes for your guests until the doors open."},
    ],
  },
  start: {
    kicker: fill("Free for {trialDays} days · founding hosts get {foundingTrialDays}", {trialDays: facts.trialDays, foundingTrialDays: facts.foundingTrialDays}),
    title: "Your next event. A stronger foundation.",
    body: `Download ${brand.stores.hostAppName}, set up your first event, and run it tonight if you like.`,
    steps: [
      {title: `Download ${brand.stores.hostAppName}`, body: "On iPhone, Android or iPad. On a laptop, scan the code or get the link on WhatsApp."},
      {title: "Set up your page and your first event", body: "Pick a format, set the price and publish when you’re ready."},
      {title: "Your free days start when doors open", body: fill("No {brand} fee on what you sell until {trialDays} days after your first event.", {brand: brand.name, trialDays: facts.trialDays})},
    ],
    /** Wide screens only (leak 6): the QR opens this band on the phone, where both store buttons are. */
    qrTitle: `On a laptop? Scan to get ${brand.stores.hostAppName}`,
    qrBody: "Or we’ll send the link to your WhatsApp.",
    qrLabel: `QR code that opens ${brand.name} for hosts on your phone`,
    whatsappLink: "Get the link on WhatsApp",
    personLead: "Prefer a person?",
    personWhatsapp: "WhatsApp us",
    personWalkthrough: "Book 15 minutes",
    weddingsLead: "Running a wedding or a multi-day programme?",
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
    event: "Sunday Social Run", where: "Carter Road Runners · Carter Road, Bandra",
    lead: `People are moving, so phones stay in pockets. ${brand.name} does its work before the start and after the finish.`,
    badges: {phones: "Phones away while running", groups: "Grouped by pace", rhythm: "One route, start to finish", tracks: "Counts who’s back", ends: "Ends with next week’s run"},
    moments: [
      {time: "Thursday", property: "groups", title: "Pace groups, set before Sunday", slot: "host-formats-pods", body: `Every booking brings a pace. ${brand.name} builds groups of six to eight at a similar pace, and spreads newcomers so no group is all strangers.`},
      {time: "6:20 AM", property: "phones", title: "Check in, then pocket the phone", slot: "host-door-in", body: `Runners tap in at the fountain and see their group and its lead once. After the start, ${brand.name} goes quiet: no prompts while anyone is running.`},
      {time: "6:30 AM", property: "groups", title: "A first hello at the start line", slot: "host-formats-mix", body: "Each group gets one question to answer together before they set off, so the first kilometre already has a conversation in it."},
      {time: "7:15 AM", property: "tracks", title: "Nobody left on the road", slot: "host-live-console", body: "Group leads mark runners back at the finish. Anyone not back ten minutes after their group shows up on your screen, with their group and last check-in."},
      {time: "Sunday evening", property: "ends", title: "The next run, already easier", slot: "host-post-event-report", body: "Finishers get the photos and a one-tap “same time next week?”. Anyone who asked for a steadier pace starts in a steadier group next time."},
    ],
  },
  {
    format: "courts", accent: "mint", title: "Pickleball", tileTitle: "Racket sports", tile: "Pickleball, padel, tennis and badminton, rotated by level.",
    event: "Pickleball Social", where: "Dink and Drink · Andheri West · 40 players, 3 courts",
    lead: `Forty players, three courts. Phones come out between games, and ${brand.name} makes sure everyone gets their share of court time.`,
    badges: {phones: "Phones out between games", groups: "Doubles on three courts", rhythm: "15-minute rounds", tracks: "Counts court time", ends: "Ends with standings"},
    moments: [
      {time: "Friday", property: "groups", title: "Levels in, courts balanced", slot: "host-formats-courts-setup", body: `Each booking brings a skill level. ${brand.name} plans the rounds so every match is close and all forty players get about the same time on court.`},
      {time: "4:45 PM", property: "phones", title: "Check in, level confirmed", slot: "host-formats-rules", body: "Players confirm their level at the door. Walk-ins join the next round, not a queue."},
      {time: "5:00 PM", property: "groups", title: "A new partner every round", slot: "host-formats-courts", body: "Between games, phones buzz with the next court and partner. Nobody plays with the same partner twice until they’ve played with everyone at their level."},
      {time: "5:40 PM", property: "tracks", title: "Fair court time, counted", slot: "host-live-needs", body: `${brand.name} counts every player’s minutes on court. Anyone falling behind goes on next; anyone sitting out is pointed to the lounge, and to someone there to meet.`},
      {time: "That evening", property: "ends", title: "Standings, then the next session", slot: "host-post-event-report", body: "Final standings go out with the photos. Players who want an easier or tougher session get that invitation next."},
    ],
  },
  {
    format: "dinner", accent: "pink", title: "Dinners", tileTitle: "Supper clubs", tile: "Applications, seating and payment before the table is set.", photo: "/assets/marketing/home-dinner.jpg",
    event: "Long Table Supper", where: "Khar Table · Khar West",
    lead: `Phones are within reach all evening, and the point is to leave them there. ${brand.name} sets the table, then gets out of the way.`,
    badges: {phones: "Phones barely needed", groups: "Tables of six", rhythm: "Three courses", tracks: "Knows who sits where", ends: "Ends with who’d sit together again"},
    moments: [
      {time: "Tuesday", property: "groups", title: "Tables planned from what people told you", slot: "host-formats-rules", body: `Applications bring who’s coming and why. ${brand.name} suggests tables of six with something in common and someone new, and you adjust with a drag.`},
      {time: "8:00 PM", property: "phones", title: "One look at the phone, then dinner", slot: "host-door-in", body: `Guests check in and see their seat once. After that, nothing at dinner needs a phone, and ${brand.name} won’t ask for one.`},
      {time: "8:20 PM", property: "tracks", title: "The whole room at a glance", slot: "host-live-console", body: "The seating map shows who’s where. Seat a late arrival or move someone with a tap, and table sizes and anyone you’ve kept apart still hold."},
      {time: "9:10 PM", property: "rhythm", title: "A new seat for dessert", slot: "host-formats-mix", body: `Between courses, ${brand.name} suggests a dessert swap so everyone meets a few more people. One table gone quiet? Send it a conversation card.`},
      {time: "Next morning", property: "ends", title: "Invite them back", slot: "host-post-event-report", body: "Guests say who they’d happily sit with again. The people who’d come back hear about the next date first."},
    ],
  },
  {
    format: "games", accent: "yellow", title: "Games and quizzes", tileTitle: "Quiz and game nights", tile: "Teams, rounds and live scores that fill Tuesday.",
    event: "Tuesday Trivia Night", where: "Lantern Lane Social · Harbour Room, Bandra West",
    lead: `Heads are down during rounds and up between them. ${brand.name} only speaks in the gaps, and keeps the scores honest.`,
    badges: {phones: "Phones out between rounds", groups: "Balanced teams of five", rhythm: "Six rounds", tracks: "Scores hidden till the end", ends: "Ends with the reveal"},
    moments: [
      {time: "7:00 PM", property: "groups", title: "Fair teams before the first question", slot: "host-formats-rules", body: `${brand.name} builds teams of five from who’s coming: people on their own spread across teams, friends kept together if they asked, and no team stacked with regulars.`},
      {time: "7:30 PM", property: "phones", title: "A team for everyone at the door", slot: "host-door-arriving", body: "Guests check in and see their team and table. Anyone who came alone is introduced to their team by name before round one."},
      {time: "8:40 PM", property: "rhythm", title: "Mix once at half-time", slot: "host-formats-mix", body: "Between rounds, one person from each team moves on. Only the people moving get a buzz; everyone else stays in the game."},
      {time: "9:00 PM", property: "tracks", title: "Scores in, standings hidden", slot: "host-live-scores", body: "The quizmaster enters each round’s scores. Teams see their own; the leaderboard stays hidden until the end, so the last round still matters."},
      {time: "9:40 PM", property: "ends", title: "The reveal", slot: "host-live-needs", body: "A countdown on every phone and the big screen at once, then the final standings. The winners pick next week’s theme."},
    ],
  },
  {
    format: "nightsOut", accent: "magenta", title: "Pub crawls", tileTitle: "Nights out", tile: "Crawls and socials, with a link for every promoter.",
    event: "Friday Bandra Pub Crawl", where: "Night Shift Socials · four stops in Bandra",
    lead: `The night moves, so the plan has to travel with it. Phones come out between stops, and ${brand.name} keeps count of everyone along the way.`,
    badges: {phones: "Phones out between stops", groups: "Groups of ten, each with a lead", rhythm: "Four stops", tracks: "Counts arrivals at every stop", ends: "Ends with everyone home"},
    moments: [
      {time: "Thursday", property: "rhythm", title: "Plan the route", slot: "host-formats-crawl", body: "Four stops, two groups of ten and a lead for each, shared with your team and the venues before the night."},
      {time: "7:30 PM", property: "groups", title: "A first hello at the first bar", slot: "host-door-arriving", body: "Guests check in and get one icebreaker to do with someone in their group, so the group is mixing before the first move."},
      {time: "8:42 PM", property: "phones", title: "Move groups between venues", slot: "host-formats-crawl-move", body: "Phones come out on the move: where you’re heading and who’s with you. Each lead confirms who left and who arrived."},
      {time: "10:30 PM", property: "tracks", title: "Late arrivals find the group", slot: "host-formats-crawl-move", body: "Someone arriving late gets the stop you’re at now, not the first one, and their lead sees them coming."},
      {time: "11:15 PM", property: "ends", title: "The return sweep", slot: "host-live-needs", body: "At the last stop, leads mark everyone as home or still out. Anyone not accounted for shows up on your screen."},
    ],
  },
];
