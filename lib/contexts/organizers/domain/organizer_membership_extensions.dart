/// Hand-written helpers that accompany the generated [OrganizerMembership] data
/// shape (emitted from `contracts/firestore/organizer_memberships.schema.json` by
/// `tool/contracts/generate_domain_classes.mjs`).
String organizerMembershipId({
  required String organizerId,
  required String uid,
}) => '${organizerId}_$uid';
