import {describe, expect, it} from "vitest";
import {hostFeeCapReachedAt, hostFeeQuote, hostPricing} from "@content/pricing";
import {
  currentToolFee,
  formatLastEventMoney,
  formatShowUpRate,
  lastEventInputLimits,
  lastEventReport,
  parseLastEventNumber,
  type LastEventInputs,
} from "./lastEventReportModel";

const event = (patch: Partial<LastEventInputs> = {}): LastEventInputs => ({sold: "52", price: "400", came: "46", feePercent: "", feePerTicket: "", ...patch});

describe("parseLastEventNumber", () => {
  it("reads whole numbers, ignoring spaces, commas and a leading ₹", () => {
    expect(parseLastEventNumber("1,20,000", 1_000_000)).toEqual({kind: "value", value: 120_000});
    expect(parseLastEventNumber(" ₹400 ", 1_000)).toEqual({kind: "value", value: 400});
    expect(parseLastEventNumber("400.00", 1_000)).toEqual({kind: "value", value: 400});
    expect(parseLastEventNumber("", 1_000)).toEqual({kind: "empty"});
  });

  it("refuses negatives, letters, fractions where whole numbers are asked, and more than the maximum", () => {
    expect(parseLastEventNumber("-5", 1_000)).toEqual({kind: "problem", problem: "notNumber"});
    expect(parseLastEventNumber("forty", 1_000)).toEqual({kind: "problem", problem: "notNumber"});
    expect(parseLastEventNumber("4.5", 1_000)).toEqual({kind: "problem", problem: "notWhole"});
    expect(parseLastEventNumber("1001", 1_000)).toEqual({kind: "problem", problem: "tooLarge"});
  });

  it("takes up to two decimals where they are allowed", () => {
    expect(parseLastEventNumber("2.5", 100, 2)).toEqual({kind: "value", value: 2.5});
    expect(parseLastEventNumber("3.99", 100, 2)).toEqual({kind: "value", value: 3.99});
    expect(parseLastEventNumber("3.999", 100, 2)).toEqual({kind: "problem", problem: "notNumber"});
  });
});

describe("currentToolFee", () => {
  it("adds the percentage of sales to the amount on each ticket, rounded to the rupee", () => {
    expect(currentToolFee(20_800, 52, 2.5, 0)).toBe(520);
    expect(currentToolFee(20_800, 52, 0, 10)).toBe(520);
    expect(currentToolFee(20_800, 52, 2.5, 10)).toBe(1_040);
    expect(currentToolFee(999, 3, 3.33, 0)).toBe(33);
    expect(currentToolFee(0, 0, 10, 10)).toBe(0);
  });
});

describe("lastEventReport", () => {
  it("works out the sales, the show-up rate and both fees from the host's numbers", () => {
    const {problems, figures} = lastEventReport(event({feePercent: "8"}));
    expect(problems).toEqual({});
    expect(figures).toMatchObject({sold: 52, price: 400, came: 46, sales: 20_800, free: false, currentFee: 1_664});
    expect(figures?.showUpRate).toBeCloseTo((46 / 52) * 100);
    expect(figures?.catchQuote).toEqual(hostFeeQuote(20_800));
    expect(figures?.catchQuote.fee).toBe(Math.floor((20_800 * hostPricing.rateBasisPoints) / 10_000));
    expect(figures?.difference).toBe(1_664 - figures!.catchQuote.fee);
  });

  it("shows nothing until the three event numbers are entered, and no current fee until its fee is", () => {
    expect(lastEventReport(event({came: ""}))).toEqual({problems: {}, figures: null});
    const {figures} = lastEventReport(event());
    expect(figures?.currentFee).toBeNull();
    expect(figures?.difference).toBeNull();
  });

  it("refuses more who came than tickets sold", () => {
    expect(lastEventReport(event({came: "53"}))).toEqual({problems: {came: "cameMoreThanSold"}, figures: null});
    expect(lastEventReport(event({came: "52"})).figures?.showUpRate).toBe(100);
  });

  it("refuses a negative or oversized number in any field", () => {
    expect(lastEventReport(event({price: "-400"})).problems).toEqual({price: "notNumber"});
    expect(lastEventReport(event({sold: String(lastEventInputLimits.sold + 1)})).problems.sold).toBe("tooLarge");
    expect(lastEventReport(event({feePercent: "101"}))).toEqual({problems: {feePercent: "tooLarge"}, figures: null});
    expect(lastEventReport(event({feePerTicket: String(lastEventInputLimits.feePerTicket + 1)})).problems).toEqual({feePerTicket: "tooLarge"});
  });

  it("handles an event with no tickets sold: no sales, no fee, no show-up rate", () => {
    const {figures} = lastEventReport(event({sold: "0", came: "0", feePercent: "5", feePerTicket: "20"}));
    expect(figures).toMatchObject({sales: 0, showUpRate: null, currentFee: 0, difference: 0});
    expect(figures?.catchQuote.fee).toBe(0);
  });

  it("charges nothing on a free event, while a per-ticket fee the host entered still counts", () => {
    const {figures} = lastEventReport(event({price: "0", feePerTicket: "15"}));
    expect(figures).toMatchObject({free: true, sales: 0, currentFee: 780, difference: 780});
    expect(figures?.catchQuote).toEqual({sales: 0, fee: 0, effectiveRate: hostPricing.rateBasisPoints / 100, capped: false});
  });

  it("stops the fee at the cap once an event's sales reach it", () => {
    const sold = 500;
    const price = hostFeeCapReachedAt / 100;
    const {figures} = lastEventReport(event({sold: String(sold), price: String(price), came: "480", feePercent: "6"}));
    expect(figures?.catchQuote).toMatchObject({fee: hostPricing.cap, capped: true});
    expect(figures?.currentFee).toBe((sold * price * 6) / 100);
    expect(figures?.difference).toBe((sold * price * 6) / 100 - hostPricing.cap);
    expect(lastEventReport(event({sold: "1", price: String(hostFeeCapReachedAt - 1), came: "1"})).figures?.catchQuote.capped).toBe(false);
  });

  it("gives a negative difference when the host's current fee is lower than this one", () => {
    expect(lastEventReport(event({feePercent: "1"})).figures?.difference).toBe(208 - hostFeeQuote(20_800).fee);
  });
});

describe("formatting", () => {
  it("formats rupees as the pricing pages do, and rounds the show-up rate down", () => {
    expect(formatLastEventMoney(120_000)).toBe("₹1,20,000");
    expect(formatShowUpRate((46 / 52) * 100)).toBe("88%");
    expect(formatShowUpRate((51 / 52) * 100)).toBe("98%");
    expect(formatShowUpRate(100)).toBe("100%");
  });
});
