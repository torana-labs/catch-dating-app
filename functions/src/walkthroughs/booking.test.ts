/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import {
  bookWalkthroughHandler,
  getWalkthroughSlotsHandler,
  manageWalkthroughBookingHandler,
} from "./publicCallables";
import {walkthroughBookingId} from "./model";
import {
  FIRST_OPEN,
  INSIDE_LEAD,
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
  verified,
} from "./testHarness";

const BOOKING_ID = walkthroughBookingId(PHONE, "web-0f3c2a9e-5b1d-4c7e");

test("the public slot read returns open India-time slots and nothing about staff", async () => {
  const h = harness();
  const slots = await getWalkthroughSlotsHandler(h.call({days: 2}), h.deps);
  assertContract("GetWalkthroughSlotsCallableResponse", slots);
  assert.equal(slots.bookingOpen, true);
  assert.equal(slots.timeZone, "Asia/Kolkata");
  assert.equal(slots.utcOffset, "+05:30");
  assert.deepEqual(slots.days.map((day) => [day.label, day.slots.map((slot) => slot.label.slice(-9))]), [
    ["Mon 16 Nov", ["11:00 IST", "11:30 IST"]],
    ["Tue 17 Nov", ["10:00 IST", "10:30 IST", "11:00 IST", "11:30 IST"]],
  ]);
  assert.ok(!JSON.stringify(slots).includes(STAFF_UID), "no staff identity");
  assert.deepEqual(Object.keys(slots).sort(), ["bookingOpen", "days", "followUp", "generatedAt", "slotMinutes", "timeZone", "utcOffset"]);
  assert.deepEqual(h.limits.map((limit) => [limit.action, limit.maxRequests]), [["getWalkthroughSlots", 120]]);
  assert.match(h.limits[0].key, /^walkthrough-ip-[a-f0-9]{32}$/);
});

test("with no calendar saved, or booking switched off, the page is told to show its request form", async () => {
  const closed = harness({settings: null});
  const none = await getWalkthroughSlotsHandler(closed.call({}), closed.deps);
  assertContract("GetWalkthroughSlotsCallableResponse", none);
  assert.deepEqual([none.bookingOpen, none.slotMinutes, none.days], [false, null, []]);
  const off = harness({settings: {...SETTINGS, enabled: false}});
  const paused = await getWalkthroughSlotsHandler(off.call({}), off.deps);
  assert.deepEqual([paused.bookingOpen, paused.slotMinutes, paused.days], [false, 30, []]);
  await assertRefused(bookWalkthroughHandler(off.call(bookPayload(), verified()), off.deps), "failed-precondition", "booking_closed");
});

test("a verified number books an open slot: one booking, one hold, and the slot leaves the public read", async () => {
  const h = harness();
  const booked = await bookWalkthroughHandler(h.call(bookPayload(), verified()), h.deps);
  assertContract("BookWalkthroughCallableResponse", booked);
  assert.deepEqual(booked, {
    bookingId: BOOKING_ID, status: "booked",
    slot: {startAt: FIRST_OPEN, endAt: "2026-11-16T06:00:00.000Z", label: "Mon 16 Nov, 11:00 IST"},
    timeZone: "Asia/Kolkata", followUp: {channel: "whatsapp", mode: "staff_reply"},
    managePath: `/start/walkthrough/manage?booking=${BOOKING_ID}`, idempotentReplay: false,
  });
  const stored = h.db.get(`walkthroughBookings/${BOOKING_ID}`)!;
  assertContract("WalkthroughBookingDocument", stored);
  assert.equal(stored.phone, PHONE);
  assert.equal(stored.verifiedByUid, "uid-0001");
  assert.notEqual(stored.manageTokenHash, TOKEN);
  assert.deepEqual(stored.consent, {purpose: "leadFollowUp", version: "walkthrough-v1", decidedAt: "2026-11-16T04:00:00.000Z"});
  const hold = h.db.get("walkthroughSlotHolds/default-20261116T0530Z")!;
  assertContract("WalkthroughSlotHoldDocument", hold);
  assert.deepEqual([hold.status, hold.bookingId], ["held", BOOKING_ID]);
  const slots = await getWalkthroughSlotsHandler(h.call({days: 1}), h.deps);
  assert.deepEqual(slots.days[0].slots.map((slot) => slot.startAt), ["2026-11-16T06:00:00.000Z"]);
  assert.deepEqual(h.limits.map((limit) => [limit.action, limit.maxRequests, limit.windowMs]), [
    ["bookWalkthrough", 5, 3_600_000], ["bookWalkthroughAddress", 20, 3_600_000], ["bookWalkthroughDaily", 200, 86_400_000],
    ["getWalkthroughSlots", 120, 600_000],
  ]);
  assert.ok(!h.limits.some((limit) => limit.key.includes("9000000001")), "no number in a counter id");
});

