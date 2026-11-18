// Picks the converter for a file and reads it into canonical guest rows.
// Adding a format means adding one converter file and listing it here.

import type {
  CanonicalGuestRead,
  CanonicalGuestRow,
  ExternalRosterProvider,
  GuestListConverter,
  NormalizedRosterImportRow,
  PreparedRosterImport,
  RosterAdapterDetection,
  RosterAdapterId,
  SkippedGuestRow,
} from "./canonical";
import {eventbriteConverter} from "./converters/eventbrite";
import {googleFormsConverter} from "./converters/googleForms";
import {instamojoConverter} from "./converters/instamojo";
import {lumaConverter} from "./converters/luma";
import {partifulConverter} from "./converters/partiful";
import {poshConverter} from "./converters/posh";
import {townscriptConverter} from "./converters/townscript";
import {typeformConverter} from "./converters/typeform";
import {vcardConverter} from "./converters/vcard";
import {guestFields, rosterStatus, suggestGuestMapping} from "./mapping";
import {
  normalizeHeader,
  nullableValueAt,
  parseCsvMatrix,
  uniqueHeaders,
  valueAt,
  type GuestTable,
} from "./table";

/**
 * Detection order. On equal scores the earlier converter wins, so a new
 * converter goes after the ones whose files it might resemble.
 */
export const guestListConverters: readonly GuestListConverter[] = [
  lumaConverter,
  eventbriteConverter,
  partifulConverter,
  poshConverter,
  googleFormsConverter,
  typeformConverter,
  townscriptConverter,
  instamojoConverter,
  vcardConverter,
];

/** Providers whose exports we have not reviewed a real sample of yet. */
const sampleRequiredProviders = new Set<ExternalRosterProvider>([
  "bookmyshow",
  "district",
  "sortmyscene",
  "airbnb",
]);

/** The share of a converter's signature a file needs to be read by it. */
export const DETECTION_THRESHOLD = 0.6;
export const MAX_GUEST_COLUMNS = 40;
export const MAX_GUEST_ROWS = 250;
/** Matches the review session's raw cell bound. */
export const MAX_CELL_LENGTH = 500;

/** The converter for an id, or null for generic and sample-required. */
export function guestListConverter(
  adapterId: RosterAdapterDetection["adapterId"]
): GuestListConverter | null {
  return guestListConverters.find((converter) =>
    converter.id === adapterId) ?? null;
}

/**
 * Chooses a converter from the event's provider, else from the headers.
 * @return {RosterAdapterDetection} The converter and detection confidence.
 */
export function detectRosterAdapter(
  headers: string[],
  providerHint?: ExternalRosterProvider
): RosterAdapterDetection {
  if (providerHint === "generic") {
    return {adapterId: "generic-v1", support: "generic", confidence: 1};
  }
  if (providerHint && sampleRequiredProviders.has(providerHint)) {
    return {
      adapterId: "sample-required",
      support: "sampleRequired",
      confidence: 1,
    };
  }
  const hinted = providerHint ? guestListConverters.find((converter) =>
    converter.provider === providerHint) : undefined;
  if (hinted) {
    return {adapterId: hinted.id, support: "verified", confidence: 1};
  }

  const ordered = headers.map(normalizeHeader);
  const normalizedHeaders = new Set(ordered);
  const candidates = guestListConverters.map((converter) => ({
    adapterId: converter.id,
    confidence: converter.detect ? converter.detect(ordered) :
      converter.signature.filter((value) =>
        normalizedHeaders.has(value)).length / converter.signature.length,
  })).sort((left, right) => right.confidence - left.confidence);
  const best = candidates[0];
  if (best && best.confidence >= DETECTION_THRESHOLD) {
    return {
      adapterId: best.adapterId,
      support: "verified",
      confidence: best.confidence,
    };
  }
  return {adapterId: "generic-v1", support: "generic", confidence: 0};
}

/** Applies the detected converter's table reshaping, if it has one. */
export function normalizeRosterMatrix(
  matrix: GuestTable,
  adapter: RosterAdapterDetection
): GuestTable {
  const converter = guestListConverter(adapter.adapterId);
  return converter?.normalizeTable ? converter.normalizeTable(matrix) :
    matrix;
}

