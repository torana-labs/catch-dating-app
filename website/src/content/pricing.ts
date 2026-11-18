// The host fee, once for every page that states it: /host/'s pricing band,
// /pricing/ and the fee calculator both use. The facts are the owner's
// (16 Nov 2026): 5% of ticket sales, net of refunds, never more than
// ₹10,000 per 30-day billing cycle; 30 days free from the first event, 90
// for founding hosts; venues and companies pay the same. Every figure a page
// shows is worked out here from these facts, never typed as a string, so a
// change to the rate or the cap reaches every page at once. Marketing pages
// say "a month", never "per billing cycle" (owner, 18 Nov 2026); the host
// billing page states the 30-day cycle itself.
import {brand} from "./brand.ts";
import {interpolateContent as fill} from "./interpolate.ts";
// The active market pack, by its file: Node smoke scripts import the host copy, and this module, directly.
import {inMarket as activeMarket} from "./markets/in.ts";

export const hostPricing = {
  /** The fee on ticket sales, in basis points: 500 is 5%. */
  rateBasisPoints: 500,
  /** The most the fee comes to in one billing cycle, in rupees. */
  cap: 10_000,
  /** The length of a billing cycle; the cap applies to each one. */
  cycleDays: 30,
  /** Free days from the host's first event. */
  trialDays: 30,
  /** Free days for a founding host. */
  foundingTrialDays: 90,
} as const;

/** The fee calculator's slider, in rupees of ticket sales in one billing cycle. */
export const hostFeeSalesRange = {min: 0, max: 500_000, step: 10_000, initial: 120_000} as const;

const money = new Intl.NumberFormat(activeMarket.locale, {style: "currency", currency: activeMarket.currencyCode, maximumFractionDigits: 0});

/** An amount in the market's currency, in whole units: "₹10,000", "₹2,00,000". */
export function formatPricingMoney(amount: number): string {
  return money.format(amount);
}

/** A share as a percentage with at most one decimal: "5%", "3.3%", "2%". */
export function formatPricingRate(percent: number): string {
  return `${percent.toFixed(1).replace(/\.0$/u, "")}%`;
}

function wholeSales(sales: number): number {
  return Number.isFinite(sales) && sales > 0 ? Math.floor(sales) : 0;
}

/**
 * The fee on one billing cycle's ticket sales after the free trial, in whole
 * rupees: 5%, rounded down, never more than the cap. Nothing, negative or
 * not a number is no sales.
 */
export function hostFee(sales: number): number {
  return Math.min(Math.floor((wholeSales(sales) * hostPricing.rateBasisPoints) / 10_000), hostPricing.cap);
}

/** The ticket sales in one billing cycle at which the fee reaches the cap: ₹2,00,000. */
export const hostFeeCapReachedAt = (hostPricing.cap * 10_000) / hostPricing.rateBasisPoints;

/** The fee as a share of sales, as a percentage; the plain rate when nothing is sold. */
export function hostEffectiveRate(sales: number): number {
  const amount = wholeSales(sales);
  return amount > 0 ? (hostFee(amount) / amount) * 100 : hostPricing.rateBasisPoints / 100;
}

/** One billing cycle's sales, worked through: what the calculator and the examples show. */
export interface HostFeeQuote {
  sales: number;
  fee: number;
  /** The fee as a share of sales, as a percentage. */
  effectiveRate: number;
  /** True once the fee has reached the cap. */
  capped: boolean;
}

export function hostFeeQuote(sales: number): HostFeeQuote {
  const amount = wholeSales(sales);
  return {sales: amount, fee: hostFee(amount), effectiveRate: hostEffectiveRate(amount), capped: amount >= hostFeeCapReachedAt};
}

/** The resolved facts every pricing sentence is filled from. */
export const hostPricingFacts = {
  rate: formatPricingRate(hostPricing.rateBasisPoints / 100),
  cap: formatPricingMoney(hostPricing.cap),
  capReachedAt: formatPricingMoney(hostFeeCapReachedAt),
  cycleDays: hostPricing.cycleDays,
  trialDays: hostPricing.trialDays,
  foundingTrialDays: hostPricing.foundingTrialDays,
  zero: formatPricingMoney(0),
} as const;

const facts = hostPricingFacts;

/**
 * A worked example: an event, its places and ticket price, and what the fee
 * on it comes to after the trial. The fee and the sales are worked out from
 * these numbers; the words around them are templates.
 */
export interface HostFeeExampleInput {
  /** The event, with {seats} and {price} where its numbers go. */
  title: string;
  /** The fee, with {fee} where it goes. */
  value: string;
  /** How it is reached, with {sales}, {rate} or {effectiveRate} where they go. */
  body: string;
  seats: number;
  price: number;
}

/** A worked example with its numbers filled in. */
export interface HostFeeExample {
  title: string;
  value: string;
  body: string;
}

/** Each template token a worked example may use, from its inputs and the fee. */
function exampleValues(seats: number, price: number) {
  const sales = seats * price;
  const quote = hostFeeQuote(sales);
  return {
    seats: seats.toLocaleString(activeMarket.locale),
    price: formatPricingMoney(price),
    sales: formatPricingMoney(sales),
    fee: formatPricingMoney(quote.fee),
    rate: facts.rate,
    effectiveRate: formatPricingRate(quote.effectiveRate),
  };
}

