// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/revoke_event_staff_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Organizer-manager request to revoke one event staff member immediately.
final class RevokeEventStaffCallableRequest {
  const RevokeEventStaffCallableRequest({
    required this.eventId,
    required this.uid,
    required this.expectedRevision,
  });

  final String eventId;
  final String uid;
  final int expectedRevision;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'uid': uid,
    'expectedRevision': expectedRevision,
  };
}
