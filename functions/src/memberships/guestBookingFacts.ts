import type {OrganizerCommunityMembershipDocument} from
  "../shared/generated/organizerCommunityMembershipDocument";

/**
 * guestBookingFacts/{uid}: booking facts about one guest that come from
 * documents the guest cannot read, projected for that guest alone so the
 * event screen can show booking state from a listener. Booking commands keep
 * reading the authoritative documents.
 */
export const guestBookingFactsCollection = "guestBookingFacts";

/** Merge patch that records one organizer's community decision. */
export function communityMembershipFactPatch(
  membership: OrganizerCommunityMembershipDocument
) {
  return {
    schemaVersion: 1,
    uid: membership.uid,
    updatedAtMillis: membership.updatedAtMillis,
    communityMemberships: {
      [membership.organizerId]: {
        state: membership.state,
        revision: membership.revision,
        decisionId: membership.lastDecisionId,
        updatedAtMillis: membership.updatedAtMillis,
      },
    },
  };
}
