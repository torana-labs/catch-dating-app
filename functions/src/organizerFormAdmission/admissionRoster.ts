import type {EventAttendeeDocument, OrganizerContactDocument,
  OrganizerFormResponseDocument} from
  "../shared/generated/firestoreAdminTypes";

export function newFormAttendee(eventId: string, organizerId: string,
  responseId: string, contact: OrganizerContactDocument,
  response: OrganizerFormResponseDocument, verifiedPhone: string | null,
  now: FirebaseFirestore.Timestamp): EventAttendeeDocument {
  const displayName = contact.displayNameOverride?.trim() ||
    contact.displayName.trim() || response.identity.displayName?.trim() ||
    "Guest";
  const linkedUid = response.respondentUid === contact.linkedUid ?
    response.respondentUid : null;
  return {eventId, organizerId,
    displayName, searchName: displayName.toLocaleLowerCase("en"),
    source: "hostManual", status: "registered",
    linkedUid,
    phoneE164: verifiedPhone === contact.phoneE164 ? verifiedPhone : null,
    email: contact.email,
    externalReference: responseId, arrivalGroup: null, ticketType: null,
    importId: null, sourceRowId: responseId.slice(0, 120),
    createdAt: now, updatedAt: now, registeredAt: now,
    waitlistedAt: null, checkedInAt: null, cancelledAt: null,
    checkedInBy: null, linkedAt: linkedUid ? now : null};
}

