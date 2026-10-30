// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/start_event_success_first_hello_mission_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by startEventSuccessFirstHelloMission.
final class StartEventSuccessFirstHelloMissionCallableRequest {
  const StartEventSuccessFirstHelloMissionCallableRequest({
    required this.eventId,
    required this.venueSessionToken,
  });

  final String eventId;
  final String venueSessionToken;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'venueSessionToken': venueSessionToken,
  };
}
