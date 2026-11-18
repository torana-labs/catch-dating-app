// The shared stage between a converter and the review session: canonical
// rows become hostRosterIntake rows with per-field provenance, so every
// source (a file read on the server, later an API connector) is reviewed,
// normalised and applied by the same code (hostRosterIntakeCore.ts:
// prepareImportRows normalises names and phones, finds duplicate and shared
// identities, and the preview compares against the current roster).

import type {
  HostRosterIntakeRow,
  HostRosterSourceField,
} from "../events/hostRosterIntakeCore";
import {marketForIdOrAlias} from "../locations/marketConfig";
import type {CanonicalGuestRead, GuestField} from "./canonical";
import {parseRevenueAmountMinor, type GuestExtraMapping} from "./mapping";

/** The review session's bounds for each mapped value. */
const MAX_LENGTH: Record<Exclude<GuestField, "status">, number> = {
  displayName: 120,
  phone: 40,
  email: 320,
  externalReference: 180,
  arrivalGroup: 180,
  ticketType: 120,
};
const MAX_HEADER_LENGTH = 120;

export interface GuestIntakeInput {
  headers: string[];
  /** Field → column, as the review session stores it. */
  mapping: Record<string, number>;
  rows: HostRosterIntakeRow[];
}

/**
 * Turns one read into review rows. A value longer than the review allows is
 * cut and the row flagged "value-too-long", so it needs a look before apply.
 * @return {GuestIntakeInput} Headers, mapping and rows for the session.
 */
export function guestIntakeInput(read: CanonicalGuestRead,
  options: {
    /** City and revenue columns (Catch Host's reader maps these too). */
    extraMapping?: GuestExtraMapping;
    /** The host's ticket price for rows the file gives no amount for. */
    fallbackRevenue?: {amountMinor: number; currency: string} | null;
  } = {}): GuestIntakeInput {
  const extra = options.extraMapping ??
    {city: null, revenueAmount: null, revenueCurrency: null};
  const headers = read.headers.map((header) =>
    header.slice(0, MAX_HEADER_LENGTH));
  const mapping: Record<string, number> = {};
  for (const [field, column] of Object.entries(read.mapping)) {
    if (column !== null) mapping[field] = column;
  }
  for (const [field, column] of Object.entries(extra)) {
    if (column !== null) mapping[field] = column;
  }
  const corrected = new Set(read.correctedFields);
  const rows = read.rows.map((row): HostRosterIntakeRow => {
    const issues: string[] = [...(row.issues ?? [])];
    const value: HostRosterIntakeRow["value"] = {...row.value};
    for (const [field, max] of Object.entries(MAX_LENGTH) as Array<
      [Exclude<GuestField, "status">, number]>) {
      const current = value[field];
      if (typeof current === "string" && current.length > max) {
        value[field] = current.slice(0, max);
        if (!issues.includes("value-too-long")) issues.push("value-too-long");
      }
    }
    const fields: HostRosterIntakeRow["fields"] = {};
    for (const [field, source] of Object.entries(row.fields) as Array<
      [GuestField, {column: number; header: string}]>) {
      const provenance: HostRosterSourceField = {column: source.column,
        header: headers[source.column] ?? source.header.slice(0,
          MAX_HEADER_LENGTH),
        origin: corrected.has(field) ? "hostCorrection" : "upload",
        confidence: null};
      fields[field] = provenance;
    }
    const source = (column: number | null, origin:
      HostRosterSourceField["origin"] = "upload"): HostRosterSourceField =>
      ({column: column ?? -1, header: column === null ? "Host entry" :
        headers[column] ?? "Column", origin, confidence: null});
    const cell = (column: number | null) => column === null ? null :
      (row.rawCells[column] ?? "").trim() || null;

    const rawCity = cell(extra.city);
    if (rawCity) {
      const market = marketForIdOrAlias(rawCity);
      if (market) {
        value.cityMarketId = market.marketId;
        fields.cityMarketId = source(extra.city);
      } else {
        issues.push("invalid-city");
      }
    }
    const rawAmount = cell(extra.revenueAmount);
    const mappedAmount = rawAmount === null ? null :
      parseRevenueAmountMinor(rawAmount);
    if (rawAmount !== null && mappedAmount === null) {
      issues.push("invalid-revenue-amount");
    }
    const fallback = options.fallbackRevenue ?? null;
    const amount = mappedAmount ?? (rawAmount === null && fallback ?
      fallback.amountMinor : null);
    if (amount !== null) {
      const currency = cell(extra.revenueCurrency)?.toUpperCase() ??
        fallback?.currency ?? null;
      if (!currency || !/^[A-Z]{3}$/u.test(currency)) {
        issues.push("missing-revenue-currency");
      } else {
        value.revenueAmountMinor = amount;
        value.revenueCurrency = currency;
        value.revenueSource = mappedAmount !== null ? "hostImport" :
          "hostEstimate";
        fields.revenueAmountMinor = mappedAmount !== null ?
          source(extra.revenueAmount) : source(null, "hostCorrection");
        fields.revenueCurrency = extra.revenueCurrency !== null &&
          cell(extra.revenueCurrency) ? source(extra.revenueCurrency) :
          source(null, "hostCorrection");
        fields.revenueSource = fields.revenueAmountMinor;
      }
    }
    return {value, sourceRowNumber: row.sourceRowNumber, fields,
      rawCells: row.rawCells,
      ...(issues.length ? {issues: [...new Set(issues)].slice(0, 10)} : {})};
  });
  return {headers, mapping, rows};
}
