import type {Bill, BillsMonth, MoneyIssue} from "../api/moneyRepository";
import {isOverdue} from "./useBillsController";

export {moneyNowMillis} from "../api/moneyRepository";

/** A cell or fact tone, as the web-ui table and meta row read it. */
export type MoneyTone = "secondary" | "success" | "warning" | "danger";

export interface MoneyLabel {
  text: string;
  tone?: MoneyTone;
}

const dayMs = 24 * 60 * 60 * 1000;
const hourMs = 60 * 60 * 1000;
const india = "Asia/Kolkata";
const dayMonth = new Intl.DateTimeFormat("en-IN", {day: "numeric", month: "short", timeZone: india});
const weekdayDayMonth = new Intl.DateTimeFormat("en-IN", {weekday: "short", day: "numeric", month: "short", timeZone: india});
const monthName = new Intl.DateTimeFormat("en-IN", {month: "long", timeZone: india});

/** Paise as rupees, Indian grouping: ₹1,60,000, or ₹1,500.50 when there are paise. */
export function rupees(minor: number): string {
  const whole = minor % 100 === 0;
  return `${minor < 0 ? "−" : ""}₹${(Math.abs(minor) / 100).toLocaleString("en-IN", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  })}`;
}

/** A bill month ("2026-10") as its name: October. */
export function monthLabel(month: string): string {
  const [year, number] = month.split("-").map(Number);
  return monthName.format(Date.UTC(year, number - 1, 15));
}

/** A date in India time: 15 Nov. */
export function shortDate(millis: number): string {
  return dayMonth.format(millis);
}

/** A date with its weekday in India time: Fri, 1 Nov. */
export function dayDate(millis: number): string {
  return weekdayDayMonth.format(millis);
}

/** How long something has waited, in words: 5 hours, 1 day, 2 days. */
export function waitingFor(sinceMillis: number, nowMillis: number): string {
  const elapsed = Math.max(0, nowMillis - sinceMillis);
  if (elapsed < hourMs) return "under an hour";
  if (elapsed < dayMs) {
    const hours = Math.floor(elapsed / hourMs);
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }
  const days = Math.floor(elapsed / dayMs);
  return `${days} ${days === 1 ? "day" : "days"}`;
}

/** Waiting more than a day is worth a colour. */
export function waitingTone(sinceMillis: number, nowMillis: number): MoneyTone | undefined {
  return nowMillis - sinceMillis >= dayMs ? "warning" : undefined;
}

export const issueKindLabels: Record<MoneyIssue["kind"], string> = {
  payment: "Payment",
  refund: "Refund",
  review: "Review",
  bill: "Bill",
};

export const issueSourceLabels: Record<MoneyIssue["source"], string> = {
  publicEventPayments: "Website checkout",
  organizerEventOfferPayments: "Offer checkout",
  payments: "App booking",
  organizerBills: "Catch bill",
};

