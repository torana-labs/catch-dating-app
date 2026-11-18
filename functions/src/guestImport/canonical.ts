// The canonical guest row every source produces (owner rule, 18 Nov 2026:
// one importer). A file converter or an API connector turns its source into
// these rows; one shared stage then normalises, suggests merges and previews
// them before anything is saved (hostRosterIntakeCore.ts).

import type {GuestTable} from "./table";

/** Booking platforms an event can say it came from. */
export type ExternalRosterProvider =
  "generic" | "luma" | "eventbrite" | "partiful" | "posh" |
  "bookmyshow" | "district" | "sortmyscene" | "airbnb";

/** Every converter's id. The version suffix changes when its output does. */
export type RosterAdapterId =
  "generic-v1" | "luma-v1" | "eventbrite-v1" | "partiful-v1" |
  "posh-v1" | "google-forms-v1" | "typeform-v1" | "townscript-v1" |
  "instamojo-v1" | "vcard-v1" | "sample-required";

export type RosterAdapterSupport = "verified" | "generic" | "sampleRequired";

/** Which converter read a file, and how sure detection was. */
export interface RosterAdapterDetection {
  adapterId: RosterAdapterId;
  support: RosterAdapterSupport;
  confidence: number;
}

export type GuestStatus = "invited" | "registered" | "waitlisted";

/** One guest, as the shared stage receives it. */
export interface NormalizedRosterImportRow {
  rowId: string;
  displayName: string;
  phone: string | null;
  email: string | null;
  externalReference: string | null;
  arrivalGroup: string | null;
  ticketType: string | null;
  status: GuestStatus;
}

/** The fields a converter can map from a column. */
export type GuestField = Exclude<keyof NormalizedRosterImportRow, "rowId">;

/** Column index per field; null when the file has no such column. */
export type GuestColumnMapping = Record<GuestField, number | null>;

/** Rows read by one converter, with the detection that chose it. */
export interface PreparedRosterImport {
  adapter: RosterAdapterDetection;
  rows: NormalizedRosterImportRow[];
}

/** Where one field of a canonical row came from in the source file. */
export interface GuestFieldSource {
  column: number;
  header: string;
}

/** One guest read from a file, with per-field provenance. */
export interface CanonicalGuestRow {
  sourceRowNumber: number;
  value: NormalizedRosterImportRow;
  fields: Partial<Record<GuestField, GuestFieldSource>>;
  rawCells: string[];
}

/** A source row the converter did not turn into a guest, and why. */
export interface SkippedGuestRow {
  sourceRowNumber: number;
  reason: "missing-name" | "excluded-status";
  rawCells: string[];
}

/** Everything one converter read from a table. */
export interface CanonicalGuestRead {
  adapter: RosterAdapterDetection;
  /** Headers after the converter's reshape (e.g. a joined name column). */
  headers: string[];
  mapping: GuestColumnMapping;
  rows: CanonicalGuestRow[];
  skipped: SkippedGuestRow[];
  /** Data rows beyond the row limit, not read. */
  truncatedCount: number;
}

/**
 * A file-format converter. Detection scores the normalised headers against
 * [signature]; the shared mapper then reads the columns, using the
 * converter's own aliases where its format names a field differently.
 */
export interface GuestListConverter {
  id: Exclude<RosterAdapterId, "generic-v1" | "sample-required">;
  /** The provider an event's origin names for this format, if any. */
  provider: ExternalRosterProvider | null;
  /** Normalised headers that mark the format. */
  signature: readonly string[];
  /** Attendee-level ids. Order or booking ids belong in arrivalGroup. */
  externalReferenceAliases?: ReadonlySet<string>;
  /** Booking or order fields that group guests arriving together. */
  arrivalGroupAliases?: ReadonlySet<string>;
  /** Reshapes the table before mapping, e.g. joins first and last names. */
  normalizeTable?(table: GuestTable): GuestTable;
  /**
   * Scores the headers when a signature alone cannot (0 to 1). Overrides
   * signature scoring for this converter.
   */
  detect?(normalizedHeaders: string[]): number;
  /** Extra exact aliases, tried before the shared ones. */
  aliases?: Partial<Record<GuestField, ReadonlySet<string>>>;
  /**
   * Form exports name columns after questions ("What's your WhatsApp
   * number?"). When set, a field with no exact column falls back to the
   * first header containing one of these words.
   */
  questionWords?: Partial<Record<GuestField, readonly string[]>>;
  /** Reads a status cell; "excluded" rows (failed payments) are skipped. */
  statusFor?(value: string | null): GuestStatus | "excluded";
}
