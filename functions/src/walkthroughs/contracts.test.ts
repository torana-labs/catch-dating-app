/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import {contractValidator} from "../shared/contractTestValidators";

// Contract fixtures for walkthrough booking, kept beside their tests: every
// file under contracts/fixtures must be declared in
// tool/contracts/check_schema_fixtures.mjs, which other open work holds. The
// hand-off lists them for that file once it is free.

const bookingId = "wt-0123456789abcdef0123456789abcdef01234567";

const walkthroughFixtures = {
  availability: {
    schemaVersion: 1, calendarId: "default", timeZone: "Asia/Kolkata", utcOffsetMinutes: 330,
    settings: {enabled: true, slotMinutes: 30, leadTimeMinutes: 120, horizonDays: 14,
      weeklyWindows: [{weekday: 1, start: "11:00", end: "13:00"}, {weekday: 4, start: "16:00", end: "19:00"}],
      closedDates: ["2026-12-25"]},
    revision: 3, updatedAt: "2026-11-16T09:00:00.000Z", updatedByUid: "staff-uid",
  },
  hold: {
    schemaVersion: 1, holdId: "default-20261119T1030Z", calendarId: "default", slotStartAt: "2026-11-19T10:30:00.000Z",
    slotEndAt: "2026-11-19T11:00:00.000Z", status: "held", bookingId, updatedAt: "2026-11-16T09:05:00.000Z",
  },
  booking: {
    schemaVersion: 1, bookingId, calendarId: "default", requestId: "web-0f3c2a9e-5b1d-4c7e", status: "booked",
    slot: {holdId: "default-20261119T1030Z", startAt: "2026-11-19T10:30:00.000Z", endAt: "2026-11-19T11:00:00.000Z",
      label: "Thu 19 Nov, 16:00 IST"},
    requestedSlotStartAt: "2026-11-19T10:30:00.000Z", phone: "+919000000001", verifiedByUid: "website-uid",
    manageTokenHash: "a".repeat(64), name: "Asha", details: {organisation: "Run Club Bandra"}, cityId: "in-mh-mumbai",
    consent: {purpose: "leadFollowUp", version: "walkthrough-v1", decidedAt: "2026-11-16T09:05:00.000Z"},
    sourcePage: "/start/walkthrough", entry: "start_walkthrough", followUp: {channel: "whatsapp", mode: "staff_reply"},
    staffConfirmation: null, reschedules: [], cancellation: null,
    createdAt: "2026-11-16T09:05:00.000Z", updatedAt: "2026-11-16T09:05:00.000Z",
  },
  slotsResponse: {
    timeZone: "Asia/Kolkata", utcOffset: "+05:30", bookingOpen: true, slotMinutes: 30, generatedAt: "2026-11-16T09:10:00.000Z",
    days: [{date: "2026-11-19", weekday: 4, label: "Thu 19 Nov", slots: [
      {startAt: "2026-11-19T11:00:00.000Z", endAt: "2026-11-19T11:30:00.000Z", label: "Thu 19 Nov, 16:30 IST"}]}],
    followUp: {channel: "whatsapp", mode: "staff_reply"},
  },
  bookPayload: {
    requestId: "web-0f3c2a9e-5b1d-4c7e", slotStartAt: "2026-11-19T10:30:00.000Z", manageToken: "A".repeat(43),
    consent: {purpose: "leadFollowUp", version: "walkthrough-v1"}, sourcePage: "/start/walkthrough", entry: "start_walkthrough",
  },
  setAvailabilityPayload: {
    expectedRevision: 0,
    settings: {enabled: true, slotMinutes: 30, leadTimeMinutes: 120, horizonDays: 14,
      weeklyWindows: [{weekday: 2, start: "11:00", end: "13:00"}], closedDates: []},
    note: "Pilot hours",
  },
};

