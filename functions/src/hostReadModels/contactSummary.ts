import type {
  OrganizerContactDocument, OrganizerContactTraitDocument,
  OrganizerContactChannelStateDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {ListOrganizerContactsCallableResponse} from
  "../shared/generated/listOrganizerContactsCallableResponse";
import {organizerContactVisibleFields} from
  "../organizers/organizerContactFields";

type Row = ListOrganizerContactsCallableResponse["contacts"][number];

/** Explicit host read contract: never spread an internal source document. */
export type ContactSummary = import(
  "../shared/generated/firestoreAdminTypes"
).HostContactSummaryDocument;

/** A list entry is a disposable view, not identity or delivery authority. */
export function projectContactSummary(params: {
  contactId: string;
  contact: OrganizerContactDocument | undefined;
  traits: OrganizerContactTraitDocument | undefined;
  channel: OrganizerContactChannelStateDocument | undefined;
  tags: ReadonlyMap<string, {tagId: string; label: string}>;
}): ContactSummary | null {
  const {contactId, contact, traits, channel, tags} = params;
  if (!contact || !traits || !contact.organizerId ||
      traits.organizerId !== contact.organizerId ||
      traits.contactId !== contactId || contact.deletedAt !== null ||
      contact.hiddenAt != null || contact.identityState === "merged") {
    return null;
  }
  const manualTagIds = (contact.manualTagIds ?? []).slice(0, 5);
  const fields = organizerContactVisibleFields(contact);
  const row: Row = {
    contactId, displayName: fields.displayName,
    phoneE164: fields.phoneE164, email: fields.email,
    identityState: contact.identityState,
    identityConfidence: contact.identityConfidence,
    ambiguousCandidateCount: contact.ambiguousCandidateContactIds.length,
    attendedEventCount: traits.attendedEventCount,
    expectedEventCount: traits.expectedEventCount,
    lastAttendedAtMillis: traits.lastAttendedAt?.toMillis() ?? null,
    segmentIds: [...traits.segmentIds],
    manualTags: manualTagIds.flatMap((id) => {
      const tag = tags.get(id);
      return tag ? [{tagId: tag.tagId, label: tag.label}] : [];
    }),
    whatsappStatus: traits.whatsappStatus,
    whatsappAdminSuppressed: channel?.organizerId === contact.organizerId &&
      channel.contactId === contactId && channel.adminSuppressed === true,
    smsStatus: traits.smsStatus, sourceCoverage: traits.sourceCoverage,
    revision: contact.revision,
    ...(traits.membership ? {membership: traits.membership} : {}),
  };
  return {organizerId: contact.organizerId, contactId,
    searchName: contact.searchName,
    lastSeenAtMillis: contact.lastSeenAt.toMillis(),
    manualTagIds, linkedAccount: traits.linkedAccount,
    importedContact: traits.importedEventCount > 0, row, version: 1};
}
