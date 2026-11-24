import type {CityPlansDocument} from
  "../../shared/generated/cityPlansDocument";

/**
 * The formats the website's city-by-format pages (/<city>/<format>/) are
 * built for. Finer than the homepage's six formats: each matches an
 * organiser segment of the redesign (design/source_packs/website-playbook,
 * the "By format" menu and its segment pages), and the four racket sports
 * also have pages of their own (/mumbai/padel/).
 *
 * The mapping is explicit, in two tables:
 * - discoveryActivityKinds: which formats each event activity kind belongs
 *   to. Every kind in contracts/shared/event_common.schema.json is listed,
 *   and a test holds the table to that enum.
 * - discoveryKeywords: which formats an organiser's listed category and
 *   formats name. These are free text, so each format has a word list.
 *
 * Book clubs and workshops have no activity kind: their events are open
 * activities and take the formats their organiser lists.
 */
export type DiscoveryFormat = keyof CityPlansDocument["formatPages"];

export const discoveryFormats = [
  "runClubs",
  "racketSports",
  "pickleball",
  "padel",
  "tennis",
  "badminton",
  "supper",
  "quizNights",
  "nightlife",
  "studios",
  "workshops",
  "books",
  "outdoors",
] as const satisfies readonly DiscoveryFormat[];

/** The URL segment of each format's city page: /mumbai/run-clubs/. */
export const discoveryFormatSlugs: Readonly<Record<DiscoveryFormat, string>> =
  {
    runClubs: "run-clubs",
    racketSports: "racket-sports",
    pickleball: "pickleball",
    padel: "padel",
    tennis: "tennis",
    badminton: "badminton",
    supper: "supper-clubs",
    quizNights: "quiz-nights",
    nightlife: "nightlife",
    studios: "studios",
    workshops: "workshops",
    books: "book-clubs",
    outdoors: "outdoors",
  };

/**
 * Every event activity kind and the formats it counts toward. An empty list
 * means the kind names no format of its own: the event takes its
 * organiser's listed formats instead.
 */
export const discoveryActivityKinds: Readonly<
  Record<string, readonly DiscoveryFormat[]>> = {
    socialRun: ["runClubs"],
    running: ["runClubs"],
    walking: ["runClubs"],
    pickleball: ["racketSports", "pickleball"],
    padel: ["racketSports", "padel"],
    tennis: ["racketSports", "tennis"],
    badminton: ["racketSports", "badminton"],
    cycling: ["outdoors"],
    spinClass: ["studios"],
    yoga: ["studios"],
    strengthTraining: ["studios"],
    pubQuiz: ["quizNights"],
    barCrawl: ["nightlife"],
    dinner: ["supper"],
    // Never public: the page read model shows it as openActivity.
    singlesMixer: [],
    openActivity: [],
  };

/**
 * The words in an organiser's category or listed formats that name each
 * format, matched whole and case-insensitively. A space in a word also
 * matches a hyphen or no space ("board game", "boardgame", "board-game").
 */
