// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/configure_event_assignment_features_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Organizer maps reviewed versioned form questions to bounded soft assignment features; it does not grant answer use.
final class ConfigureEventAssignmentFeaturesCallableRequest {
  const ConfigureEventAssignmentFeaturesCallableRequest({
    required this.eventId,
    required this.expectedRevision,
    required this.requestId,
    required this.rules,
  });

  final String eventId;
  final int expectedRevision;
  final String requestId;
  final List<Map<String, Object?>> rules;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'expectedRevision': expectedRevision,
    'requestId': requestId,
    'rules': rules,
  };
}
