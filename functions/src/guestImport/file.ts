// Reads an uploaded guest-list file on the server: CSV (UTF-8, or Latin-1
// when the bytes are not UTF-8), XLSX (the sheet that looks most like a
// guest list) or vCard contacts. The limits match the app's reader, so a
// file the app accepted reads the same here.

import type ExcelJS from "exceljs";
import type {RosterAdapterId} from "./canonical";
import {vcardMatrix} from "./converters/vcard";
import {fullNameAliases} from "./mapping";
import {findHeader, parseCsvMatrix, uniqueHeaders} from "./table";

export const MAX_GUEST_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_GUEST_FILE_EXPANDED_BYTES = 25 * 1024 * 1024;
const MAX_XLSX_COLUMNS = 40;

export type GuestFileFormat = "csv" | "xlsx" | "vcf";

export interface GuestFileRead {
  format: GuestFileFormat;
  matrix: string[][];
  usedLegacyEncoding: boolean;
  worksheetCount: number;
  /** Set when the file type alone decides the converter (vCard). */
  converterId: RosterAdapterId | null;
}

/** The format a file name implies, or null for an unsupported file. */
export function guestFileFormat(fileName: string): GuestFileFormat | null {
  const extension = fileName.split(".").pop()?.toLowerCase();
  return extension === "csv" || extension === "xlsx" ||
    extension === "vcf" ? extension : null;
}

/**
 * Reads one bounded upload into a table, header row first.
 * @return {Promise<GuestFileRead>} The table and how it was read.
 */
export async function readGuestFile(params: {fileName: string;
  bytes: Uint8Array}): Promise<GuestFileRead> {
  const {fileName, bytes} = params;
  if (bytes.byteLength > MAX_GUEST_FILE_BYTES) {
    throw new Error("roster_file_too_large");
  }
  const format = guestFileFormat(fileName);
  if (!format) throw new Error("roster_unsupported_file");
  if (format === "xlsx") {
    const workbook = await readXlsx(bytes);
    return {format, matrix: workbook.rows,
      worksheetCount: workbook.worksheetCount, usedLegacyEncoding: false,
      converterId: null};
  }
  const text = decodeText(bytes);
  return {format, usedLegacyEncoding: text.legacy, worksheetCount: 1,
    matrix: format === "vcf" ? vcardMatrix(text.value) :
      parseCsvMatrix(text.value),
    converterId: format === "vcf" ? "vcard-v1" : null};
}

/** UTF-8 when the bytes are valid UTF-8, else Latin-1 (old Excel CSVs). */
export function decodeText(bytes: Uint8Array):
  {value: string; legacy: boolean} {
  try {
    return {value: new TextDecoder("utf-8", {fatal: true}).decode(bytes),
      legacy: false};
  } catch {
    return {value: Buffer.from(bytes).toString("latin1"), legacy: true};
  }
}

/**
 * The sum of the uncompressed sizes a zip's central directory declares.
 * Refuses zip64 and malformed archives, so a decompression bomb is turned
 * away before anything is inflated.
 * @return {number} Declared expanded bytes.
 */
export function zipDeclaredExpandedBytes(bytes: Uint8Array): number {
  const view = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const searchFrom = Math.max(0, view.length - 22 - 0xffff);
  let end = -1;
  for (let index = view.length - 22; index >= searchFrom; index -= 1) {
    if (view.readUInt32LE(index) === 0x06054b50) {
      end = index;
      break;
    }
  }
  if (end < 0) throw new Error("roster_unreadable_xlsx");
  const entries = view.readUInt16LE(end + 10);
  let offset = view.readUInt32LE(end + 16);
  if (entries === 0xffff || offset === 0xffffffff) {
    throw new Error("roster_unreadable_xlsx");
  }
  let total = 0;
  for (let entry = 0; entry < entries; entry += 1) {
    if (offset + 46 > view.length ||
        view.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("roster_unreadable_xlsx");
    }
    const size = view.readUInt32LE(offset + 24);
    if (size === 0xffffffff) throw new Error("roster_unreadable_xlsx");
    total += size;
    offset += 46 + view.readUInt16LE(offset + 28) +
      view.readUInt16LE(offset + 30) + view.readUInt16LE(offset + 32);
  }
  return total;
}

async function readXlsx(bytes: Uint8Array):
  Promise<{rows: string[][]; worksheetCount: number}> {
  if (zipDeclaredExpandedBytes(bytes) > MAX_GUEST_FILE_EXPANDED_BYTES) {
    throw new Error("roster_expanded_file_too_large");
  }
  // Loaded on first use, as the form export does, to keep cold starts fast.
  const {Workbook} = (await import("exceljs")).default;
  const workbook = new Workbook();
  try {
    await workbook.xlsx.load(Buffer.from(bytes) as unknown as
      ArrayBuffer);
  } catch {
    throw new Error("roster_unreadable_xlsx");
  }
  const sheets = workbook.worksheets.map(sheetRows)
    .filter((rows) => rows.length > 0);
  if (sheets.length === 0) throw new Error("roster_missing_worksheet");
  // Prefer a sheet whose first row has a name column, then the longest.
  sheets.sort((left, right) => {
    const leftHasName = hasNameColumn(left);
    const rightHasName = hasNameColumn(right);
    if (leftHasName !== rightHasName) return leftHasName ? -1 : 1;
    return right.length - left.length;
  });
  return {rows: sheets[0], worksheetCount: workbook.worksheets.length};
}

function hasNameColumn(rows: string[][]): boolean {
  return findHeader(uniqueHeaders(rows[0]), fullNameAliases) !== null;
}

function sheetRows(sheet: ExcelJS.Worksheet): string[][] {
  const rows: string[][] = [];
  sheet.eachRow({includeEmpty: false}, (row) => {
    const cells: string[] = [];
    for (let column = 1; column <= Math.min(row.cellCount,
      MAX_XLSX_COLUMNS); column += 1) {
      cells.push(cellText(row.getCell(column)));
    }
    const trimmed = cells.map((cell) => cell.trim());
    if (trimmed.some((cell) => cell.length > 0)) rows.push(trimmed);
  });
  return rows;
}

function cellText(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("richText" in value) {
      return value.richText.map((part) => part.text).join("");
    }
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value) return String(value.result ?? "");
    if ("error" in value) return "";
  }
  return String(value);
}
