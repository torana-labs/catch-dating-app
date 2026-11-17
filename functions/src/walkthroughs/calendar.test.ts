/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_AVAILABILITY,
  addDays,
  effectiveAvailability,
  indiaDate,
  normalizedSettings,
  offeredRange,
  offeredSlot,
  openSlotDays,
  settingsProblems,
  holdIdFor,
  slotLabel,
  slotsOnDate,
  type AvailabilitySettings,
} from "./calendar";

const weekdays10to12: AvailabilitySettings = {
  enabled: true,
  slotMinutes: 30,
  leadTimeMinutes: 0,
  horizonDays: 14,
  weeklyWindows: [1, 2, 3, 4, 5].map((weekday) => ({weekday, start: "10:00", end: "12:00"})),
  closedDates: [],
};

const none = new Set<string>();

test("weekly windows become slots at the India-time clock, a fixed UTC+05:30", () => {
  // Monday 16 November 2026, 05:30 in India.
  const days = openSlotDays({settings: weekdays10to12, now: new Date("2026-11-16T00:00:00.000Z"), days: 1, held: none});
  assert.deepEqual(days, [{
    date: "2026-11-16", weekday: 1, label: "Mon 16 Nov",
    slots: [
      {startAt: "2026-11-16T04:30:00.000Z", endAt: "2026-11-16T05:00:00.000Z", label: "Mon 16 Nov, 10:00 IST"},
      {startAt: "2026-11-16T05:00:00.000Z", endAt: "2026-11-16T05:30:00.000Z", label: "Mon 16 Nov, 10:30 IST"},
      {startAt: "2026-11-16T05:30:00.000Z", endAt: "2026-11-16T06:00:00.000Z", label: "Mon 16 Nov, 11:00 IST"},
      {startAt: "2026-11-16T06:00:00.000Z", endAt: "2026-11-16T06:30:00.000Z", label: "Mon 16 Nov, 11:30 IST"},
    ],
  }]);
});

