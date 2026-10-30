// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/grant_event_staff_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Organizer-manager request to grant an existing phone-auth account expiring event-operator access.
final class GrantEventStaffCallableRequest {
  const GrantEventStaffCallableRequest({
    required this.eventId,
    required this.phoneNumber,
    required this.expiresAtMillis,
  });

  final String eventId;
  final String phoneNumber;
  final int expiresAtMillis;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'phoneNumber': phoneNumber,
    'expiresAtMillis': expiresAtMillis,
  };
}
