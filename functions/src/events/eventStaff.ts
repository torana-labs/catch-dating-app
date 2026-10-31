import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from
  "../shared/callableOptions";
import {
  eventStaffGrantId,
  eventOperatorExpiryMillis,
  eventOperatorPermissions,
  requireEventOperatorPermission,
} from "../shared/eventOperatorAuthority";
import type {
  EventDocument,
  EventStaffGrantDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {EventOperatorAccessCallablePayload} from
  "../shared/generated/eventOperatorAccessCallablePayload";
import type {EventOperatorAccessCallableResponse} from
  "../shared/generated/eventOperatorAccessCallableResponse";
import type {EventStaffListCallableResponse} from
  "../shared/generated/eventStaffListCallableResponse";
import type {GrantEventStaffCallablePayload} from
  "../shared/generated/grantEventStaffCallablePayload";
import type {RevokeEventStaffCallablePayload} from
  "../shared/generated/revokeEventStaffCallablePayload";
import {
  validateEventOperatorAccessCallablePayload,
} from "../shared/generated/validators/eventOperatorAccessInput";
import {
  validateGrantEventStaffCallablePayload,
} from "../shared/generated/validators/grantEventStaffInput";
import {
  validateRevokeEventStaffCallablePayload,
} from "../shared/generated/validators/revokeEventStaffInput";
import {
  EventOrganizerDocument,
  eventOrganizerRef,
  isEventOrganizerManager,
  requireEventOrganizer,
} from "../shared/eventOrganizers";
import {checkRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {normalizeRosterPhone} from "./eventAttendees";
import {eventTitleLabel} from "../shared/eventLabels";
import {requireScheduledEvent} from "./configuredEvent";

interface EventStaffDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => FirebaseFirestore.Timestamp;
  getUserByPhoneNumber: (
    phoneNumber: string
  ) => Promise<admin.auth.UserRecord>;
}

const defaultDeps: EventStaffDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  now: () => admin.firestore.Timestamp.now(),
  getUserByPhoneNumber: (phoneNumber) =>
    admin.auth().getUserByPhoneNumber(phoneNumber),
};

const maxStaff = 50;
const maxGrantDurationMillis = 14 * 24 * 60 * 60 * 1000;

export async function getEventOperatorAccessHandler(
  request: CallableRequest<unknown>,
  deps: EventStaffDeps = defaultDeps
): Promise<EventOperatorAccessCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<EventOperatorAccessCallablePayload>(
    request,
    validateEventOperatorAccessCallablePayload,
    normalizeEventPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "getEventOperatorAccess", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const eventSnap = await db.collection("events").doc(data.eventId).get();
  if (!eventSnap.exists) throw new HttpsError("not-found", "Event not found.");
  const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
  const organizer = requireEventOrganizer(
    await eventOrganizerRef(db, event).get(), event
  );
  const access = await requireEventOperatorPermission({
    db,
    organizer,
    event,
    eventId: data.eventId,
    actorUid,
    permission: "viewRoster",
    now: deps.now(),
  });
  const scheduledEvent = requireScheduledEvent(event);
  return {
    eventId: data.eventId,
    organizerId: event.organizerId,
    title: eventTitleLabel(scheduledEvent),
    startAtMillis: scheduledEvent.startTime.toMillis(),
    endAtMillis: scheduledEvent.endTime.toMillis(),
    eventStatus: event.status,
    actorRole: access.role,
    permissions: access.role === "manager" ?
      eventOperatorPermissions : access.grant!.permissions,
    grantExpiresAtMillis: access.grant ?
      eventOperatorExpiryMillis(access.grant) : null,
  };
}

export async function listEventStaffHandler(
  request: CallableRequest<unknown>,
  deps: EventStaffDeps = defaultDeps
): Promise<EventStaffListCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<EventOperatorAccessCallablePayload>(
    request,
    validateEventOperatorAccessCallablePayload,
    normalizeEventPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "listEventStaff", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  await requireEventManager(db, data.eventId, actorUid);
  return eventStaffList(db, data.eventId, deps.now());
}

