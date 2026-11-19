import {describe, expect, it} from "vitest";
import {hostLandingCopy} from "./hostLanding";
import {
  formatPricingMoney,
  formatPricingRate,
  hostEffectiveRate,
  hostFee,
  hostFeeCalculatorCopy,
  hostFeeCapReachedAt,
  hostFeeCycleExample,
  hostFeeExample,
  hostFeeQuote,
  hostFeeSalesRange,
  hostLandingFeeExamples,
  hostPricing,
  hostPricingFacts,
  hostPricingLines,
  pricingPageCycleExamples,
  pricingPageFeeExamples,
} from "./pricing";

/** Every string in a value, however deep. */
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value !== null && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

describe("the host fee model", () => {
  it("holds the owner's facts: 5%, capped at ₹10,000 per 30-day billing cycle, 30 days free or 90 for founding hosts", () => {
    expect(hostPricing).toEqual({rateBasisPoints: 500, cap: 10_000, cycleDays: 30, trialDays: 30, foundingTrialDays: 90, referralTrialDays: 60});
    expect(hostPricingFacts).toMatchObject({rate: "5%", cap: "₹10,000", capReachedAt: "₹2,00,000", zero: "₹0"});
  });

  it("charges 5% of a billing cycle's sales, rounded down, and stops at the cap", () => {
    expect([0, 6_000, 100_000, 199_999, 200_000, 500_000].map(hostFee)).toEqual([0, 300, 5_000, 9_999, 10_000, 10_000]);
    expect(hostFeeCapReachedAt).toBe(200_000);
  });

  it("treats nothing, negative or broken sales as no sales", () => {
    expect([-1, Number.NaN, Number.POSITIVE_INFINITY].map(hostFee)).toEqual([0, 0, 0]);
    expect(hostFeeQuote(-5)).toEqual({sales: 0, fee: 0, effectiveRate: 5, capped: false});
  });

  it("works out the effective rate, which falls once the cap is reached", () => {
    expect([0, 100_000, 300_000, 400_000, 500_000].map(hostEffectiveRate).map(formatPricingRate)).toEqual(["5%", "5%", "3.3%", "2.5%", "2%"]);
    expect([hostFeeQuote(199_999).capped, hostFeeQuote(200_000).capped]).toEqual([false, true]);
  });

  it("formats money in the market's currency, in whole rupees", () => {
    expect([formatPricingMoney(2_160), formatPricingMoney(200_000)]).toEqual(["₹2,160", "₹2,00,000"]);
  });

  it("starts the calculator inside its range, on a step", () => {
    const {min, max, step, initial} = hostFeeSalesRange;
    expect(initial >= min && initial <= max && initial % step === 0 && max % step === 0).toBe(true);
    expect(hostFeeCalculatorCopy.max).toBe("₹5,00,000");
  });

  it("works every example out from its places and ticket price", () => {
    expect(hostLandingFeeExamples.map(hostFeeExample)).toEqual([
      {title: "A 40-person weekly run at ₹250", value: "₹500 a run", body: "Free runs cost nothing."},
      {title: "A 24-seat supper club at ₹1,800", value: "₹2,160 a dinner", body: "Paid when guests book, not at the door."},
      {title: "A free book club", value: "₹0", body: "Free events stay free."},
    ]);
    expect(pricingPageFeeExamples.map(hostFeeExample).map((example) => example.value))
      .toEqual(["₹0", "₹300 a session", "₹2,160 a dinner", "₹1,497 a night", "₹640 a session", "₹1,500 a class"]);
    expect(pricingPageCycleExamples.map(hostFeeCycleExample)).toEqual([
      {title: "₹1,00,000 in a month", value: "₹5,000", body: "5% of sales."},
      {title: "₹5,00,000 in a month", value: "₹10,000", body: "An effective rate of 2%."},
    ]);
  });
});

describe("pricing copy", () => {
  const pricingCopy = [hostFeeCalculatorCopy, hostPricingLines, hostLandingCopy];

  it("says a month, never per billing cycle (owner, 18 Nov 2026)", () => {
    for (const text of strings(pricingCopy)) {
      expect(text, text).not.toMatch(/billing cycle|\bcycle\b/iu);
    }
    expect(hostPricingLines.rateTitle).toBe("of ticket sales. Never more than ₹10,000 a month.");
    expect(hostPricingLines.terms).toContain("never more than ₹10,000 a month");
    expect(hostFeeCalculatorCopy.sales).toBe("Your ticket sales in a month");
  });

  it("states the price only from the fee model", () => {
    const host = hostLandingCopy;
    expect(host.pricing.rate).toBe(hostPricingFacts.rate);
    expect(host.pricing.title).toContain(hostPricingFacts.cap);
    expect(host.hero.terms).toContain(`${hostPricingFacts.trialDays} days`);
    expect(host.pricing.examples).toEqual(hostLandingFeeExamples.map(hostFeeExample));
    expect(hostPricingLines.organisations).toBe("Venues and companies pay the same 5%, with the same ₹10,000 monthly cap.");
  });

  it("promises no day-before reminder: the default is a push 15 minutes before, and WhatsApp needs the host's own sender", () => {
    const text = strings(pricingCopy).join("\n");
    expect(text).not.toMatch(/day before/iu);
    expect(text).toContain("15 minutes before the start");
    expect(text).toContain("connect your own WhatsApp sender");
  });

  it("names no place count for founding hosts", () => {
    expect(strings(pricingCopy).join("\n")).not.toMatch(/of 50|\[N\]|places left/iu);
  });
});
