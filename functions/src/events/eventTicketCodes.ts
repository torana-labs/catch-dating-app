import {createHmac, timingSafeEqual} from "node:crypto";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {requireEventOperatorPermission} from
  "../shared/eventOperatorAuthority";
import {eventOrganizerRef, requireEventOrganizer} from
  "../shared/eventOrganizers";
import type {
  EventAttendeeDocument,
  EventDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {GetEventTicketCodeCallablePayload} from
  "../shared/generated/getEventTicketCodeCallablePayload";
import type {GetEventTicketCodeCallableResponse} from
  "../shared/generated/getEventTicketCodeCallableResponse";
import type {ResolveEventTicketCodeCallablePayload} from
  "../shared/generated/resolveEventTicketCodeCallablePayload";
import type {ResolveEventTicketCodeCallableResponse} from
  "../shared/generated/resolveEventTicketCodeCallableResponse";
import {validateGetEventTicketCodeCallablePayload} from
  "../shared/generated/validators/getEventTicketCodeInput";
import {validateGetEventTicketCodeCallableResponse} from
  "../shared/generated/validators/getEventTicketCodeOutput";
import {validateResolveEventTicketCodeCallablePayload} from
  "../shared/generated/validators/resolveEventTicketCodeInput";
import {validateResolveEventTicketCodeCallableResponse} from
  "../shared/generated/validators/resolveEventTicketCodeOutput";
import {checkRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {GuestLinkKeyStore} from
  "../eventSuccess/operations/guestLinkKeyStore";
import type {GuestLinkSigningKeys} from
  "../eventSuccess/operations/guestLinkTokens";

/**
 * Guest ticket codes. A code is stateless: it names one attendee row of one
 * event and is signed with the event-assistance key ring (the same pinned
 * Secret Manager version the guest response links use), under its own
 * domain label so a code can never pass as a guest-link grant or the other
 * way round. The key id travels in the code, so rotation keeps old codes
 * valid while their key stays in the ring. Cancelling the row revokes it.
 */
const ticketDomain = "catch:event-ticket:v1";
const ticketVersion = 1;
const holdingStatuses = new Set(["registered", "checkedIn"]);

export interface EventTicketCodeDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  signingKeys: () => Promise<GuestLinkSigningKeys>;
  now: () => FirebaseFirestore.Timestamp;
}

const defaultDeps: EventTicketCodeDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  signingKeys: () => new GuestLinkKeyStore().access(),
  now: () => admin.firestore.Timestamp.now(),
};

/** Signs the ticket code for one attendee row. */
export function signEventTicketCode(params: {
  eventId: string;
  attendeeId: string;
  keys: GuestLinkSigningKeys;
}): string {
  const keyId = params.keys.currentKeyId;
  const body = Buffer.from(JSON.stringify([ticketVersion, keyId,
    params.attendeeId])).toString("base64url");
  return `${body}.${ticketMac(params.keys, keyId, params.eventId,
    params.attendeeId)}`;
}

/**
 * The attendee id a code names, or null when the code is malformed, signed
 * by a key the ring no longer holds, or bound to another event.
 */
export function verifyEventTicketCode(params: {
  eventId: string;
  ticketCode: string;
  keys: GuestLinkSigningKeys;
}): string | null {
  const [body, mac, ...extra] = params.ticketCode.split(".");
  if (!body || !mac || extra.length > 0) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length !== 3 ||
      parsed[0] !== ticketVersion || typeof parsed[1] !== "string" ||
      typeof parsed[2] !== "string" || parsed[2].length < 1 ||
      parsed[2].length > 180 || parsed[2].includes("/")) return null;
  const [, keyId, attendeeId] = parsed as [number, string, string];
  let expected: string;
  try {
    expected = ticketMac(params.keys, keyId, params.eventId, attendeeId);
  } catch {
    return null;
  }
  const supplied = Buffer.from(mac);
  const wanted = Buffer.from(expected);
  if (supplied.length !== wanted.length ||
      !timingSafeEqual(supplied, wanted)) return null;
  return attendeeId;
}

function ticketMac(keys: GuestLinkSigningKeys, keyId: string,
  eventId: string, attendeeId: string): string {
  const key = keys.keyFor(keyId);
  if (!Buffer.isBuffer(key) || key.length < 32) {
    throw new Error("Ticket signing key must have at least 256 bits");
  }
  return createHmac("sha256", key)
    .update(JSON.stringify([ticketDomain, keyId, eventId, attendeeId]))
    .digest("base64url");
}

