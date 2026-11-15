import type {
  EventAttendeeDocument,
  EventParticipationDocument,
  EventRuntimeParticipantDocument,
  Gender,
  PublicProfileDocument,
  UserProfileDocument,
} from "../shared/generated/firestoreAdminTypes";
import {HttpsError} from "firebase-functions/v2/https";
import {
  getCatchBooking,
  catchBookingsFromRows,
} from "../shared/relationshipDocuments";
import {requireDoc} from "../shared/validation";
import {eventRuntimeParticipantId} from "./eventRuntime";
import {
  activityAttributesForProfile,
  activityAttributesForRuntimeProfile,
} from "./assignmentPrimitiveControls";

export type EventSuccessRosterStatus = "signedUp" | "attended";

export interface EventSuccessRosterParticipant {
  uid: string;
  status: EventSuccessRosterStatus;
  attendedAtMillis?: number;
  gender?: Gender;
  interestedInGenders: Gender[];
  displayName: string;
  arrivalGroup: string | null;
  cohortAtSignup: string;
  profile: Partial<UserProfileDocument>;
  activityAttributes: Record<string, string | number | boolean | null>;
  source: "catchParticipation" | "externalRuntime";
}

/** Loads both Consumer booking edges and ready event-scoped runtime edges. */
export async function loadEventSuccessRoster(
  db: FirebaseFirestore.Firestore,
  eventId: string,
  maxEntries?: number
): Promise<EventSuccessRosterParticipant[]> {
  // Only active Catch bookings join the roster preview.
  const participationQuery = db.collection("eventAttendees")
    .where("eventId", "==", eventId)
    .where("booking.status", "in", ["signedUp", "attended"]);
  const runtimeQuery = db.collection("eventRuntimeParticipants")
    .where("eventId", "==", eventId);
  const [participationSnap, runtimeSnap] = await Promise.all([
    (maxEntries === undefined ? participationQuery :
      participationQuery.limit(maxEntries + 1)).get(),
    (maxEntries === undefined ? runtimeQuery :
      runtimeQuery.limit(maxEntries + 1)).get(),
  ]);
  if (maxEntries !== undefined &&
      participationSnap.size + runtimeSnap.size > maxEntries) {
    throw new HttpsError("failed-precondition",
      "Event roster exceeds supported preview cohort.");
  }
  const consumerEdges = catchBookingsFromRows(db, participationSnap)
    .map((booking) => booking.data()!);
  const [consumerProfiles, publicProfiles] = await Promise.all([
    Promise.all(consumerEdges.map((edge) =>
      db.collection("users").doc(edge.uid).get())),
    Promise.all(consumerEdges.map((edge) =>
      db.collection("publicProfiles").doc(edge.uid).get())),
  ]);
  const byUid = new Map<string, EventSuccessRosterParticipant>();
  consumerEdges.forEach((edge, index) => {
    if (edge.status !== "signedUp" && edge.status !== "attended") return;
    const profileSnap = consumerProfiles[index];
    const profile = profileSnap.exists ?
      requireDoc<UserProfileDocument>(profileSnap, "UserProfileDocument") :
      {} as UserProfileDocument;
    const publicProfileSnap = publicProfiles[index];
    const publicProfile = publicProfileSnap.exists ?
      requireDoc<PublicProfileDocument>(
        publicProfileSnap,
        "PublicProfileDocument"
      ) :
      null;
    const gender = normalizeRuntimeGender(profile.gender) ??
      normalizeRuntimeGender(edge.genderAtSignup) ??
      normalizeRuntimeGender(publicProfile?.gender);
    const interests = Array.isArray(profile.interestedInGenders) ?
      profile.interestedInGenders
        .map(normalizeRuntimeGender)
        .filter((value): value is Gender => value !== undefined) :
      [];
    byUid.set(edge.uid, {
      uid: edge.uid,
      status: edge.status,
      ...attendedAtProjection(edge.status, edge.attendedAt),
      gender,
      interestedInGenders: interests,
      displayName: profile.displayName || profile.name ||
        publicProfile?.name || edge.uid,
      arrivalGroup: null,
      cohortAtSignup: edge.cohortAtSignup ??
        cohortFor(gender, interests),
      profile,
      activityAttributes: activityAttributesForProfile(profile),
      source: "catchParticipation",
    });
  });

  const runtimeEdges = runtimeSnap.docs
    .map((snap) => requireDoc<EventRuntimeParticipantDocument>(
      snap,
      "EventRuntimeParticipantDocument"
    ))
    .filter((edge) =>
      edge.eventId === eventId &&
      edge.accessStatus === "ready" &&
      edge.eventAttendeeId !== null &&
      !byUid.has(edge.uid));
  const attendeeSnaps = await Promise.all(runtimeEdges.map((edge) =>
    db.collection("eventAttendees").doc(edge.eventAttendeeId!).get()));
  runtimeEdges.forEach((edge, index) => {
    const attendeeSnap = attendeeSnaps[index];
    if (!attendeeSnap.exists) return;
    const attendee = requireDoc<EventAttendeeDocument>(
      attendeeSnap,
      "EventAttendeeDocument"
    );
    const gender = edge.runtimeProfile.gender ?? undefined;
    const interests = edge.runtimeProfile.interestedInGenders;
    const status = runtimeRosterStatus(attendee, eventId, edge.uid);
    if (!status) return;
    byUid.set(edge.uid, {
      uid: edge.uid,
      status,
      ...attendedAtProjection(status, attendee.checkedInAt),
      gender,
      interestedInGenders: interests,
      displayName: edge.runtimeProfile.displayName,
      arrivalGroup: attendee.arrivalGroup ?? null,
      cohortAtSignup: cohortFor(gender, interests),
      profile: {
        gender,
        interestedInGenders: interests,
        displayName: edge.runtimeProfile.displayName,
        relationshipGoal: edge.runtimeProfile.relationshipGoal,
        dateOfBirth: edge.runtimeProfile.dateOfBirth ?? undefined,
      },
      activityAttributes: activityAttributesForRuntimeProfile(
        edge.runtimeProfile
      ),
      source: "externalRuntime",
    });
  });
  return [...byUid.values()].sort((a, b) => a.uid.localeCompare(b.uid));
}

