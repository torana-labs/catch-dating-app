// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/update_organizer_event_setup_defaults_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class UpdateOrganizerEventSetupDefaultsCallableRequest {
  const UpdateOrganizerEventSetupDefaultsCallableRequest({
    required this.organizerId,
    required this.requestId,
    required this.expectedRevision,
    required this.reviewedDefaultsHash,
    required this.changes,
  });

  final String organizerId;
  final String requestId;
  final int expectedRevision;
  final String reviewedDefaultsHash;
  final Map<String, Object?> changes;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'requestId': requestId,
    'expectedRevision': expectedRevision,
    'reviewedDefaultsHash': reviewedDefaultsHash,
    'changes': changes,
  };
}