/**
 * Reads a table (header row first) with the detected converter, or the
 * converter [options.converterId] names, into at most 250 canonical rows
 * with per-field provenance. Rows without a name, and rows the converter
 * excludes (a failed payment), are reported in skipped.
 * @return {CanonicalGuestRead} The rows, skips and the converter used.
 */
export function readGuestTable(
  matrix: string[][],
  options: {providerHint?: ExternalRosterProvider;
    converterId?: RosterAdapterId} = {}
): CanonicalGuestRead {
  if (matrix.length < 2) throw new Error("roster_missing_rows");
  if (matrix[0].length > MAX_GUEST_COLUMNS) {
    throw new Error("roster_too_many_columns");
  }
  const headers = uniqueHeaders(matrix[0]);
  const forced = options.converterId ?
    guestListConverter(options.converterId) : null;
  const adapter: RosterAdapterDetection = forced ?
    {adapterId: forced.id, support: "verified", confidence: 1} :
    detectRosterAdapter(headers, options.providerHint);
  const converter = guestListConverter(adapter.adapterId);
  const normalized = normalizeRosterMatrix({
    headers,
    rows: matrix.slice(1).filter((row) => row.some((value) => value.trim())),
  }, adapter);
  const mapping = suggestGuestMapping(normalized.headers, converter);
  const nameIndex = mapping.displayName;
  if (nameIndex === null) throw new Error("roster_missing_name_column");
  const rows: CanonicalGuestRow[] = [];
  const skipped: SkippedGuestRow[] = [];
  let index = 0;
  for (; index < normalized.rows.length && rows.length < MAX_GUEST_ROWS;
    index += 1) {
    const row = normalized.rows[index];
    const sourceRowNumber = index + 2;
    const rawCells = row.slice(0, MAX_GUEST_COLUMNS)
      .map((cell) => cell.slice(0, MAX_CELL_LENGTH));
    const displayName = valueAt(row, nameIndex);
    if (!displayName) {
      skipped.push({sourceRowNumber, reason: "missing-name", rawCells});
      continue;
    }
    const statusCell = nullableValueAt(row, mapping.status);
    const status = converter?.statusFor ? converter.statusFor(statusCell) :
      rosterStatus(statusCell);
    if (status === "excluded") {
      skipped.push({sourceRowNumber, reason: "excluded-status", rawCells});
      continue;
    }
    const value: NormalizedRosterImportRow = {
      rowId: String(sourceRowNumber),
      displayName,
      phone: nullableValueAt(row, mapping.phone),
      email: nullableValueAt(row, mapping.email),
      externalReference: nullableValueAt(row, mapping.externalReference),
      arrivalGroup: nullableValueAt(row, mapping.arrivalGroup),
      ticketType: nullableValueAt(row, mapping.ticketType),
      status,
    };
    const fields: CanonicalGuestRow["fields"] = {};
    for (const field of guestFields) {
      const column = mapping[field];
      if (column === null || field !== "status" && value[field] === null ||
          field === "status" && statusCell === null) {
        continue;
      }
      fields[field] = {column, header: normalized.headers[column]};
    }
    rows.push({sourceRowNumber, value, fields, rawCells});
  }
  return {adapter, headers: normalized.headers, mapping, rows, skipped,
    truncatedCount: normalized.rows.length - index};
}

/**
 * The forwarded-roster reader: canonical values only, and an error when no
 * row has a name.
 * @return {PreparedRosterImport} The rows and the converter that read them.
 */
export function prepareRosterTable(
  matrix: string[][],
  providerHint?: ExternalRosterProvider
): PreparedRosterImport {
  const read = readGuestTable(matrix, {providerHint});
  if (read.rows.length === 0) throw new Error("roster_missing_guest_names");
  return {adapter: read.adapter, rows: read.rows.map((row) => row.value)};
}

/** Reads a CSV file with the detected converter. */
export function prepareCsvRosterImport(
  source: string,
  providerHint?: ExternalRosterProvider
): PreparedRosterImport {
  return prepareRosterTable(parseCsvMatrix(source), providerHint);
}
