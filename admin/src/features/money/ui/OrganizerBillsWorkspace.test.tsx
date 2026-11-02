import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {sampleManageOrganizerBills} from "../api/moneySamples";
import {
  organizerMonthBreakdown,
  organizerMoneySummary,
} from "../controllers/useOrganizerBillsController";
import {OrganizerBillsWorkspace} from "./OrganizerBillsWorkspace";

afterEach(cleanup);

const sample = sampleManageOrganizerBills({action: "list", month: "2026-10", organizerId: null,
  billId: null, expectedRevision: null, note: null}).bills[0]!;

function renderMonth(status: typeof sample.status) {
  const bill = {...sample, status, paidMinor: null, totalMinor: 25000};
  render(
    <OrganizerBillsWorkspace
      controller={{
        bills: [bill],
        summary: organizerMoneySummary([bill]),
        latest: organizerMonthBreakdown(bill),
        loadState: "ready",
        loadError: null,
      }}
      nowMillis={0}
      onOpenBill={() => undefined}
    />,
  );
}

/** The smallest part of the page holding the Catch bill row's title and its amount. */
function catchBillRow(): string {
  let row: HTMLElement = screen.getByText("Catch bill");
  while (!row.textContent?.includes("₹") && row.parentElement) row = row.parentElement;
  return row.textContent ?? "";
}

describe("OrganizerBillsWorkspace", () => {
  it("shows a written-off month as nothing billed, and says why", () => {
    renderMonth("writtenOff");
    expect(catchBillRow()).toContain("₹0");
    expect(catchBillRow()).toContain("Written off");
  });

  it("shows a sent month's bill without that label", () => {
    renderMonth("sent");
    expect(catchBillRow()).toContain("−₹250");
    expect(screen.queryByText("Written off")).toBeNull();
  });
});
