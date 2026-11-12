import type {
  EventAttendeeDocument,
  EventAttendeeIndexDocument,
  EventParticipationDocument,
} from "../shared/generated/firestoreAdminTypes";

/**
 * Pure builders for a Catch booking's roster row and index pointer. Booking
 * callables write them in their own transaction through catchBookingRoster;
 * the copy-forward migration uses the same builders.
 */

/** Server-only pointer collection from a Catch account to its roster row. */
export const EVENT_ATTENDEE_INDEX = "eventAttendeeIndex";

/**
 * Deterministic index id for one account on one event.
 * @param {string} eventId Event id.
 * @param {string} uid Catch account id.
 * @return {string} Document id under eventAttendeeIndex.
 */
export function eventAttendeeIndexId(eventId: string, uid: string): string {
  return `${eventId}_${uid}`;
}

/**
 * The index row pointing an account at its roster row.
 * @param {object} params Source booking, row id and time.
 * @return {EventAttendeeIndexDocument} Index document.
 */
export function eventAttendeeIndexDocument(params: {
  source: EventParticipationDocument;
  attendeeId: string;
  organizerId: string;
  now: FirebaseFirestore.Timestamp;
}): EventAttendeeIndexDocument {
  return {eventId: params.source.eventId, organizerId: params.organizerId,
    uid: params.source.uid, attendeeId: params.attendeeId,
    createdAt: params.now};
}

/**
 * The Catch booking carried on the roster row: its own lifecycle (which a
 * Host-owned row's status does not reflect) and its admission facts.
 * @param {EventParticipationDocument} source Booking.
 * @param {boolean} sourceExists Whether the booking document still exists.
 * @param {FirebaseFirestore.Timestamp} now Fallback deletion time.
 * @return {NonNullable<EventAttendeeDocument["booking"]>} Booking facts.
 */
export function catchBookingFacts(
  source: EventParticipationDocument,
  sourceExists: boolean,
  now: FirebaseFirestore.Timestamp
): NonNullable<EventAttendeeDocument["booking"]> {
  const deleted = !sourceExists || source.status === "deleted";
  return {
    status: deleted ? "deleted" : source.status,
    createdAt: source.createdAt,
    signedUpAt: source.signedUpAt ?? null,
    waitlistedAt: source.waitlistedAt ?? null,
    attendedAt: source.attendedAt ?? null,
    cancelledAt: source.cancelledAt ?? null,
    inviteLinkId: source.inviteLinkId ?? null,
    inviteCapturedAt: source.inviteCapturedAt ?? null,
    paymentId: source.paymentId ?? null,
    genderAtSignup: source.genderAtSignup ?? null,
    cohortAtSignup: source.cohortAtSignup ?? null,
    ...(source.communityMembershipAtSignup ?
      {communityMembershipAtSignup: source.communityMembershipAtSignup} : {}),
    hostApprovalStatus: source.hostApprovalStatus ?? null,
    hostApprovalDecidedAt: source.hostApprovalDecidedAt ?? null,
    hostApprovalDecidedBy: source.hostApprovalDecidedBy ?? null,
    waitlistOfferStatus: source.waitlistOfferStatus ?? null,
    waitlistOfferedAt: source.waitlistOfferedAt ?? null,
    waitlistOfferExpiresAt: source.waitlistOfferExpiresAt ?? null,
    waitlistOfferAcceptedAt: source.waitlistOfferAcceptedAt ?? null,
    waitlistOfferId: source.waitlistOfferId ?? null,
    inviteSource: source.inviteSource ?? null,
    deletedAt: deleted ? source.deletedAt ?? now : null,
  };
}

/**
 * The roster row for a Catch booking. A Host-supplied row keeps its contact
 * and import fields; a Catch booking never adds private-profile contact data.
 * @param {object} params Booking, current row, owner, name and time.
 * @return {EventAttendeeDocument} Roster row.
 */
export function catchBookingAttendeeDocument(params: {
  source: EventParticipationDocument;
  sourceExists: boolean;
  existing: EventAttendeeDocument | undefined;
  organizerId: string;
  displayName: string;
  now: FirebaseFirestore.Timestamp;
}): EventAttendeeDocument {
  const {source, existing, now} = params;
  const sourceStatus = params.sourceExists ? source.status : "deleted";
  const status = projectedParticipationStatus(
    participationStatus(sourceStatus), existing?.status);
  return {
    eventId: source.eventId,
    organizerId: params.organizerId,
    displayName: params.displayName,
    searchName: params.displayName.toLocaleLowerCase("en"),
    source: existing?.source ?? "catchBooking",
    status,
    linkedUid: source.uid,
    phoneE164: existing?.phoneE164 ?? null,
    email: existing?.email ?? null,
    externalReference: existing?.externalReference ?? null,
    arrivalGroup: existing?.arrivalGroup ?? null,
    ticketType: existing?.ticketType ?? null,
    importId: existing?.importId ?? null,
    sourceRowId: existing?.sourceRowId ?? null,
    createdAt: existing?.createdAt ?? source.createdAt,
    updatedAt: now,
    registeredAt: source.signedUpAt ?? existing?.registeredAt ?? null,
    waitlistedAt: source.waitlistedAt ?? existing?.waitlistedAt ?? null,
    checkedInAt: status === "checkedIn" ?
      source.attendedAt ?? existing?.checkedInAt ?? now : null,
    cancelledAt: status === "cancelled" ?
      source.cancelledAt ?? source.deletedAt ?? now : null,
    checkedInBy: existing?.checkedInBy ?? null,
    linkedAt: existing?.linkedAt ?? source.createdAt,
    inviteLinkId: existing?.inviteLinkId ?? source.inviteLinkId ?? null,
    inviteCapturedAt: existing?.inviteCapturedAt ??
      source.inviteCapturedAt ?? null,
    attendanceRevision: existing?.attendanceRevision ?? 0,
    preCheckInStatus: status === "checkedIn" ?
      existing?.preCheckInStatus ?? "registered" : null,
    booking: catchBookingFacts(source, params.sourceExists, now),
  };
}


export function projectedParticipationStatus(
  participation: EventAttendeeDocument["status"],
  existing: EventAttendeeDocument["status"] | undefined
): EventAttendeeDocument["status"] {
  if (participation !== "cancelled" && existing === "checkedIn") {
    return "checkedIn";
  }
  return participation;
}

export function participationStatus(
  status: EventParticipationDocument["status"] | undefined
): EventAttendeeDocument["status"] {
  switch (status) {
  case "signedUp": return "registered";
  case "waitlisted": return "waitlisted";
  case "attended": return "checkedIn";
  case "cancelled":
  case "deleted":
  case undefined:
    return "cancelled";
  }
}

