/* eslint-disable max-len */
import {createHash, timingSafeEqual} from "node:crypto";
import {CallableRequest, HttpsError, type FunctionsErrorCode} from "firebase-functions/v2/https";
import type {AvailabilitySettings, CalendarSource, Slot, SlotMinutes, WeeklyWindow} from "./calendar";

// The walkthrough booking contracts (contracts/callables/*walkthrough*,
// contracts/callable_responses/*walkthrough*, contracts/firestore/walkthrough_*
// and contracts/shared/walkthrough_common.schema.json) as TypeScript, and the
// hand-written payload checks.
//
// The payloads are checked here field for field with their schemas because the
// generated runtime validators come from contracts/functions/runtime_modules.json,
// which other open work holds. model.test.ts proves each check and its schema
// accept and refuse the same payloads; once the payload names are registered
// there, these can become the generated validators.

export const WALKTHROUGH_COLLECTIONS = {
  availability: "walkthroughAvailability",
  bookings: "walkthroughBookings",
  holds: "walkthroughSlotHolds",
} as const;

export const MANAGE_PATH_PREFIX = "/start/walkthrough/manage?booking=";
export const DEFAULT_SLOT_DAYS = 14;
export const MAX_RESCHEDULES = 10;

/** A person confirms on WhatsApp; nothing is sent automatically (decision 28). */
export const STAFF_REPLY = {channel: "whatsapp", mode: "staff_reply"} as const;
export type FollowUp = typeof STAFF_REPLY;

/**
 * Why a call was refused, sent as HttpsError details.reason so the website can
 * choose its words: phone_unverified and phone_mismatch ask for the code
 * again; booking_closed shows the request form; slot_unavailable and
 * slot_taken reload the slots; has_upcoming_booking links to the booking it
 * names; request_changed starts a fresh request id.
 */
export type WalkthroughRefusal = "phone_unverified" | "phone_mismatch" | "booking_closed" | "slot_unavailable" |
  "slot_taken" | "has_upcoming_booking" | "request_changed" | "not_found" | "not_yours" | "slot_started" |
  "booking_cancelled" | "too_many_changes" | "stale_revision" | "invalid_settings";

export function refusal(code: FunctionsErrorCode, message: string, reason: WalkthroughRefusal,
  extra: Record<string, string> = {}): HttpsError {
  return new HttpsError(code, message, {reason, ...extra});
}

export interface ConsentInput {
  purpose: "leadFollowUp";
  version: string;
}

export interface WalkthroughDetails {
  organisation?: string;
  whatYouRun?: string;
}

export interface GetWalkthroughSlotsPayload {
  days?: number;
}

export interface GetWalkthroughSlotsResponse {
  timeZone: "Asia/Kolkata";
  utcOffset: "+05:30";
  bookingOpen: boolean;
  slotMinutes: SlotMinutes | null;
  generatedAt: string;
  days: Array<{date: string; weekday: number; label: string; slots: Slot[]}>;
  followUp: FollowUp;
}

export interface BookWalkthroughPayload {
  requestId: string;
  slotStartAt: string;
  manageToken: string;
  phone?: string;
  consent: ConsentInput;
  name?: string;
  details?: WalkthroughDetails;
  cityId?: string;
  sourcePage: string;
  entry: string;
}

export interface BookWalkthroughResponse {
  bookingId: string;
  status: "booked" | "cancelled";
  slot: Slot;
  timeZone: "Asia/Kolkata";
  followUp: FollowUp;
  managePath: string;
  idempotentReplay: boolean;
}

export interface ManageWalkthroughBookingPayload {
  bookingId: string;
  action: "read" | "cancel" | "reschedule";
  manageToken?: string;
  slotStartAt?: string;
  reason?: string;
}

export interface ManageWalkthroughBookingResponse {
  bookingId: string;
  status: "booked" | "cancelled";
  slot: Slot;
  timeZone: "Asia/Kolkata";
  confirmed: boolean;
  canChange: boolean;
  followUp: FollowUp;
  changed: boolean;
}

export interface AdminSetWalkthroughAvailabilityPayload {
  expectedRevision: number;
  settings: AvailabilitySettings;
  note?: string;
}

export interface AvailabilityView {
  settings: AvailabilitySettings;
  revision: number;
  updatedAt: string;
  updatedByUid: string;
}

export interface AdminSetWalkthroughAvailabilityResponse {
  availability: AvailabilityView;
  nextSlots: Slot[];
  changed: boolean;
}

export interface AdminListWalkthroughBookingsPayload {
  fromDate?: string;
  days?: number;
  includeCancelled?: boolean;
}

