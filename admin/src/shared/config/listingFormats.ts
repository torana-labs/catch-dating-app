import type {AdminApproveOrganizerListingCallablePayload} from
  "../../generated/contracts/adminApproveOrganizerListingCallablePayload";

/**
 * The formats staff may give a listing Catch sources itself: every
 * city-by-format page format except nightlife (owner decision 10, 19 Nov
 * 2026: nightlife and singles stay out of programmatic listings). The values
 * come from contracts/shared/listing_program_common.schema.json, so a format
 * added there fails this table's type until it has a label. The labels match
 * the website's format page names.
 */
export type ListingFormat = NonNullable<AdminApproveOrganizerListingCallablePayload["formats"]>[number];

const labels = {
  runClubs: "Run clubs",
  racketSports: "Racket sports",
  pickleball: "Pickleball",
  padel: "Padel",
  tennis: "Tennis",
  badminton: "Badminton",
  supper: "Supper clubs",
  quizNights: "Quiz nights",
  studios: "Yoga and fitness",
  workshops: "Workshops",
  books: "Book clubs",
  outdoors: "Outdoors",
} as const satisfies Record<ListingFormat, string>;

export const listingFormats = Object.keys(labels) as ListingFormat[];

/** At most this many formats per listing (the contract's maxItems). */
export const maxListingFormats = 4;

export function listingFormatLabel(format: ListingFormat): string {
  return labels[format];
}

/**
 * The formats a listing's Supply Intake categories carry: a nomination sends
 * them as snake_case categories (functions/src/admin/listingProgram/formats.ts).
 */
const categoryFormats: Readonly<Record<string, ListingFormat>> = {
  run_clubs: "runClubs", racket_sports: "racketSports", pickleball: "pickleball", padel: "padel", tennis: "tennis",
  badminton: "badminton", supper_clubs: "supper", quiz_nights: "quizNights", studios: "studios", workshops: "workshops",
  book_clubs: "books", outdoors: "outdoors",
};

export function listingFormatsFromCategories(categories: readonly string[]): ListingFormat[] {
  const found = new Set(categories.flatMap((category) => Object.hasOwn(categoryFormats, category) ? [categoryFormats[category]] : []));
  return listingFormats.filter((format) => found.has(format)).slice(0, maxListingFormats);
}

/** The cohort the approval sheet suggests for a listing Catch sourced: the Indore pilot. */
export const defaultListingCohortId = "pilot-indore-1";
