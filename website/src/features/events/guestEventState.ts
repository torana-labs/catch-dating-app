import type {EventGuestEntryDocument} from "../../shared/contracts/generated/eventGuestEntryDocument";
import type {GuestEventStatusDocument} from "../../shared/contracts/generated/guestEventStatusDocument";

export type GuestEventAction =
  | "registerFree" | "bookPaid" | "apply" | "applicationPending" | "applicationWaitlisted"
  | "declined" | "awaitingOffer" | "offer" | "registered" | "seatWaitlisted"
  | "recoverPayment" | "closed" | "unsupported" | "unavailable";

/** The guest's next step on the event page. Destinations keep their own authority. */
export interface GuestEventState {
  action: GuestEventAction;
  publicFormId: string | null;
  applicationStatus: GuestEventStatusDocument["applicationStatus"];
  offerGrantId: string | null;
  publicPaymentId: string | null;
  offerPaymentId: string | null;
  runtimeId: string | null;
}

/** What the guest's listeners deliver: the event's entry, their own row and their community memberships. */
export interface GuestEventSources {
  entry: EventGuestEntryDocument | null;
  status: GuestEventStatusDocument | null;
  activeMemberOf: readonly string[];
}

/**
 * The guest's next step from the published read models, decided in the same
 * order the server's old guest read used: the guest's own place, payment
 * recovery and seat waitlist first; then a closed or unpublished event; then
 * an offer, an application and, last, the event's registration for a member
 * or anyone else. Null means the event is unavailable to this guest.
 * Registration, checkout, application and offer commands still decide.
 */
export function guestEventState({entry, status, activeMemberOf}: GuestEventSources,
  eventId: string, nowMillis: number): GuestEventState | null {
  if (entry && entry.eventId !== eventId || status && status.eventId !== eventId) return null;
  const base: GuestEventState = {action: "unavailable", publicFormId: null,
    applicationStatus: null, offerGrantId: null, publicPaymentId: null,
    offerPaymentId: status?.offerPaymentId ?? null, runtimeId: null};
  if (status?.booking === "registered") {
    return {...base, action: "registered", runtimeId: status.runtimeId,
      publicPaymentId: status.publicPaymentId};
  }
  if (status?.ambiguous) return {...base, action: status.offerPaymentId ? "offer" : "unavailable"};
  const own = {...base, publicPaymentId: status?.publicPaymentId ?? null};
  if (status?.paymentRecoverable) return {...own, action: "recoverPayment"};
  if (status?.booking === "waitlisted") return {...own, action: "seatWaitlisted"};
  if (!entry) return own.publicPaymentId || own.offerPaymentId ? {...own, action: "closed"} : null;
  if (!entry.open || nowMillis >= entry.startAtMillis) return {...own, action: "closed"};
  const open = {...own, publicFormId: entry.publicFormId,
    applicationStatus: status?.applicationStatus ?? null};
  const grant = status?.offerGrantId && status.offerExpiresAtMillis !== null &&
    nowMillis < status.offerExpiresAtMillis ? status.offerGrantId : null;
  if (grant || open.offerPaymentId) {
    return {...open, offerGrantId: grant,
      action: status?.offerAdmissible || open.offerPaymentId ? "offer" : "unsupported"};
  }
  if (status?.offerAmbiguous) return {...open, action: "unsupported"};
  switch (open.applicationStatus) {
    case "submitted": case "inReview": return {...open, action: "applicationPending"};
    case "waitlisted": return {...open, action: "applicationWaitlisted"};
    case "declined": return {...open, action: "declined"};
    case "approved": return {...open, action: "awaitingOffer"};
    default: break;
  }
  const member = activeMemberOf.includes(entry.organizerId);
  return {...open, action: member ? entry.registration.member : entry.registration.guest};
}

/** The next moment the decision changes by itself: the start, or an offer invitation expiring. */
export function nextGuestEventChangeMillis({entry, status}: GuestEventSources, nowMillis: number): number | null {
  const moments = [entry?.startAtMillis, status?.offerExpiresAtMillis]
    .filter((value): value is number => typeof value === "number" && value > nowMillis);
  return moments.length ? Math.min(...moments) : null;
}

const record = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const id = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9_-]{1,200}$/u.test(value);
const optionalId = (value: unknown): value is string | null => value === null || id(value);
const millis = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) > 0;
const registrationSteps = new Set(["registerFree", "bookPaid", "apply", "unsupported"]);
const applicationStatuses = new Set(["submitted", "inReview", "waitlisted", "approved", "declined", "withdrawn"]);

/** Accepts only the published entry shape; anything else reads as no entry. */
export function parseEventGuestEntry(raw: unknown): EventGuestEntryDocument | null {
  const data = record(raw);
  const registration = record(data?.registration);
  if (!data || data.schemaVersion !== 1 || !id(data.eventId) || !id(data.organizerId) ||
      typeof data.open !== "boolean" || !millis(data.startAtMillis) || !optionalId(data.publicFormId) ||
      !registrationSteps.has(String(registration?.guest)) || !registrationSteps.has(String(registration?.member))) {
    return null;
  }
  return data as unknown as EventGuestEntryDocument;
}

/** Accepts only the guest's own row; anything else reads as no row. */
export function parseGuestEventStatus(raw: unknown, uid: string): GuestEventStatusDocument | null {
  const data = record(raw);
  if (!data || data.schemaVersion !== 1 || !id(data.eventId) || data.uid !== uid ||
      !["none", "registered", "waitlisted"].includes(String(data.booking)) ||
      typeof data.ambiguous !== "boolean" || typeof data.paymentRecoverable !== "boolean" ||
      typeof data.offerAdmissible !== "boolean" || typeof data.offerAmbiguous !== "boolean" ||
      !optionalId(data.runtimeId) || !optionalId(data.publicPaymentId) || !optionalId(data.offerPaymentId) ||
      !(data.offerGrantId === null || typeof data.offerGrantId === "string" && /^[a-f0-9]{64}$/u.test(data.offerGrantId)) ||
      !(data.offerExpiresAtMillis === null || millis(data.offerExpiresAtMillis)) ||
      !(data.applicationStatus === null || applicationStatuses.has(String(data.applicationStatus)))) {
    return null;
  }
  return data as unknown as GuestEventStatusDocument;
}

/** Organizers whose community counts the guest as an active member. */
export function activeCommunityMemberships(raw: unknown): string[] {
  const memberships = record(record(raw)?.communityMemberships);
  return Object.entries(memberships ?? {})
    .filter(([organizerId, value]) => id(organizerId) && record(value)?.state === "active")
    .map(([organizerId]) => organizerId);
}
