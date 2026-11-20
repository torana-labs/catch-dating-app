import {brand} from "./brand.ts";

// The Room page's plan-a-night tool (features/tryIt/NightPlanTryIt.tsx): its fields,
// the plan night.plan answers, the practice session createEventRehearsal
// starts, and saving the plan to the visitor's draft event. The phone step
// and the shared failures stay in content/tryIt.ts; the band, its form label
// and its button stay in the page's JSON. Mission text is the event
// runtime's (content/eventRuntime.ts), keyed by the plan's promptIds. Every
// line describes what the command returns, nothing more. No dating wording.

const host = brand.stores.hostAppName;

/** The formats night.plan takes (contracts/callables/plan_night_payload.schema.json). */
export const nightPlanFormats = ["run", "dinner", "quiz", "courts", "crawl"] as const;
export type NightPlanFormat = (typeof nightPlanFormats)[number];

export const nightPlanTryItCopy = {
  /** The card's title (the canvas card's "Plan your night"). */
  title: "Plan your night",
  formatLabels: {
    run: "Run",
    dinner: "Dinner",
    quiz: "Quiz night",
    courts: "Court night",
    crawl: "Pub crawl",
  } satisfies Record<NightPlanFormat, string>,
  formatHint: "Choose a format",
  formatRequired: "Choose your format.",
  guests: "How many guests",
  guestsHint: "32",
  guestsInvalid: "Enter how many people are coming: 2 to 1,000.",
  working: "Planning your night…",
  /** {format} and {count}: "Run for 32". */
  headline: "{format} for {count}",
  groups: {
    title: "Groups",
    /** One pace group or {count} of them. */
    paceGroups: {one: "1 pace group", other: "{count} pace groups"},
    paceUnset: "You set each group’s pace.",
    /** {count} courts with {size} players on each. */
    courts: {one: "1 court, {size} players on it", other: "{count} courts, {size} players on each"},
    /** {count} on the bench while the courts are full. */
    bench: {one: "1 waiting their turn on the bench", other: "{count} waiting their turn on the bench"},
    /** {count} units of about {size} guests, by the plan's unit kind. */
    units: {
      tables: {one: "1 table of about {size}", other: "{count} tables of about {size}"},
      teams: {one: "1 team of about {size}", other: "{count} teams of about {size}"},
      pods: {one: "1 small group of about {size}", other: "{count} small groups of about {size}"},
      pairs: {one: "1 pair", other: "{count} pairs"},
      groups: {one: "1 group of about {size}", other: "{count} groups of about {size}"},
    },
    wholeGroup: "Everyone together",
    /** {count} stops on a crawl. */
    stops: {one: "1 stop", other: "{count} stops"},
    /** {count} more pace groups past the ones listed. */
    more: "and {count} more",
    /** countLimited: the plan stopped at its 200-group limit. */
    countLimitedGroups: "A plan holds up to 200 groups, so at this size each group is bigger.",
    countLimitedCourts: "A plan holds up to 200 courts, so at this size more people wait on the bench.",
  },
  capacity: {
    /** {min} to {max} guests the format is built for. */
    within: "Right for this format, which works best for {min} to {max} guests.",
    below: "Fewer than this format works best for: {min} to {max} guests.",
    above: "More than this format works best for: {min} to {max} guests.",
  },
  mixing: {
    title: "When people mix",
    /** A run of show stage set aside for mixing, {minutes} long. */
    stage: "{minutes} minutes set aside for people to mix.",
    stageUntimed: "A moment set aside for people to mix.",
    /** Rotations every {minutes} minutes during {activity}. */
    rotation: "People move on every {minutes} minutes during {activity}.",
    rotationUntimed: "People move on during {activity}.",
    teamReveal: "Teams are mixed and revealed at a round break.",
  },
  runOfShow: {
    title: "The night",
    /** {minutes} for one stage. */
    minutes: "{minutes} min",
    /** {minutes} for the whole night. */
    total: "{minutes} minutes in all",
    stages: {
      before: "Before it starts",
      arrival: "Arrival",
      opening: "Opening",
      mixing: "Mixing",
      closing: "Close",
    },
    /** The activity stage, named for the format. */
    activity: {
      run: "The run",
      dinner: "Dinner",
      quiz: "The quiz",
      courts: "Games on court",
      crawl: "The crawl",
    } satisfies Record<NightPlanFormat, string>,
    /** The activity, inside a sentence: "during the run". */
    during: {
      run: "the run",
      dinner: "dinner",
      quiz: "the quiz",
      courts: "the games",
      crawl: "the crawl",
    } satisfies Record<NightPlanFormat, string>,
  },
  missions: {
    /** Owner decision #2062 C4. */
    title: "Three missions for your format, ready to edit",
    /** When a mission has no words on this site and is left out. */
    titleSome: "Missions for your format, ready to edit",
  },
  rehearsal: {
    action: "Try it with a friend",
    lead: "Start a practice session of this night, then try a first hello on your phones.",
    readyTitle: "Your practice session is ready",
    readyLead: "Scan the code with a friend, or open the link on your phone. Nothing here reaches a real event.",
    sameAsHosts: "The practice session is the same one hosts use for a dress rehearsal.",
    open: "Open the practice link",
    /** The QR code's accessible name. */
    qr: "QR code for the practice session",
    problems: {
      rate_limited: "You’ve started several practice sessions. Finish one, or wait a while, then try again.",
      not_allowed: "We couldn’t start a practice session for this profile.",
    },
  },
  save: {
    action: "Save to my event",
    /** {name} is the draft event's name. */
    lead: "Saves this plan on your draft “{name}”. It stays private until you publish it.",
    /** {name} is the draft event's name. */
    saved: "Saved on your draft “{name}”.",
    /** {phone} is the verified number. */
    savedLead: `Open it in ${host} with {phone} to carry on.`,
    refusals: {
      event_format_mismatch: "Your draft event is already set for a different activity, so this plan can’t go on it. Plan a night in that activity’s format instead.",
      no_draft_event: "You don’t have a draft event to save it to yet.",
      event_not_in_workspace: "That draft isn’t in your profile any more.",
      event_format_needed: `Choose your event’s activity in ${host} first.`,
      plan_locked: "This event’s plan is already live, so it can’t be replaced here.",
    } satisfies Record<string, string>,
  },
  startOver: "Plan another night",
  /** The night tool's own words for problems the shared list words for links. */
  problems: {
    invalid: "Choose a format and a number of guests from 2 to 1,000.",
    not_allowed: "That draft event isn’t in your profile.",
  },
} as const;
