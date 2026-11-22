/* eslint-disable max-len */
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import {CallableRequest, onCall} from "firebase-functions/v2/https";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import type {WalkthroughBookingDocument} from "../shared/generated/firestoreAdminTypes";
import {
  CALENDAR_ID,
  INDIA_TIME_ZONE,
  INDIA_UTC_OFFSET,
  bookingOpen,
  effectiveAvailability,
  holdIdFor,
  offeredSlot,
  openSlotDays,
} from "./calendar";
import {
  DEFAULT_SLOT_DAYS,
  MAX_RESCHEDULES,
  STAFF_REPLY,
  WALKTHROUGH_COLLECTIONS,
  clientAddress,
  limiterKey,
  managePath,
  manageTokenHash,
  manageTokenMatches,
  parseBookWalkthroughPayload,
  parseGetWalkthroughSlotsPayload,
  parseManageWalkthroughBookingPayload,
  refusal,
  verifiedPhone,
  walkthroughBookingId,
  type BookWalkthroughPayload,
  type BookWalkthroughResponse,
  type GetWalkthroughSlotsResponse,
  type ManageWalkthroughBookingResponse,
} from "./model";
import {defaultWalkthroughBookedDeps, sendWalkthroughBooked} from "./bookedWhatsapp";
import {
  availabilityOf,
  availabilityRef,
  bookingRef,
  cancelBooking,
  heldByOther,
  heldInHorizon,
  holdRef,
  isConfirmed,
  publicSlot,
  releaseHoldIfOwned,
  writeHold,
} from "./store";

// The website's walkthrough booking (Start / Walkthrough page):
//
// - getWalkthroughSlots: public, App Check. The open slots of the next days,
//   times only, from the saved staff calendar or, while none is saved, the
//   built-in default (calendar.ts DEFAULT_AVAILABILITY). bookingOpen false
//   means staff closed booking: show the request form.
// - bookWalkthrough: App Check and a Firebase sign-in whose phone was verified
//   with a one-time code. Books one slot for that WhatsApp number, once per
//   request id, and opens a task in the Admin Inbox (inbox.ts), where a
//   person confirms on WhatsApp. Catch's number also sends the approved
//   "your walkthrough is booked" template (bookedWhatsapp.ts, off unless
//   CATCH_WHATSAPP_WALKTHROUGH_BOOKED_ENABLED).
// - manageWalkthroughBooking: App Check. Reads, cancels or moves a booking for
//   whoever holds its manage token or signs in with its verified phone. A
//   move sends that template again with the new time.
//
// A refusal carries details.reason (model.ts WalkthroughRefusal).

export interface WalkthroughDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => Date;
  checkRateLimit: typeof defaultCheckRateLimit;
  /** The WhatsApp message for a booking's new slot; never throws. Absent: none. */
  sendBookedMessage?: (bookingId: string) => Promise<unknown>;
}

const defaultDeps: WalkthroughDeps = {
  firestore: () => admin.firestore(),
  now: () => new Date(),
  checkRateLimit: defaultCheckRateLimit,
  sendBookedMessage: (bookingId) => sendWalkthroughBooked(defaultWalkthroughBookedDeps, bookingId),
};

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
/** Upcoming bookings one number is checked against; one is allowed. */
const PHONE_BOOKINGS_READ = 20;

/** Open slots, times only: no staff, no other bookings. */
export async function getWalkthroughSlotsHandler(request: CallableRequest<unknown>,
  deps: WalkthroughDeps = defaultDeps): Promise<GetWalkthroughSlotsResponse> {
  const data = parseGetWalkthroughSlotsPayload(request.data);
  const db = deps.firestore();
  await deps.checkRateLimit(db, limiterKey("ip", clientAddress(request)), "getWalkthroughSlots",
    {maxRequests: 120, windowMs: 10 * MINUTE});
  const now = deps.now();
  const {settings} = effectiveAvailability(availabilityOf(await availabilityRef(db).get())?.settings);
  const open = bookingOpen(settings);
  const held = open ? await heldInHorizon(db, settings, now) : new Set<string>();
  return {
    timeZone: INDIA_TIME_ZONE,
    utcOffset: INDIA_UTC_OFFSET,
    bookingOpen: open,
    slotMinutes: settings.slotMinutes,
    generatedAt: now.toISOString(),
    days: openSlotDays({settings, now, days: data.days ?? DEFAULT_SLOT_DAYS, held}),
    followUp: STAFF_REPLY,
  };
}

export const getWalkthroughSlots = onCall(appCheckCallableOptionsWithLimits({maxInstances: 10}),
  (request) => getWalkthroughSlotsHandler(request));

/**
 * Books one open slot for the caller's verified WhatsApp number. Limits: per
 * number, per network address and a daily ceiling for the whole page. A
 * number holds at most one upcoming booking; it moves that one instead.
 */
