// The guest-list table every converter reads: headers plus rows of cells.
// One CSV reader serves every surface (Catch Host, the forwarded roster, the
// guests.import-list command), so a file reads the same wherever it arrives.

export interface GuestTable {
  headers: string[];
  rows: string[][];
}

/**
 * Reads RFC 4180 CSV into rows of trimmed cells, dropping blank rows and a
 * leading byte-order mark.
 * @return {string[][]} The rows, header row first.
 */
export function parseCsvMatrix(source: string): string[][] {
  const text = source.startsWith("﻿") ? source.slice(1) : source;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === "\"") {
        if (text[index + 1] === "\"") {
          field += "\"";
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }
    if (character === "\"") {
      quoted = true;
    } else if (character === ",") {
      row.push(field.trim());
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (quoted) throw new Error("roster_malformed_csv");
  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    if (row.some((value) => value.length > 0)) rows.push(row);
  }
  return rows;
}

/** Blank headers get a column label; repeated headers get a count. */
export function uniqueHeaders(headers: string[]): string[] {
  const counts = new Map<string, number>();
  return headers.map((raw, index) => {
    const base = raw.trim() || `Column ${index + 1}`;
    const count = (counts.get(base) ?? 0) + 1;
    counts.set(base, count);
    return count === 1 ? base : `${base} (${count})`;
  });
}

/** Lowercase letters and digits only: "Phone Number" → "phonenumber". */
export function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** The index of the first header in [aliases], or null. */
export function findHeader(headers: string[],
  aliases: ReadonlySet<string>): number | null {
  const index = headers.findIndex(
    (header) => aliases.has(normalizeHeader(header))
  );
  return index < 0 ? null : index;
}

/** The trimmed cell, or "" when the column is unmapped or missing. */
export function valueAt(row: string[], index: number | null): string {
  return index === null ? "" : (row[index] ?? "").trim();
}

/** The trimmed cell, or null when it is empty. */
export function nullableValueAt(row: string[],
  index: number | null): string | null {
  const value = valueAt(row, index);
  return value.length > 0 ? value : null;
}
