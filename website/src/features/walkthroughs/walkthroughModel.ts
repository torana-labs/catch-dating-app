import type {
  BookWalkthroughCallablePayload,
  BookWalkthroughCallableResponse,
  GetWalkthroughSlotsCallableResponse,
  ManageWalkthroughBookingCallablePayload,
  ManageWalkthroughBookingCallableResponse,
} from "../../firebase";

/**
 * The walkthrough booking's pure parts: the slot times in India time and in
 * the visitor's own zone, the request id and manage token the website makes,
 * the manage link, and the plain problem a refused call names
 * (functions/src/walkthroughs/model.ts WalkthroughRefusal).
 */
export type WalkthroughSlots = GetWalkthroughSlotsCallableResponse;
export type WalkthroughDay = WalkthroughSlots["days"][number];
export type WalkthroughSlot = WalkthroughDay["slots"][number];
export type WalkthroughBookingPayload = BookWalkthroughCallablePayload;
export type WalkthroughBooking = BookWalkthroughCallableResponse;
export type WalkthroughManagePayload = ManageWalkthroughBookingCallablePayload;
export type WalkthroughManaged = ManageWalkthroughBookingCallableResponse;

/** India time: a fixed UTC+05:30 with no daylight saving (contracts/shared/walkthrough_common.schema.json). */
export const walkthroughTimeZone = "Asia/Kolkata";

/** What the slots and booking calls run against: the site's Firebase callables unless a story or test provides others. */
export interface WalkthroughClient {
  getSlots: () => Promise<WalkthroughSlots>;
  book: (payload: WalkthroughBookingPayload) => Promise<WalkthroughBooking>;
  manage: (payload: WalkthroughManagePayload) => Promise<WalkthroughManaged>;
  /** The signed-in account and its code-verified phone, or null. */
  readCaller: () => Promise<{uid: string; phoneNumber: string | null} | null>;
}

/** The site's client: Firebase loads only on the first call. */
export const siteWalkthroughClient: WalkthroughClient = {
  getSlots: async () => (await import("../../firebase")).getWalkthroughSlots(),
  book: async (payload) => (await import("../../firebase")).bookWalkthrough(payload),
  manage: async (payload) => (await import("../../firebase")).manageWalkthroughBooking(payload),
  readCaller: async () => (await import("../../firebase")).readWalkthroughCaller(),
};

function validDate(iso: string): Date | null {
  const date = new Date(iso);
  return Number.isFinite(date.getTime()) ? date : null;
}

function clock(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {timeZone, hour: "numeric", minute: "2-digit"}).format(date);
}

function dayOf(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {timeZone, weekday: "short", day: "numeric", month: "short"}).format(date);
}

/** A slot's start in India time as the buttons read it: "4:00 PM". */
export function walkthroughIndiaTime(startAt: string): string {
  const date = validDate(startAt);
  return date ? clock(date, walkthroughTimeZone) : startAt;
}

/** A slot's India-time day as the day buttons read it: "Mon 23 Nov". */
export function walkthroughIndiaDay(startAt: string): string {
  const date = validDate(startAt);
  return date ? dayOf(date, walkthroughTimeZone) : startAt;
}

/** The visitor's IANA time zone, or null when the browser does not say. */
export function visitorTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/**
 * A slot's start on the visitor's clock, when that clock is not on India
 * time: "11:30 AM", with the day too when it falls on another date
 * ("Tue 17 Nov, 11:30 PM"). Null when the visitor's clock reads the same as
 * India time, or the zone is unknown.
 */
export function walkthroughLocalTime(startAt: string, timeZone: string | null): string | null {
  const date = validDate(startAt);
  if (!date || !timeZone || timeZone === walkthroughTimeZone) return null;
  try {
    const local = clock(date, timeZone);
    const localDay = dayOf(date, timeZone);
    if (local === clock(date, walkthroughTimeZone) && localDay === dayOf(date, walkthroughTimeZone)) return null;
    return localDay === dayOf(date, walkthroughTimeZone) ? local : `${localDay}, ${local}`;
  } catch {
    return null;
  }
}

/** The day of the slots that holds this start, if any. */
export function walkthroughDayOf(slots: WalkthroughSlots | null, startAt: string | null): WalkthroughDay | null {
  if (!slots || !startAt) return null;
  return slots.days.find((day) => day.slots.some((slot) => slot.startAt === startAt)) ?? null;
}

function randomBytes(count: number): Uint8Array {
  return globalThis.crypto.getRandomValues(new Uint8Array(count));
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/u, "");
}

const requestIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{15,79}$/u;
const manageTokenPattern = /^[A-Za-z0-9_-]{43}$/u;

/**
 * One booking attempt's request id and manage token, made once and reused on
 * retries so a retry finds the same booking. The token is 32 random bytes,
 * base64url without padding; only its SHA-256 is stored, and the manage link
 * carries it in the fragment, which never reaches a server log.
 */
