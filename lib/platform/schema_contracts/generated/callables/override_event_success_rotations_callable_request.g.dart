// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/override_event_success_rotations_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by overrideEventSuccessRotations.
final class OverrideEventSuccessRotationsCallableRequest {
  const OverrideEventSuccessRotationsCallableRequest({
    required this.eventId,
    required this.expectedRevision,
    required this.rounds,
  });

  final String eventId;
  final int expectedRevision;
  final List<Map<String, Object?>> rounds;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'expectedRevision': expectedRevision,
    'rounds': rounds,
  };
}
