import {activeMarket} from "@content/markets";
import {formatPricingMoney} from "@content/pricing";

/**
 * The no-show calculator's sums, from the host's own numbers only: the
 * places they hold, the events they run, their ticket price (or, on a free
 * event, what a held place costs them), their no-show rate today and the
 * rate they want to try. Nothing here is a measured or typical rate: every
 * figure the page shows is worked out from what the host typed or slid.
 */

/** The largest number each field takes, so a stray keystroke cannot overflow the sums. */
export const noShowInputLimits = {
  places: 100_000,
  events: 100,
  price: 1_000_000,
  costPerHead: 1_000_000,
} as const;

/** What the host typed or slid. Text fields stay strings, so an empty field is allowed while they type. */
export interface NoShowInputs {
  /** Places or tickets at each event. */
  readonly places: string;
  /** Events a month. */
  readonly events: string;
  /** The ticket price in whole rupees; 0 is a free event. */
  readonly price: string;
  /** On a free event: what each held place costs the host (food, space). */
  readonly costPerHead: string;
  /** The host's no-show rate today, as a percentage. */
  readonly rate: number;
  /** The rate the host wants to see the sums at, as a percentage: their own what-if. */
  readonly target: number;
}

/** The figures the calculator shows, before formatting. */
export interface NoShowFigures {
  readonly places: number;
  readonly events: number;
  readonly price: number;
  readonly costPerHead: number;
  readonly rate: number;
  /** The what-if rate, never above today's rate. */
  readonly target: number;
  /** A free event: the cost is what held places cost, not tickets. */
  readonly free: boolean;
  /** What one empty place costs: the ticket, or on a free event the cost per head. */
  readonly costPerEmptyPlace: number;
  /** Places held in a month: places × events. */
  readonly heldPerMonth: number;
  readonly emptyPerEvent: number;
  readonly emptyPerMonth: number;
  /** What no-shows cost, in whole rupees. */
  readonly costPerEvent: number;
  readonly costPerMonth: number;
  readonly targetEmptyPerEvent: number;
  readonly targetEmptyPerMonth: number;
  readonly targetCostPerEvent: number;
  readonly targetCostPerMonth: number;
  /** The difference between today and the what-if. */
  readonly fewerEmptyPerMonth: number;
  readonly savedPerMonth: number;
}

/**
 * A typed whole number, or 0: spaces, commas and a leading currency sign are
 * ignored, decimals are dropped, and anything else (empty, negative, letters)
 * is 0. Clamped to `max`.
 */
export function parseWholeNumber(input: string, max: number): number {
  const cleaned = input.replace(/[\s,]/gu, "").replace(/^₹/u, "");
  if (!/^\d+(?:\.\d*)?$/u.test(cleaned)) return 0;
  const value = Math.floor(Number(cleaned));
  return Number.isFinite(value) ? Math.min(value, max) : 0;
}

/** A percentage from a slider or a typed value: whole, between 0 and 100; anything else is 0. */
export function clampRate(rate: number): number {
  return Number.isFinite(rate) ? Math.min(100, Math.max(0, Math.round(rate))) : 0;
}

/** Empty places to one decimal, so a fraction of a person reads as an average. */
function places(count: number): number {
  return Math.round(count * 10) / 10;
}

/** Every figure the calculator shows, from the host's inputs. */
export function noShowFigures(inputs: NoShowInputs): NoShowFigures {
  const placesPerEvent = parseWholeNumber(inputs.places, noShowInputLimits.places);
  const events = parseWholeNumber(inputs.events, noShowInputLimits.events);
  const price = parseWholeNumber(inputs.price, noShowInputLimits.price);
  const costPerHead = parseWholeNumber(inputs.costPerHead, noShowInputLimits.costPerHead);
  const rate = clampRate(inputs.rate);
  const target = Math.min(clampRate(inputs.target), rate);
  const free = price === 0;
  const costPerEmptyPlace = free ? costPerHead : price;
  const exactEmpty = (share: number) => (placesPerEvent * share) / 100;
  const emptyPerEvent = exactEmpty(rate);
  const targetEmptyPerEvent = exactEmpty(target);
  const costPerMonth = Math.round(emptyPerEvent * events * costPerEmptyPlace);
  const targetCostPerMonth = Math.round(targetEmptyPerEvent * events * costPerEmptyPlace);
  return {
    places: placesPerEvent,
    events,
    price,
    costPerHead,
    rate,
    target,
    free,
    costPerEmptyPlace,
    heldPerMonth: placesPerEvent * events,
    emptyPerEvent: places(emptyPerEvent),
    emptyPerMonth: places(emptyPerEvent * events),
    costPerEvent: Math.round(emptyPerEvent * costPerEmptyPlace),
    costPerMonth,
    targetEmptyPerEvent: places(targetEmptyPerEvent),
    targetEmptyPerMonth: places(targetEmptyPerEvent * events),
    targetCostPerEvent: Math.round(targetEmptyPerEvent * costPerEmptyPlace),
    targetCostPerMonth,
    fewerEmptyPerMonth: places((emptyPerEvent - targetEmptyPerEvent) * events),
    savedPerMonth: costPerMonth - targetCostPerMonth,
  };
}

const counts = new Intl.NumberFormat(activeMarket.locale, {maximumFractionDigits: 1});

/** A count of places in the market's digits, with at most one decimal: "8", "4.5", "1,00,000". */
export function formatNoShowCount(count: number): string {
  return counts.format(Number.isFinite(count) ? count : 0);
}

/** An amount in whole rupees, as every pricing figure on the site is formatted: "₹4,000", "₹1,20,000". */
export function formatNoShowMoney(amount: number): string {
  return formatPricingMoney(Number.isFinite(amount) ? Math.round(amount) : 0);
}

/** A whole percentage: "20%". */
export function formatNoShowRate(rate: number): string {
  return `${clampRate(rate)}%`;
}
