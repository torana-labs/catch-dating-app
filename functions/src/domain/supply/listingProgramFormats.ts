import {
  discoveryFormats,
  discoveryFormatsForText,
  type DiscoveryFormat,
} from "../discovery/discoveryFormats";

/**
 * The formats staff may give a listing Catch sourced itself (an Admin or
 * message nomination, or discovery): every city-by-format page format except
 * nightlife. Owner decision 10 (19 Nov 2026): nightlife and anything singles
 * stay out of programmatic listings. Singles has no format of its own (a
 * singles mixer counts toward none), so leaving out nightlife is the whole
 * exclusion. An organizer's own sign-up is unaffected: it never goes through
 * this list.
 *
 * Each format has the label written to the organizer page and the Supply
 * Intake category a nomination carries it in. The label must name its format
 * in discoveryKeywords, because the city-by-format pages count an organizer
 * by matching its listed formats as free text (cityPlans/cityPlansModel.ts).
 */
export type ProgrammaticListingFormat = Exclude<DiscoveryFormat, "nightlife">;

export const excludedProgrammaticFormats = ["nightlife"] as const satisfies
  readonly DiscoveryFormat[];

export const programmaticListingFormats: Readonly<Record<
  ProgrammaticListingFormat, {label: string; category: string}>> = {
    runClubs: {label: "Run clubs", category: "run_clubs"},
    racketSports: {label: "Racket sports", category: "racket_sports"},
    pickleball: {label: "Pickleball", category: "pickleball"},
    padel: {label: "Padel", category: "padel"},
    tennis: {label: "Tennis", category: "tennis"},
    badminton: {label: "Badminton", category: "badminton"},
    supper: {label: "Supper clubs", category: "supper_clubs"},
    quizNights: {label: "Quiz nights", category: "quiz_nights"},
    studios: {label: "Yoga and fitness", category: "studios"},
    workshops: {label: "Workshops", category: "workshops"},
    books: {label: "Book clubs", category: "book_clubs"},
    outdoors: {label: "Outdoors", category: "outdoors"},
  };

/** Programmatic formats in city-page order. */
export const programmaticListingFormatOrder:
  readonly ProgrammaticListingFormat[] = discoveryFormats.filter(
    (format): format is ProgrammaticListingFormat =>
      Object.hasOwn(programmaticListingFormats, format));

/** Whether a value is a format a programmatic listing may carry. */
export function isProgrammaticListingFormat(
  value: unknown
): value is ProgrammaticListingFormat {
  return typeof value === "string" &&
    Object.hasOwn(programmaticListingFormats, value);
}

/** Formats deduplicated, in city-page order. */
export function orderedFormats(
  formats: readonly ProgrammaticListingFormat[]
): ProgrammaticListingFormat[] {
  const chosen = new Set(formats);
  return programmaticListingFormatOrder.filter((format) => chosen.has(format));
}

/** The Supply Intake categories a nomination's formats travel in. */
export function categoriesForFormats(
  formats: readonly ProgrammaticListingFormat[]
): string[] {
  return orderedFormats(formats)
    .map((format) => programmaticListingFormats[format].category);
}

/**
 * The programmatic formats a listing's categories name: the format
 * categories a nomination carries, or, when it carries none, the formats its
 * free-text categories name. Nightlife is never returned.
 */
export function formatsForListingCategories(
  categories: readonly string[]
): ProgrammaticListingFormat[] {
  const byCategory = new Map(programmaticListingFormatOrder.map((format) =>
    [programmaticListingFormats[format].category, format]));
  const named = categories.flatMap((category) => {
    const format = byCategory.get(category);
    return format ? [format] : [];
  });
  if (named.length) return orderedFormats(named);
  return discoveryFormatsForText(
    categories.map((category) => category.replace(/_/gu, " ")))
    .filter(isProgrammaticListingFormat);
}

/** The labels written to publicProfile.formats. */
export function labelsForFormats(
  formats: readonly ProgrammaticListingFormat[]
): string[] {
  return orderedFormats(formats)
    .map((format) => programmaticListingFormats[format].label);
}
