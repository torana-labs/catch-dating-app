import {describe, expect, it} from "vitest";
import {sampleManageOrganizerBills} from "../api/moneySamples";
import {
  billDue,
  billJourney,
  billPeriod,
  billReviewLabel,
  billSending,
  billState,
  billSummary,
  monthLabel,
  refundCreditNote,
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

  it("names a rolling cycle bill by its days and number", () => {
    const cycle = {...bill(bills[0]!.organizerId), periodKind: "cycle" as const, cycleNumber: 3,
      periodStartMillis: Date.parse("2026-11-09T12:00:00+05:30"),
      periodEndMillis: Date.parse("2026-12-09T12:00:00+05:30"),
      plan: {kind: "toolsOnly" as const, toolsOnlyFeeMinor: 500000}};
    expect(billPeriod(cycle)).toBe("9 Nov–9 Dec");
    expect(billSummary(cycle)).toMatch(/^Cycle 3 · \d+ events? · tools only/u);
  });

  it("says how an unsent cycle bill goes out: staff review, automatically, or held", () => {
    const cycle = {...bill("sample-padel"), periodKind: "cycle" as const, cycleNumber: 1};
    expect(billSending(cycle, false)).toMatchObject({automatic: false, held: false,
      label: {text: "Waits for staff: one of the host's first two billing cycles", tone: "warning"}});
    // A bill made before automatic sending has no send time: staff send it.
    expect(billSending({...cycle, autoSendAtMillis: undefined}, false).automatic).toBe(false);
    const automatic = {...cycle, cycleNumber: 3, autoSendAtMillis: Date.parse("2026-11-19T06:15:00+05:30")};
    expect(billSending(automatic, false)).toMatchObject({automatic: true, held: false,
      label: {text: "Sends automatically 19 Nov"}});
    expect(billState(automatic, now)).toEqual({text: "Sends 19 Nov", tone: "secondary"});
    expect(billSending(automatic, true).label.text).toBe("On hold: the organizer's bills are held");
    expect(billState(automatic, now, true)).toEqual({text: "To send · held", tone: "warning"});
    const held = {...automatic, sendHold: {atMillis: now, byUid: "operator", note: "Disputed refund"}};
    expect(billSending(held, false)).toMatchObject({held: true, label: {text: "On hold: Disputed refund"}});
    expect(billJourney(held, now).at(-1)?.title).toBe("Waiting to be issued");
    expect(billJourney(automatic, now).at(-1)?.title).toBe("Sends automatically 19 Nov");
  });

  it("says how an organizer's bills go out", () => {
    expect(billReviewLabel(null)).toBeNull();
    expect(billReviewLabel({reviewedCycles: 0, reviewRequiredCycles: 2, hold: null, canHold: false})?.text)
      .toBe("Staff review: 0 of the first 2 cycles sent");
    expect(billReviewLabel({reviewedCycles: 4, reviewRequiredCycles: 2, hold: null, canHold: true})?.text)
      .toBe("Sent automatically a day after each cycle is billed");
    expect(billReviewLabel({reviewedCycles: 4, reviewRequiredCycles: 2,
      hold: {atMillis: 1, byUid: null, note: null}, canHold: true})).toEqual({
      text: "On hold · staff send every bill", tone: "warning"});
  });

  it("states a refund credit from earlier bills, and a bill it covered", () => {
    const base = bill("sample-padel");
    expect(refundCreditNote(base)).toBeNull();
    const credited = {...base, periodKind: "cycle" as const, cycleNumber: 2, refundCredit: {
      availableMinor: 50_000, appliedMinor: 5_000, carriedForwardMinor: 45_000, lines: [{
        billId: "sample-padel_c2026-11-09", cycleNumber: 1, invoiceNumber: "2026-27/031",
        refundedMinor: 1_000_000, creditMinor: 50_000, appliedMinor: 5_000}]}};
    expect(refundCreditNote(credited)).toEqual({title: "Refund credit",
      subtitle: "₹500 owed from 2026-27/031 (₹10,000 refunded after it was sent); ₹450 carries to the next bill"});
    expect(billSummary(credited)).toMatch(/· refund credit$/u);
    expect(billState({...credited, status: "free"}, now)).toEqual({text: "Covered by refund credit", tone: "secondary"});
  });
});
