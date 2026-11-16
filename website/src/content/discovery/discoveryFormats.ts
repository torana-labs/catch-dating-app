/**
 * What each city-by-format page calls its format, keyed by the cityPlans
 * read model's discovery format (functions/src/cityPlans/discoveryFormats.ts).
 * The backend owns which formats exist and their URL segments; this module
 * owns only their words. `organiser` and `plan` are the nouns the page counts
 * in ("14 clubs", "23 runs"); `lead` opens the page.
 *
 * `firstTime` and `faq` add format-specific bands where the redesign board
 * wrote them (PlaybookCityFormat: run clubs). Other formats show the shared
 * questions in cityFormatPage.ts only.
 */
export const discoveryFormatCopy = {
  runClubs: {
    name: "Run clubs",
    organiserOne: "club", organiserMany: "clubs",
    planOne: "run", planMany: "runs",
    lead: "Social runs for every pace. Book a place, run with a group, stay for coffee.",
    joinAction: "List your club",
    firstTime: {
      kicker: "First time?",
      title: "Joining a run club in {city}.",
      ticks: [
        "Pick your pace. Most clubs have groups from walk-run to 5 minutes a kilometre. The listing says which.",
        "Book, even if it’s free. The club knows to expect you, and you’ll get the start point and time the day before.",
        "Come alone. Clubs put you in a pace group with a lead who’ll introduce you.",
        "Stay for coffee. That’s where the club happens.",
      ],
    },
    faq: [
      {question: "Do I need to be fast?", answer: "No. Most clubs run in pace groups, including walk-run groups. Each listing says which paces it caters for."},
    ],
  },
  racketSports: {
    name: "Racket sports",
    organiserOne: "club", organiserMany: "clubs",
    planOne: "session", planMany: "sessions",
    lead: "Social sessions on the court for every level. Book a place, get paired up, stay for a drink.",
    joinAction: "List your club",
  },
  pickleball: {
    name: "Pickleball",
    organiserOne: "club", organiserMany: "clubs",
    planOne: "session", planMany: "sessions",
    lead: "Pickleball socials for every level. Book a court spot and play with a group.",
    joinAction: "List your club",
  },
  padel: {
    name: "Padel",
    organiserOne: "club", organiserMany: "clubs",
    planOne: "session", planMany: "sessions",
    lead: "Padel socials for every level. Book a place and play with a group.",
    joinAction: "List your club",
  },
  tennis: {
    name: "Tennis",
    organiserOne: "club", organiserMany: "clubs",
    planOne: "session", planMany: "sessions",
    lead: "Social tennis for every level. Book a place and play with a group.",
    joinAction: "List your club",
  },
  badminton: {
    name: "Badminton",
    organiserOne: "club", organiserMany: "clubs",
    planOne: "session", planMany: "sessions",
    lead: "Social badminton for every level. Book a place and play with a group.",
    joinAction: "List your club",
  },
  supperClubs: {
    name: "Supper clubs",
    organiserOne: "host", organiserMany: "hosts",
    planOne: "supper", planMany: "suppers",
    lead: "Long tables and shared plates with people you haven’t met yet. Book a seat and the host does the rest.",
    joinAction: "List your supper club",
  },
  quizNights: {
    name: "Quiz nights",
    organiserOne: "host", organiserMany: "hosts",
    planOne: "quiz", planMany: "quizzes",
    lead: "Pub quizzes and trivia nights. Bring a team or join one at the door.",
    joinAction: "List your quiz",
  },
  nightlife: {
    name: "Nights out",
    organiserOne: "host", organiserMany: "hosts",
    planOne: "night out", planMany: "nights out",
    lead: "Socials, crawls and parties run by hosts, with a guest list and a plan for the night.",
    joinAction: "List your nights",
  },
  studios: {
    name: "Yoga and fitness",
    organiserOne: "studio", organiserMany: "studios",
    planOne: "class", planMany: "classes",
    lead: "Classes and socials at studios around the city. Book a spot and turn up.",
    joinAction: "List your studio",
  },
  workshops: {
    name: "Workshops",
    organiserOne: "host", organiserMany: "hosts",
    planOne: "workshop", planMany: "workshops",
    lead: "Make something with a small group and a host who shows you how.",
    joinAction: "List your workshop",
  },
  bookClubs: {
    name: "Book clubs",
    organiserOne: "club", organiserMany: "clubs",
    planOne: "meet-up", planMany: "meet-ups",
    lead: "Book clubs and reading socials. Come for the book, stay for the conversation.",
    joinAction: "List your club",
  },
  outdoors: {
    name: "Outdoors",
    organiserOne: "group", organiserMany: "groups",
    planOne: "outing", planMany: "outings",
    lead: "Hikes, walks and days outside with a group that knows the way.",
    joinAction: "List your group",
  },
} as const;
