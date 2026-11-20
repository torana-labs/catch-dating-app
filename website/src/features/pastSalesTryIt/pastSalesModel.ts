import {activeMarket} from "@content/markets";
import type {TryItInput, TryItResponse} from "../../shared/api/tryItCommands";
import {parseLastEventNumber} from "../marketing/lastEventReportModel";

/**
 * Reports' export upload (sales.import-past) as plain values: which files
 * the command takes, what the visitor typed about the night turned into the
 * command's input, the column guesses for the mapping step, and the file's
 * bytes as base64. The file is read here only to send it to the command.
 */

export type PastSalesInput = TryItInput<"sales.import-past">;
export type PastSalesResponse = TryItResponse<"sales.import-past">;
export type PastSalesReport = NonNullable<PastSalesResponse["result"]["report"]>;
export type PastSalesReviewRow = PastSalesResponse["result"]["rowsNeedingReview"][number];
export type PastSalesImport = NonNullable<PastSalesResponse["result"]["import"]>;
export type PastSalesFile = PastSalesInput["file"];

/** The files the command reads (its fileName pattern), for the file chooser. */
export const pastSalesAccept = ".csv,.xlsx,.vcf";
/** The most the command reads, before encoding. */
export const pastSalesMaxBytes = 5 * 1024 * 1024;
const fileNamePattern = /\.(?:csv|xlsx|vcf)$/iu;

export type PastSalesFileProblem = "fileRequired" | "fileType" | "fileTooLarge";

/** Why the chosen file cannot be sent, or null: none chosen, a type the command refuses, or over 5 MB. */
export function pastSalesFileProblem(file: {readonly name: string; readonly size: number} | null): PastSalesFileProblem | null {
  if (!file) return "fileRequired";
  if (!fileNamePattern.test(file.name) || file.name.length < 5 || file.name.length > 255) return "fileType";
  if (file.size === 0 || file.size > pastSalesMaxBytes) return "fileTooLarge";
  return null;
}

/** The file's bytes as base64, as the command takes them, in chunks so a large file does not overflow the call stack. */
export function pastSalesBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let start = 0; start < bytes.length; start += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000));
  }
  return btoa(binary);
}

/** The most each amount field takes, as the command's limits allow. */
export const pastSalesInputLimits = {
  /** The ticket price for rows with no amount, in rupees. */
  ticketPrice: 1_000_000,
  /** The current tool's fee, as a percentage of ticket sales. */
  feePercent: 100,
  /** The current tool's fee on each ticket, in rupees. */
  feePerTicket: 10_000,
} as const;

/** What the visitor typed about the night. Each stays a string, so an empty field is allowed. */
export interface PastSalesDetails {
  readonly eventName: string;
  /** YYYY-MM-DD, or empty for the command's default (yesterday). */
  readonly eventDate: string;
  readonly ticketPrice: string;
  readonly feePercent: string;
  readonly feePerTicket: string;
}
export type PastSalesDetailField = keyof PastSalesDetails;
export type PastSalesDetailProblem = "notNumber" | "notWhole" | "tooLarge" | "dateInFuture";

export const emptyPastSalesDetails: PastSalesDetails = {eventName: "", eventDate: "", ticketPrice: "", feePercent: "", feePerTicket: ""};

/** Today in the market's timezone, as YYYY-MM-DD: the latest date the command takes. */
export function pastSalesToday(now: Date = new Date(), timeZone = activeMarket.cities[0]?.timezone ?? "UTC"): string {
  return new Intl.DateTimeFormat("en-CA", {timeZone, year: "numeric", month: "2-digit", day: "2-digit"}).format(now);
}

/** The details as the command's input (without the file), or the fields' problems. Empty fields are left out. */
export function pastSalesDetailsInput(details: PastSalesDetails, today: string): {
  readonly problems: Partial<Record<PastSalesDetailField, PastSalesDetailProblem>>;
  readonly input: Omit<PastSalesInput, "file">;
} {
  const problems: Partial<Record<PastSalesDetailField, PastSalesDetailProblem>> = {};
  const price = parseLastEventNumber(details.ticketPrice, pastSalesInputLimits.ticketPrice, 2);
  const percent = parseLastEventNumber(details.feePercent, pastSalesInputLimits.feePercent, 2);
  const perTicket = parseLastEventNumber(details.feePerTicket, pastSalesInputLimits.feePerTicket, 2);
  for (const [field, parsed] of [["ticketPrice", price], ["feePercent", percent], ["feePerTicket", perTicket]] as const) {
    if (parsed.kind === "problem") problems[field] = parsed.problem === "cameMoreThanSold" ? "notNumber" : parsed.problem;
  }
  const date = details.eventDate.trim();
  if (date && (!/^\d{4}-\d{2}-\d{2}$/u.test(date) || date > today)) problems.eventDate = "dateInFuture";
  const name = details.eventName.trim().replace(/\s+/gu, " ").slice(0, 120);
  const currency = activeMarket.currencyCode;
  const event = {...(name ? {name} : {}), ...(date ? {localDate: date} : {})};
  const fees = {
    ...(percent.kind === "value" ? {percent: percent.value} : {}),
    ...(perTicket.kind === "value" ? {perTicketMinor: Math.round(perTicket.value * 100)} : {}),
  };
  return {
    problems,
    input: {
      ...(Object.keys(event).length ? {event} : {}),
      ...(price.kind === "value" ? {fallbackTicketPrice: {amountMinor: Math.round(price.value * 100), currency}} : {}),
      ...(Object.keys(fees).length ? {currentFees: {...fees, currency}} : {}),
    },
  };
}