const fixtures: Array<[string, string, unknown, boolean]> = [
  ["walkthrough availability", "WalkthroughAvailabilityDocument", walkthroughFixtures.availability, true],
  ["walkthrough slot hold", "WalkthroughSlotHoldDocument", walkthroughFixtures.hold, true],
  ["walkthrough booking", "WalkthroughBookingDocument", walkthroughFixtures.booking, true],
  ["cancelled walkthrough booking", "WalkthroughBookingDocument", {...walkthroughFixtures.booking, status: "cancelled",
    cancellation: {at: "2026-11-17T09:00:00.000Z", by: "booker_token", byUid: null, reason: null}}, true],
  ["confirmed and moved booking", "WalkthroughBookingDocument", {...walkthroughFixtures.booking,
    staffConfirmation: {byUid: "staff-uid", at: "2026-11-16T10:00:00.000Z", slotStartAt: "2026-11-19T10:00:00.000Z", note: null},
    reschedules: [{fromStartAt: "2026-11-19T10:00:00.000Z", toStartAt: "2026-11-19T10:30:00.000Z", at: "2026-11-16T11:00:00.000Z", by: "booker_phone"}]}, true],
  ["slots response", "GetWalkthroughSlotsCallableResponse", walkthroughFixtures.slotsResponse, true],
  ["closed slots response", "GetWalkthroughSlotsCallableResponse", {...walkthroughFixtures.slotsResponse, bookingOpen: false, slotMinutes: null, days: []}, true],
  ["book payload", "BookWalkthroughCallablePayload", walkthroughFixtures.bookPayload, true],
  ["set availability payload", "AdminSetWalkthroughAvailabilityCallablePayload", walkthroughFixtures.setAvailabilityPayload, true],

  ["a daylight-saving offset", "WalkthroughAvailabilityDocument", {...walkthroughFixtures.availability, utcOffsetMinutes: 300}, false],
  ["another time zone", "WalkthroughAvailabilityDocument", {...walkthroughFixtures.availability, timeZone: "Europe/London"}, false],
  ["a second staff calendar", "WalkthroughAvailabilityDocument", {...walkthroughFixtures.availability, calendarId: "riya"}, false],
  ["a staff name on a window", "WalkthroughAvailabilityDocument", {...walkthroughFixtures.availability,
    settings: {...walkthroughFixtures.availability.settings, weeklyWindows: [{weekday: 1, start: "11:00", end: "13:00", staffName: "Riya"}]}}, false],
  ["a staff identity in the public read", "GetWalkthroughSlotsCallableResponse", {...walkthroughFixtures.slotsResponse,
    days: [{...walkthroughFixtures.slotsResponse.days[0], slots: [{...walkthroughFixtures.slotsResponse.days[0].slots[0], staffUid: "staff-uid"}]}]}, false],
  ["a booker's number in the public read", "GetWalkthroughSlotsCallableResponse", {...walkthroughFixtures.slotsResponse, heldBy: ["+919000000001"]}, false],
  ["a day with no slots", "GetWalkthroughSlotsCallableResponse", {...walkthroughFixtures.slotsResponse,
    days: [{date: "2026-11-20", weekday: 5, label: "Fri 20 Nov", slots: []}]}, false],
  ["a local number", "WalkthroughBookingDocument", {...walkthroughFixtures.booking, phone: "9000000001"}, false],
  ["a cancelled booking with no cancellation", "WalkthroughBookingDocument", {...walkthroughFixtures.booking, status: "cancelled"}, false],
  ["a booked booking with a cancellation", "WalkthroughBookingDocument", {...walkthroughFixtures.booking,
    cancellation: {at: "2026-11-17T09:00:00.000Z", by: "staff", byUid: "staff-uid", reason: null}}, false],
  ["a slot start off the minute", "WalkthroughSlotHoldDocument", {...walkthroughFixtures.hold, slotStartAt: "2026-11-19T10:30:30.000Z"}, false],
  ["a book payload without consent", "BookWalkthroughCallablePayload",
    Object.fromEntries(Object.entries(walkthroughFixtures.bookPayload).filter(([key]) => key !== "consent")), false],
  ["a book payload with a raw token hash", "BookWalkthroughCallablePayload", {...walkthroughFixtures.bookPayload, manageTokenHash: "a".repeat(64)}, false],
];

test("walkthrough contract fixtures are valid or invalid as labelled", () => {
  for (const [label, schemaName, value, expected] of fixtures) {
    assert.equal(contractValidator(schemaName)(value), expected, label);
  }
});
