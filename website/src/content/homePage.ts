// Copy for the homepage, from the owner's RbWebHomeV2 board (catch-design-source
// gen/rebuild14.py, home()). Copy is the owner's: change it on the board first.
// Catch is for meeting people in real life: no dating, singles, mixer or match
// wording.
import type {CatchFormat} from "@catch/web-ui";

export const homePageCopy = {
  header: {nav: "Main", explore: "Explore", organisers: "Organisers", hosts: "For hosts", app: "Get the app",
    cityMenu: "Choose your city", liveStatus: "{count} plans this week", liveStatusOne: "1 plan this week",
    /** A live city with no plans this week yet. */
    newStatus: "New", soonStatus: "Launching soon",
    /** A country with no city open yet, shown once instead of every city's "soon". */
    countrySoon: "Launching soon in {country}",
    /** The picker's search, shown once there are more than eight cities. */
    citySearch: {label: "Search cities", placeholder: "Search cities", clear: "Clear “{query}”", close: "Close search",
      none: "No city matches “{query}”."}},
  hero: {
    liveEyebrow: "In {city} this week",
    soonEyebrow: "Launching soon in {city}",
    title: "Find something worth showing up for.",
    body: "Runs, dinners, games and nights out, run by hosts who bring people together. Come on your own and leave knowing a few more people.",
    liveAction: "See what’s on in {city}",
    soonAction: "Get notified for {city}",
    hostAction: "Host an event",
    /** A plan chip's kicker on the hero spotlight: "Run club · Fri 6:30 AM". */
    chipKicker: "{format} · {when}",
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
    unavailable: "We couldn’t load this week’s plans. Please try again in a moment.",
    detail: "{host} · {place}",
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
  notice: {
    title: "Tell me when it opens",
    lead: "One WhatsApp message on the day Catch opens in {city}. Nothing else unless you ask.",
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
    joined: "Done. We’ll message you on WhatsApp the day Catch opens in {city}.",
    alreadyJoined: "You’re already on the list for {city}. We’ve kept your latest choice.",
  },
  story: {
    eyebrow: "How a night works",
    title: "Come on your own. Leave knowing a few more people.",
    lead: "Hosts plan the first ten minutes so you don’t have to. Here’s a Tuesday quiz with Lantern Lane Social.",
    steps: [
      {title: "Find a plan", body: "Pick something you’d actually enjoy. Every plan shows who’s hosting, where you meet and who it suits."},
      {title: "Show up", body: "Your host has a team, a group or a game ready, and a first hello so nobody stands on their own."},
      {title: "Stay in touch", body: "Your group chat stays open for a week. Follow the hosts you liked and hear about their next one first."},
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
    seePageLabel: "See their plans: {name}",
    claim: "Is this you? Claim it",
    claimBand: "Run something in {city}?",
    claimBandBody: "Claim your page, or list your first plan. Setting up is free.",
    claimBandAction: "Claim your page",
  },
  host: {
    eyebrow: "For hosts",
    title: "Bring people together? Run the whole night from one screen.",
    body: "Bookings, the door, groups, the first hello and the follow-up, for runs, dinners, games and nights out. Use it alongside the booking tools you already have.",
    price: "Free for 30 days. Then 5% of ticket sales, capped at ₹10,000 a month.",
    priceNote: "Your trial starts at your first event. Free events stay free. Payment gateway fees are charged separately by the payment provider.",
    trial: "Start your free trial",
    action: "See Catch for hosts",
    claim: "Claim your page",
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
      {question: "Who runs these events?", answer: "Independent hosts, clubs and communities. Every listing shows who’s running it. Pages built from public sources are marked until the organiser claims them."},
      {question: "Is Catch free?", answer: "Browsing and the app are free. Hosts set the price of each plan, many are free, and you see the full price before you book."},
      {question: "Who can see what I share?", answer: "You choose what your profile shows. Hosts see the booking details they need to run their event, and any feedback you give reaches them only as part of a summary."},
      {question: "What if Catch isn’t in my city yet?", answer: "Choose your city and we’ll tell you when it opens. If you know a host who should be on Catch, send them our way."},
    ],
  },

  stores: {
    appStore: {kicker: "Download on the", label: "App Store", accessibleLabel: "Download on the App Store"},
    googlePlay: {kicker: "Get it on", label: "Google Play", accessibleLabel: "Get it on Google Play"},
  },
} as const;

/** Each format's tile and filter copy, in the board's order. */
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
