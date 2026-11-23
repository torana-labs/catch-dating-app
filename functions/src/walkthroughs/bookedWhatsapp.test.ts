/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import {MetaProviderError} from "../platform/delivery/organizerWhatsappProvider";
import type {CatchTemplateName} from "../catchMessaging/catchTemplates";
import {CATCH_TEMPLATES} from "../catchMessaging/catchTemplates";
import {CATCH_ENDPOINT_STOPS} from "../catchMessaging/whatsappEndpointStops";
import {catchEndpointHash, catchStopId} from "../catchMessaging/whatsappReply";
import {supportConversationId} from "../supportInbox/conversations";
import {projectWalkthroughBooking} from "../admin/inbox/walkthroughBookings";
import {
  sendWalkthroughBooked,
  walkthroughBookedMessageId,
  walkthroughSlotTime,
  type WalkthroughBookedDeps,
} from "./bookedWhatsapp";
import {walkthroughBookingId} from "./model";
import {bookWalkthroughHandler, manageWalkthroughBookingHandler} from "./publicCallables";
import {FIRST_OPEN, NOW, PHONE, TOKEN, TUESDAY_10, assertContract, bookPayload, harness, verified} from "./testHarness";

const scope = {wabaId: "123", phoneNumberId: "456"};
const BOOKING_ID = walkthroughBookingId(PHONE, "web-0f3c2a9e-5b1d-4c7e");
const conversationId = supportConversationId("whatsapp", PHONE);

function setup(options: {enabled?: boolean; noSender?: boolean; now?: string} = {}) {
  const h = harness({now: options.now});
  const sent: Array<{to: string; template: CatchTemplateName; variables: Record<string, string>}> = [];
  const warnings: string[] = [];
  let failure: unknown = null;
  let clock = Date.parse(options.now ?? NOW);
  const booked: WalkthroughBookedDeps = {
    config: () => ({enabled: options.enabled ?? true, ...scope}),
    db: () => h.db.asFirestore(),
    nowMillis: () => clock,
    sender: async () => options.noSender ? null : async (to, template, variables) => {
      if (failure) throw failure;
      sent.push({to, template, variables});
      return `wamid.bk${sent.length}`;
    },
    findUidByPhone: async () => null,
    warn: (message) => {
      warnings.push(message);
    },
  };
  const deps = {...h.deps, sendBookedMessage: (bookingId: string) => sendWalkthroughBooked(booked, bookingId)};
  return {...h, deps, booked, sent, warnings,
    fail: (error: unknown) => {
      failure = error;
    },
    advance: (iso: string) => {
      clock = Date.parse(iso);
      h.setNow(iso);
    },
    booking: () => h.db.get(`walkthroughBookings/${BOOKING_ID}`)! as Record<string, unknown>,
    message: (id: string) => h.db.get(`supportConversations/${conversationId}/messages/${id}`) as Record<string, unknown> | undefined,
  };
}

const sentRecord = (value: unknown) => value as Record<string, unknown>;

test("the slot reads in India time as the template says it", () => {
  assert.equal(walkthroughSlotTime("2026-11-25T05:30:00.000Z"), "Wed 25 Nov, 11:00 AM");
  assert.equal(walkthroughSlotTime(FIRST_OPEN), "Mon 16 Nov, 11:00 AM");
  assert.equal(walkthroughSlotTime("2026-11-17T08:30:00.000Z"), "Tue 17 Nov, 2:00 PM");
  assert.equal(walkthroughSlotTime("2026-11-17T06:30:00.000Z"), "Tue 17 Nov, 12:00 PM");
  assert.equal(walkthroughSlotTime("2026-11-30T18:45:00.000Z"), "Tue 1 Dec, 12:15 AM");
});

test("a booking sends the booked template once to the verified number, recorded on the booking and in Support", async () => {
  const h = setup();
  await bookWalkthroughHandler(h.call(bookPayload(), verified()), h.deps);
  assert.deepEqual(h.sent, [{to: PHONE, template: "host_walkthrough_booked",
    variables: {first_name: "Asha", slot_time: "Mon 16 Nov, 11:00 AM"}}]);
  const messageId = walkthroughBookedMessageId(scope, BOOKING_ID, FIRST_OPEN);
  const stored = h.booking();
  assertContract("WalkthroughBookingDocument", stored);
  const record = sentRecord(stored.bookedWhatsapp);
  assert.equal(record.slotStartAt, FIRST_OPEN);
  assert.equal(record.state, "accepted");
  assert.equal(record.messageId, messageId);
  assert.equal(record.providerMessageId, "wamid.bk1");
  assert.equal(record.conversationId, conversationId);
  const message = h.message(messageId)!;
  assert.equal(message.authorUid, null);
  assert.equal(message.deliveryState, "accepted");
  assert.equal(message.text, CATCH_TEMPLATES.host_walkthrough_booked.text({first_name: "Asha", slot_time: "Mon 16 Nov, 11:00 AM"}));

  // A retried booking request or a repeated call sends nothing more.
  await bookWalkthroughHandler(h.call(bookPayload(), verified()), h.deps);
  assert.equal(await sendWalkthroughBooked(h.booked, BOOKING_ID), "replayed");
  assert.equal(h.sent.length, 1);

  const projection = projectWalkthroughBooking(BOOKING_ID, h.booking())!;
  assert.ok(projection.journey.some((step) => step.title === "Sent the booking message for Mon 16 Nov, 11:00 IST on WhatsApp"));
  assert.equal(projection.state.code, "confirm_on_whatsapp", "staff still confirm the time");
});