export interface AdminBookingRow {
  bookingId: string;
  status: "booked" | "cancelled";
  slot: Slot;
  phone: string;
  name: string | null;
  details: WalkthroughDetails;
  cityId: string | null;
  confirmed: boolean;
  staffConfirmation: null | {byUid: string; at: string; slotStartAt: string; note: string | null};
  cancellation: null | {at: string; by: "booker_token" | "booker_phone" | "staff"; reason: string | null};
  rescheduleCount: number;
  createdAt: string;
  updatedAt: string;
  managePath: string;
  inboxItemId: string;
}

export interface AdminListWalkthroughBookingsResponse {
  generatedAt: string;
  timeZone: "Asia/Kolkata";
  fromDate: string;
  toDate: string;
  availability: AvailabilityView | null;
  /** The calendar slots come from now: the saved one, or the built-in default while none is saved. */
  calendar: {source: CalendarSource; settings: AvailabilitySettings};
  openSlotCount: number;
  bookings: AdminBookingRow[];
  truncated: boolean;
}

export interface AdminUpdateWalkthroughBookingPayload {
  bookingId: string;
  action: "confirm" | "cancel";
  note?: string;
}

export interface AdminUpdateWalkthroughBookingResponse {
  booking: AdminBookingRow;
  changed: boolean;
}

const REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{15,79}$/u;
const TOKEN = /^[A-Za-z0-9_-]{43}$/u;
const PHONE = /^\+[1-9][0-9]{7,14}$/u;
const BOOKING_ID = /^wt-[a-f0-9]{40}$/u;
const SLOT_START = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:00\.000Z$/u;
const LOCAL_DATE = /^[0-9]{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])$/u;
const LOCAL_START = /^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/u;
const LOCAL_END = /^(?:(?:[01][0-9]|2[0-3]):[0-5][0-9]|24:00)$/u;
const CONSENT_VERSION = /^[a-z0-9-]{1,40}$/u;
const CITY_ID = /^[a-z]{2}-[a-z0-9]{1,3}-[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const SOURCE_PAGE = /^\/[^\s?#]*$/u;
const ENTRY = /^[a-z0-9][a-z0-9_-]{0,39}$/u;
const SLOT_MINUTES: readonly number[] = [15, 20, 30, 45, 60, 90];

/** One booking per verified phone and client request id, so a retry finds it. */
export function walkthroughBookingId(phone: string, requestId: string): string {
  return `wt-${createHash("sha256").update(`walkthrough:${phone}:${requestId}`).digest("hex").slice(0, 40)}`;
}

export function managePath(bookingId: string): string {
  return `${MANAGE_PATH_PREFIX}${bookingId}`;
}

export function manageTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time comparison of a presented manage token with the stored hash. */
export function manageTokenMatches(token: string | undefined, storedHash: unknown): boolean {
  if (token === undefined || typeof storedHash !== "string" || !/^[a-f0-9]{64}$/u.test(storedHash)) return false;
  return timingSafeEqual(Buffer.from(manageTokenHash(token), "hex"), Buffer.from(storedHash, "hex"));
}

/** A short, hashed rate-limit key, so no number or address is stored in a counter id. */
export function limiterKey(kind: "phone" | "ip" | "booking", value: string): string {
  return `walkthrough-${kind}-${createHash("sha256").update(`${kind}:${value}`).digest("hex").slice(0, 32)}`;
}

/** The caller's network address, for a hashed rate-limit key only. */
export function clientAddress(request: CallableRequest<unknown>): string {
  const raw = request.rawRequest;
  const forwarded = raw?.headers?.["x-forwarded-for"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim();
  return first || raw?.ip || "unknown";
}

/**
 * The phone the caller's Firebase sign-in verified with a one-time code (the
 * website's Continue with phone sheet, the same verification checkout and
 * instant drafts use) is the WhatsApp number staff confirm on. A sent number
 * must be that same number, so nobody can book for a number they do not hold.
 */
export function verifiedPhone(request: CallableRequest<unknown>, submittedPhone: string | undefined):
  {uid: string; phone: string} {
  const message = "Confirm your WhatsApp number with a code first.";
  if (!request.auth) throw refusal("unauthenticated", message, "phone_unverified");
  const phone = request.auth.token?.phone_number;
  if (typeof phone !== "string" || !PHONE.test(phone)) throw refusal("failed-precondition", message, "phone_unverified");
  if (submittedPhone !== undefined && submittedPhone !== phone) {
    throw refusal("failed-precondition", "Use the WhatsApp number you confirmed with a code.", "phone_mismatch");
  }
  return {uid: request.auth.uid, phone};
}

export function parseGetWalkthroughSlotsPayload(value: unknown): GetWalkthroughSlotsPayload {
  const data = record(value ?? {});
  if (!data) invalid("Send an object.");
  allowOnly(data, ["days"]);
  if (data.days !== undefined && !integerIn(data.days, 1, 28)) invalid("days is between 1 and 28.");
  return data.days === undefined ? {} : {days: data.days as number};
}

export function parseBookWalkthroughPayload(value: unknown): BookWalkthroughPayload {
  const data = record(value);
  if (!data) invalid("Send a booking.");
  allowOnly(data, ["requestId", "slotStartAt", "manageToken", "phone", "consent", "name", "details", "cityId",
    "sourcePage", "entry"]);
  if (!matches(data.requestId, REQUEST_ID)) invalid("requestId is invalid.");
  if (!matches(data.slotStartAt, SLOT_START)) invalid("Pick one of the offered times.");
  if (!matches(data.manageToken, TOKEN)) invalid("manageToken is invalid.");
  if (data.phone !== undefined && !matches(data.phone, PHONE)) invalid("Enter your WhatsApp number with its country code.");
  const consent = parseConsent(data.consent);
  if (data.name !== undefined && !textOf(data.name, 100)) invalid("name is 1 to 100 characters.");
  const details = data.details === undefined ? undefined : parseDetails(data.details);
  if (data.cityId !== undefined && !(matches(data.cityId, CITY_ID) && (data.cityId as string).length <= 64)) {
    invalid("cityId is invalid.");
  }
  if (!(matches(data.sourcePage, SOURCE_PAGE) && (data.sourcePage as string).length <= 512)) invalid("sourcePage is invalid.");
  if (!matches(data.entry, ENTRY)) invalid("entry is invalid.");
  return {
    requestId: data.requestId as string,
    slotStartAt: data.slotStartAt as string,
    manageToken: data.manageToken as string,
    ...(data.phone === undefined ? {} : {phone: data.phone as string}),
    consent,
    ...(data.name === undefined ? {} : {name: data.name as string}),
    ...(details === undefined ? {} : {details}),
    ...(data.cityId === undefined ? {} : {cityId: data.cityId as string}),
    sourcePage: data.sourcePage as string,
    entry: data.entry as string,
  };
}

export function parseManageWalkthroughBookingPayload(value: unknown): ManageWalkthroughBookingPayload {
  const data = record(value);
  if (!data) invalid("Send a booking id.");
  allowOnly(data, ["bookingId", "action", "manageToken", "slotStartAt", "reason"]);
  if (!matches(data.bookingId, BOOKING_ID)) invalid("bookingId is invalid.");
  if (data.action !== "read" && data.action !== "cancel" && data.action !== "reschedule") invalid("action is invalid.");
  if (data.manageToken !== undefined && !matches(data.manageToken, TOKEN)) invalid("manageToken is invalid.");
  if (data.slotStartAt !== undefined && !matches(data.slotStartAt, SLOT_START)) invalid("Pick one of the offered times.");
  if (data.reason !== undefined && !textOf(data.reason, 300)) invalid("reason is 1 to 300 characters.");
  if (data.action === "reschedule" && data.slotStartAt === undefined) invalid("Pick the new time.");
  if (data.action !== "reschedule" && data.slotStartAt !== undefined) invalid("slotStartAt is for reschedule only.");
  if (data.action !== "cancel" && data.reason !== undefined) invalid("reason is for cancel only.");
  return {
    bookingId: data.bookingId as string,
    action: data.action,
    ...(data.manageToken === undefined ? {} : {manageToken: data.manageToken as string}),
    ...(data.slotStartAt === undefined ? {} : {slotStartAt: data.slotStartAt as string}),
    ...(data.reason === undefined ? {} : {reason: data.reason as string}),
  };
}

export function parseAdminSetWalkthroughAvailabilityPayload(value: unknown): AdminSetWalkthroughAvailabilityPayload {
  const data = record(value);
  if (!data) invalid("Send the calendar.");
  allowOnly(data, ["expectedRevision", "settings", "note"]);
  if (!integerIn(data.expectedRevision, 0, Number.MAX_SAFE_INTEGER)) invalid("expectedRevision is invalid.");
  const settings = parseSettings(data.settings);
  if (data.note !== undefined && !textOf(data.note, 300)) invalid("note is 1 to 300 characters.");
  return {expectedRevision: data.expectedRevision as number, settings,
    ...(data.note === undefined ? {} : {note: data.note as string})};
}

export function parseAdminListWalkthroughBookingsPayload(value: unknown): AdminListWalkthroughBookingsPayload {
  const data = record(value ?? {});
  if (!data) invalid("Send an object.");
  allowOnly(data, ["fromDate", "days", "includeCancelled"]);
  if (data.fromDate !== undefined && !matches(data.fromDate, LOCAL_DATE)) invalid("fromDate is invalid.");
  if (data.days !== undefined && !integerIn(data.days, 1, 60)) invalid("days is between 1 and 60.");
  if (data.includeCancelled !== undefined && typeof data.includeCancelled !== "boolean") invalid("includeCancelled is invalid.");
  return {
    ...(data.fromDate === undefined ? {} : {fromDate: data.fromDate as string}),
    ...(data.days === undefined ? {} : {days: data.days as number}),
    ...(data.includeCancelled === undefined ? {} : {includeCancelled: data.includeCancelled}),
  };
}

export function parseAdminUpdateWalkthroughBookingPayload(value: unknown): AdminUpdateWalkthroughBookingPayload {
  const data = record(value);
  if (!data) invalid("Send a booking id.");
  allowOnly(data, ["bookingId", "action", "note"]);
  if (!matches(data.bookingId, BOOKING_ID)) invalid("bookingId is invalid.");
  if (data.action !== "confirm" && data.action !== "cancel") invalid("action is invalid.");
  if (data.note !== undefined && !textOf(data.note, 500)) invalid("note is 1 to 500 characters.");
  return {bookingId: data.bookingId as string, action: data.action,
    ...(data.note === undefined ? {} : {note: data.note as string})};
}

function parseConsent(value: unknown): ConsentInput {
  const consent = record(value);
  if (!consent) invalid("Tick the box so we can message you on WhatsApp.");
  allowOnly(consent, ["purpose", "version"]);
  if (consent.purpose !== "leadFollowUp" || !matches(consent.version, CONSENT_VERSION)) {
    invalid("Review the WhatsApp consent again.");
  }
  return {purpose: "leadFollowUp", version: consent.version as string};
}

function parseDetails(value: unknown): WalkthroughDetails {
  const details = record(value);
  if (!details) invalid("details is invalid.");
  allowOnly(details, ["organisation", "whatYouRun"]);
  if (details.organisation !== undefined && !textOf(details.organisation, 140)) invalid("organisation is 1 to 140 characters.");
  if (details.whatYouRun !== undefined && !textOf(details.whatYouRun, 200)) invalid("whatYouRun is 1 to 200 characters.");
  return {
    ...(details.organisation === undefined ? {} : {organisation: details.organisation as string}),
    ...(details.whatYouRun === undefined ? {} : {whatYouRun: details.whatYouRun as string}),
  };
}

function parseSettings(value: unknown): AvailabilitySettings {
  const settings = record(value);
  if (!settings) invalid("settings is invalid.");
  allowOnly(settings, ["enabled", "slotMinutes", "leadTimeMinutes", "horizonDays", "weeklyWindows", "closedDates"]);
  if (typeof settings.enabled !== "boolean") invalid("enabled is invalid.");
  if (typeof settings.slotMinutes !== "number" || !SLOT_MINUTES.includes(settings.slotMinutes)) {
    invalid("slotMinutes is 15, 20, 30, 45, 60 or 90.");
  }
  if (!integerIn(settings.leadTimeMinutes, 0, 10080)) invalid("leadTimeMinutes is between 0 and 10080.");
  if (!integerIn(settings.horizonDays, 1, 28)) invalid("horizonDays is between 1 and 28.");
  if (!Array.isArray(settings.weeklyWindows) || settings.weeklyWindows.length > 28) invalid("weeklyWindows is at most 28 windows.");
  const weeklyWindows = settings.weeklyWindows.map((entry): WeeklyWindow => {
    const window = record(entry);
    if (!window) invalid("A weekly window is invalid.");
    allowOnly(window, ["weekday", "start", "end"]);
    if (!integerIn(window.weekday, 1, 7)) invalid("weekday is 1 (Monday) to 7 (Sunday).");
    if (!matches(window.start, LOCAL_START) || !matches(window.end, LOCAL_END)) invalid("A window's times are HH:MM.");
    return {weekday: window.weekday as number, start: window.start as string, end: window.end as string};
  });
  if (!Array.isArray(settings.closedDates) || settings.closedDates.length > 120 ||
      settings.closedDates.some((date) => !matches(date, LOCAL_DATE)) ||
      new Set(settings.closedDates).size !== settings.closedDates.length) {
    invalid("closedDates is at most 120 different dates.");
  }
  return {enabled: settings.enabled, slotMinutes: settings.slotMinutes as SlotMinutes,
    leadTimeMinutes: settings.leadTimeMinutes as number, horizonDays: settings.horizonDays as number,
    weeklyWindows, closedDates: [...settings.closedDates as string[]]};
}

export function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function matches(value: unknown, pattern: RegExp): boolean {
  return typeof value === "string" && pattern.test(value);
}

function integerIn(value: unknown, min: number, max: number): boolean {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

function textOf(value: unknown, max: number): boolean {
  return typeof value === "string" && value.length >= 1 && value.length <= max;
}

function allowOnly(data: Record<string, unknown>, keys: readonly string[]): void {
  const extra = Object.keys(data).find((key) => !keys.includes(key));
  if (extra) invalid(`${extra} is not part of this request.`);
}

function invalid(message: string): never {
  throw new HttpsError("invalid-argument", message);
}
