/**
 * Bookings-owned accountability result on a roster row (`eventAttendees`):
 * whether a checked-in guest returned or departed, bound to the check-in it
 * resolves. The live runtime decides who may resolve a guest and when; this
 * module owns the fields, their revision and the write.
 */

import {HttpsError} from "firebase-functions/v2/https";
import type {EventAttendeeDocument} from
  "../../shared/generated/firestoreAdminTypes";

/** A stored or serialized check-in time. */
export type CheckInTimestamp = FirebaseFirestore.Timestamp |
  {_seconds: number; _nanoseconds: number} | null;

/** The part of a roster row that identifies its current visit. */
export type AttendeeVisit = Pick<EventAttendeeDocument, "status"> & {
  checkedInAt: CheckInTimestamp;
};

export type AttendeeAccountabilityResolution =
  "returned" | "departed" | "unresolved";

type WriteTime = FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;

/**
 * A stable identity for a check-in time, or null when it is not one.
 * @param {unknown} value Stored or serialized timestamp.
 * @return {string | null} "seconds:nanoseconds", or null.
 */
export function checkInTimestampIdentity(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const stamp = value as {seconds?: number; nanoseconds?: number;
    _seconds?: number; _nanoseconds?: number};
  const seconds = stamp.seconds ?? stamp._seconds;
  const nanos = stamp.nanoseconds ?? stamp._nanoseconds;
  return Number.isSafeInteger(seconds) && seconds! >= 0 &&
    Number.isInteger(nanos) && nanos! >= 0 && nanos! < 1_000_000_000 ?
    seconds + ":" + nanos : null;
}

/**
 * Rejects sweep writes unless the operational attendee is checked in now.
 * @param {AttendeeVisit} attendee The row's current visit.
 */
export function requireCurrentAccountabilityCheckIn(
  attendee: AttendeeVisit
): void {
  if (attendee.status !== "checkedIn" ||
      checkInTimestampIdentity(attendee.checkedInAt) === null) {
    throw new HttpsError(
      "failed-precondition",
      "Only a currently checked-in attendee can be resolved."
    );
  }
}

/**
 * The visit-bound result and next revision both command surfaces write.
 * "unresolved" clears the result.
 * @param {object} attendee The row's current visit and revision.
 * @param {string} resolution Result to record.
 * @param {string} actorUid Who resolved the guest.
 * @param {WriteTime} now Write time.
 * @return {object} Fields to write on the row.
 */
export function accountabilityResolutionFields(
  attendee: AttendeeVisit &
    Pick<EventAttendeeDocument, "accountabilityRevision">,
  resolution: AttendeeAccountabilityResolution, actorUid: string,
  now: WriteTime
) {
  requireCurrentAccountabilityCheckIn(attendee);
  const revision = attendee.accountabilityRevision ?? 0;
  if (!Number.isSafeInteger(revision) || revision < 0 ||
      revision >= Number.MAX_SAFE_INTEGER) {
    throw new HttpsError("failed-precondition",
      "The accountability revision is unavailable.");
  }
  const clear = resolution === "unresolved";
  return {
    accountabilityRevision: revision + 1,
    accountabilityResolution: resolution === "unresolved" ? null : resolution,
    accountabilityResolvedForCheckInAt: clear ? null : attendee.checkedInAt,
    accountabilityResolvedAt: clear ? null : now,
    accountabilityResolvedBy: clear ? null : actorUid,
    updatedAt: now,
  };
}

/**
 * Prepares an accountability result for a checked-in guest's roster row.
 * Throws when the row is not checked in now or its revision is unusable.
 * @param {object} params The row as read in the caller's transaction, the
 *   result, actor and write time.
 * @return {object} The fields, the row as it reads after the write, and
 *   `apply`, which stages the write in the caller's transaction.
 */
export function prepareAttendeeAccountabilityResolution<
  Attendee extends AttendeeVisit &
    Pick<EventAttendeeDocument, "accountabilityRevision">
>(params: {
  db: FirebaseFirestore.Firestore;
  attendeeId: string;
  attendee: Attendee;
  resolution: AttendeeAccountabilityResolution;
  actorUid: string;
  now: WriteTime;
}): {
  fields: ReturnType<typeof accountabilityResolutionFields>;
  attendee: Attendee;
  apply: (tx: FirebaseFirestore.Transaction) => void;
} {
  const fields = accountabilityResolutionFields(params.attendee,
    params.resolution, params.actorUid, params.now);
  const attendeeRef = params.db.collection("eventAttendees")
    .doc(params.attendeeId);
  return {
    fields,
    attendee: {...params.attendee, ...fields},
    apply: (tx) => {
      tx.update(attendeeRef, fields);
    },
  };
}
