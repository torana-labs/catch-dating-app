/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import {contractValidator} from "../shared/contractTestValidators";
import {
  limiterKey,
  manageTokenHash,
  manageTokenMatches,
  parseAdminListWalkthroughBookingsPayload,
  parseAdminSetWalkthroughAvailabilityPayload,
  parseAdminUpdateWalkthroughBookingPayload,
  parseBookWalkthroughPayload,
  parseGetWalkthroughSlotsPayload,
  parseManageWalkthroughBookingPayload,
  walkthroughBookingId,
} from "./model";

// The payloads are checked by hand until their names are registered in
// contracts/functions/runtime_modules.json; these cases prove each hand check
// and its schema accept and refuse the same payloads.

function agrees(schemaName: string, parse: (value: unknown) => unknown, cases: Array<[string, unknown]>): void {
  const schema = contractValidator(schemaName);
  for (const [label, payload] of cases) {
    let accepted = true;
    try {
      parse(payload);
    } catch {
      accepted = false;
    }
    assert.equal(accepted, schema(payload), `${schemaName}: ${label}`);
  }
}

const without = (value: Record<string, unknown>, key: string) =>
  Object.fromEntries(Object.entries(value).filter(([name]) => name !== key));

const book = {
  requestId: "web-0f3c2a9e-5b1d-4c7e", slotStartAt: "2026-11-18T10:30:00.000Z", manageToken: "A".repeat(43),
  phone: "+919000000001", consent: {purpose: "leadFollowUp", version: "walkthrough-v1"},
  name: "Asha", details: {organisation: "Run Club Bandra", whatYouRun: "Sunday 5k"}, cityId: "in-mh-mumbai",
  sourcePage: "/start/walkthrough", entry: "start_walkthrough",
};

test("the bookWalkthrough check accepts and refuses exactly what its schema does", () => {
  agrees("BookWalkthroughCallablePayload", parseBookWalkthroughPayload, [
    ["valid", book],
    ["phone left to the verified sign-in", without(book, "phone")],
    ["only what is required", without(without(without(without(book, "phone"), "name"), "details"), "cityId")],
    ["empty details", {...book, details: {}}],
    ["short request id", {...book, requestId: "short"}],
    ["seconds in the slot", {...book, slotStartAt: "2026-11-18T10:30:15.000Z"}],
    ["slot with an offset", {...book, slotStartAt: "2026-11-18T16:00:00+05:30"}],
    ["short token", {...book, manageToken: "A".repeat(42)}],
    ["padded token", {...book, manageToken: `${"A".repeat(42)}=`}],
    ["local number", {...book, phone: "9000000001"}],
    ["other consent purpose", {...book, consent: {purpose: "cityNewPlans", version: "walkthrough-v1"}}],
    ["consent with a capital", {...book, consent: {purpose: "leadFollowUp", version: "Walkthrough"}}],
    ["no consent", without(book, "consent")],
    ["extra consent field", {...book, consent: {...book.consent, marketing: true}}],
    ["empty name", {...book, name: ""}],
    ["long organisation", {...book, details: {organisation: "x".repeat(141)}}],
    ["extra details field", {...book, details: {preferredTime: "Tue 4pm"}}],
    ["bad city", {...book, cityId: "Mumbai"}],
    ["page with a query", {...book, sourcePage: "/start/walkthrough?x=1"}],
    ["relative page", {...book, sourcePage: "start"}],
    ["bad entry", {...book, entry: "Start"}],
    ["extra field", {...book, staffUid: "staff-1"}],
    ["not an object", "book me"],
  ]);
});

test("the manageWalkthroughBooking check accepts and refuses exactly what its schema does", () => {
  const bookingId = walkthroughBookingId("+919000000001", book.requestId);
  agrees("ManageWalkthroughBookingCallablePayload", parseManageWalkthroughBookingPayload, [
    ["read by token", {bookingId, action: "read", manageToken: "B".repeat(43)}],
    ["read by verified phone", {bookingId, action: "read"}],
    ["cancel with a reason", {bookingId, action: "cancel", reason: "Clash"}],
    ["reschedule", {bookingId, action: "reschedule", slotStartAt: "2026-11-19T05:00:00.000Z"}],
    ["reschedule without a time", {bookingId, action: "reschedule"}],
    ["reschedule with a reason", {bookingId, action: "reschedule", slotStartAt: "2026-11-19T05:00:00.000Z", reason: "x"}],
    ["cancel with a time", {bookingId, action: "cancel", slotStartAt: "2026-11-19T05:00:00.000Z"}],
    ["read with a reason", {bookingId, action: "read", reason: "x"}],
    ["unknown action", {bookingId, action: "confirm"}],
    ["bad id", {bookingId: "wt-123", action: "read"}],
    ["bad token", {bookingId, action: "read", manageToken: "short"}],
    ["extra", {bookingId, action: "read", phone: "+919000000001"}],
  ]);
});

