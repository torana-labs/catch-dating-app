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
  "posh-v1" | "sample-required";

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
}
