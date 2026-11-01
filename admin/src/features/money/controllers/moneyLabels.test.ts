import {describe, expect, it} from "vitest";
import {sampleManageOrganizerBills} from "../api/moneySamples";
import {
  billDue,
  billJourney,
  billPeriod,
  billState,
  billSummary,
  monthLabel,
  percent,
  rupees,
  waitingFor,
} from "./moneyLabels";

const now = Date.parse("2026-11-18T12:00:00+05:30");
const bills = sampleManageOrganizerBills({action: "list", month: "2026-10", organizerId: null,
  billId: null, expectedRevision: null, note: null}, now).bills;
const bill = (organizerId: string) => bills.find((entry) => entry.organizerId === organizerId)!;

describe("Money labels", () => {
  it("writes rupees in Indian grouping, with paise only when there are some", () => {
    expect(rupees(16_000_000)).toBe("₹1,60,000");
    expect(rupees(150_050)).toBe("₹1,500.50");
    expect(rupees(-38_500)).toBe("−₹385");
  });

  it("names months, rates and waits", () => {
    expect(monthLabel("2026-10")).toBe("October");
    expect(percent(400)).toBe("4%");
    expect(percent(450)).toBe("4.5%");
    expect(waitingFor(now - 5 * 3_600_000, now)).toBe("5 hours");
    expect(waitingFor(now - 50 * 3_600_000, now)).toBe("2 days");
  });

  it("says where each bill is, as drawn", () => {
    expect(billState(bill("sample-lantern"), now)).toEqual({text: "Overdue 2 days", tone: "danger"});
    expect(billState(bill("sample-padel"), now)).toEqual({text: "To send", tone: "warning"});
    expect(billState(bill("sample-afterfly"), now)).toEqual({text: "Paid 3 Nov", tone: "success"});
    expect(billState(bill("sample-seaside"), now)).toEqual({text: "Free until 12 Nov", tone: "secondary"});
    expect(billSummary(bill("sample-afterfly"))).toBe("October · 4 events · capped");
    expect(billPeriod(bill("sample-lantern"))).toBe("1–31 October");
    expect(billDue(bill("sample-lantern"), now)).toEqual({text: "15 Nov · 2 days late", tone: "danger"});
  });

  it("ends an unpaid bill's journey with where it is now", () => {
    const steps = billJourney(bill("sample-lantern"), now);
    expect(steps.map((step) => step.title)).toEqual([
      "Bill made from October's bookings", "Issued with a payment link", "Overdue 2 days"]);
    expect(steps.at(-1)).toMatchObject({state: "current", tone: "danger"});
    expect(billJourney(bill("sample-afterfly"), now).every((step) => step.state === "done")).toBe(true);
  });
});
