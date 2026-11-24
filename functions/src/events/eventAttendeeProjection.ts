import type {
  EventAttendeeDocument,
  EventBookingDocument,
} from "../shared/generated/firestoreAdminTypes";

/**
 * Pure builder for a Catch booking's roster row. Booking callables write it in
 * their own transaction through catchBookingRoster. The booking itself stays
 * in eventBookings; the row is the Host's view of that guest.
 */

/**
 * The roster row for a Catch booking. A Host-supplied row keeps its contact
 * and import fields; a Catch booking never adds private-profile contact data.
 * @param {object} params Booking, current row, owner, name and time.
 * @return {EventAttendeeDocument} Roster row.
 */
export function catchBookingAttendeeDocument(params: {
  source: EventBookingDocument;
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
  status: EventBookingDocument["status"] | undefined
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

