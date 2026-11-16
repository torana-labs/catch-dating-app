/* eslint-disable max-len */
import * as admin from "firebase-admin";
import {isDeepStrictEqual} from "node:util";
import {CallableRequest, onCall} from "firebase-functions/v2/https";
import {setAdminAuditLogInTransaction} from "../admin/adminAudit";
import {requireAdminRole} from "../admin/adminAuth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import type {WalkthroughAvailabilityDocument, WalkthroughBookingDocument} from "../shared/generated/firestoreAdminTypes";
import {
  CALENDAR_ID,
  INDIA_TIME_ZONE,
  INDIA_UTC_OFFSET_MINUTES,
  addDays,
  indiaDate,
  indiaInstant,
  normalizedSettings,
  openSlotDays,
  settingsProblems,
} from "./calendar";
import {
  WALKTHROUGH_COLLECTIONS,
  parseAdminListWalkthroughBookingsPayload,
  parseAdminSetWalkthroughAvailabilityPayload,
  parseAdminUpdateWalkthroughBookingPayload,
  refusal,
  type AdminListWalkthroughBookingsResponse,
  type AdminSetWalkthroughAvailabilityResponse,
  type AdminUpdateWalkthroughBookingResponse,
} from "./model";
import {
  MAX_BOOKINGS_READ,
  adminBookingRow,
  availabilityOf,
  availabilityRef,
  availabilityView,
  bookingRef,
  cancelBooking,
  heldInHorizon,
  holdRef,
  isConfirmed,
} from "./store";

// Staff side of walkthrough booking, for adminOwner and admin. These are
// control-plane actions (contracts/admin/actions/walkthroughs.json) until an
// Admin screen is built: set the staff calendar, see the bookings, and record
// a WhatsApp confirmation or cancel for a host. Every change is audited.

export const walkthroughAdminRoles = ["admin", "adminOwner"] as const;

export interface WalkthroughAdminDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => Date;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  checkRateLimit: typeof defaultCheckRateLimit;
}

