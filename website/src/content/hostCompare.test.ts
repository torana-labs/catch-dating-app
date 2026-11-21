import {describe, expect, it} from "vitest";
import {hostCompareCopy as copy} from "./hostCompare";
import {hostPricingFacts} from "./pricing";

describe("host comparison content", () => {
  it("compares only the tools the owner allows, with the fee a month, one cell per tool in every row", () => {
    const allowed = /^(WhatsApp, Forms and UPI|Luma|District|Meetup)$/u;
    for (const column of copy.columns.slice(1)) expect(column).toMatch(allowed);
    for (const row of copy.rows) expect(row.cells, row.label).toHaveLength(copy.columns.length);
    expect(copy.rows.find((row) => row.label === "Fee on paid tickets")?.cells[0].text)
      .toBe(`${hostPricingFacts.rate}, never more than ${hostPricingFacts.cap} a month`);
  });
});
