// Copy for the host landing (/host/), from the owner's RbWebHostV2 board in
// the design canvas (page "Website · rebuilt"). Copy is the
// owner's: change it on the board first. Capture slot ids name entries in
// tool/marketing/capture_manifest.json.
import type {CatchFormat} from "@catch/web-ui";
import {brand} from "./brand.ts";

/** An event property the format matrix compares and each night moment relies on. */
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
  title: string;
  /** The format tile's line. */
  tile: string;
  /** A photo for the format tile, when the site has one. */
  photo?: string;
  event: string;
  where: string;
  lead: string;
  /** The matrix row for each property. */
  properties: Record<HostNightProperty, string>;
  /** Each property phrased as a fact about this event, the badge on the focused moment. */
  badges: Record<HostNightProperty, string>;
  moments: readonly HostNightMoment[];
}

const startTrial = "Start free trial";

export const hostLandingCopy = {
  header: {
    title: `${brand.name} for hosts`,
    nav: [
      {label: "On the night", href: "#night"},
      {label: `Ways to use ${brand.name}`, href: "#ways"},
      {label: "Pricing", href: "#pricing"},
    ],
    start: startTrial,
  },
  hero: {
    title: "Run great events. Build a business around them.",
    body: "Bookings, payments, check-in and the night itself, in one app. Spend the evening with your guests, not your spreadsheets.",
    start: startTrial,
    seeNight: `See a night on ${brand.name}`,
    terms: "Free for 30 days from your first event · then 5% of ticket sales, never more than ₹10,000 a month · iPhone, Android and iPad",
  },
  kinds: {
    title: "Built for every kind of night.",
    body: `A pace group, a seating plan and a group walking to the next bar are different jobs. ${brand.name} knows which one you’re running.`,
    label: "Event formats",
    kicker: "Follow an evening",
  },
  matrix: {
    heading: `How ${brand.name} reads each one`,
    note: "Same app, five different nights. Pick one to follow it moment by moment.",
    properties: [
      {key: "phones", label: "When phones come out"},
      {key: "groups", label: "How people are grouped"},
      {key: "rhythm", label: "The rhythm of the night"},
      {key: "tracks", label: `What ${brand.name} keeps count of`},
      {key: "ends", label: "How it ends"},
    ] satisfies readonly {key: HostNightProperty; label: string}[],
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
  tablet: {
    kicker: "At the host stand",
    title: "Bigger room? Put it on the iPad.",
    body: "The same live controls, with the run of show and the room map side by side for whoever is running the floor.",
    slot: "host-live-tablet",
  },
  pipeline: {
    title: "From interested to expected.",
    body: `Watch ten applications become a guest list that’s ready for the night. You make the calls; ${brand.name} does the chasing.`,
    label: "Booking steps",
    boardLabel: "Guests moving from applied to booked",
    replay: "Play again",
    steps: [
      {label: "Applied", title: "They apply", accent: "indigo", stat: "10 applications", body: "Applications arrive with the answers you asked for: who they are, who they’re bringing, what they’re hoping for."},
      {label: "Approved", title: "You approve", accent: "mint", stat: "9 approved · 1 on the waitlist", body: "Approve with a tap. Offers stay open for as long as you choose, and the waitlist stays warm."},
      {label: "Paid", title: "They pay", accent: "yellow", stat: "7 paid · ₹4,200", body: "UPI or card. Every payment lands next to the right name, with no screenshots to chase."},
      {label: "Booked", title: "They show up", accent: "coral", stat: "7 booked · arrival details sent", body: "Booked guests get where to meet and a reminder the day before. You get a guest list that’s ready."},
    ] as const,
    guests: [
      {name: "Asha", reached: 3}, {name: "Kabir", reached: 3}, {name: "Ishaan", reached: 3}, {name: "Neha", reached: 3}, {name: "Rohan", reached: 1},
      {name: "Zara", reached: 3}, {name: "Tara", reached: 3}, {name: "Vikram", reached: 1}, {name: "Meera", reached: 3}, {name: "Dev", reached: 0},
    ],
  },
  guests: {
    kicker: "For your guests",
    title: "Help people get more out of being there.",
    body: `A prompt gives someone a reason to approach. A shared activity makes conversation expected. ${brand.name} helps the hello begin, then leaves people to enjoy the night.`,
    slot: "guest-explore",
    items: [
      {icon: "people", title: "A reason to say hello", body: "A group, a team or a prompt, then attention goes back to the room."},
      {icon: "chat", title: "A quieter way to ask", body: "With Help me say hi, a guest asks you for an introduction, privately."},
      {icon: "mobile", title: "Nothing to install", body: "Guests join live moments in their phone’s browser, and can always skip."},
    ] as const,
    sees: {kicker: "What a guest sees", title: "Steady 5K", body: "Meet by the fountain. Say hello to someone in your group."},
  },
  growth: {
    title: "Know what brings people in, and brings them back.",
    body: `Give every promoter, venue and post its own link. ${brand.name} follows each one from the first visit to a paid booking, so you know where to put your next effort.`,
    pickLink: "Pick a link",
    linkBase: `${brand.web.domain}/e/tuesday-trivia?via=`,
    links: [
      {name: "Community newsletter", description: "Your monthly email", slug: "newsletter", visits: 180, bookings: 24, revenue: 14_400, format: "courts"},
      {name: "Promoter · Meera", description: "A promoter who brings friends", slug: "meera", visits: 120, bookings: 18, revenue: 10_800, format: "dinner"},
      {name: "Instagram bio", description: "The link in your profile", slug: "instagram", visits: 240, bookings: 12, revenue: 7_200, format: "games"},
    ] satisfies readonly {name: string; description: string; slug: string; visits: number; bookings: number; revenue: number; format: CatchFormat}[],
    steps: [
      {title: "Make a link for each promoter, post or poster."},
      {title: "Share it anywhere: a bio, a newsletter, a WhatsApp group."},
      {title: "Every visit and booking counts against the link it came from."},
    ],
    visits: "Visits: {count}",
    bookings: "Bookings: {count}",
    rate: "of visitors booked",
    revenue: "in ticket sales",
    perVisit: "per visit",
    insight: "Instagram sends the most visitors, but Meera’s link books the biggest share of them.",
    regularsTitle: "Your regulars, remembered.",
    regularsBody: "Every guest keeps one record across your events, so the next invitation goes to the people who’ll come.",
    disclaimer: "Illustrative data. Link tracking counts recorded visits and bookings; it doesn’t see private forwards. Private answers stay private.",
  },
  layers: {
    title: "Start with what you need.",
    body: `Keep the tools you like. Hand ${brand.name} as much of the evening as you want, one layer at a time.`,
    label: `How much of the evening runs on ${brand.name}`,
    options: [
      {value: "0", label: "1 · Keep your tools", body: "Import your guest list from any tool. Nothing changes for your guests until the doors open."},
      {value: "1", label: `2 · Take bookings on ${brand.name}`, body: `Applications, payments and reminders run on ${brand.name}, with one record for every guest.`},
      {value: "2", label: `3 · Get found on ${brand.name}`, body: "Your events appear where people in your city look for something worth showing up for."},
    ],
    map: {
      on: `${brand.name} runs this`,
      off: "Stays on your own tools",
      everyLayer: "Every layer",
      fromLayer: "From layer {layer}",
      newHere: "new here",
      youKeep: "You keep {yours}",
    },
    nodes: [
      {label: "Get found", from: 2, yours: "Instagram and your own page"},
      {label: "Bookings and payments", from: 1, yours: "Luma, forms and UPI screenshots"},
      {label: "Messages", from: 1, yours: "your WhatsApp groups"},
      {label: "Check-in", from: 0},
      {label: "The night", from: 0},
      {label: "Follow-up", from: 0},
    ],
    pricing: "See pricing",
  },
  pricing: {
    kicker: "Pricing",
    rate: "5%",
    title: "of ticket sales. Never more than ₹10,000 a month.",
    body: `Free for 30 days from your first event. After that, ${brand.name} keeps 5% of what you sell, net of refunds, and the fee stops growing once it reaches ₹10,000 in a month. Free events stay free.`,
    start: startTrial,
    sales: "Your ticket sales this month",
    min: "₹0",
    max: "₹5,00,000",
    fee: `${brand.name} fee`,
    feeNote: "5% until the cap",
    effective: "Your effective rate",
    effectiveNote: "of this month’s ticket sales",
    capLabel: "Fee against the ₹10,000 monthly cap",
    capped: "Capped. After your trial, you pay ₹10,000 however much more you sell in a month.",
    uncapped: "After your trial, the cap kicks in at ₹2,00,000 of ticket sales in a month.",
    trial: "In your first 30 days, from your first event: ₹0, whatever you sell.",
    gateway: `Payment gateway fees are separate. Your payment provider charges them at its own rate, on top of the ${brand.name} fee.`,
  },
  faq: {
    title: "A few things you might be wondering.",
    items: [
      {title: `Is ${brand.name} only for one kind of event?`, body: `No. ${brand.name} is for independent hosts, clubs, communities and event teams. Runs, dinners, games, sports and nights out all benefit from easier coordination and more ways to take part. Social tools are optional.`},
      {title: "What does the free trial include?", body: `Everything: bookings and payments, the door, the live console, links and the follow-up. It runs for 30 days from your first event, and ${brand.name} takes no fee on what you sell in that time.`},
      {title: "What happens when the trial ends?", body: `Nothing changes in the app. From then on ${brand.name} keeps 5% of ticket sales, net of refunds, and never more than ₹10,000 in a month. Free events stay free, and payment gateway fees are charged separately by your payment provider.`},
      {title: "Do I need to talk to anyone to start?", body: `No. Download ${brand.stores.hostAppName}, set up your page and your first event, and publish when you’re ready. Help is in the app if you want it. Running a wedding or a multi-day programme? That’s ${brand.name} for weddings, which we set up with you.`},
      {title: "Do my guests need to download an app?", body: `No. Guests join live moments in their phone’s browser after a quick phone check, with no app or profile needed. Taking part is scoped to your event. Guests who want their plans and group chats in one place can use the ${brand.name} app.`},
      {title: `Do I have to move my bookings to ${brand.name}?`, body: `No. Keep your booking or RSVP tool and import your guest list from a CSV or spreadsheet in ${brand.stores.hostAppName}. Move bookings over whenever you’re ready.`},
      {title: "Can I choose which activities guests see?", body: "Yes. Pick the format and tools when you set up an event, and adjust groups or override assignments from the live console. Introductions, prompts and group activities are optional, and guests can skip them."},
      {title: "What guest information can my team see?", body: "Your team uses the booking and application information guests provide for the event, with access suited to each role. Private questionnaire answers stay out of guest records, and private feedback is shown as combined patterns."},
    ],
  },
  start: {
    kicker: "Free for 30 days",
    title: "Your next event. A stronger foundation.",
    body: `Download ${brand.stores.hostAppName}, set up your first event, and run it tonight if you like. No call, no application.`,
    steps: [
      {title: `Download ${brand.stores.hostAppName}`, body: "On iPhone, Android or iPad."},
      {title: "Set up your page and your first event", body: "Pick a format, set the price and publish when you’re ready."},
      {title: "Your 30 days start when doors open", body: `No ${brand.name} fee on what you sell until 30 days after your first event.`},
    ],
    weddingsLead: "Running a wedding or a multi-day programme?",
    weddings: `${brand.name} for weddings`,
    weddingsHref: "/weddings/",
  },
  footer: {
    wordmark: `${brand.name}`,
    tagline: "For hosts in Mumbai. Meet people in real life, through hosts who bring them together.",
  },
} as const;

/**
 * The five formats the page follows, in the board's order: the tile, the
 * matrix column and the night scene's journey for each.
 */
export const hostNightFormats: readonly HostNightFormat[] = [
  {
    format: "run", accent: "coral", title: "Run clubs", tile: "Pace groups, and a first hello for every newcomer.", photo: "/assets/events/social-run-music-hero-960.jpg",
    event: "Sunday Social Run", where: "Carter Road Runners · Carter Road, Bandra",
    lead: `People are moving, so phones stay in pockets. ${brand.name} does its work before the start and after the finish.`,
    properties: {phones: "Before and after only", groups: "Pace groups of 6 to 8", rhythm: "One route, start to finish", tracks: "Who’s back at the finish", ends: "Next week’s run"},
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
    format: "dinner", accent: "pink", title: "Dinners", tile: "Seat strangers well, then invite them back.", photo: "/assets/marketing/home-dinner.jpg",
    event: "Long Table Supper", where: "Khar Table · Khar West",
    lead: `Phones are within reach all evening, and the point is to leave them there. ${brand.name} sets the table, then gets out of the way.`,
    properties: {phones: "Nearby, rarely needed", groups: "Tables of 6", rhythm: "Three courses", tracks: "Who sits where", ends: "Who’d sit together again"},
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
    format: "games", accent: "yellow", title: "Games and quizzes", tile: "Teams, rounds and a final the whole room shares.",
    event: "Tuesday Trivia Night", where: "Lantern Lane Social · Harbour Room, Bandra West",
    lead: `Heads are down during rounds and up between them. ${brand.name} only speaks in the gaps, and keeps the scores honest.`,
    properties: {phones: "Between rounds", groups: "Balanced teams of 5", rhythm: "Six rounds", tracks: "Scores, hidden till the end", ends: "The reveal"},
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
    format: "courts", accent: "mint", title: "Pickleball", tile: "Courts and partners, rotated by level.",
    event: "Pickleball Social", where: "Dink and Drink · Andheri West · 40 players, 3 courts",
    lead: `Forty players, three courts. Phones come out between games, and ${brand.name} makes sure everyone gets their share of court time.`,
    properties: {phones: "Between rounds", groups: "Doubles on 3 courts", rhythm: "15-minute rounds", tracks: "Court time and partners", ends: "Standings"},
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
    format: "nightsOut", accent: "magenta", title: "Pub crawls", tile: "Move a group between venues and know who arrived.",
    event: "Friday Bandra Pub Crawl", where: "Night Shift Socials · four stops in Bandra",
    lead: `The night moves, so the plan has to travel with it. Phones come out between stops, and ${brand.name} keeps count of everyone along the way.`,
    properties: {phones: "Between stops", groups: "Groups of 10, each with a lead", rhythm: "Four stops", tracks: "Who’s at each stop", ends: "Everyone accounted for"},
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

/** A rectangle in a capture's own pixels. */
export interface HostNightBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Where the app screen sits inside every framed phone capture the night scene
 * shows (980 × 1924 PNGs from tool/marketing; the frame is the same on each).
 */
export const hostNightCaptureScreen: HostNightBox = {x: 88, y: 88, width: 804, height: 1748};

/**
 * The part of each capture a night moment is about, in capture pixels, from
 * the owner's NightFrameCropMap board (design canvas page "On the night ·
 * mobile framing"). A phone-width band shows only this box, so the app's text
 * reads at about 14 px instead of 4.6. Keep each box inside
 * hostNightCaptureScreen and re-check it when a capture is re-rendered. A slot
 * without a box shows the top of its screen.
 */
export const hostNightFocus: Readonly<Record<string, HostNightBox>> = {
  "host-formats-pods": {x: 112, y: 650, width: 756, height: 1080},
  "host-door-in": {x: 112, y: 340, width: 756, height: 910},
  "host-formats-mix": {x: 112, y: 350, width: 756, height: 580},
  "host-live-console": {x: 112, y: 500, width: 756, height: 930},
  "host-post-event-report": {x: 112, y: 380, width: 756, height: 680},
  "host-door-arriving": {x: 112, y: 700, width: 756, height: 980},
  "host-live-needs": {x: 112, y: 360, width: 756, height: 860},
  "host-live-scores": {x: 112, y: 680, width: 756, height: 1040},
  "host-formats-rules": {x: 112, y: 380, width: 756, height: 790},
  "host-formats-courts-setup": {x: 112, y: 360, width: 756, height: 1000},
  "host-formats-courts": {x: 112, y: 360, width: 756, height: 1060},
  "host-formats-crawl": {x: 112, y: 360, width: 756, height: 1060},
  "host-formats-crawl-move": {x: 112, y: 660, width: 756, height: 1080},
};