/** The columns the mapping step asks about, as the command's mapping names them. Only the guest name is required. */
export const pastSalesMappingFields = ["displayName", "phone", "email", "ticketType", "status", "revenueAmount"] as const;
export type PastSalesMappingField = (typeof pastSalesMappingFields)[number];
export type PastSalesMapping = Readonly<Record<PastSalesMappingField, number | null>>;
export type PastSalesMappingProblem = "nameRequired" | "duplicate";

export const emptyPastSalesMapping: PastSalesMapping = {displayName: null, phone: null, email: null, ticketType: null, status: null, revenueAmount: null};

const headerGuesses: ReadonlyArray<readonly [PastSalesMappingField, RegExp]> = [
  ["displayName", /\bname\b|guest|attendee|buyer|customer/iu],
  ["phone", /phone|mobile|whats\s?app|contact\s?number/iu],
  ["email", /e-?mail/iu],
  ["ticketType", /ticket|tier|pass|category/iu],
  ["status", /status|check(?:ed)?[\s-]?in|attend/iu],
  ["revenueAmount", /amount|paid|price|total|revenue/iu],
];

/**
 * A first guess at each column, so the visitor only fixes what is wrong: a
 * phone- or email-shaped column for the phone or email, and a heading's
 * words for the rest. Each column fills one field at most.
 */
export function guessPastSalesMapping(headers: readonly string[], shapes: readonly string[]): PastSalesMapping {
  const used = new Set<number>();
  const mapping: Record<PastSalesMappingField, number | null> = {...emptyPastSalesMapping};
  const take = (field: PastSalesMappingField, column: number) => {
    if (column < 0 || used.has(column) || mapping[field] !== null) return;
    mapping[field] = column;
    used.add(column);
  };
  take("phone", shapes.indexOf("phone-like"));
  take("email", shapes.indexOf("email-like"));
  for (const [field, pattern] of headerGuesses) {
    take(field, headers.findIndex((header, column) => !used.has(column) && pattern.test(header)));
  }
  return mapping;
}

/** Why the mapping cannot be sent: no name column, or one column chosen twice. */
export function pastSalesMappingProblems(mapping: PastSalesMapping): Partial<Record<PastSalesMappingField, PastSalesMappingProblem>> {
  const problems: Partial<Record<PastSalesMappingField, PastSalesMappingProblem>> = {};
  if (mapping.displayName === null) problems.displayName = "nameRequired";
  const seen = new Map<number, PastSalesMappingField>();
  for (const field of pastSalesMappingFields) {
    const column = mapping[field];
    if (column === null) continue;
    const first = seen.get(column);
    if (first) problems[field] = "duplicate";
    else seen.set(column, field);
  }
  return problems;
}

const counts = new Intl.NumberFormat(activeMarket.locale, {maximumFractionDigits: 0});

/** A count in the market's digits: "52", "1,00,000". */
export function formatPastSalesCount(count: number): string {
  return counts.format(Number.isFinite(count) ? count : 0);
}

/** An amount the command gives in minor units, in its currency: "₹13,800", "₹99.50". */
export function formatPastSalesMoney(minor: number, currency: string): string {
  const whole = minor % 100 === 0;
  try {
    return new Intl.NumberFormat(activeMarket.locale, {style: "currency", currency, minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2}).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(whole ? 0 : 2)}`;
  }
}

/** A show rate (0 to 1) as a whole percentage, rounded down so 51 of 52 never reads as everyone. */
export function formatPastSalesRate(rate: number): string {
  return `${Math.floor(Number.isFinite(rate) ? Math.max(0, Math.min(1, rate)) * 100 + 1e-9 : 0)}%`;
}
