// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/manage_organizer_guest_block_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// An organizer's owner or manager stops someone booking their events, or lets them back. No reason or review; it affects no other organizer.
final class ManageOrganizerGuestBlockCallableRequest {
  const ManageOrganizerGuestBlockCallableRequest({
    required this.organizerId,
    required this.uid,
    required this.blocked,
  });

  final String organizerId;
  final String uid;
  final bool blocked;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'uid': uid,
    'blocked': blocked,
  };
}