test("booking needs the number verified by a code, and a sent number must be that number", async () => {
  const h = harness();
  await assertRefused(bookWalkthroughHandler(h.call(bookPayload()), h.deps), "unauthenticated", "phone_unverified");
  await assertRefused(bookWalkthroughHandler(h.call(bookPayload(), {uid: "email-user", token: {email: "a@example.com"}}), h.deps),
    "failed-precondition", "phone_unverified");
  await assertRefused(bookWalkthroughHandler(h.call(bookPayload({phone: OTHER_PHONE}), verified(PHONE)), h.deps),
    "failed-precondition", "phone_mismatch");
  assert.deepEqual(h.db.paths("walkthrough"), ["walkthroughAvailability/default"], "nothing written");
  assert.deepEqual(h.limits, [], "refused before any counter");
  const matching = await bookWalkthroughHandler(h.call(bookPayload({phone: PHONE}), verified(PHONE)), h.deps);
  assert.equal(matching.status, "booked");
});

test("a slot inside the lead time, between slots or past the horizon is not booked", async () => {
  const h = harness();
  for (const slotStartAt of [INSIDE_LEAD, "2026-11-17T04:45:00.000Z", "2026-11-30T04:30:00.000Z", "2026-11-21T04:30:00.000Z"]) {
    await assertRefused(bookWalkthroughHandler(h.call(bookPayload({slotStartAt, requestId: `web-${slotStartAt.replace(/[^0-9]/g, "")}`}), verified()), h.deps),
      "failed-precondition", "slot_unavailable");
  }
  // Time moves on: the first open slot falls inside the lead time and is refused.
  h.setNow("2026-11-16T04:31:00.000Z");
  await assertRefused(bookWalkthroughHandler(h.call(bookPayload(), verified()), h.deps), "failed-precondition", "slot_unavailable");
  assert.deepEqual(h.db.paths("walkthroughBookings"), []);
});

test("a retried booking returns the same booking; the same request with other answers is refused", async () => {
  const h = harness();
  const first = await bookWalkthroughHandler(h.call(bookPayload(), verified()), h.deps);
  const counted = h.limits.length;
  const again = await bookWalkthroughHandler(h.call(bookPayload(), verified()), h.deps);
  assert.deepEqual(again, {...first, idempotentReplay: true});
  assert.equal(h.limits.length, counted, "a retry spends no rate limit");
  assert.deepEqual(h.db.paths("walkthroughBookings"), [`walkthroughBookings/${BOOKING_ID}`]);
  await assertRefused(bookWalkthroughHandler(h.call(bookPayload({slotStartAt: TUESDAY_10}), verified()), h.deps),
    "already-exists", "request_changed");
  await assertRefused(bookWalkthroughHandler(h.call(bookPayload({manageToken: "u".repeat(43)}), verified()), h.deps),
    "already-exists", "request_changed");
  // The same request id from another verified number is another booking.
  const other = await bookWalkthroughHandler(h.call(bookPayload({slotStartAt: TUESDAY_10}), verified(OTHER_PHONE)), h.deps);
  assert.notEqual(other.bookingId, first.bookingId);
});

test("two people booking one slot at once: exactly one holds it, the other is told it was taken", async () => {
  const h = harness();
  const attempts = await Promise.allSettled([
    bookWalkthroughHandler(h.call(bookPayload({requestId: "web-aaaaaaaaaaaaaaaa"}), verified(PHONE)), h.deps),
    bookWalkthroughHandler(h.call(bookPayload({requestId: "web-bbbbbbbbbbbbbbbb"}), verified(OTHER_PHONE)), h.deps),
  ]);
  assert.equal(attempts.filter((attempt) => attempt.status === "fulfilled").length, 1);
  const lost = attempts.find((attempt): attempt is PromiseRejectedResult => attempt.status === "rejected")!;
  assert.equal(lost.reason.code, "already-exists");
  assert.equal(lost.reason.details.reason, "slot_taken");
  assert.equal(h.db.paths("walkthroughBookings").length, 1);
  const hold = h.db.get("walkthroughSlotHolds/default-20261116T0530Z")!;
  assert.equal(hold.bookingId, (attempts.find((attempt) => attempt.status === "fulfilled") as PromiseFulfilledResult<{bookingId: string}>).value.bookingId);
});

