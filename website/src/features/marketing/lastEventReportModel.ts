import {activeMarket} from "@content/markets";
import {formatPricingMoney, hostFeeQuote, type HostFeeQuote} from "@content/pricing";

/**
 * The numbers-only report on /product/reports-and-payouts/ (the
 * lastEventReport custom section): from what the host types about their last
 * event (tickets sold, the ticket price, how many came) and what their
 * current ticketing tool charges, the event's ticket sales, its show-up
 * rate, {brand}'s fee on it (content/pricing.ts's hostFeeQuote, as every
 * pricing page works it out) and the difference. Nothing is sent or stored:
 * every figure is worked out here from the host's inputs and the fee model.
 */

/** The largest number each field takes; more is refused, not clamped, so the host sees why. */
export const lastEventInputLimits = {
  sold: 100_000,
  price: 1_000_000,
  /** The current tool's fee, as a percentage of ticket sales. */
  feePercent: 100,
  /** The current tool's fee on each ticket, in rupees. */
  feePerTicket: 10_000,
} as const;

/** What the host typed. Each field stays a string, so an empty field is allowed while they type. */
export interface LastEventInputs {
  readonly sold: string;
  /** The ticket price in whole rupees; 0 is a free event. */
  readonly price: string;
  readonly came: string;
  /** The current tool's fee as a percentage of ticket sales, up to two decimals; empty when it has none. */
  readonly feePercent: string;
  /** The current tool's fee on each ticket sold, in rupees, up to two decimals; empty when it has none. */
  readonly feePerTicket: string;
}

export type LastEventField = keyof LastEventInputs;

/** Why a field cannot be used as typed. */
export type LastEventFieldProblem = "notNumber" | "notWhole" | "tooLarge" | "cameMoreThanSold";

/** Every figure the report shows, before formatting. */
export interface LastEventFigures {
  readonly sold: number;
  readonly price: number;
  readonly came: number;
  /** The event's ticket sales: tickets sold × the ticket price. */
  readonly sales: number;
  /** A free event: nothing sold for money, so no {brand} fee. */
  readonly free: boolean;
  /** Who came, as a share of tickets sold, in percent; null when no tickets were sold. */
  readonly showUpRate: number | null;
  /** {brand}'s fee on this event's sales alone, after the trial (hostFeeQuote). */
  readonly catchQuote: HostFeeQuote;
  /** What the host says their current tool charged on this event, in whole rupees; null until they enter its fee. */
  readonly currentFee: number | null;
  /** The current tool's fee less {brand}'s: positive when {brand}'s is lower. Null until the current fee is entered. */
  readonly difference: number | null;
}

/** The fields' problems, the figures once the three event numbers are entered and usable, or neither while a field is empty. */
export interface LastEventReport {
  readonly problems: Partial<Record<LastEventField, LastEventFieldProblem>>;
  readonly figures: LastEventFigures | null;
}

type Parsed = {readonly kind: "empty"} | {readonly kind: "value"; readonly value: number} | {readonly kind: "problem"; readonly problem: LastEventFieldProblem};

/**
 * A typed amount: spaces, commas and a leading ₹ are ignored. Empty is
 * empty; a negative number, letters or more than `decimals` decimal places
 * is a problem, as is anything above `max`.
 */
export function parseLastEventNumber(input: string, max: number, decimals = 0): Parsed {
  const cleaned = input.replace(/[\s,]/gu, "").replace(/^₹/u, "");
  if (!cleaned) return {kind: "empty"};
  if (!/^\d+(?:\.\d*)?$|^\.\d+$/u.test(cleaned)) return {kind: "problem", problem: "notNumber"};
  const [, fraction = ""] = cleaned.split(".");
  if (fraction.replace(/0+$/u, "").length > decimals) return {kind: "problem", problem: decimals === 0 ? "notWhole" : "notNumber"};
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return {kind: "problem", problem: "notNumber"};
  if (value > max) return {kind: "problem", problem: "tooLarge"};
  return {kind: "value", value};
}

/**
 * The current tool's fee on the event, in whole rupees: its percentage of
 * the ticket sales plus its amount on each ticket sold, worked in paise and
 * rounded to the nearest rupee.
 */
export function currentToolFee(sales: number, sold: number, feePercent: number, feePerTicket: number): number {
  const paise = Math.round(sales * feePercent) + Math.round(sold * feePerTicket * 100);
  return Math.round(paise / 100);
}

/** The report for what the host typed. */
export function lastEventReport(inputs: LastEventInputs): LastEventReport {
  const parsed: Record<LastEventField, Parsed> = {
    sold: parseLastEventNumber(inputs.sold, lastEventInputLimits.sold),
    price: parseLastEventNumber(inputs.price, lastEventInputLimits.price),
    came: parseLastEventNumber(inputs.came, lastEventInputLimits.sold),
    feePercent: parseLastEventNumber(inputs.feePercent, lastEventInputLimits.feePercent, 2),
    feePerTicket: parseLastEventNumber(inputs.feePerTicket, lastEventInputLimits.feePerTicket, 2),
  };
  const problems: Partial<Record<LastEventField, LastEventFieldProblem>> = {};
  for (const [field, value] of Object.entries(parsed) as [LastEventField, Parsed][]) {
    if (value.kind === "problem") problems[field] = value.problem;
  }
  const {sold, price, came, feePercent, feePerTicket} = parsed;
  if (sold.kind === "value" && came.kind === "value" && came.value > sold.value) problems.came = "cameMoreThanSold";
  if (Object.keys(problems).length > 0 || sold.kind !== "value" || price.kind !== "value" || came.kind !== "value") {
    return {problems, figures: null};
  }
  const sales = sold.value * price.value;
  const catchQuote = hostFeeQuote(sales);
  const percent = feePercent.kind === "value" ? feePercent.value : null;
  const perTicket = feePerTicket.kind === "value" ? feePerTicket.value : null;
  const currentFee = percent === null && perTicket === null ? null : currentToolFee(sales, sold.value, percent ?? 0, perTicket ?? 0);
  return {
    problems,
    figures: {
      sold: sold.value,
      price: price.value,
      came: came.value,
      sales,
      free: price.value === 0,
      showUpRate: sold.value > 0 ? (came.value / sold.value) * 100 : null,
      catchQuote,
      currentFee,
      difference: currentFee === null ? null : currentFee - catchQuote.fee,
    },
  };
}

const counts = new Intl.NumberFormat(activeMarket.locale, {maximumFractionDigits: 0});

/** A count in the market's digits: "52", "1,00,000". */
export function formatLastEventCount(count: number): string {
  return counts.format(Number.isFinite(count) ? count : 0);
}

/** An amount in whole rupees, as every pricing figure on the site is formatted: "₹20,800", "₹1,20,000". */
export function formatLastEventMoney(amount: number): string {
  return formatPricingMoney(Number.isFinite(amount) ? Math.round(amount) : 0);
}

/** A show-up rate as a whole percentage, rounded down so 51 of 52 never reads as everyone: "88%", "98%". */
export function formatShowUpRate(rate: number): string {
  return `${Math.floor(Number.isFinite(rate) ? Math.max(0, Math.min(100, rate)) : 0)}%`;
}
