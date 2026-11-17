/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import {
  adminListWalkthroughBookingsHandler,
  adminSetWalkthroughAvailabilityHandler,
  adminUpdateWalkthroughBookingHandler,
} from "./adminCallables";
import {bookWalkthroughHandler, getWalkthroughSlotsHandler, manageWalkthroughBookingHandler} from "./publicCallables";
import {walkthroughBookingId} from "./model";
import {
  FIRST_OPEN,
  OTHER_PHONE,
  PHONE,
  SETTINGS,
  STAFF_UID,
  TOKEN,
  TUESDAY_10,
  assertContract,
  assertRefused,
  bookPayload,
  harness,
  staff,
  verified,
} from "./testHarness";

const BOOKING_ID = walkthroughBookingId(PHONE, "web-0f3c2a9e-5b1d-4c7e");

test("only admin and the owner reach the walkthrough Admin actions", async () => {
  const h = harness();
  for (const auth of [null, verified(), staff("support"), staff("salesStaff"), staff("safetyReviewer")]) {
    await assertRefused(adminListWalkthroughBookingsHandler(h.call({}, auth), h.deps), auth ? "permission-denied" : "unauthenticated", null);
    await assertRefused(adminSetWalkthroughAvailabilityHandler(h.call({expectedRevision: 1, settings: SETTINGS}, auth), h.deps),
      auth ? "permission-denied" : "unauthenticated", null);
    await assertRefused(adminUpdateWalkthroughBookingHandler(h.call({bookingId: BOOKING_ID, action: "confirm"}, auth), h.deps),
      auth ? "permission-denied" : "unauthenticated", null);
  }
  const owner = await adminListWalkthroughBookingsHandler(h.call({}, staff("adminOwner")), h.deps);
  assert.equal(owner.availability?.revision, 1);
});

test("staff save the calendar against the revision they read, audited, and see the slots it opens", async () => {
  const h = harness({settings: null});
  // Before any save, the list reports the default calendar in use and the slots it opens.
  const before = await adminListWalkthroughBookingsHandler(h.call({}, staff()), h.deps);
  assertContract("AdminListWalkthroughBookingsCallableResponse", before);
  assert.equal(before.availability, null);
  assert.equal(before.calendar.source, "default");
  assert.deepEqual(before.calendar.settings.weeklyWindows.map((window) => `${window.weekday} ${window.start}-${window.end}`),
    ["1 10:00-18:00", "2 10:00-18:00", "3 10:00-18:00", "4 10:00-18:00", "5 10:00-18:00"]);
  // Ten weekdays of 16 slots, less Monday's 10:00, 10:30 and 11:00 inside the 2-hour lead at 09:30.
  assert.equal(before.openSlotCount, 157);
  const settings = {...SETTINGS, weeklyWindows: [{weekday: 2, start: "15:00", end: "16:00"}, {weekday: 1, start: "16:00", end: "17:00"}],
    closedDates: ["2026-11-24"]};
  const saved = await adminSetWalkthroughAvailabilityHandler(h.call({expectedRevision: 0, settings, note: "Pilot hours"}, staff()), h.deps);
  assertContract("AdminSetWalkthroughAvailabilityCallableResponse", saved);
  assert.deepEqual([saved.changed, saved.availability.revision, saved.availability.updatedByUid], [true, 1, STAFF_UID]);
  assert.deepEqual(saved.availability.settings.weeklyWindows.map((window) => window.weekday), [1, 2], "stored in order");
  assert.deepEqual(saved.nextSlots.map((slot) => slot.label), [
    "Mon 16 Nov, 16:00 IST", "Mon 16 Nov, 16:30 IST", "Tue 17 Nov, 15:00 IST", "Tue 17 Nov, 15:30 IST",
    "Mon 23 Nov, 16:00 IST", "Mon 23 Nov, 16:30 IST",
  ]);
  const doc = h.db.get("walkthroughAvailability/default")!;
  assertContract("WalkthroughAvailabilityDocument", doc);
  const audits = h.db.children("adminAuditLogs").map(([, entry]) => entry);
  assert.equal(audits.length, 1);
  assert.deepEqual([audits[0].action, audits[0].targetPath, audits[0].actorUid, audits[0].note],
    ["walkthroughs.set-availability", "walkthroughAvailability/default", STAFF_UID, "Pilot hours"]);
  // The first save records the default it replaced.
  const [auditBefore, auditAfter] = [audits[0].before, audits[0].after] as Array<Record<string, unknown>>;
  assert.deepEqual([auditBefore.source, auditBefore.revision, auditBefore.leadTimeMinutes], ["default", 0, 120]);
  assert.deepEqual([auditAfter.source, auditAfter.revision], ["saved", 1]);
  const after = await adminListWalkthroughBookingsHandler(h.call({}, staff()), h.deps);
  assert.deepEqual([after.calendar.source, after.availability?.revision], ["saved", 1]);
  assert.deepEqual(after.calendar.settings, saved.availability.settings);
  // An unchanged save keeps the revision and writes no audit entry.
  const same = await adminSetWalkthroughAvailabilityHandler(h.call({expectedRevision: 1, settings}, staff("adminOwner")), h.deps);
  assert.deepEqual([same.changed, same.availability.revision], [false, 1]);
  assert.equal(h.db.children("adminAuditLogs").length, 1);
  // A save from a stale read is refused.
  await assertRefused(adminSetWalkthroughAvailabilityHandler(h.call({expectedRevision: 0, settings: {...settings, enabled: false}}, staff()), h.deps),
    "aborted", "stale_revision");
  const closed = await adminSetWalkthroughAvailabilityHandler(h.call({expectedRevision: 1, settings: {...settings, enabled: false}}, staff()), h.deps);
  assert.deepEqual([closed.availability.revision, closed.nextSlots], [2, []]);
  const slots = await getWalkthroughSlotsHandler(h.call({}), h.deps);
  assert.equal(slots.bookingOpen, false);
});