export async function grantEventStaffHandler(
  request: CallableRequest<unknown>,
  deps: EventStaffDeps = defaultDeps
): Promise<EventStaffListCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<GrantEventStaffCallablePayload>(
    request,
    validateGrantEventStaffCallablePayload,
    normalizeGrantPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "grantEventStaff", {
    maxRequests: 20, windowMs: 60 * 1000,
  });
  const {event, organizer} = await requireEventManager(
    db, data.eventId, actorUid
  );
  const now = deps.now();
  if (data.expiresAtMillis <= now.toMillis() ||
      data.expiresAtMillis > now.toMillis() + maxGrantDurationMillis) {
    throw new HttpsError(
      "invalid-argument",
      "Operator access must expire within the next 14 days."
    );
  }
  const phone = normalizeRosterPhone(data.phoneNumber);
  if (!phone.value || phone.issue) {
    throw new HttpsError("invalid-argument", phone.issue ?? "Invalid phone.");
  }
  const authUser = await resolveStaffAuthUser(
    deps.getUserByPhoneNumber,
    phone.value
  );
  if (isEventOrganizerManager(organizer, event, authUser.uid)) {
    throw new HttpsError(
      "failed-precondition",
      "Organizer managers already have event access."
    );
  }
  const organizerId = event.organizerId;
  const ref = db.collection("eventStaffGrants").doc(
    eventStaffGrantId(data.eventId, authUser.uid)
  );
  await db.runTransaction(async (tx) => {
    const fresh = await requireEventManager(db, data.eventId, actorUid, tx);
    if ((fresh.event.organizerId) !== organizerId ||
        isEventOrganizerManager(fresh.organizer, fresh.event, authUser.uid)) {
      throw new HttpsError("aborted", "Event staff authority changed.");
    }
    const now = deps.now();
    const [currentSnap, activeStaffSnap] = await Promise.all([
      tx.get(ref),
      tx.get(db.collection("eventStaffGrants")
        .where("eventId", "==", data.eventId)
        .where("status", "==", "active")
        .where("expiresAt", ">", now)
        .limit(maxStaff)),
    ]);
    const current = currentSnap.data() as EventStaffGrantDocument | undefined;
    const currentIsActive = current?.status === "active" &&
      current.expiresAt.toMillis() > now.toMillis();
    if (!currentIsActive && activeStaffSnap.size >= maxStaff) {
      throw new HttpsError(
        "resource-exhausted",
        "This event already has the maximum number of staff grants."
      );
    }
    const committedAt = deps.now();
    if (data.expiresAtMillis <= committedAt.toMillis() ||
        data.expiresAtMillis >
          committedAt.toMillis() + maxGrantDurationMillis) {
      throw new HttpsError("failed-precondition",
        "Staff access window changed.");
    }
    const groupDuties = current?.status === "active" ?
      current.groupDuties ?? [] : [];
    const document: EventStaffGrantDocument = {
      organizerId,
      eventId: data.eventId,
      uid: authUser.uid,
      displayName: eventStaffDisplayName(authUser),
      phoneLastFour: phone.value!.slice(-4),
      role: groupDuties.length ? "eventOperator" : "checkInOperator",
      groupDuties,
      operatorExpiresAt: admin.firestore.Timestamp.fromMillis(
        data.expiresAtMillis),
      permissions: eventOperatorPermissions,
      status: "active",
      createdBy: current?.createdBy ?? actorUid,
      createdAt: current?.createdAt ?? committedAt,
      expiresAt: admin.firestore.Timestamp.fromMillis(Math.max(
        data.expiresAtMillis, ...groupDuties.map((d) => d.expiresAtMillis))),
      revokedBy: null,
      revokedAt: null,
      updatedAt: committedAt,
      revision: Math.max((current?.revision ?? 0) + 1, committedAt.toMillis()),
    };
    tx.set(ref, document);
  });
  return eventStaffList(db, data.eventId, deps.now());
}

export async function revokeEventStaffHandler(
  request: CallableRequest<unknown>,
  deps: EventStaffDeps = defaultDeps
): Promise<EventStaffListCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<RevokeEventStaffCallablePayload>(
    request,
    validateRevokeEventStaffCallablePayload,
    normalizeRevokePayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "revokeEventStaff", {
    maxRequests: 20, windowMs: 60 * 1000,
  });
  await requireEventManager(db, data.eventId, actorUid);
  const ref = db.collection("eventStaffGrants").doc(
    eventStaffGrantId(data.eventId, data.uid)
  );
  const now = deps.now();
  await db.runTransaction(async (tx) => {
    await requireEventManager(db, data.eventId, actorUid, tx);
    const snap = await tx.get(ref);
    const grant = snap.data() as EventStaffGrantDocument | undefined;
    if (!grant || grant.eventId !== data.eventId) {
      throw new HttpsError("not-found", "Event staff member not found.");
    }
    if (grant.revision !== data.expectedRevision) {
      throw new HttpsError(
        "aborted",
        "Staff access changed. Reload and retry."
      );
    }
    tx.update(ref, {
      status: "revoked",
      revokedBy: actorUid,
      revokedAt: now,
      updatedAt: now,
      revision: Math.max(grant.revision + 1, now.toMillis()),
    });
  });
  return eventStaffList(db, data.eventId, deps.now());
}

