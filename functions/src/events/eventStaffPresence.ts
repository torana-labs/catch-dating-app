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
  EventDocument,
  EventStaffPresenceDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {HeartbeatEventStaffPresenceCallablePayload} from
  "../shared/generated/heartbeatEventStaffPresenceCallablePayload";
import type {HeartbeatEventStaffPresenceCallableResponse} from
  "../shared/generated/heartbeatEventStaffPresenceCallableResponse";
import {validateEventStaffPresenceDocument} from
  "../shared/generated/validators/eventStaffPresenceDocument";
import {validateHeartbeatEventStaffPresenceCallablePayload} from
  "../shared/generated/validators/heartbeatEventStaffPresenceInput";
import {validateHeartbeatEventStaffPresenceCallableResponse} from
  "../shared/generated/validators/heartbeatEventStaffPresenceOutput";
import {organizerHostProfiles} from "../shared/organizerHosts";
import {checkRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";

export const eventStaffPresenceCollection = "eventStaffPresence";

/** A door phone heartbeats about every 45 s; two missed beats lapse it. */
export const eventStaffPresenceLifetimeMillis = 2 * 60 * 1000;

export interface EventStaffPresenceDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => FirebaseFirestore.Timestamp;
  timestampFromMillis: (millis: number) => FirebaseFirestore.Timestamp;
}

const defaultDeps: EventStaffPresenceDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  now: () => admin.firestore.Timestamp.now(),
  timestampFromMillis: (millis) =>
    admin.firestore.Timestamp.fromMillis(millis),
};

export function eventStaffPresenceId(eventId: string, uid: string): string {
  return `${eventId}_${uid}`;
}

/**
 * Records that an organizer manager or event staff with viewRoster is on
 * the door now. The row is a last-write heartbeat, so a retry is harmless;
 * it lapses at expiresAt, and other door phones read it by listener.
 */
export async function heartbeatEventStaffPresenceHandler(
  request: CallableRequest<unknown>,
  deps: EventStaffPresenceDeps = defaultDeps
): Promise<HeartbeatEventStaffPresenceCallableResponse> {
  const uid = requireAuth(request);
  const payload =
    validateCallableWithAjv<HeartbeatEventStaffPresenceCallablePayload>(
      request, validateHeartbeatEventStaffPresenceCallablePayload,
      normalizePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, uid, "heartbeatEventStaffPresence", {
    maxRequests: 6, windowMs: 60 * 1000,
  });
  const eventSnap = await db.collection("events").doc(payload.eventId).get();
  if (!eventSnap.exists) {
    throw new HttpsError("not-found", "Event not found.");
  }
  const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
  if (event.status === "cancelled") {
    throw new HttpsError("failed-precondition", "This event was cancelled.");
  }
  const organizer = requireEventOrganizer(
    await eventOrganizerRef(db, event).get(), event);
  const now = deps.now();
  const access = await requireEventOperatorPermission({db, organizer, event,
    eventId: payload.eventId, actorUid: uid, permission: "viewRoster", now});
  const displayName = access.grant?.displayName ??
    organizerHostProfiles(organizer).find((p) => p.uid === uid)
      ?.displayName?.trim() ??
    authName(request) ?? "Host";
  const expiresAtMillis = now.toMillis() + eventStaffPresenceLifetimeMillis;
  const document: EventStaffPresenceDocument = {
    schemaVersion: 1,
    eventId: payload.eventId,
    organizerId: event.organizerId,
    uid,
    displayName: displayName.slice(0, 120) || "Host",
    role: access.role,
    lastSeenAt: now,
    expiresAt: deps.timestampFromMillis(expiresAtMillis),
  };
  if (!validateEventStaffPresenceDocument(document)) {
    throw new HttpsError("internal", "Door presence failed its contract.");
  }
  await db.collection(eventStaffPresenceCollection)
    .doc(eventStaffPresenceId(payload.eventId, uid)).set(document);
  const response: HeartbeatEventStaffPresenceCallableResponse = {
    eventId: payload.eventId,
    lastSeenAtMillis: now.toMillis(),
    expiresAtMillis,
  };
  if (!validateHeartbeatEventStaffPresenceCallableResponse(response)) {
    throw new HttpsError("internal", "Door presence failed its contract.");
  }
  return response;
}

function authName(request: CallableRequest<unknown>): string | null {
  const name = request.auth?.token.name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

function normalizePayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const input = {...value as Record<string, unknown>};
  if (typeof input.eventId === "string") input.eventId = input.eventId.trim();
  return input;
}

export const heartbeatEventStaffPresence = onCall(
  appCheckCallableOptions,
  (request) => heartbeatEventStaffPresenceHandler(request)
);