test("a calendar the schema allows but that cannot work is refused with what to fix", async () => {
  const h = harness();
  const details = await assertRefused(adminSetWalkthroughAvailabilityHandler(h.call({expectedRevision: 1, settings: {...SETTINGS,
    weeklyWindows: [{weekday: 1, start: "10:00", end: "12:00"}, {weekday: 1, start: "11:00", end: "13:00"}]}}, staff()), h.deps),
  "invalid-argument", "invalid_settings");
  assert.equal(details.reason, "invalid_settings");
  await assertRefused(adminSetWalkthroughAvailabilityHandler(h.call({expectedRevision: 1, settings: {...SETTINGS, slotMinutes: 25}}, staff()), h.deps),
    "invalid-argument", null);
  assert.equal(h.db.get("walkthroughAvailability/default")!.revision, 1);
});

test("staff see bookings with the number to reply to, confirm one, and the confirmation covers only its slot", async () => {
  const h = harness();
  await bookWalkthroughHandler(h.call(bookPayload(), verified()), h.deps);
  await bookWalkthroughHandler(h.call(bookPayload({requestId: "web-eeeeeeeeeeeeeeee", slotStartAt: TUESDAY_10, name: undefined, details: undefined, cityId: undefined}), verified(OTHER_PHONE)), h.deps);
  const listed = await adminListWalkthroughBookingsHandler(h.call({}, staff()), h.deps);
  assertContract("AdminListWalkthroughBookingsCallableResponse", listed);
  assert.deepEqual([listed.fromDate, listed.toDate, listed.truncated], ["2026-11-16", "2026-11-29", false]);
  assert.deepEqual(listed.bookings.map((row) => [row.slot.label, row.phone, row.name, row.confirmed]), [
    ["Mon 16 Nov, 11:00 IST", PHONE, "Asha", false],
    ["Tue 17 Nov, 10:00 IST", OTHER_PHONE, null, false],
  ]);
  assert.equal(listed.bookings[0].inboxItemId, `walkthrough-${BOOKING_ID}`);
  assert.equal(listed.bookings[0].managePath, `/start/walkthrough/manage?booking=${BOOKING_ID}`);
  // Two weeks of weekday slots (40), less the 10:00 and 10:30 inside the lead time, less the two booked.
  assert.equal(listed.openSlotCount, 36);

  const confirmed = await adminUpdateWalkthroughBookingHandler(h.call({bookingId: BOOKING_ID, action: "confirm", note: "Sent the Meet link"}, staff()), h.deps);
  assertContract("AdminUpdateWalkthroughBookingCallableResponse", confirmed);
  assert.deepEqual([confirmed.changed, confirmed.booking.confirmed], [true, true]);
  assert.deepEqual(confirmed.booking.staffConfirmation, {byUid: STAFF_UID, at: "2026-11-16T04:00:00.000Z", slotStartAt: FIRST_OPEN, note: "Sent the Meet link"});
  const again = await adminUpdateWalkthroughBookingHandler(h.call({bookingId: BOOKING_ID, action: "confirm"}, staff()), h.deps);
  assert.equal(again.changed, false);
  const read = await manageWalkthroughBookingHandler(h.call({bookingId: BOOKING_ID, action: "read", manageToken: TOKEN}), h.deps);
  assert.equal(read.confirmed, true);
  // The host moves it: the old confirmation no longer counts.
  await manageWalkthroughBookingHandler(h.call({bookingId: BOOKING_ID, action: "reschedule", manageToken: TOKEN, slotStartAt: "2026-11-18T05:00:00.000Z"}), h.deps);
  const afterMove = await adminListWalkthroughBookingsHandler(h.call({}, staff()), h.deps);
  assert.deepEqual(afterMove.bookings.find((row) => row.bookingId === BOOKING_ID)!.confirmed, false);
  assert.equal(h.db.children("adminAuditLogs").filter(([, entry]) => entry.action === "walkthroughs.confirm-booking").length, 1);
});

