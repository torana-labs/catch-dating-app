// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/check_in_event_runtime_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Checks a ready no-download participant into the linked operational attendee row.
final class CheckInEventRuntimeCallableRequest {
  const CheckInEventRuntimeCallableRequest({
    required this.publicRuntimeId,
    required this.venueSessionToken,
  });

  final String publicRuntimeId;
  final String venueSessionToken;

  Map<String, Object?> toJson() => {
    'publicRuntimeId': publicRuntimeId,
    'venueSessionToken': venueSessionToken,
  };
}
