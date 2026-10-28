// Copy for the Website v2 homepage (CAT-260), from the owner-approved WebHomeV2
// board (design/source_packs/website-v2/boards/WebHomeV2.dc.html). Catch is
// for meeting people in real life: no dating, singles, mixer or match wording.
import type {CatchFormat} from "@catch/web-ui";

export const homePageCopy = {
  header: {nav: "Main", explore: "Explore", organisers: "Organisers", hosts: "For hosts", app: "Get the app",
    cityMenu: "Choose your city", liveStatus: "{count} plans this week", soonStatus: "Launching soon"},
  hero: {
    liveEyebrow: "In {city} this week",
    soonEyebrow: "Launching soon in {city}",
    title: "Find something worth showing up for.",
    body: "Runs, dinners, games and nights out, run by hosts who bring people together. Come on your own and leave knowing a few more people.",
    liveAction: "See what’s on in {city}",
    soonAction: "Get notified for {city}",
    hostAction: "Host an event",
    screenAlt: "The Catch app showing tonight’s plans",
  },
  formats: {
    eyebrow: "Something for every kind of evening",
    title: "Start with what you feel like doing.",
    lead: "Tap a format to see what’s on. Every plan has a host who’s there on the night.",
    label: "Formats",
    liveCount: "{count} this week",
    soonKicker: "Coming to {city}",
  },
  week: {
    title: "This week in {city}",
    eyebrow: "{count} plans this week",
    lead: "Hosted plans across {areas}.",
    leadNoAreas: "Hosted plans across {city}.",
    action: "See everything in {city}",
    filters: "Filter by format",
    everything: "Everything",
    note: "{shown} of {total} plans shown. Hosts set their own prices.",
    filteredNote: "Showing {shown} of {total} this week · {format}",
    emptyFormat: "No {format} this week. Try another format.",
    spotsLeft: "{count} left",
    full: "Full",
    free: "Free",
  },
  soon: {
    eyebrow: "Launching soon",
    title: "Catch is coming to {city}.",
    lead: "Hosts in {areas} are setting up their first plans. Say you’re in and you’ll hear the day it opens.",
    leadNoAreas: "Hosts in {city} are setting up their first plans. Say you’re in and you’ll hear the day it opens.",
    comingLabel: "What’s coming first",
    comingFallback: "Runs, dinners, games and nights out",
    joiningLabel: "Organisers joining",
    knowHost: "Know a host in {city}?",
    knowHostAction: "Send them to Catch for hosts →",
    appTitle: "Get the app now and follow hosts as they join",
    liveCityNote: "In {city} soon?",
    liveCityCount: "{count} plans are on this week.",
    liveCityAction: "See what’s on in {city}",
  },
  story: {
    eyebrow: "How a night works",
    title: "Come on your own. Leave knowing a few more people.",
    lead: "Hosts plan the first ten minutes so you don’t have to. Here’s a Sunday run with Carter Road Runners.",
    label: "How a night works",
    previous: "Previous step",
    next: "Next step",
    steps: [
      {id: "find", title: "Find a plan", body: "Pick something you’d actually enjoy. Every plan shows who’s hosting, where you meet and who it suits.",
        screen: "/assets/app-screens/explore.png", alt: "Explore with tonight’s plans"},
      {id: "show-up", title: "Show up", body: "Your host has a group, a partner or a game ready, and a first hello so nobody stands on their own.",
        screen: "/assets/app-screens/guest-live.png", alt: "The live view with your group and a first hello prompt"},
      {id: "keep-in-touch", title: "Keep in touch", body: "Your group chat stays open for a week. Follow the hosts you liked and hear about their next one first.",
        screen: "/assets/app-screens/guest-after.png", alt: "After the event: feedback, the group chat and the host’s next plan"},
    ],
  },
  organisers: {
    liveEyebrow: "Organisers near you",
    soonEyebrow: "Joining in {city}",
    liveTitle: "The people behind the plans.",
    soonTitle: "Follow them before Catch opens.",
    lead: "Follow the hosts you like and their next plan lands in your app first.",
    next: "Next: {date} · {title}",
    nextSoon: "Next: first plan announced when Catch opens",
    nextNone: "Next: no plan this week",
    followers: "{count} followers",
    follower: "1 follower",
    unclaimed: "Not claimed yet",
    joining: "Joining at launch",
    seePage: "See their plans",
    seePageLabel: "See {name}’s plans",
    claim: "Is this you? Claim it",
    claimBand: "Run something in {city}?",
    claimBandBody: "Claim your page, or list your first plan. Setting up is free.",
    claimBandAction: "Claim your page",
  },
  host: {
    eyebrow: "For hosts",
    title: "Bring people together? Run the whole night from one screen.",
    body: "Bookings, the door, groups, the first hello and the follow-up, for runs, dinners, games and nights out. Use it alongside the booking tools you already have.",
    price: "5% of ticket sales, capped at ₹10,000 a month",
    priceNote: "Free events stay free. Payment gateway fees are charged separately by the payment provider.",
    action: "See Catch for hosts",
    claim: "Claim your page",
    todayAlt: "Host app, today: bookings, arrivals and tasks for tonight",
    doorAlt: "Host app, the door: checking guests in",
  },
  app: {
    eyebrow: "Get the app",
    title: "Your plans, your groups and your hosts, in your pocket.",
    body: "Book in a couple of taps, get reminders and directions, and keep your group chat after the night.",
    qr: "Scan to get the app",
    qrLabel: "QR code for the Catch app download link",
  },
  faq: {
    eyebrow: "Questions",
    title: "Good to know before your first plan.",
    items: [
      {question: "Do I need the app?", answer: "You can browse and book on the web. The app keeps your plans, reminders, group chats and the hosts you follow in one place."},
      {question: "Can I come on my own?", answer: "Yes. Lots of people do. Hosts plan a group, a game or a first hello so it’s easy to start talking."},
      {question: "Who runs these events?", answer: "Independent hosts, clubs and communities. Every listing shows who’s running it. Profiles built from public sources are marked until the organiser claims them."},
      {question: "Is Catch free?", answer: "Browsing and the app are free. Hosts set the price of each plan, many are free, and you see the full price before you book."},
      {question: "Who can see what I share?", answer: "You choose what your profile shows. Hosts see the booking details they need to run their event, and any feedback you give reaches them only as part of a summary."},
      {question: "What if Catch isn’t in my city yet?", answer: "Choose your city and we’ll tell you when it opens. If you know a host who should be on Catch, send them our way."},
    ],
  },
  footer: {
    nav: "Footer",
    tagline: "Meet people in real life, through hosts who bring them together.",
    soon: "soon",
    groups: {explore: "Explore", cities: "Cities", hosts: "Hosts", help: "Help and legal"},
    links: {whatsOn: "What’s on", organisers: "Organisers", app: "Get the app", hosts: "Catch for hosts", pricing: "Pricing",
      claim: "Claim your page", help: "Help", privacy: "Privacy", terms: "Terms", refunds: "Refunds", contact: "Contact"},
  },
  stores: {
    appStore: {kicker: "Download on the", label: "App Store", accessibleLabel: "Download on the App Store"},
    googlePlay: {kicker: "Get it on", label: "Google Play", accessibleLabel: "Get it on Google Play"},
  },
} as const;

/** Each format's tile and filter copy, in the board's order. */
export const homeFormats: readonly {format: CatchFormat; name: string; line: string; poster: string}[] = [
  {format: "run", name: "Run clubs", line: "Pace groups and a first hello for every newcomer.", poster: "Run club"},
  {format: "dinner", name: "Dinners", line: "Long tables, good food and new people.", poster: "Supper club"},
  {format: "games", name: "Games and quizzes", line: "Teams, rounds and a room that’s in it together.", poster: "Game night"},
  {format: "courts", name: "Pickleball", line: "Courts and partners, rotated by level.", poster: "On court"},
  {format: "nightsOut", name: "Nights out", line: "Crawls and socials that move through the city.", poster: "Night out"},
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