test("no clock change anywhere moves a slot: every day of 2026 starts at 10:00 in Asia/Kolkata", () => {
  const settings = {...weekdays10to12, weeklyWindows: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({weekday, start: "10:00", end: "10:30"}))};
  const clock = new Intl.DateTimeFormat("en-GB", {timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23"});
  const day = new Intl.DateTimeFormat("en-CA", {timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit"});
  for (let date = "2026-01-01"; date < "2027-01-01"; date = addDays(date, 1)) {
    const [slot] = slotsOnDate(settings, date);
    assert.equal(slot.startAt, `${date}T04:30:00.000Z`, date);
    assert.equal(clock.format(new Date(slot.startAt)), "10:00", date);
    assert.equal(day.format(new Date(slot.startAt)), date, date);
  }
  // Around the US (8 Mar, 1 Nov) and EU (29 Mar, 25 Oct) changes the UTC instant stays put.
  for (const date of ["2026-03-07", "2026-03-09", "2026-03-28", "2026-03-30", "2026-10-24", "2026-10-26", "2026-10-31", "2026-11-02"]) {
    assert.equal(slotsOnDate(settings, date)[0].startAt, `${date}T04:30:00.000Z`);
  }
});

test("an early-morning India slot falls on the previous UTC day, and a window may end at 24:00", () => {
  const settings: AvailabilitySettings = {...weekdays10to12, slotMinutes: 60,
    weeklyWindows: [{weekday: 2, start: "03:00", end: "04:00"}, {weekday: 2, start: "23:00", end: "24:00"}]};
  assert.deepEqual(slotsOnDate(settings, "2026-11-17").map((slot) => [slot.startAt, slot.endAt, slot.label]), [
    ["2026-11-16T21:30:00.000Z", "2026-11-16T22:30:00.000Z", "Tue 17 Nov, 03:00 IST"],
    ["2026-11-17T17:30:00.000Z", "2026-11-17T18:30:00.000Z", "Tue 17 Nov, 23:00 IST"],
  ]);
  assert.equal(indiaDate(new Date("2026-11-16T21:30:00.000Z")), "2026-11-17");
  assert.equal(indiaDate(new Date("2026-11-16T18:29:59.999Z")), "2026-11-16");
  assert.equal(slotLabel("2026-11-16T21:30:00.000Z"), "Tue 17 Nov, 03:00 IST");
});

test("a trailing part slot is dropped and windows on one day come out in time order", () => {
  const settings: AvailabilitySettings = {...weekdays10to12, slotMinutes: 45,
    weeklyWindows: [{weekday: 3, start: "16:00", end: "17:00"}, {weekday: 3, start: "09:15", end: "11:00"}]};
  assert.deepEqual(slotsOnDate(settings, "2026-11-18").map((slot) => slot.label), [
    "Wed 18 Nov, 09:15 IST", "Wed 18 Nov, 10:00 IST", "Wed 18 Nov, 16:00 IST",
  ]);
});

test("the lead time cuts off slots starting sooner than now plus the lead", () => {
  const settings = {...weekdays10to12, leadTimeMinutes: 30};
  // 09:40 in India: the cutoff is 10:10, so 10:00 is gone and 10:30 stays.
  const at0940 = new Date("2026-11-16T04:10:00.000Z");
  const first = openSlotDays({settings, now: at0940, days: 1, held: none})[0].slots[0];
  assert.equal(first.label, "Mon 16 Nov, 10:30 IST");
  assert.equal(offeredSlot(settings, at0940, "2026-11-16T04:30:00.000Z"), null);
  assert.equal(offeredSlot(settings, at0940, "2026-11-16T05:00:00.000Z")?.label, "Mon 16 Nov, 10:30 IST");
  // Exactly the lead time before a slot, that slot is still offered.
  const at0930 = new Date("2026-11-16T04:00:00.000Z");
  assert.equal(offeredSlot(settings, at0930, "2026-11-16T04:30:00.000Z")?.label, "Mon 16 Nov, 10:00 IST");
  // A day-long lead empties today and keeps tomorrow.
  const dayLead = {...weekdays10to12, leadTimeMinutes: 24 * 60};
  const days = openSlotDays({settings: dayLead, now: at0930, days: 2, held: none});
  assert.deepEqual(days.map((day) => day.date), ["2026-11-17"]);
  assert.equal(days[0].slots[0].label, "Tue 17 Nov, 10:00 IST");
  assert.equal(offeredRange(dayLead, at0930).from, "2026-11-17T04:00:00.000Z");
});

test("held slots, closed dates, the weekend and the horizon are not offered", () => {
  const settings = {...weekdays10to12, horizonDays: 7, closedDates: ["2026-11-17"]};
  const now = new Date("2026-11-16T00:00:00.000Z");
  const held = new Set(["2026-11-16T04:30:00.000Z"]);
  const days = openSlotDays({settings, now, days: 28, held});
  // Mon 16 (minus the held slot), Wed 18 to Fri 20; Tue 17 is closed and Mon 23 is past the 7-day horizon.
  assert.deepEqual(days.map((day) => day.date), ["2026-11-16", "2026-11-18", "2026-11-19", "2026-11-20"]);
  assert.equal(days[0].slots.length, 3);
  assert.equal(offeredSlot(settings, now, "2026-11-17T04:30:00.000Z"), null, "closed date");
  assert.equal(offeredSlot(settings, now, "2026-11-21T04:30:00.000Z"), null, "Saturday");
  assert.equal(offeredSlot(settings, now, "2026-11-23T04:30:00.000Z"), null, "past the horizon");
  assert.equal(offeredSlot(settings, now, "2026-11-18T04:45:00.000Z"), null, "between slots");
  assert.equal(offeredSlot(settings, now, "2026-11-16T04:30:00.000Z")?.label, "Mon 16 Nov, 10:00 IST", "held is still a slot");
  assert.deepEqual(offeredRange(settings, now), {from: "2026-11-16T00:00:00.000Z", to: "2026-11-22T18:30:00.000Z"});
});

test("a closed calendar, or one without windows, offers nothing", () => {
  const now = new Date("2026-11-16T00:00:00.000Z");
  assert.deepEqual(openSlotDays({settings: {...weekdays10to12, enabled: false}, now, held: none}), []);
  assert.deepEqual(openSlotDays({settings: {...weekdays10to12, weeklyWindows: []}, now, held: none}), []);
  assert.deepEqual(openSlotDays({settings: null, now, held: none}), []);
  assert.equal(offeredSlot({...weekdays10to12, enabled: false}, now, "2026-11-16T04:30:00.000Z"), null);
});

test("the default calendar: weekdays 10:00 to 18:00 IST in 30-minute slots, 2 hours' lead, 14 days ahead", () => {
  assert.deepEqual(DEFAULT_AVAILABILITY, {
    enabled: true, slotMinutes: 30, leadTimeMinutes: 120, horizonDays: 14,
    weeklyWindows: [1, 2, 3, 4, 5].map((weekday) => ({weekday, start: "10:00", end: "18:00"})),
    closedDates: [],
  });
  assert.deepEqual(settingsProblems(DEFAULT_AVAILABILITY), [], "staff could save it as it is");
  const {settings} = effectiveAvailability(null);
  // Monday 16 November 2026, 05:30 in India: all of today is past the lead time.
  const now = new Date("2026-11-16T00:00:00.000Z");
  const days = openSlotDays({settings, now, days: 28, held: none});
  // Two working weeks: Mon 16 to Fri 20 and Mon 23 to Fri 27; no weekend, nothing past the 14-day horizon.
  assert.deepEqual(days.map((day) => day.label), [
    "Mon 16 Nov", "Tue 17 Nov", "Wed 18 Nov", "Thu 19 Nov", "Fri 20 Nov",
    "Mon 23 Nov", "Tue 24 Nov", "Wed 25 Nov", "Thu 26 Nov", "Fri 27 Nov",
  ]);
  for (const day of days) {
    assert.equal(day.slots.length, 16, day.label);
    assert.equal(day.slots[0].label, `${day.label}, 10:00 IST`);
    assert.equal(day.slots.at(-1)!.label, `${day.label}, 17:30 IST`);
  }
  // The first slot starts at 10:00 and the last ends at 18:00 India time.
  assert.deepEqual([days[0].slots[0].startAt, days[0].slots.at(-1)!.endAt], ["2026-11-16T04:30:00.000Z", "2026-11-16T12:30:00.000Z"]);
  assert.equal(offeredSlot(settings, now, "2026-11-16T12:30:00.000Z"), null, "18:00 starts no slot");
  assert.equal(offeredSlot(settings, now, "2026-11-16T04:00:00.000Z"), null, "09:30 starts no slot");
  assert.equal(offeredSlot(settings, now, "2026-11-21T04:30:00.000Z"), null, "Saturday");
  assert.equal(offeredSlot(settings, now, "2026-11-22T04:30:00.000Z"), null, "Sunday");
  assert.deepEqual(slotsOnDate(settings, "2026-11-21"), []);
  assert.deepEqual(slotsOnDate(settings, "2026-11-22"), []);
});

test("the default calendar's 2-hour lead time cuts off today's early slots", () => {
  const {settings} = effectiveAvailability(null);
  // 10:15 in India: the cutoff is 12:15, so 12:30 is the first slot today.
  const at1015 = new Date("2026-11-16T04:45:00.000Z");
  const today = openSlotDays({settings, now: at1015, days: 1, held: none})[0];
  assert.equal(today.slots[0].label, "Mon 16 Nov, 12:30 IST");
  assert.equal(today.slots.length, 11);
  assert.equal(offeredSlot(settings, at1015, "2026-11-16T06:30:00.000Z"), null, "12:00 is inside the lead time");
  assert.equal(offeredSlot(settings, at1015, "2026-11-16T07:00:00.000Z")?.label, "Mon 16 Nov, 12:30 IST");
  // Exactly two hours before 10:00, the 10:00 slot is still offered.
  assert.equal(offeredSlot(settings, new Date("2026-11-16T02:30:00.000Z"), "2026-11-16T04:30:00.000Z")?.label, "Mon 16 Nov, 10:00 IST");
  // From 16:00 the 17:30 slot is gone too; Friday evening's next slot is Monday 10:00.
  assert.deepEqual(openSlotDays({settings, now: new Date("2026-11-16T10:30:00.000Z"), days: 2, held: none}).map((day) => day.label), ["Tue 17 Nov"]);
  const friday = openSlotDays({settings, now: new Date("2026-11-20T11:00:00.000Z"), days: 4, held: none});
  assert.deepEqual(friday.map((day) => day.slots[0].label), ["Mon 23 Nov, 10:00 IST"]);
});

test("a saved calendar replaces the default, including one that closes booking", () => {
  assert.equal(effectiveAvailability(undefined).source, "default");
  assert.deepEqual(effectiveAvailability(weekdays10to12), {source: "saved", settings: weekdays10to12});
  const closed = {...weekdays10to12, enabled: false};
  assert.deepEqual(effectiveAvailability(closed), {source: "saved", settings: closed});
  // A copy: changing it leaves the default as it was.
  const copy = effectiveAvailability(null).settings;
  copy.weeklyWindows[0].end = "12:00";
  assert.equal(DEFAULT_AVAILABILITY.weeklyWindows[0].end, "18:00");
});

test("settings problems name what the schema cannot check", () => {
  assert.deepEqual(settingsProblems(weekdays10to12), []);
  assert.deepEqual(settingsProblems({...weekdays10to12, weeklyWindows: [
    {weekday: 1, start: "10:00", end: "12:00"}, {weekday: 1, start: "11:30", end: "13:00"},
    {weekday: 2, start: "12:00", end: "12:00"}, {weekday: 3, start: "10:00", end: "10:20"},
  ], closedDates: ["2026-02-30"]}), [
    "Tue 12:00 to 12:00: a window ends after it starts.",
    "Wed 10:00 to 10:20: shorter than one 30-minute slot.",
    "Mon: two windows overlap.",
    "2026-02-30 is not a date.",
  ]);
  assert.deepEqual(settingsProblems({...weekdays10to12, weeklyWindows: []}),
    ["Add at least one weekly window before opening booking."]);
  assert.deepEqual(settingsProblems({...weekdays10to12, enabled: false, weeklyWindows: []}), []);
  // Back-to-back windows touch but do not overlap.
  assert.deepEqual(settingsProblems({...weekdays10to12, weeklyWindows: [
    {weekday: 1, start: "10:00", end: "12:00"}, {weekday: 1, start: "12:00", end: "13:00"}]}), []);
});

test("normalized settings sort windows and dates so an unchanged save compares equal", () => {
  const settings = normalizedSettings({...weekdays10to12, weeklyWindows: [
    {weekday: 2, start: "14:00", end: "15:00"}, {weekday: 1, start: "16:00", end: "17:00"}, {weekday: 1, start: "09:00", end: "10:00"}],
  closedDates: ["2026-12-25", "2026-11-20", "2026-12-25"]});
  assert.deepEqual(settings.weeklyWindows.map((window) => `${window.weekday} ${window.start}`), ["1 09:00", "1 16:00", "2 14:00"]);
  assert.deepEqual(settings.closedDates, ["2026-11-20", "2026-12-25"]);
});

test("a slot hold id names the calendar and the UTC start", () => {
  assert.equal(holdIdFor("2026-11-18T10:30:00.000Z"), "default-20261118T1030Z");
});
