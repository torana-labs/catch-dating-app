// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/organizer_follow_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by followOrganizer and unfollowOrganizer.
final class OrganizerFollowCallableRequest {
  const OrganizerFollowCallableRequest({
    required this.organizerId,
    this.expectedUid,
  });

  final String organizerId;
  final String? expectedUid;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'expectedUid': ?expectedUid,
  };
}