const defaultDeps: WalkthroughAdminDeps = {
  firestore: () => admin.firestore(),
  now: () => new Date(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
};

const MINUTE = 60 * 1000;
const DEFAULT_LIST_DAYS = 14;

/** Saves the staff calendar when it names the revision it read. Bookings keep their slots. */
export async function adminSetWalkthroughAvailabilityHandler(request: CallableRequest<unknown>,
  deps: WalkthroughAdminDeps = defaultDeps): Promise<AdminSetWalkthroughAvailabilityResponse> {
  const adminContext = requireAdminRole(request, walkthroughAdminRoles);
  const data = parseAdminSetWalkthroughAvailabilityPayload(request.data);
  const db = deps.firestore();
  await deps.checkRateLimit(db, adminContext.uid, "adminSetWalkthroughAvailability", {maxRequests: 30, windowMs: MINUTE});
  const problems = settingsProblems(data.settings);
  if (problems.length) throw refusal("invalid-argument", problems.join(" "), "invalid_settings");
  const settings = normalizedSettings(data.settings);
  const now = deps.now();
  const ref = availabilityRef(db);
  const saved = await db.runTransaction(async (tx) => {
    const current = availabilityOf(await tx.get(ref));
    if ((current?.revision ?? 0) !== data.expectedRevision) {
      throw refusal("aborted", "Someone changed the calendar. Reload it and try again.", "stale_revision");
    }
    if (current && isDeepStrictEqual(current.settings, settings)) return {doc: current, changed: false};
    const doc: WalkthroughAvailabilityDocument = {
      schemaVersion: 1, calendarId: CALENDAR_ID, timeZone: INDIA_TIME_ZONE, utcOffsetMinutes: INDIA_UTC_OFFSET_MINUTES,
      settings, revision: (current?.revision ?? 0) + 1, updatedAt: now.toISOString(), updatedByUid: adminContext.uid,
    };
    tx.set(ref, doc);
    setAdminAuditLogInTransaction(tx, db, adminContext, {
      action: "walkthroughs.set-availability", targetPath: ref.path, request,
      ...(current ? {before: {...current.settings, revision: current.revision}} : {}),
      after: {...settings, revision: doc.revision}, note: data.note ?? null, serverTimestamp: deps.serverTimestamp,
    });
    return {doc, changed: true};
  });
  const held = await heldInHorizon(db, settings, now);
  const nextSlots = openSlotDays({settings, now, held}).flatMap((day) => day.slots).slice(0, 10);
  return {availability: availabilityView(saved.doc)!, nextSlots, changed: saved.changed};
}

export const adminSetWalkthroughAvailability = onCall({...appCheckCallableOptions, maxInstances: 2},
  (request) => adminSetWalkthroughAvailabilityHandler(request));

/** The calendar, the open slot count and the bookings whose slots fall in a range of India-time days. */
export async function adminListWalkthroughBookingsHandler(request: CallableRequest<unknown>,
  deps: WalkthroughAdminDeps = defaultDeps): Promise<AdminListWalkthroughBookingsResponse> {
  const adminContext = requireAdminRole(request, walkthroughAdminRoles);
  const data = parseAdminListWalkthroughBookingsPayload(request.data);
  const db = deps.firestore();
  await deps.checkRateLimit(db, adminContext.uid, "adminListWalkthroughBookings", {maxRequests: 60, windowMs: MINUTE});
  const now = deps.now();
  const fromDate = data.fromDate ?? indiaDate(now);
  const days = data.days ?? DEFAULT_LIST_DAYS;
  const [availabilitySnap, bookingsSnap] = await Promise.all([
    availabilityRef(db).get(),
    db.collection(WALKTHROUGH_COLLECTIONS.bookings)
      .where("slot.startAt", ">=", indiaInstant(fromDate, 0).toISOString())
      .where("slot.startAt", "<", indiaInstant(addDays(fromDate, days), 0).toISOString())
      .orderBy("slot.startAt").limit(MAX_BOOKINGS_READ + 1).get(),
  ]);
  const availability = availabilityOf(availabilitySnap);
  const read = bookingsSnap.docs.map((doc) => doc.data() as WalkthroughBookingDocument);
  const bookings = read.slice(0, MAX_BOOKINGS_READ)
    .filter((booking) => data.includeCancelled === true || booking.status === "booked");
  const settings = availability?.settings ?? null;
  const held = settings ? await heldInHorizon(db, settings, now) : new Set<string>();
  return {
    generatedAt: now.toISOString(),
    timeZone: INDIA_TIME_ZONE,
    fromDate,
    toDate: addDays(fromDate, days - 1),
    availability: availabilityView(availability),
    openSlotCount: openSlotDays({settings, now, held}).reduce((count, day) => count + day.slots.length, 0),
    bookings: bookings.map(adminBookingRow),
    truncated: read.length > MAX_BOOKINGS_READ,
  };
}

export const adminListWalkthroughBookings = onCall({...appCheckCallableOptions, maxInstances: 2},
  (request) => adminListWalkthroughBookingsHandler(request));

/**
 * confirm records that a person confirmed the booking's current slot on
 * WhatsApp, which closes its Admin Inbox task; cancel cancels it for the host
 * and frees the slot. Repeating either changes nothing.
 */
export async function adminUpdateWalkthroughBookingHandler(request: CallableRequest<unknown>,
  deps: WalkthroughAdminDeps = defaultDeps): Promise<AdminUpdateWalkthroughBookingResponse> {
  const adminContext = requireAdminRole(request, walkthroughAdminRoles);
  const data = parseAdminUpdateWalkthroughBookingPayload(request.data);
  const db = deps.firestore();
  await deps.checkRateLimit(db, adminContext.uid, "adminUpdateWalkthroughBooking", {maxRequests: 60, windowMs: MINUTE});
  const now = deps.now();
  const nowIso = now.toISOString();
  const ref = bookingRef(db, data.bookingId);
  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) throw refusal("not-found", "We could not find that booking.", "not_found");
    const booking = snapshot.data() as WalkthroughBookingDocument;
    const audit = (after: WalkthroughBookingDocument) => setAdminAuditLogInTransaction(tx, db, adminContext, {
      action: `walkthroughs.${data.action}-booking`, targetPath: ref.path, request,
      before: {status: booking.status, slotStartAt: booking.slot.startAt, confirmed: isConfirmed(booking)},
      after: {status: after.status, slotStartAt: after.slot.startAt, confirmed: isConfirmed(after)},
      note: data.note ?? null, serverTimestamp: deps.serverTimestamp,
    });
    if (data.action === "confirm") {
      if (booking.status === "cancelled") {
        throw refusal("failed-precondition", "This booking was cancelled.", "booking_cancelled");
      }
      if (isConfirmed(booking)) return {booking: adminBookingRow(booking), changed: false};
      const confirmed: WalkthroughBookingDocument = {...booking, updatedAt: nowIso,
        staffConfirmation: {byUid: adminContext.uid, at: nowIso, slotStartAt: booking.slot.startAt, note: data.note ?? null}};
      tx.set(ref, confirmed);
      audit(confirmed);
      return {booking: adminBookingRow(confirmed), changed: true};
    }
    if (booking.status === "cancelled") return {booking: adminBookingRow(booking), changed: false};
    const holdSnap = await tx.get(holdRef(db, booking.slot.startAt));
    const cancelled = cancelBooking(tx, db, booking, holdSnap,
      {at: nowIso, by: "staff", byUid: adminContext.uid, reason: data.note ?? null}, now);
    audit(cancelled);
    return {booking: adminBookingRow(cancelled), changed: true};
  });
}

export const adminUpdateWalkthroughBooking = onCall({...appCheckCallableOptions, maxInstances: 2},
  (request) => adminUpdateWalkthroughBookingHandler(request));
