import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {sampleManageOrganizerBills} from "../api/moneySamples";
import {
  organizerMonthBreakdown,
  organizerMoneySummary,
} from "../controllers/useOrganizerBillsController";
import {OrganizerBillsWorkspace} from "./OrganizerBillsWorkspace";

afterEach(cleanup);

const sample = sampleManageOrganizerBills({action: "list", month: "2026-10", organizerId: null,
  billId: null, expectedRevision: null, note: null}).bills[0]!;

type Controller = Parameters<typeof OrganizerBillsWorkspace>[0]["controller"];
type Trial = Controller["trial"];

function renderMonth(status: typeof sample.status, trial: Trial = null, extra: Partial<Controller> = {}) {
  const bill = {...sample, status, paidMinor: null, totalMinor: 25000};
  render(
    <OrganizerBillsWorkspace
      controller={{
        bills: [bill],
        summary: organizerMoneySummary([bill]),
        latest: organizerMonthBreakdown(bill),
        trial,
        billingPlan: null,
        billReview: null,
        loadState: "ready",
        loadError: null,
        isActing: false,
        actionError: null,
        setHold: async () => true,
        ...extra,
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
  it("says how the organizer's bills go out while staff review its first cycles", () => {
    renderMonth("sent", null, {billReview: {reviewedCycles: 1, reviewRequiredCycles: 2, hold: null, canHold: true}});
    expect(screen.getByText("Staff review: 1 of the first 2 cycles sent")).toBeTruthy();
  });

  it("holds and releases the organizer's automatic sending", () => {
    const setHold = vi.fn(async () => true);
    renderMonth("sent", null, {setHold,
      billReview: {reviewedCycles: 2, reviewRequiredCycles: 2, hold: null, canHold: true}});
    expect(screen.getByText("Sent automatically a day after each cycle is billed")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: "Hold bills from sending automatically"}));
    expect(setHold).toHaveBeenCalledWith("holdOrganizer", null);
    cleanup();
    renderMonth("sent", null, {setHold, billReview: {reviewedCycles: 2, reviewRequiredCycles: 2,
      hold: {atMillis: 1, byUid: "operator", note: "Chargeback"}, canHold: true}});
    expect(screen.getByText("On hold: Chargeback · staff send every bill")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: "Release the hold on sending"}));
    expect(setHold).toHaveBeenCalledWith("releaseOrganizerHold", null);
  });

  it("offers no hold before the organizer's first cycle is billed", () => {
    renderMonth("sent", null, {billReview: {reviewedCycles: 0, reviewRequiredCycles: 2, hold: null, canHold: false}});
    expect(screen.queryByRole("button", {name: "Hold bills from sending automatically"})).toBeNull();
  });

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

  it("shows the organizer's free trial as status", () => {
    renderMonth("sent", {state: "active", anchor: "firstEvent", days: 30,
      startsAtMillis: Date.UTC(2026, 9, 20), endsAtMillis: Date.UTC(2026, 10, 19),
      daysLeft: 12});
    expect(screen.getByText("Free trial")).toBeTruthy();
    expect(screen.getByText(/12 days left, ends 19 Nov/u)).toBeTruthy();
  });

  it("shows the organizer's plan", () => {
    renderMonth("sent");
    expect(screen.getByText("Plan")).toBeTruthy();
    expect(screen.getByText("Ticketing (commission on sales)")).toBeTruthy();
  });
});