export function newWalkthroughRequest(random: (count: number) => Uint8Array = randomBytes): {requestId: string; manageToken: string} {
  const requestId = `web_${Array.from(random(16), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  const manageToken = base64Url(random(32));
  if (!requestIdPattern.test(requestId) || !manageTokenPattern.test(manageToken)) {
    throw new Error("A walkthrough request must match the booking contract.");
  }
  return {requestId, manageToken};
}

/** The manage link the confirmation offers: the booking's managePath with the token as #t=<token>. */
export function walkthroughManageHref(managePath: string, manageToken: string): string {
  return `${managePath}#t=${encodeURIComponent(manageToken)}`;
}

const bookingIdPattern = /^wt-[a-f0-9]{40}$/u;

/** The booking id and token a manage link carries (?booking=…#t=…); either is null when absent or malformed. */
export function readWalkthroughManageLink(search: string, hash: string): {bookingId: string | null; manageToken: string | null} {
  const bookingId = new URLSearchParams(search).get("booking");
  const token = new URLSearchParams(hash.replace(/^#/u, "")).get("t");
  return {
    bookingId: bookingId && bookingIdPattern.test(bookingId) ? bookingId : null,
    manageToken: token && manageTokenPattern.test(token) ? token : null,
  };
}

/**
 * Why a walkthrough call did not go through. The refusal's details.reason
 * first, then its code:
 * - slot_taken, slot_unavailable: reload the slots and pick again;
 * - booking_closed: show the request form;
 * - has_upcoming_booking: the number already holds one (managePath names it);
 * - phone, phone_mismatch: confirm the number with a code again;
 * - request_changed: start a fresh request id;
 * - not_found, not_yours, slot_started, booking_cancelled, too_many_changes: the manage page's refusals;
 * - invalid, rate_limited, app_check, not_configured, offline, failed: the shared failures.
 */
export type WalkthroughProblem =
  | "slot_taken" | "slot_unavailable" | "booking_closed" | "has_upcoming_booking" | "phone" | "phone_mismatch"
  | "request_changed" | "not_found" | "not_yours" | "slot_started" | "booking_cancelled" | "too_many_changes"
  | "invalid" | "rate_limited" | "app_check" | "not_configured" | "offline" | "failed";

const reasonProblems: Readonly<Record<string, WalkthroughProblem>> = {
  slot_taken: "slot_taken",
  slot_unavailable: "slot_unavailable",
  booking_closed: "booking_closed",
  has_upcoming_booking: "has_upcoming_booking",
  phone_unverified: "phone",
  phone_mismatch: "phone_mismatch",
  request_changed: "request_changed",
  not_found: "not_found",
  not_yours: "not_yours",
  slot_started: "slot_started",
  booking_cancelled: "booking_cancelled",
  too_many_changes: "too_many_changes",
};

const codeProblems: Readonly<Record<string, WalkthroughProblem>> = {
  unauthenticated: "phone",
  "invalid-argument": "invalid",
  "resource-exhausted": "rate_limited",
  "not-found": "not_found",
  "permission-denied": "not_yours",
  unavailable: "offline",
  "deadline-exceeded": "offline",
};

/** The problem a thrown call error names, and the managePath a has_upcoming_booking refusal carries. */
export function walkthroughProblemFor(error: unknown): {problem: WalkthroughProblem; managePath: string | null} {
  if (!error || typeof error !== "object") return {problem: "failed", managePath: null};
  const {code, details, name, message} = error as {code?: unknown; details?: unknown; name?: unknown; message?: unknown};
  const detail = details && typeof details === "object" ? details as {reason?: unknown; managePath?: unknown} : {};
  const managePath = typeof detail.managePath === "string" && detail.managePath.startsWith("/") ? detail.managePath : null;
  const reason = typeof detail.reason === "string" ? detail.reason : null;
  if (reason && Object.hasOwn(reasonProblems, reason)) return {problem: reasonProblems[reason], managePath};
  const bare = typeof code === "string" ? code.replace(/^functions\//u, "") : "";
  if (Object.hasOwn(codeProblems, bare)) return {problem: codeProblems[bare], managePath};
  if (name === "AppCheckDeadlineError") return {problem: "app_check", managePath};
  if (typeof message === "string" && /not configured for this build/u.test(message)) return {problem: "not_configured", managePath};
  if (bare === "internal" && typeof message === "string" && /^internal$/iu.test(message)) return {problem: "offline", managePath};
  return {problem: "failed", managePath};
}

/**
 * Whether the manage page the booking's managePath opens
 * (/start/walkthrough/manage?booking=…, functions/src/walkthroughs/model.ts
 * MANAGE_PATH_PREFIX) is routed on this site. Until it is, the confirmation
 * and the "already booked" refusal send the visitor to the WhatsApp chat
 * instead of a link that would 404. Flip it in the PR that registers the route.
 */
export const walkthroughManagePageLive = false;
