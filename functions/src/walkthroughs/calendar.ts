/* eslint-disable max-len */

// The walkthrough staff calendar, as pure functions: weekly windows in India
// time become concrete slots. India keeps UTC+05:30 all year and has no
// daylight saving, so a local time converts to an instant with one fixed
// offset; no time-zone database is consulted, and a European or American
// clock change cannot move a slot. Every instant here is a UTC ISO string as
// Date.toISOString() writes it, so strings compare in time order.

export const INDIA_TIME_ZONE = "Asia/Kolkata";
export const INDIA_UTC_OFFSET = "+05:30";
export const INDIA_UTC_OFFSET_MINUTES = 330;
export const CALENDAR_ID = "default";

const MINUTE_MS = 60_000;
const DAY_MINUTES = 24 * 60;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type SlotMinutes = 15 | 20 | 30 | 45 | 60 | 90;

export interface WeeklyWindow {
  /** ISO weekday: 1 Monday to 7 Sunday. */
  weekday: number;
  start: string;
  end: string;
}

export interface AvailabilitySettings {
  enabled: boolean;
  slotMinutes: SlotMinutes;
  leadTimeMinutes: number;
  horizonDays: number;
  weeklyWindows: WeeklyWindow[];
  closedDates: string[];
}

export interface Slot {
  startAt: string;
  endAt: string;
  label: string;
}

export interface SlotDay {
  date: string;
  weekday: number;
  label: string;
  slots: Slot[];
}

/**
 * The calendar used while no staff calendar is saved (owner decision):
 * Monday to Friday, 10:00 to 18:00 IST, 30-minute slots, 2 hours' lead and
 * 14 days ahead, so the last slot starts at 17:30 and ends at 18:00. A
 * calendar staff save through adminSetWalkthroughAvailability replaces it,
 * including one that closes booking.
 */
export const DEFAULT_AVAILABILITY: Readonly<AvailabilitySettings> = Object.freeze({
  enabled: true,
  slotMinutes: 30,
  leadTimeMinutes: 120,
  horizonDays: 14,
  weeklyWindows: [1, 2, 3, 4, 5].map((weekday) => ({weekday, start: "10:00", end: "18:00"})),
  closedDates: [],
});

export type CalendarSource = "saved" | "default";

/** The calendar slots come from: the saved one, else the built-in default. */
export function effectiveAvailability(saved: AvailabilitySettings | null | undefined): {
  source: CalendarSource;
  settings: AvailabilitySettings;
} {
  return saved ? {source: "saved", settings: saved} : {source: "default", settings: defaultAvailability()};
}

/** A fresh copy of the default calendar, safe for a caller to change. */
export function defaultAvailability(): AvailabilitySettings {
  return {...DEFAULT_AVAILABILITY, weeklyWindows: DEFAULT_AVAILABILITY.weeklyWindows.map((window) => ({...window})),
    closedDates: [...DEFAULT_AVAILABILITY.closedDates]};
}

/** Booking is open while staff enabled it and at least one window exists. */
export function bookingOpen(settings: AvailabilitySettings | null | undefined): settings is AvailabilitySettings {
  return Boolean(settings?.enabled && settings.weeklyWindows.length > 0);
}

/** Minutes after local midnight for HH:MM; 24:00 is the end of the day. */
export function minuteOfDay(value: string): number {
  const match = /^(\d{2}):(\d{2})$/u.exec(value);
  if (!match) throw new Error(`Not a local time: ${value}`);
  return Number(match[1]) * 60 + Number(match[2]);
}

/** The India-time calendar date an instant falls on. */
export function indiaDate(instant: Date): string {
  return new Date(instant.getTime() + INDIA_UTC_OFFSET_MINUTES * MINUTE_MS).toISOString().slice(0, 10);
}

/** The instant of a local India time on a local date. */
export function indiaInstant(date: string, minutes: number): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) + (minutes - INDIA_UTC_OFFSET_MINUTES) * MINUTE_MS);
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** ISO weekday of a calendar date: 1 Monday to 7 Sunday. */
export function isoWeekday(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() || 7;
}

/** True for a real calendar date written YYYY-MM-DD. */
export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  return addDays(value, 0) === value;
}

/** "Wed 18 Nov": a day as people read it. */
export function dayLabel(date: string): string {
  const [, month, day] = date.split("-").map(Number);
  return `${WEEKDAYS[isoWeekday(date) - 1]} ${day} ${MONTHS[month - 1]}`;
}

/** "Wed 18 Nov, 16:00 IST": a slot start in India time. */
export function slotLabel(startAt: string | Date): string {
  const start = typeof startAt === "string" ? new Date(startAt) : startAt;
  const local = new Date(start.getTime() + INDIA_UTC_OFFSET_MINUTES * MINUTE_MS).toISOString();
  return `${dayLabel(local.slice(0, 10))}, ${local.slice(11, 16)} IST`;
}

/** The slot hold document id: the calendar and the start in UTC, default-20261118T1030Z. */
export function holdIdFor(startAt: string): string {
  const compact = startAt.slice(0, 16).replace(/[-:]/gu, "");
  return `${CALENDAR_ID}-${compact}Z`;
}

/**
 * What is wrong with settings a person is about to save, in words they can
 * act on. The schema checks shapes; this checks what it cannot: each window
 * ends after it starts and fits a whole slot, windows on one day do not
 * overlap, and closed dates are real dates.
 */
