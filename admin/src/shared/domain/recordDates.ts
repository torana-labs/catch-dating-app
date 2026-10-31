/**
 * Dates as the Admin records show them: "Sat 2 Nov · 6:00 PM" for an event,
 * "31 Oct" for when something was listed, and the same in a journey step.
 * Catch runs in India for now, so records read in India time.
 */
const recordsTimeZone = "Asia/Kolkata";

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: recordsTimeZone, weekday: "short", day: "numeric", month: "short",
});
const shortDateFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: recordsTimeZone, day: "numeric", month: "short",
});
const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: recordsTimeZone, hour: "numeric", minute: "2-digit",
});
const weekdayFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: recordsTimeZone, weekday: "short",
});
const dayOfMonthFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: recordsTimeZone, day: "numeric",
});

function parse(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "Sat 2 Nov · 6:00 PM", or an em dash when the time is unknown. */
export function eventWhenLabel(iso: string | null | undefined): string {
  const date = parse(iso);
  return date ?
    `${dayFormat.format(date).replace(",", "")} · ${timeFormat.format(date)}` :
    "—";
}

/** "6:00 PM". */
export function timeLabel(iso: string | null | undefined): string {
  const date = parse(iso);
  return date ? timeFormat.format(date) : "—";
}

/** "31 Oct". */
export function shortDateLabel(iso: string | null | undefined): string {
  const date = parse(iso);
  return date ? shortDateFormat.format(date) : "—";
}

/** "Mon 28 Oct, 9:41 PM", for a journey step. */
export function stepTimeLabel(iso: string | null | undefined): string {
  const date = parse(iso);
  return date ?
    `${dayFormat.format(date).replace(",", "")}, ${timeFormat.format(date)}` :
    "";
}

/** The weekday and day of month an event's date chip shows. */
export function dateChip(iso: string | null | undefined):
  {day: string; date: number} | null {
  const date = parse(iso);
  return date ? {day: weekdayFormat.format(date),
    date: Number(dayOfMonthFormat.format(date))} : null;
}