/** Resolves one caller without exposing any other roster identity. */
export async function loadEventSuccessRosterParticipant(
  db: FirebaseFirestore.Firestore,
  eventId: string,
  uid: string
): Promise<EventSuccessRosterParticipant | null> {
  const runtimeRef = db.collection("eventRuntimeParticipants")
    .doc(eventRuntimeParticipantId(eventId, uid));
  const [
    participationSnap,
    runtimeSnap,
    userSnap,
    publicProfileSnap,
  ] = await Promise.all([
    getCatchBooking(db, eventId, uid),
    runtimeRef.get(),
    db.collection("users").doc(uid).get(),
    db.collection("publicProfiles").doc(uid).get(),
  ]);
  if (participationSnap.exists) {
    const edge = requireDoc<EventParticipationDocument>(
      participationSnap,
      "EventParticipationDocument"
    );
    const profile = userSnap.exists ? requireDoc<UserProfileDocument>(
      userSnap,
      "UserProfileDocument"
    ) : {} as UserProfileDocument;
    const publicProfile = publicProfileSnap.exists ?
      requireDoc<PublicProfileDocument>(
        publicProfileSnap,
        "PublicProfileDocument"
      ) :
      null;
    if (edge.status === "signedUp" || edge.status === "attended") {
      const gender = normalizeRuntimeGender(profile.gender) ??
        normalizeRuntimeGender(edge.genderAtSignup) ??
        normalizeRuntimeGender(publicProfile?.gender);
      const interests = Array.isArray(profile.interestedInGenders) ?
        profile.interestedInGenders
          .map(normalizeRuntimeGender)
          .filter((value): value is Gender => value !== undefined) :
        [];
      return {
        uid,
        status: edge.status,
        ...attendedAtProjection(edge.status, edge.attendedAt),
        gender,
        interestedInGenders: interests,
        displayName: profile.displayName || profile.name ||
          publicProfile?.name || uid,
        arrivalGroup: null,
        cohortAtSignup: edge.cohortAtSignup ??
          cohortFor(gender, interests),
        profile,
        activityAttributes: activityAttributesForProfile(profile),
        source: "catchParticipation",
      };
    }
  }
  if (!runtimeSnap.exists) return null;
  const edge = requireDoc<EventRuntimeParticipantDocument>(
    runtimeSnap,
    "EventRuntimeParticipantDocument"
  );
  if (
    edge.eventId !== eventId ||
    edge.uid !== uid ||
    edge.accessStatus !== "ready" ||
    !edge.eventAttendeeId
  ) return null;
  const attendeeSnap = await db.collection("eventAttendees")
    .doc(edge.eventAttendeeId)
    .get();
  if (!attendeeSnap.exists) return null;
  const attendee = requireDoc<EventAttendeeDocument>(
    attendeeSnap,
    "EventAttendeeDocument"
  );
  const status = runtimeRosterStatus(attendee, eventId, uid);
  if (!status) return null;
  return {
    uid,
    status,
    ...attendedAtProjection(status, attendee.checkedInAt),
    gender: edge.runtimeProfile.gender ?? undefined,
    interestedInGenders: edge.runtimeProfile.interestedInGenders,
    displayName: edge.runtimeProfile.displayName,
    arrivalGroup: attendee.arrivalGroup ?? null,
    cohortAtSignup: cohortFor(
      edge.runtimeProfile.gender ?? undefined,
      edge.runtimeProfile.interestedInGenders
    ),
    profile: {
      gender: edge.runtimeProfile.gender ?? undefined,
      interestedInGenders: edge.runtimeProfile.interestedInGenders,
      displayName: edge.runtimeProfile.displayName,
      relationshipGoal: edge.runtimeProfile.relationshipGoal,
      dateOfBirth: edge.runtimeProfile.dateOfBirth ?? undefined,
    },
    activityAttributes: activityAttributesForRuntimeProfile(
      edge.runtimeProfile
    ),
    source: "externalRuntime",
  };
}