test("the getWalkthroughSlots check accepts and refuses exactly what its schema does", () => {
  agrees("GetWalkthroughSlotsCallablePayload", parseGetWalkthroughSlotsPayload, [
    ["empty", {}], ["14 days", {days: 14}], ["28 days", {days: 28}], ["29 days", {days: 29}], ["zero", {days: 0}],
    ["fraction", {days: 1.5}], ["text", {days: "7"}], ["extra", {days: 7, staff: true}],
  ]);
  assert.deepEqual(parseGetWalkthroughSlotsPayload(undefined), {});
});

test("the Admin walkthrough checks accept and refuse exactly what their schemas do", () => {
  const settings = {enabled: true, slotMinutes: 30, leadTimeMinutes: 120, horizonDays: 14,
    weeklyWindows: [{weekday: 1, start: "10:00", end: "13:00"}], closedDates: ["2026-12-25"]};
  agrees("AdminSetWalkthroughAvailabilityCallablePayload", parseAdminSetWalkthroughAvailabilityPayload, [
    ["valid", {expectedRevision: 0, settings, note: "Pilot hours"}],
    ["window ending at 24:00", {expectedRevision: 3, settings: {...settings, weeklyWindows: [{weekday: 7, start: "20:00", end: "24:00"}]}}],
    ["window starting at 24:00", {expectedRevision: 3, settings: {...settings, weeklyWindows: [{weekday: 7, start: "24:00", end: "24:00"}]}}],
    ["weekday 0", {expectedRevision: 0, settings: {...settings, weeklyWindows: [{weekday: 0, start: "10:00", end: "11:00"}]}}],
    ["25-minute slots", {expectedRevision: 0, settings: {...settings, slotMinutes: 25}}],
    ["lead over a week", {expectedRevision: 0, settings: {...settings, leadTimeMinutes: 10081}}],
    ["horizon 29", {expectedRevision: 0, settings: {...settings, horizonDays: 29}}],
    ["repeated closed date", {expectedRevision: 0, settings: {...settings, closedDates: ["2026-12-25", "2026-12-25"]}}],
    ["month 13", {expectedRevision: 0, settings: {...settings, closedDates: ["2026-13-01"]}}],
    ["negative revision", {expectedRevision: -1, settings}],
    ["staff name on a window", {expectedRevision: 0, settings: {...settings, weeklyWindows: [{weekday: 1, start: "10:00", end: "11:00", staff: "Riya"}]}}],
    ["no settings", {expectedRevision: 0}],
  ]);
  agrees("AdminListWalkthroughBookingsCallablePayload", parseAdminListWalkthroughBookingsPayload, [
    ["empty", {}], ["range", {fromDate: "2026-11-16", days: 60, includeCancelled: true}], ["61 days", {days: 61}],
    ["bad date", {fromDate: "16/11/2026"}], ["extra", {phone: "+919000000001"}],
  ]);
  const bookingId = walkthroughBookingId("+919000000001", book.requestId);
  agrees("AdminUpdateWalkthroughBookingCallablePayload", parseAdminUpdateWalkthroughBookingPayload, [
    ["confirm", {bookingId, action: "confirm", note: "Sent the Meet link"}], ["cancel", {bookingId, action: "cancel"}],
    ["empty note", {bookingId, action: "confirm", note: ""}], ["reschedule", {bookingId, action: "reschedule"}],
    ["no id", {action: "confirm"}],
  ]);
});

test("a booking id is stable per number and request id, and a token matches only its own hash", () => {
  const id = walkthroughBookingId("+919000000001", book.requestId);
  assert.match(id, /^wt-[a-f0-9]{40}$/);
  assert.equal(id, walkthroughBookingId("+919000000001", book.requestId));
  assert.notEqual(id, walkthroughBookingId("+919000000002", book.requestId));
  assert.notEqual(id, walkthroughBookingId("+919000000001", `${book.requestId}x`));
  const hash = manageTokenHash("C".repeat(43));
  assert.equal(manageTokenMatches("C".repeat(43), hash), true);
  assert.equal(manageTokenMatches("D".repeat(43), hash), false);
  assert.equal(manageTokenMatches(undefined, hash), false);
  assert.equal(manageTokenMatches("C".repeat(43), "not-a-hash"), false);
  assert.match(limiterKey("phone", "+919000000001"), /^walkthrough-phone-[a-f0-9]{32}$/);
  assert.ok(!limiterKey("phone", "+919000000001").includes("9000000001"));
});