/** A payment or bill status in words. */
export function statusLabel(status: string): string {
  const words = status.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Where a bill is, with a colour when it needs attention: Overdue 3 days, Paid 3 Nov. */
export function billState(bill: Bill, nowMillis: number, organizerHeld = false): MoneyLabel {
  if (isOverdue(bill, nowMillis) && bill.dueAtMillis !== null) {
    const days = Math.max(1, Math.floor((nowMillis - bill.dueAtMillis) / dayMs));
    return {text: `Overdue ${days} ${days === 1 ? "day" : "days"}`, tone: "danger"};
  }
  switch (bill.status) {
  case "toSend": {
    const sending = billSending(bill, organizerHeld);
    return sending.automatic && !sending.held ?
      {text: `Sends ${shortDate(bill.autoSendAtMillis as number)}`, tone: "secondary"} :
      {text: sending.held ? "To send · held" : "To send", tone: "warning"};
  }
  case "sent": return {text: bill.sentAtMillis ? `Issued ${shortDate(bill.sentAtMillis)}` : "Issued"};
  case "paid": return {text: bill.paidAtMillis ? `Paid ${shortDate(bill.paidAtMillis)}` : "Paid", tone: "success"};
  case "writtenOff": return {text: "Written off", tone: "secondary"};
  case "free": return {
    text: bill.refundCredit?.appliedMinor ? "Covered by refund credit" :
      bill.trialEndsAtMillis ? `Free until ${shortDate(bill.trialEndsAtMillis)}` : "Free month",
    tone: "secondary",
  };
  }
}

export interface BillSending {
  /** The daily run sends it without staff once its time comes. */
  automatic: boolean;
  /** Staff hold it, or its organizer. */
  held: boolean;
  label: MoneyLabel;
}

/**
 * How an unsent bill goes out: staff review for a host's first two cycles,
 * automatically after that, or held (the bill or its organizer).
 */
export function billSending(bill: Bill, organizerHeld: boolean): BillSending {
  const automatic = bill.status === "toSend" && typeof bill.autoSendAtMillis === "number";
  const held = automatic && (Boolean(bill.sendHold) || organizerHeld);
  if (bill.status !== "toSend") return {automatic: false, held: false, label: {text: "Sent or closed", tone: "secondary"}};
  if (!automatic) {
    return {automatic, held, label: {text: isCycleBill(bill) ?
      "Waits for staff: one of the host's first two billing cycles" : "Waits for staff", tone: "warning"}};
  }
  if (bill.sendHold) {
    return {automatic, held, label: {text: `On hold${bill.sendHold.note ? `: ${bill.sendHold.note}` : ""}`, tone: "warning"}};
  }
  if (organizerHeld) return {automatic, held, label: {text: "On hold: the organizer's bills are held", tone: "warning"}};
  return {automatic, held, label: {text: `Sends automatically ${shortDate(bill.autoSendAtMillis as number)}`}};
}

/** An organizer's bill review in one line: how its cycle bills go out. */
export function billReviewLabel(review: BillsMonth["billReview"]): MoneyLabel | null {
  if (!review) return null;
  if (review.hold) {
    return {text: `On hold${review.hold.note ? `: ${review.hold.note}` : ""} · staff send every bill`, tone: "warning"};
  }
  if (review.reviewedCycles < review.reviewRequiredCycles) {
    return {text: `Staff review: ${review.reviewedCycles} of the first ${review.reviewRequiredCycles} cycles sent`};
  }
  return {text: "Sent automatically a day after each cycle is billed"};
}

/** Whether a bill covers one rolling cycle (#1126) rather than a calendar month. */
export function isCycleBill(bill: Bill): boolean {
  return bill.periodKind === "cycle";
}

/** A bill's period in short: October, or cycle 3 for a rolling cycle. */
export function billPeriodName(bill: Bill): string {
  return isCycleBill(bill) ? `Cycle ${bill.cycleNumber ?? ""}`.trim() : monthLabel(bill.month);
}

/** The line under a bill's organizer: October · 9 events · capped, or Cycle 3 · tools only. */
export function billSummary(bill: Bill): string {
  const events = `${bill.sales.eventCount} ${bill.sales.eventCount === 1 ? "event" : "events"}`;
  return [billPeriodName(bill), events, bill.plan?.kind === "toolsOnly" ? "tools only" : null,
    bill.commission.capped ? "capped" : null, bill.refundCredit?.appliedMinor ? "refund credit" : null]
    .filter(Boolean).join(" · ");
}

/**
 * A bill's refund credit for staff: what came off for refunds after earlier bills were sent,
 * from which bills, and what carries to the next bill. Null when there is none.
 */
export function refundCreditNote(bill: Bill): {title: string; subtitle: string} | null {
  const credit = bill.refundCredit;
  if (!credit) return null;
  const sources = credit.lines.map((line) =>
    `${line.invoiceNumber ?? (line.cycleNumber ? `cycle ${line.cycleNumber}` : line.billId)}` +
    ` (${rupees(line.refundedMinor)} refunded after it was sent)`).join(", ");
  const carried = credit.carriedForwardMinor > 0 ? `; ${rupees(credit.carriedForwardMinor)} carries to the next bill` : "";
  return {title: "Refund credit", subtitle: `${rupees(credit.availableMinor)} owed from ${sources}${carried}`};
}

/** A rate in basis points as a percentage: 400 → 4%, 450 → 4.5%. */
export function percent(basisPoints: number): string {
  return `${(basisPoints / 100).toLocaleString("en-IN", {maximumFractionDigits: 2})}%`;
}

/** The bill's period: 1–31 October, or 9 Nov–8 Dec for a rolling cycle. */
export function billPeriod(bill: Bill): string {
  const lastDay = new Date(bill.periodEndMillis - 1);
  if (isCycleBill(bill)) {
    return `${shortDate(bill.periodStartMillis)}–${shortDate(lastDay.getTime())}`;
  }
  const day = new Intl.DateTimeFormat("en-IN", {day: "numeric", timeZone: india}).format(lastDay);
  return `1–${day} ${monthLabel(bill.month)}`;
}

/** When a bill is due, and how late it is. */
export function billDue(bill: Bill, nowMillis: number): MoneyLabel {
  if (bill.dueAtMillis === null) return {text: bill.status === "free" ? "Nothing due" : "Set when sent", tone: "secondary"};
  const due = shortDate(bill.dueAtMillis);
  if (isOverdue(bill, nowMillis)) {
    const days = Math.max(1, Math.floor((nowMillis - bill.dueAtMillis) / dayMs));
    return {text: `${due} · ${days} ${days === 1 ? "day" : "days"} late`, tone: "danger"};
  }
  return {text: due};
}

const historyTitles: Record<Bill["history"][number]["action"], string> = {
  generated: "Bill made from the period's bookings",
  regenerated: "Bill made again",
  sent: "Issued with a payment link",
  reminded: "Reminder recorded",
  paid: "Marked paid",
  writtenOff: "Written off",
  held: "Held from sending automatically",
  holdReleased: "Hold released",
};

export interface MoneyStep {
  title: string;
  subtitle?: string;
  meta?: string;
  state: "done" | "current" | "next";
  tone?: "neutral" | "warning" | "danger";
}

/** How a bill got here: each recorded step, then where it is now when something is still to do. */
export function billJourney(bill: Bill, nowMillis: number): MoneyStep[] {
  const steps: MoneyStep[] = bill.history.map((entry) => ({
    title: entry.action === "generated" ? `Bill made from ${isCycleBill(bill) ?
      `${billPeriod(bill)} bookings` : `${monthLabel(bill.month)}'s bookings`}` :
      entry.action === "paid" && bill.paidVia === "paymentLink" && !entry.byUid ? "Paid by payment link" :
        historyTitles[entry.action],
    subtitle: entry.note ?? (entry.byUid ? undefined : "Automatic"),
    meta: dayDate(entry.atMillis),
    state: "done",
  }));
  const state = billState(bill, nowMillis);
  if (bill.status === "toSend") {
    const sending = billSending(bill, false);
    steps.push({title: sending.automatic && !sending.held ? sending.label.text : "Waiting to be issued",
      subtitle: "Issuing takes the next invoice number", meta: "Now", state: "current", tone: "warning"});
  } else if (bill.status === "sent") {
    steps.push({
      title: state.tone === "danger" ? state.text : "Waiting for payment",
      subtitle: bill.reminders.length > 0 ?
        `${bill.reminders.length} ${bill.reminders.length === 1 ? "reminder" : "reminders"} so far` : undefined,
      meta: "Now",
      state: "current",
      tone: state.tone === "danger" ? "danger" : "neutral",
    });
  }
  return steps;
}

/** An organizer's free trial as one line of status for staff. */
export function trialLabel(trial: BillsMonth["trial"]): string | null {
  if (!trial) return null;
  switch (trial.state) {
  case "notStarted": return "Not started: waits for the first event";
  case "scheduled": return trial.startsAtMillis === null ? "Starts with the first event" :
    `Starts ${shortDate(trial.startsAtMillis)} with the first event`;
  case "active": return `${trial.daysLeft === 1 ? "1 day" : `${trial.daysLeft} days`} left` +
    (trial.endsAtMillis === null ? "" : `, ends ${shortDate(trial.endsAtMillis)}`);
  case "ended": return trial.endsAtMillis === null ? "Ended" : `Ended ${shortDate(trial.endsAtMillis)}`;
  case "none": return "No trial in these terms";
  case "unconfigured": return "Unknown until platform terms are saved";
  default: return null;
  }
}

/** An organizer's Catch plan as one line of status for staff. */
export function billingPlanLabel(plan: BillsMonth["billingPlan"], nowMillis: number): string {
  if (!plan || plan.plan === "ticketing" || plan.status === "ended") return "Ticketing (commission on sales)";
  if (plan.status === "pendingPayment") return "Tools-only bought; waiting for its payment";
  if (plan.endsAtMillis !== null && plan.endsAtMillis <= nowMillis) {
    return `Ticketing again since ${shortDate(plan.endsAtMillis)}`;
  }
  const from = plan.startsAtMillis === null ? "from the first cycle" :
    plan.startsAtMillis > nowMillis ? `from ${shortDate(plan.startsAtMillis)}` : `since ${shortDate(plan.startsAtMillis)}`;
  const until = plan.endsAtMillis === null ? "" : `, until ${shortDate(plan.endsAtMillis)}`;
  const prepaid = plan.prepaidBillId === null ? " · first cycle prepaid" : "";
  return `Tools-only ${from}${until}${prepaid}`;
}