async function eventStaffList(
  db: FirebaseFirestore.Firestore,
  eventId: string,
  now: FirebaseFirestore.Timestamp
): Promise<EventStaffListCallableResponse> {
  const snap = await db.collection("eventStaffGrants")
    .where("eventId", "==", eventId)
    .orderBy("updatedAt", "desc")
    .limit(maxStaff)
    .get();
  const members = snap.docs
    .map((doc) => doc.data() as EventStaffGrantDocument)
    .sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis());
  return {
    eventId,
    members: members.map((member) => ({
      uid: member.uid,
      displayName: member.displayName,
      phoneLastFour: member.phoneLastFour,
      status: member.status === "revoked" ? "revoked" :
        member.expiresAt.toMillis() <= now.toMillis() ? "expired" : "active",
      expiresAtMillis: member.expiresAt.toMillis(),
      revision: member.revision,
    })),
  };
}

export function eventStaffDisplayName(
  user: Pick<admin.auth.UserRecord, "displayName">
): string {
  return user.displayName?.trim() || "Event staff";
}

export async function resolveStaffAuthUser(
  getUserByPhoneNumber: EventStaffDeps["getUserByPhoneNumber"],
  phoneNumber: string
): Promise<admin.auth.UserRecord> {
  try {
    return await getUserByPhoneNumber(phoneNumber);
  } catch (error) {
    if (authErrorCode(error) === "auth/user-not-found") {
      throw new HttpsError(
        "not-found",
        "Ask this operator to sign in to Catch Host with that phone first."
      );
    }
    throw new HttpsError(
      "internal",
      "Unable to verify this operator right now. Try again."
    );
  }
}

function authErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  return typeof error.code === "string" ? error.code : null;
}

async function requireEventManager(
  db: FirebaseFirestore.Firestore,
  eventId: string,
  actorUid: string,
  transaction?: FirebaseFirestore.Transaction
): Promise<{
  event: EventDocument;
  organizer: EventOrganizerDocument;
}> {
  const eventRef = db.collection("events").doc(eventId);
  const eventSnap = transaction ? await transaction.get(eventRef) :
    await eventRef.get();
  if (!eventSnap.exists) throw new HttpsError("not-found", "Event not found.");
  const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
  const organizerRef = eventOrganizerRef(db, event);
  const organizer = requireEventOrganizer(transaction ?
    await transaction.get(organizerRef) : await organizerRef.get(), event);
  if (!isEventOrganizerManager(organizer, event, actorUid)) {
    throw new HttpsError(
      "permission-denied",
      "Only organizer managers can manage event staff."
    );
  }
  return {event, organizer};
}

function normalizeEventPayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const input = value as Record<string, unknown>;
  return {...input, eventId: trim(input.eventId)};
}

function normalizeGrantPayload(value: unknown): unknown {
  const normalized = normalizeEventPayload(value);
  if (!normalized || typeof normalized !== "object" ||
      Array.isArray(normalized)) return normalized;
  const input = normalized as Record<string, unknown>;
  return {...input, phoneNumber: trim(input.phoneNumber)};
}

function normalizeRevokePayload(value: unknown): unknown {
  const normalized = normalizeEventPayload(value);
  if (!normalized || typeof normalized !== "object" ||
      Array.isArray(normalized)) return normalized;
  const input = normalized as Record<string, unknown>;
  return {...input, uid: trim(input.uid)};
}

function trim(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

const staffCallableLimits = {timeoutSeconds: 60, maxInstances: 20};

export const getEventOperatorAccess = onCall(
  appCheckCallableOptionsWithLimits(staffCallableLimits),
  (request) => getEventOperatorAccessHandler(request)
);
export const listEventStaff = onCall(
  appCheckCallableOptionsWithLimits(staffCallableLimits),
  (request) => listEventStaffHandler(request)
);
export const grantEventStaff = onCall(
  appCheckCallableOptionsWithLimits(staffCallableLimits),
  (request) => grantEventStaffHandler(request)
);
export const revokeEventStaff = onCall(
  appCheckCallableOptionsWithLimits(staffCallableLimits),
  (request) => revokeEventStaffHandler(request)
);
