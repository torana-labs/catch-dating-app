import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import type {
  EventDocument,
  EventStaffGrantDocument,
} from "./generated/firestoreAdminTypes";
import {
  EventOrganizerDocument,
  isEventOrganizerManager,
} from "./eventOrganizers";

export type EventOperatorPermission =
  EventStaffGrantDocument["permissions"][number];

export const eventOperatorPermissions: EventOperatorPermission[] = [
  "viewRoster",
  "setAttendance",
  "reviewRuntimeClaims",
  "publishLiveLocation",
];

export function eventStaffGrantId(eventId: string, uid: string): string {
  return `${eventId}__${uid}`;
}

export async function requireEventOperatorPermission(params: {
  db: FirebaseFirestore.Firestore;
  organizer: EventOrganizerDocument;
  event: EventDocument;
  eventId: string;
  actorUid: string;
  permission: EventOperatorPermission;
  now?: FirebaseFirestore.Timestamp;
  transaction?: FirebaseFirestore.Transaction;
}): Promise<{role: "manager" | "operator";
  grant: EventStaffGrantDocument | null}> {
  if (isEventOrganizerManager(
    params.organizer, params.event, params.actorUid
  )) {
    return {role: "manager", grant: null};
  }
  const grantRef = params.db.collection("eventStaffGrants").doc(
    eventStaffGrantId(params.eventId, params.actorUid)
  );
  const grantSnap = params.transaction ?
    await params.transaction.get(grantRef) : await grantRef.get();
  const grant = grantSnap.data() as EventStaffGrantDocument | undefined;
  const now = params.now ?? admin.firestore.Timestamp.now();
  if (!grant || grant.eventId !== params.eventId ||
      grant.organizerId !== (params.event.organizerId) ||
      grant.uid !== params.actorUid || grant.status !== "active" ||
      (eventOperatorExpiryMillis(grant) ?? 0) <= now.toMillis() ||
      !grant.permissions.includes(params.permission)) {
    throw new HttpsError(
      "permission-denied",
      "This account does not have active event-operator access."
    );
  }
  return {role: "operator", grant};
}


/** Group duties never prolong the independently granted event-wide access. */
export function eventOperatorExpiryMillis(grant: EventStaffGrantDocument):
number | null {
  const value = grant.operatorExpiresAt === undefined ?
    (grant.role === "checkInOperator" ? grant.expiresAt : null) :
    grant.operatorExpiresAt;
  return value === null ? null : Math.min(staffTimestampMillis(value),
    staffTimestampMillis(grant.expiresAt));
}

export function staffTimestampMillis(value: unknown): number {
  if (!value || typeof value !== "object") throw invalidStaff();
  const stamp = value as {seconds?: number; nanoseconds?: number;
    _seconds?: number; _nanoseconds?: number};
  const seconds = stamp.seconds ?? stamp._seconds;
  const nanos = stamp.nanoseconds ?? stamp._nanoseconds;
  if (!Number.isSafeInteger(seconds) || !Number.isInteger(nanos) ||
      nanos! < 0 || nanos! >= 1_000_000_000) throw invalidStaff();
  const millis = Math.floor(seconds! * 1000 + nanos! / 1_000_000);
  if (!Number.isSafeInteger(millis) || millis < 0) throw invalidStaff();
  return millis;
}

function invalidStaff(): HttpsError {
  return new HttpsError("failed-precondition",
    "Event staff access is invalid.");
}