function fillUsed(template: string, values: Readonly<Record<string, string>>): string {
  const used = new Set([...template.matchAll(/\{([A-Za-z0-9_]+)\}/gu)].map((match) => match[1]));
  return fill(template, Object.fromEntries(Object.entries(values).filter(([key]) => used.has(key))));
}

/** A worked example with its fee worked out. */
export function hostFeeExample(input: HostFeeExampleInput): HostFeeExample {
  const values = exampleValues(input.seats, input.price);
  return {title: fillUsed(input.title, values), value: fillUsed(input.value, values), body: fillUsed(input.body, values)};
}

/** A billing cycle's sales and the fee on them: the cap's two examples. */
export interface HostFeeCycleExampleInput {
  sales: number;
  title: string;
  value: string;
  body: string;
}

export function hostFeeCycleExample(input: HostFeeCycleExampleInput): HostFeeExample {
  return hostFeeExample({...input, seats: 1, price: input.sales});
}

/** The words the fee calculator shows, filled from the facts. */
export const hostFeeCalculatorCopy = {
  sales: "Your ticket sales in a month",
  min: formatPricingMoney(hostFeeSalesRange.min),
  max: formatPricingMoney(hostFeeSalesRange.max),
  fee: `${brand.name} fee`,
  feeNote: "after your trial",
  effective: "Your effective rate",
  effectiveNote: "of that month’s ticket sales",
  capped: fill("Capped. You pay {cap} however much more you sell that month.", {cap: facts.cap}),
  trial: fill("In your first {trialDays} days from your first event: {zero}, whatever you sell.", {trialDays: facts.trialDays, zero: facts.zero}),
  gateway: "Payment gateway fees are separate. Your payment provider charges them at its own rate.",
} as const;

/** The cap chart's two stretches: where the fee is charged, and the rest of the cycle. */
export const hostFeeCapChartCopy = {
  charged: fill("{rate} on the first {capReachedAt}", {rate: facts.rate, capReachedAt: facts.capReachedAt}),
  free: `No ${brand.name} fee on the rest of the month`,
} as const;

/** The price in one line, as each page states it. */
export const hostPricingLines = {
  /** The rate's headline: what the 5% is of, and its cap. */
  rateTitle: fill("of ticket sales. Never more than {cap} a month.", {cap: facts.cap}),
  /** The same, for a band that adds that free events stay free. */
  rateTitleFree: fill("of ticket sales. Never more than {cap} a month. Free events stay free.", {cap: facts.cap}),
  /** How the fee works, in a sentence or two. */
  body: fill(
    "Free for {trialDays} days from your first event. After that, {brand} keeps {rate} of what you sell, net of refunds, and stops at {cap} a month.",
    {trialDays: facts.trialDays, brand: brand.name, rate: facts.rate, cap: facts.cap},
  ),
  /** The terms in one line, under a hero's actions. */
  terms: fill(
    "Free for {trialDays} days from your first event · then {rate} of ticket sales, never more than {cap} a month · iPhone, Android and iPad",
    {trialDays: facts.trialDays, rate: facts.rate, cap: facts.cap},
  ),
  /** Venues and companies pay the same. */
  organisations: fill("Venues and companies pay the same {rate}, with the same {cap} monthly cap.", {rate: facts.rate, cap: facts.cap}),
} as const;

/** The /host/ pricing band's three worked examples. */
export const hostLandingFeeExamples: readonly HostFeeExampleInput[] = [
  {title: "A {seats}-person weekly run at {price}", value: "{fee} a run", body: "Free runs cost nothing.", seats: 40, price: 250},
  {title: "A {seats}-seat supper club at {price}", value: "{fee} a dinner", body: "Paid when guests book, not at the door.", seats: 24, price: 1_800},
  {title: "A free book club", value: "{fee}", body: "Free events stay free.", seats: 20, price: 0},
];

/** /pricing/'s worked examples for each kind of night: the "What hosts like you pay" tiles. */
export const pricingPageFeeExamples: readonly HostFeeExampleInput[] = [
  {title: "Free Sunday social run, {seats} runners", value: "{fee}", body: "Every week, as long as it’s free.", seats: 40, price: 0},
  {title: "Coached run, {seats} runners at {price}", value: "{fee} a session", body: "{rate} of {sales}.", seats: 20, price: 300},
  {title: "Supper club, {seats} seats at {price}", value: "{fee} a dinner", body: "{rate} of {sales}, paid when guests book.", seats: 24, price: 1_800},
  {title: "Quiz night, {seats} players at {price}", value: "{fee} a night", body: "{rate} of {sales}.", seats: 60, price: 499},
  {title: "Padel social, {seats} players at {price}", value: "{fee} a session", body: "{rate} of {sales}.", seats: 16, price: 800},
  {title: "Pottery workshop, {seats} seats at {price}", value: "{fee} a class", body: "{rate} of {sales}.", seats: 12, price: 2_500},
];

/** /pricing/'s two months either side of the cap: the pricing band's examples. */
export const pricingPageCycleExamples: readonly HostFeeCycleExampleInput[] = [
  {sales: 100_000, title: "{price} in a month", value: "{fee}", body: "{rate} of sales."},
  {sales: 500_000, title: "{price} in a month", value: "{fee}", body: "An effective rate of {effectiveRate}."},
];
