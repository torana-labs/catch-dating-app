/// Hand-written helpers that accompany the generated [OrganizerFollow] data
/// shape (emitted from `contracts/firestore/organizer_follows.schema.json` by
/// `tool/contracts/generate_domain_classes.mjs`).
String organizerFollowId({required String organizerId, required String uid}) =>
    '${organizerId}_$uid';