export function settingsProblems(settings: AvailabilitySettings): string[] {
  const problems: string[] = [];
  const byDay = new Map<number, Array<{start: number; end: number}>>();
  for (const window of settings.weeklyWindows) {
    const start = minuteOfDay(window.start);
    const end = minuteOfDay(window.end);
    const day = WEEKDAYS[window.weekday - 1] ?? `day ${window.weekday}`;
    if (end > DAY_MINUTES) problems.push(`${day} ${window.start} to ${window.end}: a window ends by 24:00.`);
    if (end <= start) {
      problems.push(`${day} ${window.start} to ${window.end}: a window ends after it starts.`);
      continue;
    }
    if (end - start < settings.slotMinutes) {
      problems.push(`${day} ${window.start} to ${window.end}: shorter than one ${settings.slotMinutes}-minute slot.`);
    }
    byDay.set(window.weekday, [...(byDay.get(window.weekday) ?? []), {start, end}]);
  }
  for (const [weekday, windows] of byDay) {
    const sorted = windows.slice().sort((left, right) => left.start - right.start);
    for (let index = 1; index < sorted.length; index += 1) {
      if (sorted[index].start < sorted[index - 1].end) {
        problems.push(`${WEEKDAYS[weekday - 1]}: two windows overlap.`);
        break;
      }
    }
  }
  for (const date of settings.closedDates) {
    if (!isCalendarDate(date)) problems.push(`${date} is not a date.`);
  }
  if (settings.enabled && settings.weeklyWindows.length === 0) {
    problems.push("Add at least one weekly window before opening booking.");
  }
  return problems;
}

/** Settings in a stable order, so an unchanged save compares equal. */
export function normalizedSettings(settings: AvailabilitySettings): AvailabilitySettings {
  return {
    enabled: settings.enabled,
    slotMinutes: settings.slotMinutes,
    leadTimeMinutes: settings.leadTimeMinutes,
    horizonDays: settings.horizonDays,
    weeklyWindows: settings.weeklyWindows
      .map((window) => ({weekday: window.weekday, start: window.start, end: window.end}))
      .slice().sort((left, right) => left.weekday - right.weekday || minuteOfDay(left.start) - minuteOfDay(right.start)),
    closedDates: [...new Set(settings.closedDates)].sort(),
  };
}

/** Every slot the windows make on one local date, before lead time and holds. */
export function slotsOnDate(settings: AvailabilitySettings, date: string): Slot[] {
  if (settings.closedDates.includes(date)) return [];
  const weekday = isoWeekday(date);
  const slots: Slot[] = [];
  const windows = settings.weeklyWindows
    .filter((window) => window.weekday === weekday)
    .slice().sort((left, right) => minuteOfDay(left.start) - minuteOfDay(right.start));
  for (const window of windows) {
    const end = minuteOfDay(window.end);
    for (let minute = minuteOfDay(window.start); minute + settings.slotMinutes <= end; minute += settings.slotMinutes) {
      const startAt = indiaInstant(date, minute).toISOString();
      slots.push({
        startAt,
        endAt: indiaInstant(date, minute + settings.slotMinutes).toISOString(),
        label: slotLabel(startAt),
      });
    }
  }
  return slots;
}

/** The first instant a slot may start at: now plus the lead time. */
export function bookableFrom(settings: AvailabilitySettings, now: Date): string {
  return new Date(now.getTime() + settings.leadTimeMinutes * MINUTE_MS).toISOString();
}

/** The local dates the calendar offers from now: today first, at most horizonDays. */
export function offeredDates(settings: AvailabilitySettings, now: Date, days = settings.horizonDays): string[] {
  const today = indiaDate(now);
  const count = Math.max(0, Math.min(days, settings.horizonDays));
  return Array.from({length: count}, (_, index) => addDays(today, index));
}

/**
 * The open slots of the next days, grouped by local date. A slot is open when
 * booking is open, its date is in the horizon and not closed, it starts no
 * sooner than the lead time allows, and no booking holds it. Days without an
 * open slot are left out.
 */
export function openSlotDays(input: {
  settings: AvailabilitySettings | null | undefined;
  now: Date;
  days?: number;
  held: ReadonlySet<string>;
}): SlotDay[] {
  const {settings, now, held} = input;
  if (!bookingOpen(settings)) return [];
  const from = bookableFrom(settings, now);
  return offeredDates(settings, now, input.days).flatMap((date) => {
    const slots = slotsOnDate(settings, date).filter((slot) => slot.startAt >= from && !held.has(slot.startAt));
    return slots.length ? [{date, weekday: isoWeekday(date), label: dayLabel(date), slots}] : [];
  });
}

/**
 * The slot starting at startAt when the calendar offers it now (ignoring
 * holds), else null: a time between slots, past the horizon, on a closed
 * date or inside the lead time is never booked.
 */
export function offeredSlot(settings: AvailabilitySettings | null | undefined, now: Date, startAt: string): Slot | null {
  if (!bookingOpen(settings)) return null;
  if (startAt < bookableFrom(settings, now)) return null;
  const date = indiaDate(new Date(startAt));
  if (!offeredDates(settings, now).includes(date)) return null;
  return slotsOnDate(settings, date).find((slot) => slot.startAt === startAt) ?? null;
}

/** The instant range the calendar can offer from now: [bookable from, end of the last offered day). */
export function offeredRange(settings: AvailabilitySettings, now: Date): {from: string; to: string} {
  const dates = offeredDates(settings, now);
  const last = dates.at(-1) ?? indiaDate(now);
  return {from: bookableFrom(settings, now), to: indiaInstant(addDays(last, 1), 0).toISOString()};
}