test("a booking that lands while another caller is between its checks and its transaction wins the slot", async () => {
  const h = harness();
  // The first caller has passed its payload and phone checks; while it waits
  // on its rate limit, the second caller books the same slot to completion.
  h.onRateLimit(async (action) => {
    if (action !== "bookWalkthrough") return;
    h.onRateLimit(null);
    await bookWalkthroughHandler(h.call(bookPayload({requestId: "web-bbbbbbbbbbbbbbbb"}), verified(OTHER_PHONE)), h.deps);
  });
  await assertRefused(bookWalkthroughHandler(h.call(bookPayload({requestId: "web-aaaaaaaaaaaaaaaa"}), verified(PHONE)), h.deps),
    "already-exists", "slot_taken");
  assert.equal(h.db.paths("walkthroughBookings").length, 1);
  assert.equal(h.db.get("walkthroughSlotHolds/default-20261116T0530Z")!.bookingId,
    walkthroughBookingId(OTHER_PHONE, "web-bbbbbbbbbbbbbbbb"));
});

test("a number holds one upcoming walkthrough and is pointed at it", async () => {
  const h = harness();
  await bookWalkthroughHandler(h.call(bookPayload(), verified()), h.deps);
  const details = await assertRefused(bookWalkthroughHandler(h.call(bookPayload({requestId: "web-second-request-1", slotStartAt: TUESDAY_10}), verified()), h.deps),
    "failed-precondition", "has_upcoming_booking");
  assert.deepEqual(details, {reason: "has_upcoming_booking", bookingId: BOOKING_ID, managePath: `/start/walkthrough/manage?booking=${BOOKING_ID}`});
  // Once the first is cancelled, the number books again.
  await manageWalkthroughBookingHandler(h.call({bookingId: BOOKING_ID, action: "cancel", manageToken: TOKEN}), h.deps);
  const second = await bookWalkthroughHandler(h.call(bookPayload({requestId: "web-second-request-1", slotStartAt: TUESDAY_10}), verified()), h.deps);
  assert.equal(second.status, "booked");
});

test("the manage link's token cancels a booking, frees its slot, and repeating it changes nothing", async () => {
  const h = harness();
  await bookWalkthroughHandler(h.call(bookPayload(), verified()), h.deps);
  const cancelled = await manageWalkthroughBookingHandler(h.call({bookingId: BOOKING_ID, action: "cancel", manageToken: TOKEN, reason: "Clash"}), h.deps);
  assertContract("ManageWalkthroughBookingCallableResponse", cancelled);
  assert.deepEqual([cancelled.status, cancelled.changed, cancelled.canChange], ["cancelled", true, false]);
  const stored = h.db.get(`walkthroughBookings/${BOOKING_ID}`)!;
  assertContract("WalkthroughBookingDocument", stored);
  assert.deepEqual(stored.cancellation, {at: "2026-11-16T04:00:00.000Z", by: "booker_token", byUid: null, reason: "Clash"});
  assert.equal(h.db.get("walkthroughSlotHolds/default-20261116T0530Z")!.status, "released");
  const slots = await getWalkthroughSlotsHandler(h.call({days: 1}), h.deps);
  assert.equal(slots.days[0].slots[0].startAt, FIRST_OPEN, "the slot is open again");
  const again = await manageWalkthroughBookingHandler(h.call({bookingId: BOOKING_ID, action: "cancel", manageToken: TOKEN}), h.deps);
  assert.equal(again.changed, false);
  await assertRefused(manageWalkthroughBookingHandler(h.call({bookingId: BOOKING_ID, action: "reschedule", manageToken: TOKEN, slotStartAt: TUESDAY_10}), h.deps),
    "failed-precondition", "booking_cancelled");
  // Someone else can now book the freed slot.
  const rebooked = await bookWalkthroughHandler(h.call(bookPayload({requestId: "web-cccccccccccccccc"}), verified(OTHER_PHONE)), h.deps);
  assert.equal(rebooked.slot.startAt, FIRST_OPEN);
});

test("the verified phone opens a booking without the token; anyone else is refused", async () => {
  const h = harness();
  await bookWalkthroughHandler(h.call(bookPayload(), verified()), h.deps);
  const read = await manageWalkthroughBookingHandler(h.call({bookingId: BOOKING_ID, action: "read"}, verified(PHONE, "another-uid")), h.deps);
  assert.deepEqual([read.status, read.confirmed, read.canChange, read.changed], ["booked", false, true, false]);
  await assertRefused(manageWalkthroughBookingHandler(h.call({bookingId: BOOKING_ID, action: "read"}, verified(OTHER_PHONE)), h.deps),
    "permission-denied", "not_yours");
  await assertRefused(manageWalkthroughBookingHandler(h.call({bookingId: BOOKING_ID, action: "cancel", manageToken: "u".repeat(43)}), h.deps),
    "permission-denied", "not_yours");
  await assertRefused(manageWalkthroughBookingHandler(h.call({bookingId: BOOKING_ID, action: "read"}), h.deps),
    "permission-denied", "not_yours");
  await assertRefused(manageWalkthroughBookingHandler(h.call({bookingId: walkthroughBookingId(PHONE, "web-nobody-booked-this"), action: "read", manageToken: TOKEN}), h.deps),
    "not-found", "not_found");
  const cancelled = await manageWalkthroughBookingHandler(h.call({bookingId: BOOKING_ID, action: "cancel"}, verified(PHONE, "another-uid")), h.deps);
  assert.equal(cancelled.status, "cancelled");
  assert.deepEqual(h.db.get(`walkthroughBookings/${BOOKING_ID}`)!.cancellation,
    {at: "2026-11-16T04:00:00.000Z", by: "booker_phone", byUid: "another-uid", reason: null});
});

