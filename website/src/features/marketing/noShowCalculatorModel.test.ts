import {describe, expect, it} from "vitest";
import {
  clampRate,
  formatNoShowCount,
  formatNoShowMoney,
  formatNoShowRate,
  noShowFigures,
  noShowInputLimits,
  parseWholeNumber,
  type NoShowInputs,
} from "./noShowCalculatorModel";

const inputs = (patch: Partial<NoShowInputs> = {}): NoShowInputs => ({places: "40", events: "4", price: "500", costPerHead: "", rate: 20, target: 10, ...patch});

describe("noShowFigures", () => {
  it("works out empty places and uncollected tickets per event and per month from the host's numbers", () => {
    const figures = noShowFigures(inputs());
    expect(figures).toMatchObject({
      heldPerMonth: 160,
      emptyPerEvent: 8,
      emptyPerMonth: 32,
      costPerEvent: 4_000,
      costPerMonth: 16_000,
      targetEmptyPerEvent: 4,
      targetEmptyPerMonth: 16,
      targetCostPerEvent: 2_000,
      targetCostPerMonth: 8_000,
      fewerEmptyPerMonth: 16,
      savedPerMonth: 8_000,
      free: false,
      costPerEmptyPlace: 500,
    });
  });

  it("keeps fractions of a person as an average to one decimal, and rounds money to whole rupees", () => {
    const figures = noShowFigures(inputs({places: "30", events: "3", price: "333", rate: 15, target: 5}));
    expect(figures.emptyPerEvent).toBe(4.5);
    expect(figures.emptyPerMonth).toBe(13.5);
    expect(figures.costPerEvent).toBe(1_499);
    expect(figures.costPerMonth).toBe(4_496);
    expect(figures.targetCostPerMonth).toBe(1_499);
    expect(figures.savedPerMonth).toBe(figures.costPerMonth - figures.targetCostPerMonth);
  });

  it("costs a free event by what each held place costs the host, not by tickets", () => {
    const figures = noShowFigures(inputs({price: "0", costPerHead: "250"}));
    expect(figures.free).toBe(true);
    expect(figures.costPerEmptyPlace).toBe(250);
    expect(figures.costPerMonth).toBe(32 * 250);
    expect(noShowFigures(inputs({price: "0"})).costPerMonth).toBe(0);
    // The cost per head is only read on a free event.
    expect(noShowFigures(inputs({costPerHead: "9999"})).costPerEmptyPlace).toBe(500);
  });

  it("never puts the what-if above today's rate", () => {
    const figures = noShowFigures(inputs({rate: 10, target: 40}));
    expect(figures.target).toBe(10);
    expect(figures.savedPerMonth).toBe(0);
    expect(figures.fewerEmptyPerMonth).toBe(0);
  });

  it("reads empty and zero fields as nothing, without dividing by zero or showing NaN", () => {
    for (const empty of [inputs({places: "", events: "", price: ""}), inputs({places: "0", events: "0"}), inputs({rate: 0, target: 0})]) {
      const figures = noShowFigures(empty);
      for (const value of Object.values(figures)) if (typeof value === "number") expect(Number.isFinite(value)).toBe(true);
      expect(figures.costPerMonth).toBe(0);
      expect(figures.emptyPerMonth).toBe(0);
    }
  });

  it("clamps huge values to each field's limit and keeps the sums exact", () => {
    const figures = noShowFigures(inputs({places: "999999999", events: "5000", price: "1e9", rate: 250, target: 100}));
    expect(figures.places).toBe(noShowInputLimits.places);
    expect(figures.events).toBe(noShowInputLimits.events);
    expect(figures.price).toBe(0); // "1e9" is not a typed whole number
    const biggest = noShowFigures(inputs({places: "100000", events: "100", price: "1000000", rate: 100, target: 0}));
    expect(biggest.costPerMonth).toBe(10_000_000_000_000);
    expect(Number.isSafeInteger(biggest.costPerMonth)).toBe(true);
    expect(biggest.savedPerMonth).toBe(biggest.costPerMonth);
  });
});

describe("parsing the host's typing", () => {
  it("takes whole numbers with spaces, commas or a rupee sign, and drops decimals", () => {
    expect(parseWholeNumber("1,200", 10_000)).toBe(1_200);
    expect(parseWholeNumber(" ₹ 499 ", 10_000)).toBe(499);
    expect(parseWholeNumber("₹499", 10_000)).toBe(499);
    expect(parseWholeNumber("12.9", 100)).toBe(12);
    expect(parseWholeNumber("12.", 100)).toBe(12);
    expect(parseWholeNumber("500000", 100)).toBe(100);
  });

  it("reads anything else as 0", () => {
    for (const typed of ["", "  ", "-5", "abc", "1e3", "NaN", "Infinity", ".5"]) expect(parseWholeNumber(typed, 100), typed).toBe(0);
  });

  it("keeps rates whole and between 0 and 100", () => {
    expect(clampRate(-3)).toBe(0);
    expect(clampRate(12.6)).toBe(13);
    expect(clampRate(140)).toBe(100);
    expect(clampRate(Number.NaN)).toBe(0);
  });
});

describe("formatting", () => {
  it("formats rupees and counts in Indian digit grouping", () => {
    expect(formatNoShowMoney(16_000)).toBe("₹16,000");
    expect(formatNoShowMoney(120_000)).toBe("₹1,20,000");
    expect(formatNoShowMoney(10_000_000_000_000)).toBe("₹1,00,00,00,00,00,000");
    expect(formatNoShowMoney(0)).toBe("₹0");
    expect(formatNoShowMoney(1_499.6)).toBe("₹1,500");
    expect(formatNoShowMoney(Number.NaN)).toBe("₹0");
    expect(formatNoShowCount(4.5)).toBe("4.5");
    expect(formatNoShowCount(100_000)).toBe("1,00,000");
    expect(formatNoShowCount(Number.POSITIVE_INFINITY)).toBe("0");
    expect(formatNoShowRate(20)).toBe("20%");
    expect(formatNoShowRate(101)).toBe("100%");
  });
});