export const discoveryKeywords: Readonly<
  Record<DiscoveryFormat, readonly string[]>> = {
    runClubs: ["run", "runs", "runner", "runners", "running", "jog", "jogs",
      "jogger", "joggers", "jogging", "walk", "walks", "walker", "walkers",
      "walking"],
    racketSports: ["racket", "rackets", "racquet", "racquets", "pickleball",
      "padel", "tennis", "badminton", "squash"],
    pickleball: ["pickleball"],
    padel: ["padel"],
    tennis: ["tennis"],
    badminton: ["badminton"],
    supper: ["supper", "suppers", "supper club", "dinner", "dinners",
      "dining", "brunch", "brunches", "long table", "potluck", "potlucks",
      "chef", "chefs"],
    quizNights: ["quiz", "quizzes", "quizzing", "trivia", "board game",
      "board games", "game night", "game nights", "games night",
      "games nights"],
    nightlife: ["nightlife", "night out", "nights out", "bar", "bars",
      "crawl", "crawls", "mixer", "mixers", "club night", "club nights",
      "party", "parties", "pub", "pubs"],
    studios: ["studio", "studios", "yoga", "pilates", "dance", "dancing",
      "fitness", "spin", "hiit", "barre", "strength", "workout", "workouts",
      "bootcamp", "crossfit", "zumba"],
    workshops: ["workshop", "workshops", "masterclass", "masterclasses",
      "pottery", "ceramics", "craft", "crafts", "painting", "calligraphy",
      "baking", "cooking", "candle making"],
    books: ["book club", "book clubs", "books", "reading", "readers",
      "literary", "literature"],
    outdoors: ["trek", "treks", "trekking", "hike", "hikes", "hiking",
      "trail", "trails", "outdoor", "outdoors", "camping", "cycling",
      "cyclist", "cyclists", "ride", "rides", "biking", "kayaking",
      "climbing"],
  };

/**
 * Words that stop a keyword from counting where they follow it or come
 * before it: a pub quiz is a quiz night, not a night out, and table tennis
 * is a racket sport but not tennis.
 */
const keywordExceptions: Readonly<Partial<
  Record<DiscoveryFormat, readonly string[]>>> = {
    nightlife: ["pub quiz", "pub quizzes", "bar quiz", "bar quizzes"],
    tennis: ["table tennis"],
  };

const wordPattern = (words: readonly string[]) => new RegExp(
  `(?<![\\p{L}\\p{N}])(?:${words.map((word) => word
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/ /g, "[ -]?")).join("|")})(?![\\p{L}\\p{N}])`, "iu");

const keywordPatterns = Object.fromEntries(discoveryFormats.map((format) => [
  format, {
    match: wordPattern(discoveryKeywords[format]),
    except: keywordExceptions[format] ?
      new RegExp(wordPattern(keywordExceptions[format] ?? []).source,
        "giu") : null,
  }])) as Record<DiscoveryFormat, {match: RegExp; except: RegExp | null}>;

function namesFormat(text: string, format: DiscoveryFormat): boolean {
  const {match, except} = keywordPatterns[format];
  return match.test(except ? text.replace(except, " ") : text);
}

/** The formats free text names, in format order. */
export function discoveryFormatsForText(
  text: readonly string[]
): DiscoveryFormat[] {
  return discoveryFormats.filter((format) =>
    text.some((item) => namesFormat(item, format)));
}

/**
 * The formats one event counts toward: its activity kind's, or, for a kind
 * with none of its own, the formats its organiser lists.
 */
export function discoveryFormatsForEvent(
  activityKind: string, organizerFormats: readonly DiscoveryFormat[]
): DiscoveryFormat[] {
  const own = Object.hasOwn(discoveryActivityKinds, activityKind) ?
    discoveryActivityKinds[activityKind] : [];
  const found = new Set(own.length ? own : organizerFormats);
  return discoveryFormats.filter((format) => found.has(format));
}

/**
 * Owner decision, 16 Nov 2026: a city-by-format page is indexed when the
 * city has 3 or more organisers or 5 or more upcoming events in the format.
 * Owner decision, 17 Nov 2026: the bar applies before a city launches too.
 * A city that has not launched counts the published organisers joining it
 * and has no public plans, so only its organiser count can meet the bar.
 */
export const formatPageIndexing = {
  minOrganizers: 3,
  minUpcomingEvents: 5,
} as const;

export type FormatPageIndexing = "index, follow" | "noindex, follow";

export function formatPageIndexingFor(organizerCount: number,
  upcomingEventCount: number): FormatPageIndexing {
  return organizerCount >= formatPageIndexing.minOrganizers ||
    upcomingEventCount >= formatPageIndexing.minUpcomingEvents ?
    "index, follow" : "noindex, follow";
}
