/* eslint-disable max-len */
import type {CommercialTerms} from "../commercialTerms/terms";
import {prepareImportRows} from "../events/eventAttendees";
import type {HostRosterIntakeRow} from "../events/hostRosterIntakeCore";
import type {CanonicalGuestRead} from "../guestImport/canonical";
import {normalizeHeader} from "../guestImport/table";

// The report sales.import-past answers for one past night (#2062 C7). It is
// read from the rows the guest import readers produced, prepared the way an
// import saves them (prepareImportRows: names, phones, and an order total
// repeated on each guest's row split across them), so the report counts
// what the import would save. Catch's fee comes from the commercial terms
// the platform runs on, never from a copy of the rates.

export const GATEWAY_NOTE = "Payment gateway fees are charged by your payment provider either way, so they're left out of both.";

/** Status words that mean a guest came. */
const CAME = new Set(["checkedin", "checkin", "attended", "arrived", "present"]);
/**
 * Status words that mean a guest booked and did not come. The guest reader
 * leaves these rows out of the guest list, so the caller reads them back in
 * for the report and names them in noShowRowIds.
 */
export const NO_SHOW = new Set(["noshow", "absent", "didnotattend", "notcheckedin"]);
const MAX_TICKET_TYPES = 30;

export interface CurrentFees {
  percent?: number;
  perTicketMinor?: number;
  monthlySubscriptionMinor?: number;
  currency: string;
}

export interface PastSalesReport {
  eventName: string;
  localDate: string;
  ticketsSold: number;
  grossSalesMinor: number | null;
  currency: string | null;
  amountSource: "file" | "estimate" | "mixed" | "none";
  byTicketType: Array<{ticketType: string | null; count: number; grossMinor: number | null}>;
  attendance: {came: number; noShows: number; showRate: number} | null;
  attendanceReason: "no_checkin_status" | null;
  guests: {firstTime: number; repeat: number} | null;
  guestsReason: "no_earlier_nights" | null;
  fees: {
    catch: {feeMinor: number; rateBasisPoints: number; effectiveRateBasisPoints: number; capMinor: number | null;
      capReachedAtMinor: number | null; cycleDays: number; freeTrialDays: number} | null;
    catchReason: "terms_unavailable" | "no_sales_amounts" | "currency_mismatch" | null;
    current: {feeMinor: number; currency: string} | null;
    differenceMinor: number | null;
    gatewayNote: string;
  };
  skippedRows: number;
}

/** Phones and emails of guests on the organizer's earlier nights; null when there are none. */
export interface EarlierGuests {
  phones: Set<string>;
  emails: Set<string>;
}

export function pastSalesReport(params: {
  read: CanonicalGuestRead;
  rows: HostRosterIntakeRow[];
  excludedRowIds: ReadonlySet<string>;
  /** Rows whose status said the guest didn't come; they still bought a ticket. */
  noShowRowIds: ReadonlySet<string>;
  eventName: string;
  localDate: string;
  terms: CommercialTerms | null;
  currentFees: CurrentFees | null;
  earlier: EarlierGuests | null;
}): PastSalesReport {
  const kept = params.rows.filter((row) => !params.excludedRowIds.has(row.value.rowId));
  const {prepared} = prepareImportRows({eventId: "past-sales-preview", importKey: "past-sales-preview",
    rows: kept.map((row) => row.value)});
  const sold = prepared.filter((row) => row.status === "registered");

  const currencies = new Set(sold.flatMap((row) => row.revenueAmountMinor !== null && row.revenueCurrency ?
    [row.revenueCurrency] : []));
  const priced = sold.filter((row) => row.revenueAmountMinor !== null);
  const sources = new Set(priced.map((row) => row.revenueSource));
  const amountSource = priced.length === 0 ? "none" :
    sources.size > 1 ? "mixed" : sources.has("hostEstimate") ? "estimate" : "file";
  const oneCurrency = currencies.size === 1 ? [...currencies][0] : null;
  const gross = oneCurrency ? priced.reduce((sum, row) => sum + (row.revenueAmountMinor ?? 0), 0) : null;

  const types = new Map<string | null, {count: number; grossMinor: number | null}>();
  for (const row of sold) {
    const entry = types.get(row.ticketType) ?? {count: 0, grossMinor: oneCurrency ? 0 : null};
    entry.count += 1;
    if (entry.grossMinor !== null) entry.grossMinor += row.revenueAmountMinor ?? 0;
    types.set(row.ticketType, entry);
  }
  const byTicketType = [...types.entries()].sort((a, b) => b[1].count - a[1].count)
    .slice(0, MAX_TICKET_TYPES).map(([ticketType, entry]) => ({ticketType, ...entry}));

  const attendance = attendanceOf(params.read, kept, new Set(sold.map((row) => row.rowId)), params.noShowRowIds);
  const guests = params.earlier ? guestsOf(sold, params.earlier) : null;
  const fees = feesOf({terms: params.terms, sold, gross, currency: oneCurrency, mixed: currencies.size > 1,
    currentFees: params.currentFees});
  return {
    eventName: params.eventName,
    localDate: params.localDate,
    ticketsSold: sold.length,
    grossSalesMinor: gross,
    currency: oneCurrency,
    amountSource,
    byTicketType,
    attendance,
    attendanceReason: attendance ? null : "no_checkin_status",
    guests,
    guestsReason: guests ? null : "no_earlier_nights",
    fees,
    skippedRows: params.read.skipped.length + (params.rows.length - kept.length),
  };
}

