// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/set_event_success_accountability_resolution_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Host resolution for one currently checked-in operational attendee during an Event Success sweep.
final class SetEventSuccessAccountabilityResolutionCallableRequest {
  const SetEventSuccessAccountabilityResolutionCallableRequest({
    required this.eventId,
    required this.attendeeId,
    required this.resolution,
  });

  final String eventId;
  final String attendeeId;
  final String resolution;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'attendeeId': attendeeId,
    'resolution': resolution,
  };
}
