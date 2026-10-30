// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/revoke_participant_organizer_data_grant_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Revokes the authenticated participant's organizer access grant without deleting the platform audit snapshot.
final class RevokeParticipantOrganizerDataGrantCallableRequest {
  const RevokeParticipantOrganizerDataGrantCallableRequest({
    required this.organizerId,
    required this.applicationId,
    required this.expectedRevision,
  });

  final String organizerId;
  final String applicationId;
  final int expectedRevision;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'applicationId': applicationId,
    'expectedRevision': expectedRevision,
  };
}