test("a move sends again with the new time; moving back to a time already sent does not", async () => {
  const h = setup();
  await bookWalkthroughHandler(h.call(bookPayload(), verified()), h.deps);
  const move = (slotStartAt: string) => manageWalkthroughBookingHandler(
    h.call({bookingId: BOOKING_ID, action: "reschedule", manageToken: TOKEN, slotStartAt}), h.deps);
  await move(TUESDAY_10);
  assert.deepEqual(h.sent.map((send) => send.variables.slot_time), ["Mon 16 Nov, 11:00 AM", "Tue 17 Nov, 10:00 AM"]);
  assert.equal(sentRecord(h.booking().bookedWhatsapp).slotStartAt, TUESDAY_10);
  assertContract("WalkthroughBookingDocument", h.booking());
  // The same slot again is no change, so nothing is sent.
  await move(TUESDAY_10);
  await move(FIRST_OPEN);
  assert.equal(h.sent.length, 2);
  // Reads and cancellations send nothing.
  await manageWalkthroughBookingHandler(h.call({bookingId: BOOKING_ID, action: "cancel", manageToken: TOKEN}), h.deps);
  assert.equal(await sendWalkthroughBooked(h.booked, BOOKING_ID), "notApplicable");
  assert.equal(h.sent.length, 2);
});

test("the booked template is skipped while off, for internal tests, after STOP, without a sender, and for an old booking", async () => {
  const off = setup({enabled: false});
  await bookWalkthroughHandler(off.call(bookPayload(), verified()), off.deps);
  assert.equal(off.booking().bookedWhatsapp, undefined);

  const qa = setup();
  await bookWalkthroughHandler(qa.call(bookPayload({name: "[QA] Walkthrough"}), verified()), qa.deps);
  assert.equal(qa.booking().bookedWhatsapp, undefined);

  const stopped = setup();
  await stopped.db.doc(`${CATCH_ENDPOINT_STOPS}/${catchStopId(scope, catchEndpointHash(PHONE))}`).set({stopId: "x"});
  await bookWalkthroughHandler(stopped.call(bookPayload(), verified()), stopped.deps);
  assert.deepEqual([sentRecord(stopped.booking().bookedWhatsapp).state, sentRecord(stopped.booking().bookedWhatsapp).skipReason],
    ["skipped", "stopped"]);
  assertContract("WalkthroughBookingDocument", stopped.booking());

  const noSender = setup({noSender: true});
  await bookWalkthroughHandler(noSender.call(bookPayload(), verified()), noSender.deps);
  assert.equal(sentRecord(noSender.booking().bookedWhatsapp).skipReason, "unavailable");
  assert.deepEqual(noSender.warnings, ["Walkthrough booked message not sent: no WhatsApp sender here."]);

  const late = setup();
  await bookWalkthroughHandler(late.call(bookPayload({slotStartAt: TUESDAY_10}), verified()), {...late.deps, sendBookedMessage: undefined});
  late.advance("2026-11-16T11:00:00.000Z");
  assert.equal(await sendWalkthroughBooked(late.booked, BOOKING_ID), "stale");
  assert.equal(stopped.sent.length + noSender.sent.length + off.sent.length + qa.sent.length + late.sent.length, 0);
});

test("a refused or unconfirmed booked message is recorded and never retried, and the booking stands", async () => {
  const refused = setup();
  refused.fail(new MetaProviderError("Refused", 131026, 400));
  const booked = await bookWalkthroughHandler(refused.call(bookPayload(), verified()), refused.deps);
  assert.equal(booked.status, "booked");
  const record = sentRecord(refused.booking().bookedWhatsapp);
  assert.deepEqual([record.state, record.deliveryErrorCode], ["failed", 131026]);
  assert.deepEqual(refused.warnings, ["Walkthrough booked message refused by WhatsApp."]);
  refused.fail(null);
  assert.equal(await sendWalkthroughBooked(refused.booked, BOOKING_ID), "replayed");

  const lost = setup();
  lost.fail(new Error("socket hang up"));
  await bookWalkthroughHandler(lost.call(bookPayload(), verified()), lost.deps);
  assert.equal(sentRecord(lost.booking().bookedWhatsapp).state, "unknown");
  assert.equal(refused.sent.length + lost.sent.length, 0);
});
