import type {Bill, MoneyIssue} from "../api/moneyRepository";
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
export function billState(bill: Bill, nowMillis: number): MoneyLabel {
  if (isOverdue(bill, nowMillis) && bill.dueAtMillis !== null) {
    const days = Math.max(1, Math.floor((nowMillis - bill.dueAtMillis) / dayMs));
    return {text: `Overdue ${days} ${days === 1 ? "day" : "days"}`, tone: "danger"};
  }
  switch (bill.status) {
  case "toSend": return {text: "To send", tone: "warning"};
  case "sent": return {text: bill.sentAtMillis ? `Sent ${shortDate(bill.sentAtMillis)}` : "Sent"};
  case "paid": return {text: bill.paidAtMillis ? `Paid ${shortDate(bill.paidAtMillis)}` : "Paid", tone: "success"};
  case "writtenOff": return {text: "Written off", tone: "secondary"};
  case "free": return {
    text: bill.trialEndsAtMillis ? `Free until ${shortDate(bill.trialEndsAtMillis)}` : "Free month",
    tone: "secondary",
  };
  }
}

/** The line under a bill's organizer: October · 9 events · capped. */
export function billSummary(bill: Bill): string {
  const events = `${bill.sales.eventCount} ${bill.sales.eventCount === 1 ? "event" : "events"}`;
  return [monthLabel(bill.month), events, bill.commission.capped ? "capped" : null]
    .filter(Boolean).join(" · ");
}

/** A rate in basis points as a percentage: 400 → 4%, 450 → 4.5%. */
export function percent(basisPoints: number): string {
  return `${(basisPoints / 100).toLocaleString("en-IN", {maximumFractionDigits: 2})}%`;
}

/** The bill's period: 1–31 October. */
export function billPeriod(bill: Bill): string {
  const lastDay = new Date(bill.periodEndMillis - 1);
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
  generated: "Bill made from the month's bookings",
  regenerated: "Bill made again",
  sent: "Sent with a payment link",
  reminded: "Reminder sent",
  paid: "Marked paid",
  writtenOff: "Written off",
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
    title: entry.action === "generated" ? `Bill made from ${monthLabel(bill.month)}'s bookings` :
      entry.action === "paid" && bill.paidVia === "paymentLink" && !entry.byUid ? "Paid by payment link" :
        historyTitles[entry.action],
    subtitle: entry.note ?? (entry.byUid ? undefined : "Automatic"),
    meta: dayDate(entry.atMillis),
    state: "done",
  }));
  const state = billState(bill, nowMillis);
  if (bill.status === "toSend") {
    steps.push({title: "Waiting to be sent", subtitle: "Sending takes the next invoice number", meta: "Now", state: "current", tone: "warning"});
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