/**
 * Who came, only when the export's status column records check-ins or
 * no-shows: a sold guest whose status says checked in came; every other sold
 * guest did not.
 */
function attendanceOf(read: CanonicalGuestRead, kept: HostRosterIntakeRow[], soldIds: Set<string>,
  noShowRowIds: ReadonlySet<string>): PastSalesReport["attendance"] {
  const column = read.mapping.status;
  if (column === null) return null;
  const word = (cells: string[] | undefined) => normalizeHeader(cells?.[column] ?? "");
  const soldRows = kept.filter((row) => soldIds.has(row.value.rowId));
  const came = soldRows.filter((row) => CAME.has(word(row.rawCells))).length;
  const marked = soldRows.filter((row) => noShowRowIds.has(row.value.rowId) || NO_SHOW.has(word(row.rawCells))).length;
  if (came === 0 && marked === 0) return null;
  const noShows = soldRows.length - came;
  return {came, noShows, showRate: soldRows.length === 0 ? 0 : Math.round((came / soldRows.length) * 1000) / 1000};
}

function guestsOf(sold: ReturnType<typeof prepareImportRows>["prepared"], earlier: EarlierGuests):
  PastSalesReport["guests"] {
  let repeat = 0;
  for (const row of sold) {
    const seen = (row.phoneE164 !== null && earlier.phones.has(row.phoneE164)) ||
      (row.email !== null && earlier.emails.has(row.email.toLowerCase()));
    if (seen) repeat += 1;
  }
  return {firstTime: sold.length - repeat, repeat};
}

/**
 * Catch's fee on this night if it fell in one billing cycle after the free
 * trial: the commission rate on each guest's amount, rounded down per
 * payment, then the cycle cap, as the bill works it out
 * (money/billComputation.ts). Refunds are not in an export, so sales are
 * taken as net.
 */
function feesOf(params: {terms: CommercialTerms | null; sold: ReturnType<typeof prepareImportRows>["prepared"];
  gross: number | null; currency: string | null; mixed: boolean; currentFees: CurrentFees | null}):
  PastSalesReport["fees"] {
  const current = params.currentFees && params.gross !== null && params.currency === params.currentFees.currency ? {
    feeMinor: Math.round(params.gross * (params.currentFees.percent ?? 0) / 100) +
      (params.currentFees.perTicketMinor ?? 0) * params.sold.length +
      (params.currentFees.monthlySubscriptionMinor ?? 0),
    currency: params.currentFees.currency,
  } : null;
  const base = {current, gatewayNote: GATEWAY_NOTE};
  if (params.mixed) return {...base, catch: null, catchReason: "currency_mismatch", differenceMinor: null};
  if (params.gross === null || params.currency === null) {
    return {...base, catch: null, catchReason: "no_sales_amounts", differenceMinor: null};
  }
  const terms = params.terms;
  if (!terms || terms.currency !== params.currency) {
    return {...base, catch: null, catchReason: terms ? "currency_mismatch" : "terms_unavailable", differenceMinor: null};
  }
  const rate = terms.commission.rateBasisPoints;
  const uncapped = params.sold.reduce((sum, row) =>
    sum + Math.floor(((row.revenueAmountMinor ?? 0) * rate) / 10_000), 0);
  const cap = terms.commission.capMinor;
  const feeMinor = cap === null ? uncapped : Math.min(uncapped, cap);
  return {
    ...base,
    catch: {
      feeMinor,
      rateBasisPoints: rate,
      effectiveRateBasisPoints: params.gross > 0 ? Math.round((feeMinor / params.gross) * 10_000) : rate,
      capMinor: cap,
      capReachedAtMinor: cap === null || rate === 0 ? null : Math.ceil((cap * 10_000) / rate),
      cycleDays: terms.commission.cycleDays,
      freeTrialDays: terms.trial.days,
    },
    catchReason: null,
    differenceMinor: current ? current.feeMinor - feeMinor : null,
  };
}
