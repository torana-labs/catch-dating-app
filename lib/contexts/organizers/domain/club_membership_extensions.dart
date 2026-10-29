/// Hand-written helpers that accompany the generated [ClubMembership] data
/// shape (emitted from `contracts/firestore/club_memberships.schema.json` by
/// `tool/contracts/generate_domain_classes.mjs`).
String clubMembershipId({required String clubId, required String uid}) =>
    '${clubId}_$uid';
