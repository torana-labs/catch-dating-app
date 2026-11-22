import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import type {
  EventAttendeeDocument,
  EventDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {SetEventSuccessAccountabilityResolutionCallablePayload} from
  "../shared/generated/setEventSuccessAccountabilityResolutionCallablePayload";
import {
  validateSetEventSuccessAccountabilityResolutionCallablePayload,
} from
  "../shared/generated/validators/setEventSuccessAccountabilityResolutionInput";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {
  eventOrganizerRef,
  isEventOrganizerManager,
  requireEventOrganizer,
} from "../shared/eventOrganizers";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {eventSuccessPrimitivesFor} from "./formatPrimitives";
import {
  type AttendeeVisit,
  type CheckInTimestamp,
  checkInTimestampIdentity,
  prepareAttendeeAccountabilityResolution,
  requireCurrentAccountabilityCheckIn,
} from "../domain/bookings/attendeeAccountability";

export type EventSuccessAccountabilityResolution = "returned" | "departed";
type AccountabilityResult = AttendeeVisit &
  Pick<EventAttendeeDocument, "accountabilityResolution"> & {
    accountabilityResolvedForCheckInAt?: CheckInTimestamp;
  };

interface EventSuccessAccountabilityDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: EventSuccessAccountabilityDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
};

/** Returns a resolution only when it belongs to the current attendee visit. */
export function currentAccountabilityResolution(
  attendee: AccountabilityResult
): EventSuccessAccountabilityResolution | null {
  if (attendee.status !== "checkedIn") return null;
  const checkedInAt = checkInTimestampIdentity(attendee.checkedInAt);
  const resolvedFor = checkInTimestampIdentity(
    attendee.accountabilityResolvedForCheckInAt
  );
  if (checkedInAt === null || checkedInAt !== resolvedFor) return null;
  return attendee.accountabilityResolution === "returned" ||
    attendee.accountabilityResolution === "departed" ?
    attendee.accountabilityResolution : null;
}

/** Counts checked-in operational attendees without requiring a Catch UID. */
export function unresolvedAccountabilityCount(
  attendees: AccountabilityResult[]
): number {
  return attendees.filter((attendee) =>
    attendee.status === "checkedIn" &&
    currentAccountabilityResolution(attendee) === null
  ).length;
}

export function requireAccountabilityAcknowledgement(params: {
  accountability: "none" | "rollCall" | "sweep";
  unresolvedCount: number;
  acknowledged: boolean | undefined;
}): void {
  if (
    params.accountability === "sweep" &&
    params.unresolvedCount > 0 &&
    params.acknowledged !== true
  ) {
    throw new HttpsError(
      "failed-precondition",
      `${params.unresolvedCount} checked-in guests are not marked returned ` +
      "or departed. Review the sweep or finish anyway."
    );
  }
}

/** Records or clears one Host-owned sweep result for the current check-in. */
export async function setEventSuccessAccountabilityResolutionHandler(
  request: CallableRequest<unknown>,
  deps: EventSuccessAccountabilityDeps = defaultDeps
): Promise<{
  attendeeId: string;
  resolution: SetEventSuccessAccountabilityResolutionCallablePayload[
    "resolution"
  ];
}> {
  const hostUid = requireAuth(request);
  const payload = validateCallableWithAjv<
    SetEventSuccessAccountabilityResolutionCallablePayload
  >(request, validateSetEventSuccessAccountabilityResolutionCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    hostUid,
    "setEventSuccessAccountabilityResolution",
    {maxRequests: 120, windowMs: 60 * 1000}
  );
  const event = await requireEventManager(
    db,
    payload.eventId,
    hostUid,
    "resolve the accountability sweep"
  );
  if (eventSuccessPrimitivesFor(event.eventFormat).accountability !== "sweep") {
    throw new HttpsError(
      "failed-precondition",
      "This event does not use an accountability sweep."
    );
  }
  const attendeeRef = db.collection("eventAttendees").doc(payload.attendeeId);
  await db.runTransaction(async (transaction) => {
    const attendeeSnap = await transaction.get(attendeeRef);
    if (!attendeeSnap.exists) {
      throw new HttpsError("not-found", "Event attendee not found.");
    }
    const attendee = requireDoc<EventAttendeeDocument>(
      attendeeSnap,
      "EventAttendeeDocument"
    );
    if (attendee.eventId !== payload.eventId) {
      throw new HttpsError(
        "failed-precondition",
        "This attendee does not belong to the event."
      );
    }
    requireCurrentAccountabilityCheckIn(attendee);
    prepareAttendeeAccountabilityResolution({
      db,
      attendeeId: payload.attendeeId,
      attendee,
      actorUid: hostUid,
      resolution: payload.resolution,
      now: deps.serverTimestamp(),
    }).apply(transaction);
  });
  return {attendeeId: payload.attendeeId, resolution: payload.resolution};
}

export const setEventSuccessAccountabilityResolution = onCall(
  appCheckCallableOptions,
  (request) => setEventSuccessAccountabilityResolutionHandler(request)
);

async function requireEventManager(
  db: FirebaseFirestore.Firestore,
  eventId: string,
  uid: string,
  action: string
): Promise<EventDocument> {
  const eventSnap = await db.collection("events").doc(eventId).get();
  if (!eventSnap.exists) {
    throw new HttpsError("not-found", "Event not found.");
  }
  const event = requireDoc<EventDocument>(eventSnap, "EventDocument");
  const organizerSnap = await eventOrganizerRef(db, event).get();
  const organizer = requireEventOrganizer(organizerSnap, event);
  if (!isEventOrganizerManager(organizer, event, uid)) {
    throw new HttpsError(
      "permission-denied",
      `Only an organizer manager can ${action}.`
    );
  }
  return event;
}