/** Returns the caller's own ticket code for an event they hold a place at. */
export async function getEventTicketCodeHandler(
  request: CallableRequest<unknown>,
  deps: EventTicketCodeDeps = defaultDeps
): Promise<GetEventTicketCodeCallableResponse> {
  const uid = requireAuth(request);
  const payload = validateCallableWithAjv<GetEventTicketCodeCallablePayload>(
    request, validateGetEventTicketCodeCallablePayload, normalizePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, uid, "getEventTicketCode", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const rows = await db.collection("eventAttendees")
    .where("eventId", "==", payload.eventId)
    .where("linkedUid", "==", uid)
    .limit(5)
    .get();
  const holding = rows.docs
    .map((doc) => ({id: doc.id,
      row: doc.data() as Partial<EventAttendeeDocument>}))
    .filter(({row}) => row.eventId === payload.eventId &&
      row.linkedUid === uid && holdingStatuses.has(row.status ?? ""))
    .sort((a, b) => a.id.localeCompare(b.id));
  if (holding.length === 0) {
    throw new HttpsError("failed-precondition",
      "You do not hold a place at this event.",
      {reason: "noPlace"});
  }
  const keys = await signingKeysOrUnavailable(deps);
  const response: GetEventTicketCodeCallableResponse = {
    eventId: payload.eventId,
    attendeeId: holding[0].id,
    ticketCode: signEventTicketCode({eventId: payload.eventId,
      attendeeId: holding[0].id, keys}),
  };
  if (!validateGetEventTicketCodeCallableResponse(response)) {
    throw new HttpsError("internal", "Ticket code failed its contract.");
  }
  return response;
}

/**
 * Turns a scanned code into its attendee row for an organizer manager or
 * event staff who may set attendance. It reads only; the door checks the
 * guest in through its attendance outbox.
 */
export async function resolveEventTicketCodeHandler(
  request: CallableRequest<unknown>,
  deps: EventTicketCodeDeps = defaultDeps
): Promise<ResolveEventTicketCodeCallableResponse> {
  const actorUid = requireAuth(request);
  const payload =
    validateCallableWithAjv<ResolveEventTicketCodeCallablePayload>(
      request, validateResolveEventTicketCodeCallablePayload,
      normalizePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "resolveEventTicketCode", {
    maxRequests: 120, windowMs: 60 * 1000,
  });
  const eventSnap = await db.collection("events").doc(payload.eventId).get();
  if (!eventSnap.exists) {
    throw new HttpsError("not-found", "Event not found.");
  }
  const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
  const organizer = requireEventOrganizer(
    await eventOrganizerRef(db, event).get(), event);
  await requireEventOperatorPermission({db, organizer, event,
    eventId: payload.eventId, actorUid, permission: "setAttendance",
    now: deps.now()});
  const keys = await signingKeysOrUnavailable(deps);
  const attendeeId = verifyEventTicketCode({eventId: payload.eventId,
    ticketCode: payload.ticketCode, keys});
  if (attendeeId === null) throw invalidTicket();
  const attendeeSnap = await db.collection("eventAttendees")
    .doc(attendeeId).get();
  if (!attendeeSnap.exists) throw invalidTicket();
  const attendee = requireDoc<EventAttendeeDocument>(attendeeSnap,
    "EventAttendeeDocument");
  if (attendee.eventId !== payload.eventId ||
      attendee.organizerId !== event.organizerId) throw invalidTicket();
  if (attendee.status === "cancelled") {
    throw new HttpsError("failed-precondition",
      "This ticket was cancelled.", {reason: "ticketCancelled"});
  }
  const response: ResolveEventTicketCodeCallableResponse = {
    eventId: payload.eventId,
    attendeeId,
    displayName: attendee.displayName,
    status: attendee.status,
    attendanceRevision: attendee.attendanceRevision ?? 0,
  };
  if (!validateResolveEventTicketCodeCallableResponse(response)) {
    throw new HttpsError("internal", "Ticket lookup failed its contract.");
  }
  return response;
}

async function signingKeysOrUnavailable(
  deps: EventTicketCodeDeps
): Promise<GuestLinkSigningKeys> {
  try {
    return await deps.signingKeys();
  } catch {
    // Key bytes and provider errors never reach the caller.
    throw new HttpsError("unavailable",
      "Ticket codes are not available right now.",
      {reason: "ticketKeysUnavailable"});
  }
}

function invalidTicket(): HttpsError {
  return new HttpsError("failed-precondition",
    "That code is not a ticket for this event.", {reason: "invalidTicket"});
}

function normalizePayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const input = {...value as Record<string, unknown>};
  for (const field of ["eventId", "ticketCode"]) {
    if (typeof input[field] === "string") {
      input[field] = (input[field] as string).trim();
    }
  }
  return input;
}

export const getEventTicketCode = onCall(
  appCheckCallableOptions,
  (request) => getEventTicketCodeHandler(request)
);

export const resolveEventTicketCode = onCall(
  appCheckCallableOptions,
  (request) => resolveEventTicketCodeHandler(request)
);