function runtimeRosterStatus(
  attendee: EventAttendeeDocument,
  eventId: string,
  uid: string
): EventSuccessRosterStatus | null {
  if (attendee.eventId !== eventId || attendee.linkedUid !== uid) return null;
  if (attendee.status === "checkedIn") return "attended";
  if (attendee.status === "registered") return "signedUp";
  return null;
}

function attendedAtProjection(
  status: EventSuccessRosterStatus,
  value: unknown
): {attendedAtMillis?: number} {
  if (
    status !== "attended" ||
    value === null ||
    typeof value !== "object" ||
    !("toMillis" in value) ||
    typeof value.toMillis !== "function"
  ) return {};
  const attendedAtMillis = value.toMillis();
  return Number.isFinite(attendedAtMillis) && attendedAtMillis >= 0 ?
    {attendedAtMillis} : {};
}

function cohortFor(gender: Gender | undefined, interests: Gender[]): string {
  if (gender === "man" && interests.length === 1 &&
      interests[0] === "woman") return "menInterestedInWomen";
  if (gender === "woman" && interests.length === 1 &&
      interests[0] === "man") return "womenInterestedInMen";
  if (gender === "nonBinary" || gender === "other") {
    return "nonBinaryOrOther";
  }
  if (gender !== undefined && interests.length > 0) return "queerOrOpen";
  return "unclassified";
}

function normalizeRuntimeGender(value: unknown): Gender | undefined {
  if (value === "nonbinary") return "nonBinary";
  if (value === "man" || value === "woman" ||
      value === "nonBinary" || value === "other") return value;
  return undefined;
}
