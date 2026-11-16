/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import {nextInboxItem, type InboxProjection} from "../admin/inbox/model";
import {syncInboxProjection} from "../admin/inbox/store";
import {contractValidator} from "../shared/contractTestValidators";
import {adminUpdateWalkthroughBookingHandler} from "./adminCallables";
import {projectWalkthroughBooking, WALKTHROUGH_INBOX_SOURCE_KIND} from "./inbox";
import {bookWalkthroughHandler, manageWalkthroughBookingHandler} from "./publicCallables";
import {walkthroughBookingId} from "./model";
import {PHONE, TOKEN, TUESDAY_10, bookPayload, harness, staff, verified} from "./testHarness";

const BOOKING_ID = walkthroughBookingId(PHONE, "web-0f3c2a9e-5b1d-4c7e");
const ITEM_ID = `walkthrough-${BOOKING_ID}`;

// The walkthroughBooking kind joins INBOX_SOURCE_KINDS in admin/inbox/model.ts
// with the hand-off's model and schema edit; until then the store is handed
// the projection widened to InboxProjection.
const widened = (projection: ReturnType<typeof projectWalkthroughBooking>) => projection as unknown as InboxProjection;

async function booked() {
  const h = harness();
  await bookWalkthroughHandler(h.call(bookPayload(), verified()), h.deps);
  const project = () => projectWalkthroughBooking(BOOKING_ID, h.db.get(`walkthroughBookings/${BOOKING_ID}`)!)!;
  return {h, project};
}

test("a new booking opens an Admin Inbox task to confirm on WhatsApp, with the number to reply to", async () => {
  const {h, project} = await booked();
  const projection = project();
  assert.deepEqual({...projection, journey: undefined}, {
    itemId: ITEM_ID, type: "enquiry", sourceKind: WALKTHROUGH_INBOX_SOURCE_KIND, sourceId: BOOKING_ID,
    sourcePath: `walkthroughBookings/${BOOKING_ID}`, title: "Asha", subtitle: "Walkthrough Mon 16 Nov, 11:00 IST",
    cameFrom: "Host website", nominatorUid: null, city: "mumbai",
    state: {code: "confirm_on_whatsapp", label: "Confirm on WhatsApp", tone: "warning"},
    lifecycle: "open", waitingSince: "2026-11-16T04:00:00.000Z", closedAt: null, recommendation: null, journey: undefined,
  });
  assert.deepEqual(projection.journey, [{stepId: "booked", occurredAt: "2026-11-16T04:00:00.000Z",
    title: "Booked a walkthrough for Mon 16 Nov, 11:00 IST", detail: `Reply on WhatsApp to ${PHONE}`, actorUid: null, tone: "ink"}]);

  // Through the real inbox store, it is one waiting item and its journey.
  const result = await syncInboxProjection(h.db.asFirestore(), widened(projection), new Date("2026-11-16T04:00:05.000Z"));
  assert.deepEqual(result, {itemId: ITEM_ID, outcome: "written", addedSteps: 1});
  const item = h.db.get(`adminInboxItems/${ITEM_ID}`)!;
  assert.deepEqual([item.status, item.type, item.title, item.assigneeUid], ["waiting", "enquiry", "Asha", null]);
  assert.deepEqual(h.db.get(`adminInboxJourney/${ITEM_ID}~booked`)!.title, "Booked a walkthrough for Mon 16 Nov, 11:00 IST");
  // The stored item meets the inbox contract except for the new kind, which the hand-off's schema edit adds.
  const validate = contractValidator("AdminInboxItemDocument");
  assert.equal(validate(item), false);
  assert.deepEqual((validate.errors ?? []).map((error) => error.instancePath), ["/sourceKind"]);
  assert.equal(validate({...item, sourceKind: "salesInboundIntent"}), true);
});

test("the task follows the booking: a confirmation closes it, a move reopens it, a cancellation closes it", async () => {
  const {h, project} = await booked();
  const now = new Date("2026-11-16T04:10:00.000Z");
  const first = nextInboxItem(widened(project()), null, now);
  assert.equal(first.status, "waiting");

  await adminUpdateWalkthroughBookingHandler(h.call({bookingId: BOOKING_ID, action: "confirm", note: "Sent the Meet link"}, staff()), h.deps);
  const confirmed = project();
  assert.deepEqual([confirmed.lifecycle, confirmed.state.code, confirmed.closedAt], ["closed", "confirmed", "2026-11-16T04:00:00.000Z"]);
  assert.deepEqual(confirmed.journey.at(-1), {stepId: "confirmed-20261116T0530", occurredAt: "2026-11-16T04:00:00.000Z",
    title: "Confirmed Mon 16 Nov, 11:00 IST on WhatsApp", detail: "Sent the Meet link", actorUid: "staff-riya", tone: "success"});
  const done = nextInboxItem(widened(confirmed), first, now);
  assert.equal(done.status, "done");

  h.setNow("2026-11-16T04:20:00.000Z");
  await manageWalkthroughBookingHandler(h.call({bookingId: BOOKING_ID, action: "reschedule", manageToken: TOKEN, slotStartAt: TUESDAY_10}), h.deps);
  const moved = project();
  assert.deepEqual([moved.lifecycle, moved.state.label, moved.waitingSince, moved.subtitle],
    ["open", "Moved, confirm the new time on WhatsApp", "2026-11-16T04:20:00.000Z", "Walkthrough Tue 17 Nov, 10:00 IST"]);
  assert.deepEqual(moved.journey.map((step) => step.stepId), ["booked", "moved-1", "confirmed-20261116T0530"]);
  assert.equal(moved.journey[1].title, "Moved to Tue 17 Nov, 10:00 IST");
  const reopened = nextInboxItem(widened(moved), done, now);
  assert.deepEqual([reopened.status, reopened.doneAt], ["waiting", null]);

  h.setNow("2026-11-16T04:30:00.000Z");
  await manageWalkthroughBookingHandler(h.call({bookingId: BOOKING_ID, action: "cancel", manageToken: TOKEN, reason: "Found another time"}), h.deps);
  const cancelled = project();
  assert.deepEqual([cancelled.lifecycle, cancelled.state.code, cancelled.closedAt], ["closed", "cancelled", "2026-11-16T04:30:00.000Z"]);
  assert.deepEqual(cancelled.journey.at(-1), {stepId: "cancelled", occurredAt: "2026-11-16T04:30:00.000Z", title: "Cancelled by the host",
    detail: "Found another time", actorUid: null, tone: "muted"});
  assert.equal(nextInboxItem(widened(cancelled), reopened, now).status, "done");
});

test("a document that is not this booking projects to nothing", () => {
  assert.equal(projectWalkthroughBooking(BOOKING_ID, {}), null);
  assert.equal(projectWalkthroughBooking(BOOKING_ID, {schemaVersion: 1, bookingId: "wt-other"}), null);
});