export async function bookWalkthroughHandler(request: CallableRequest<unknown>,
  deps: WalkthroughDeps = defaultDeps): Promise<BookWalkthroughResponse> {
  const data = parseBookWalkthroughPayload(request.data);
  const verified = verifiedPhone(request, data.phone);
  const db = deps.firestore();
  const bookingId = walkthroughBookingId(verified.phone, data.requestId);
  const ref = bookingRef(db, bookingId);
  const existing = await ref.get();
  if (existing.exists) return replay(existing.data() as WalkthroughBookingDocument, data);

  await deps.checkRateLimit(db, limiterKey("phone", verified.phone), "bookWalkthrough",
    {maxRequests: 5, windowMs: HOUR});
  await deps.checkRateLimit(db, limiterKey("ip", clientAddress(request)), "bookWalkthroughAddress",
    {maxRequests: 20, windowMs: HOUR});
  await deps.checkRateLimit(db, "walkthrough-all", "bookWalkthroughDaily", {maxRequests: 200, windowMs: DAY});

  const now = deps.now();
  const nowIso = now.toISOString();
  const slotHold = holdRef(db, data.slotStartAt);
  const phoneBookings = db.collection(WALKTHROUGH_COLLECTIONS.bookings)
    .where("phone", "==", verified.phone).limit(PHONE_BOOKINGS_READ);
  const outcome = await db.runTransaction(async (tx): Promise<
    {replayOf: WalkthroughBookingDocument; created?: never} | {created: WalkthroughBookingDocument; replayOf?: never}> => {
    const [bookingSnap, holdSnap, availabilitySnap] = await tx.getAll(ref, slotHold, availabilityRef(db));
    if (bookingSnap.exists) return {replayOf: bookingSnap.data() as WalkthroughBookingDocument};
    const {settings} = effectiveAvailability(availabilityOf(availabilitySnap)?.settings);
    if (!bookingOpen(settings)) {
      throw refusal("failed-precondition", "Walkthrough booking is closed right now. Ask for a time instead.", "booking_closed");
    }
    const slot = offeredSlot(settings, now, data.slotStartAt);
    if (!slot) throw refusal("failed-precondition", "That time is no longer offered. Pick another.", "slot_unavailable");
    if (heldByOther(holdSnap, bookingId)) {
      throw refusal("already-exists", "Someone just booked that time. Pick another.", "slot_taken");
    }
    const upcoming = (await tx.get(phoneBookings)).docs.map((doc) => doc.data() as WalkthroughBookingDocument)
      .find((booking) => booking.status === "booked" && booking.slot.endAt > nowIso);
    if (upcoming) {
      throw refusal("failed-precondition", "This number already has a walkthrough booked. Move that one instead.",
        "has_upcoming_booking", {bookingId: upcoming.bookingId, managePath: managePath(upcoming.bookingId)});
    }
    const booking: WalkthroughBookingDocument = {
      schemaVersion: 1,
      bookingId,
      calendarId: CALENDAR_ID,
      requestId: data.requestId,
      status: "booked",
      slot: {holdId: holdIdFor(slot.startAt), ...slot},
      requestedSlotStartAt: slot.startAt,
      phone: verified.phone,
      verifiedByUid: verified.uid,
      manageTokenHash: manageTokenHash(data.manageToken),
      name: data.name?.trim() || null,
      details: data.details ?? {},
      cityId: data.cityId ?? null,
      consent: {purpose: data.consent.purpose, version: data.consent.version, decidedAt: nowIso},
      sourcePage: data.sourcePage,
      entry: data.entry,
      followUp: STAFF_REPLY,
      staffConfirmation: null,
      reschedules: [],
      cancellation: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    writeHold(tx, db, slot, bookingId, "held", now);
    tx.set(ref, booking);
    return {created: booking};
  });
  if (outcome.replayOf) return replay(outcome.replayOf, data);
  // The number and the token stay out of logs.
  logger.info("Walkthrough booked.", {bookingId, slotStartAt: outcome.created.slot.startAt, entry: data.entry});
  await deps.sendBookedMessage?.(bookingId);
  return bookingResponse(outcome.created, false);
}

export const bookWalkthrough = onCall(appCheckCallableOptionsWithLimits({maxInstances: 5}),
  (request) => bookWalkthroughHandler(request));

/** A retry of the same request finds its booking; the same request id with other answers is refused. */
function replay(booking: WalkthroughBookingDocument, data: BookWalkthroughPayload): BookWalkthroughResponse {
  if (booking.requestedSlotStartAt !== data.slotStartAt || !manageTokenMatches(data.manageToken, booking.manageTokenHash)) {
    throw refusal("already-exists", "This booking request changed. Start again.", "request_changed");
  }
  return bookingResponse(booking, true);
}

function bookingResponse(booking: WalkthroughBookingDocument, idempotentReplay: boolean): BookWalkthroughResponse {
  return {bookingId: booking.bookingId, status: booking.status, slot: publicSlot(booking), timeZone: INDIA_TIME_ZONE,
    followUp: STAFF_REPLY, managePath: managePath(booking.bookingId), idempotentReplay};
}

/**
 * The booker reads, cancels or moves their booking. Proof is the manage
 * link's token, or a sign-in whose verified phone is the booking's number.
 * Nothing changes once the slot has started.
 */
export async function manageWalkthroughBookingHandler(request: CallableRequest<unknown>,
  deps: WalkthroughDeps = defaultDeps): Promise<ManageWalkthroughBookingResponse> {
  const data = parseManageWalkthroughBookingPayload(request.data);
  const db = deps.firestore();
  await deps.checkRateLimit(db, limiterKey("booking", data.bookingId), "manageWalkthroughBooking",
    {maxRequests: 30, windowMs: HOUR});
  await deps.checkRateLimit(db, limiterKey("ip", clientAddress(request)), "manageWalkthroughBookingAddress",
    {maxRequests: 60, windowMs: HOUR});
  const now = deps.now();
  const nowIso = now.toISOString();
  const ref = bookingRef(db, data.bookingId);
  const target = data.slotStartAt ? holdRef(db, data.slotStartAt) : null;
  const result = await db.runTransaction(async (tx): Promise<ManageWalkthroughBookingResponse> => {
    const bookingSnap = await tx.get(ref);
    if (!bookingSnap.exists) throw refusal("not-found", "We could not find that booking.", "not_found");
    const booking = bookingSnap.data() as WalkthroughBookingDocument;
    const actor = manageTokenMatches(data.manageToken, booking.manageTokenHash) ? "booker_token" as const :
      request.auth?.token?.phone_number === booking.phone ? "booker_phone" as const : null;
    if (!actor) {
      throw refusal("permission-denied",
        "Open the link from your booking, or confirm the number you booked with.", "not_yours");
    }
    const started = booking.slot.startAt <= nowIso;
    const answer = (current: WalkthroughBookingDocument, changed: boolean): ManageWalkthroughBookingResponse => ({
      bookingId: current.bookingId, status: current.status, slot: publicSlot(current), timeZone: INDIA_TIME_ZONE,
      confirmed: isConfirmed(current), canChange: current.status === "booked" && current.slot.startAt > nowIso,
      followUp: STAFF_REPLY, changed,
    });
    if (data.action === "read") return answer(booking, false);
    if (booking.status === "cancelled") {
      if (data.action === "cancel") return answer(booking, false);
      throw refusal("failed-precondition", "This booking was cancelled. Book a new time.", "booking_cancelled");
    }
    if (started) throw refusal("failed-precondition", "This walkthrough has already started.", "slot_started");
    const currentHold = holdRef(db, booking.slot.startAt);
    if (data.action === "cancel") {
      const holdSnap = await tx.get(currentHold);
      const cancelled = cancelBooking(tx, db, booking, holdSnap,
        {at: nowIso, by: actor, byUid: request.auth?.uid ?? null, reason: data.reason ?? null}, now);
      return answer(cancelled, true);
    }
    // reschedule
    if (data.slotStartAt === booking.slot.startAt) return answer(booking, false);
    if (booking.reschedules.length >= MAX_RESCHEDULES) {
      throw refusal("failed-precondition", "This booking has moved too often. Cancel it and book again.", "too_many_changes");
    }
    const [holdSnap, targetSnap, availabilitySnap] = await tx.getAll(currentHold, target!, availabilityRef(db));
    const {settings} = effectiveAvailability(availabilityOf(availabilitySnap)?.settings);
    const slot = offeredSlot(settings, now, data.slotStartAt!);
    if (!slot) throw refusal("failed-precondition", "That time is no longer offered. Pick another.", "slot_unavailable");
    if (heldByOther(targetSnap, booking.bookingId)) {
      throw refusal("already-exists", "Someone just booked that time. Pick another.", "slot_taken");
    }
    const moved: WalkthroughBookingDocument = {
      ...booking,
      slot: {holdId: holdIdFor(slot.startAt), ...slot},
      reschedules: [...booking.reschedules, {fromStartAt: booking.slot.startAt, toStartAt: slot.startAt, at: nowIso, by: actor}],
      updatedAt: nowIso,
    };
    releaseHoldIfOwned(tx, db, holdSnap, booking, now);
    writeHold(tx, db, slot, booking.bookingId, "held", now);
    tx.set(ref, moved);
    return answer(moved, true);
  });
  if (data.action === "reschedule" && result.changed) await deps.sendBookedMessage?.(data.bookingId);
  return result;
}

export const manageWalkthroughBooking = onCall(appCheckCallableOptionsWithLimits({maxInstances: 5}),
  (request) => manageWalkthroughBookingHandler(request));
