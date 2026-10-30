// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/publish_event_success_rotation_round_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Confirmed revision-fenced publication of one precomputed guided-rotation round.
final class PublishEventSuccessRotationRoundCallableRequest {
  const PublishEventSuccessRotationRoundCallableRequest({
    required this.eventId,
    required this.expectedRevision,
    required this.roundIndex,
    required this.confirmed,
  });

  final String eventId;
  final int expectedRevision;
  final int roundIndex;
  final bool confirmed;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'expectedRevision': expectedRevision,
    'roundIndex': roundIndex,
    'confirmed': confirmed,
  };
}