test("staff cancel for a host: the slot frees, the list hides it unless asked, and repeating changes nothing", async () => {
  const h = harness();
  await bookWalkthroughHandler(h.call(bookPayload(), verified()), h.deps);
  const cancelled = await adminUpdateWalkthroughBookingHandler(h.call({bookingId: BOOKING_ID, action: "cancel", note: "Host asked on WhatsApp"}, staff()), h.deps);
  assertContract("AdminUpdateWalkthroughBookingCallableResponse", cancelled);
  assert.deepEqual(cancelled.booking.cancellation, {at: "2026-11-16T04:00:00.000Z", by: "staff", reason: "Host asked on WhatsApp"});
  assert.equal(h.db.get("walkthroughSlotHolds/default-20261116T0530Z")!.status, "released");
  assertContract("WalkthroughBookingDocument", h.db.get(`walkthroughBookings/${BOOKING_ID}`));
  assert.equal((h.db.get(`walkthroughBookings/${BOOKING_ID}`)!.cancellation as {byUid: string}).byUid, STAFF_UID);
  const again = await adminUpdateWalkthroughBookingHandler(h.call({bookingId: BOOKING_ID, action: "cancel"}, staff()), h.deps);
  assert.equal(again.changed, false);
  await assertRefused(adminUpdateWalkthroughBookingHandler(h.call({bookingId: BOOKING_ID, action: "confirm"}, staff()), h.deps),
    "failed-precondition", "booking_cancelled");
  assert.deepEqual((await adminListWalkthroughBookingsHandler(h.call({}, staff()), h.deps)).bookings, []);
  const all = await adminListWalkthroughBookingsHandler(h.call({includeCancelled: true, fromDate: "2026-11-16", days: 1}, staff()), h.deps);
  assert.deepEqual(all.bookings.map((row) => row.status), ["cancelled"]);
  await assertRefused(adminUpdateWalkthroughBookingHandler(h.call({bookingId: walkthroughBookingId(PHONE, "web-nobody-booked-this"), action: "confirm"}, staff()), h.deps),
    "not-found", "not_found");
  assert.deepEqual(h.limits.filter((limit) => limit.action.startsWith("admin")).map((limit) => limit.key).every((key) => key === STAFF_UID), true);
});