test("a reschedule moves the hold to an open slot and keeps the history", async () => {
  const h = harness();
  await bookWalkthroughHandler(h.call(bookPayload(), verified()), h.deps);
  const moved = await manageWalkthroughBookingHandler(h.call({bookingId: BOOKING_ID, action: "reschedule", manageToken: TOKEN, slotStartAt: TUESDAY_10}), h.deps);
  assertContract("ManageWalkthroughBookingCallableResponse", moved);
  assert.deepEqual([moved.slot.label, moved.changed, moved.canChange], ["Tue 17 Nov, 10:00 IST", true, true]);
  assert.equal(h.db.get("walkthroughSlotHolds/default-20261116T0530Z")!.status, "released");
  assert.deepEqual(h.db.get("walkthroughSlotHolds/default-20261117T0430Z")!.status, "held");
  const stored = h.db.get(`walkthroughBookings/${BOOKING_ID}`)!;
  assertContract("WalkthroughBookingDocument", stored);
  assert.deepEqual(stored.reschedules, [{fromStartAt: FIRST_OPEN, toStartAt: TUESDAY_10, at: "2026-11-16T04:00:00.000Z", by: "booker_token"}]);
  assert.equal(stored.requestedSlotStartAt, FIRST_OPEN, "a retry of the first request still finds it");
  const replayed = await bookWalkthroughHandler(h.call(bookPayload(), verified()), h.deps);
  assert.deepEqual([replayed.idempotentReplay, replayed.slot.startAt], [true, TUESDAY_10]);
  const same = await manageWalkthroughBookingHandler(h.call({bookingId: BOOKING_ID, action: "reschedule", manageToken: TOKEN, slotStartAt: TUESDAY_10}), h.deps);
  assert.equal(same.changed, false);
});

test("a reschedule refuses a taken slot, a slot inside the lead time, and a walkthrough that has started", async () => {
  const h = harness();
  await bookWalkthroughHandler(h.call(bookPayload(), verified()), h.deps);
  await bookWalkthroughHandler(h.call(bookPayload({requestId: "web-dddddddddddddddd", slotStartAt: TUESDAY_10}), verified(OTHER_PHONE)), h.deps);
  const move = (slotStartAt: string) => manageWalkthroughBookingHandler(h.call({bookingId: BOOKING_ID, action: "reschedule", manageToken: TOKEN, slotStartAt}), h.deps);
  await assertRefused(move(TUESDAY_10), "already-exists", "slot_taken");
  await assertRefused(move(INSIDE_LEAD), "failed-precondition", "slot_unavailable");
  assert.equal(h.db.get("walkthroughSlotHolds/default-20261116T0530Z")!.status, "held", "a refused move keeps the old slot");
  h.setNow("2026-11-16T05:31:00.000Z");
  await assertRefused(move("2026-11-18T04:30:00.000Z"), "failed-precondition", "slot_started");
  await assertRefused(manageWalkthroughBookingHandler(h.call({bookingId: BOOKING_ID, action: "cancel", manageToken: TOKEN}), h.deps),
    "failed-precondition", "slot_started");
  const read = await manageWalkthroughBookingHandler(h.call({bookingId: BOOKING_ID, action: "read", manageToken: TOKEN}), h.deps);
  assert.equal(read.canChange, false);
});

test("the manage call is rate limited per booking and per address", async () => {
  const h = harness();
  await bookWalkthroughHandler(h.call(bookPayload(), verified()), h.deps);
  h.limits.length = 0;
  await manageWalkthroughBookingHandler(h.call({bookingId: BOOKING_ID, action: "read", manageToken: TOKEN}), h.deps);
  assert.deepEqual(h.limits.map((limit) => [limit.action, limit.maxRequests]), [["manageWalkthroughBooking", 30], ["manageWalkthroughBookingAddress", 60]]);
  assert.match(h.limits[0].key, /^walkthrough-booking-[a-f0-9]{32}$/);
});
