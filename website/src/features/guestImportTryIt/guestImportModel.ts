import type {TryItInput, TryItResponse} from "../../shared/api/tryItCommands";

/**
 * The pure rules of the guest-list try-it tool (guests.import-list on the
 * website surface): which files it sends, which columns the visitor maps,
 * and how a preview's result reads as the review's groups. Every limit is
 * the command's own (contracts/callables/import_guest_list_payload.schema.json,
 * functions/src/commands/importGuestList.ts).
 */

export type GuestImportResponse = TryItResponse<"guests.import-list">;
export type GuestImportResult = GuestImportResponse["result"];
export type GuestImportInput = TryItInput<"guests.import-list">;
export type GuestImportRow = GuestImportResult["rows"][number];
export type GuestImportSuggestion = GuestImportResult["suggestions"][number];
export type GuestColumnShape = GuestImportResult["columnShapes"][number];
export type GuestMappingField = keyof GuestImportResult["mapping"];

/** The command reads at most 5 MB before encoding. */
export const guestImportMaxBytes = 5 * 1024 * 1024;

/** What the file chooser offers: the CSV and Excel files the page promises. */
export const guestImportAccept = ".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const fileNamePattern = /\.(?:csv|xlsx)$/iu;

export type GuestFileProblem = "fileType" | "fileEmpty" | "fileTooLarge";

/** Why the command would refuse this file before reading it, or null. */
export function guestFileProblem(file: {readonly name: string; readonly size: number}): GuestFileProblem | null {
  if (!fileNamePattern.test(file.name) || file.name.length < 5 || file.name.length > 255) return "fileType";
  if (file.size <= 0) return "fileEmpty";
  if (file.size > guestImportMaxBytes) return "fileTooLarge";
  return null;
}

/** "48 KB" or "1.2 MB", for the chosen file's line. */
export function guestFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** The file's bytes as base64, the way the command takes them. Chunked, so a 5 MB file does not overflow the call stack. */
export function guestFileBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let start = 0; start < bytes.length; start += chunk) {
    binary += String.fromCharCode(...bytes.subarray(start, start + chunk));
  }
  return btoa(binary);
}

/** The fields the visitor maps when the command could not tell the columns apart: a name, and a way to tell guests apart. */
export const guestMappingFields = ["displayName", "phone", "email", "ticketType"] as const satisfies readonly GuestMappingField[];
export type GuestMappedField = (typeof guestMappingFields)[number];
export type GuestMapping = Readonly<Record<GuestMappedField, number | null>>;

export const emptyGuestMapping: GuestMapping = {displayName: null, phone: null, email: null, ticketType: null};

export type GuestMappingProblem = "nameRequired" | "duplicateColumn";

/** Why the visitor's columns cannot be sent, or null: a name column is required and each column fills one field. */
export function guestMappingProblem(mapping: GuestMapping): GuestMappingProblem | null {
  if (mapping.displayName === null) return "nameRequired";
  const chosen = guestMappingFields.map((field) => mapping[field]).filter((column): column is number => column !== null);
  return new Set(chosen).size === chosen.length ? null : "duplicateColumn";
}

/**
 * The columns to start the choice from: the visitor's earlier choice (the
 * result's mapping), and otherwise the one column that holds phone numbers
 * or emails, from what the command says each column holds.
 */
export function guestStartingMapping(result: Pick<GuestImportResult, "mapping" | "columnShapes">): GuestMapping {
  const only = (shape: GuestColumnShape) => {
    const columns = result.columnShapes.flatMap((each, index) => each === shape ? [index] : []);
    return columns.length === 1 ? columns[0] : null;
  };
  return {
    displayName: result.mapping.displayName,
    phone: result.mapping.phone ?? only("phone-like"),
    email: result.mapping.email ?? only("email-like"),
    ticketType: result.mapping.ticketType,
  };
}

/** Rows the command will not save until they are fixed in the file or left out. */
export function guestRowsToLookAt(result: GuestImportResult): GuestImportRow[] {
  return result.rows.filter((row) => row.kind === "needsReview" || row.kind === "identityConflict");
}

/** Rows saving would add or update. */
export function guestRowsToSave(result: GuestImportResult): GuestImportRow[] {
  return result.rows.filter((row) => row.kind === "add" || row.kind === "update");
}

/** Phone numbers on rows ready to save (the command writes them in one format), and rows held back for theirs. */
export function guestPhoneCounts(result: GuestImportResult): {readonly formatted: number; readonly invalid: number} {
  return {
    formatted: guestRowsToSave(result).filter((row) => row.changedFields.includes("phone")).length,
    invalid: result.rows.filter((row) => row.issueCode === "invalid-phone").length,
  };
}

/** Possible repeats with the visitor's contacts or within the file, each in the command's own words. */
export function guestMergeSuggestions(result: GuestImportResult): GuestImportSuggestion[] {
  return result.suggestions.filter((suggestion) => suggestion.kind === "merge");
}

/** Suggested tags with how many guests each would go on, the most common first. */
export function guestTagSuggestions(result: GuestImportResult): {readonly tag: string; readonly count: number}[] {
  const counts = new Map<string, Set<string>>();
  for (const suggestion of result.suggestions) {
    if (suggestion.kind !== "tag" || !suggestion.tag) continue;
    const rows = counts.get(suggestion.tag) ?? new Set<string>();
    rows.add(suggestion.rowId);
    counts.set(suggestion.tag, rows);
  }
  return [...counts].map(([tag, rows]) => ({tag, count: rows.size}))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** Which file column filled each field, in the result's field order; a column with no name is "Column 3". */
export function guestColumnsRead(result: GuestImportResult, untitled: (number: number) => string): {readonly field: GuestMappingField; readonly header: string}[] {
  return (Object.keys(result.mapping) as GuestMappingField[]).flatMap((field) => {
    const column = result.mapping[field];
    if (column === null || column >= result.headers.length) return [];
    return [{field, header: result.headers[column]?.trim() || untitled(column + 1)}];
  });
}

/** The refusals that are about the file itself, which the tool words by reason. */
export const guestFileRefusals = [
  "roster_file_too_large", "roster_unsupported_file", "roster_unreadable_xlsx", "roster_expanded_file_too_large",
  "roster_missing_worksheet", "roster_malformed_csv", "roster_missing_rows", "roster_too_many_columns", "roster_missing_guest_names",
] as const;
export type GuestFileRefusal = (typeof guestFileRefusals)[number];

/** Refusals of the visitor's column choice, which send them back to it. */
export const guestMappingRefusals = ["roster_invalid_mapping", "roster_duplicate_mapped_column"] as const;

export function isGuestFileRefusal(reason: string | null): reason is GuestFileRefusal {
  return (guestFileRefusals as readonly string[]).includes(reason ?? "");
}

export function isGuestMappingRefusal(reason: string | null): boolean {
  return (guestMappingRefusals as readonly string[]).includes(reason ?? "");
}
