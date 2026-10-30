// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/preview_event_assignment_features_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Manager-only aggregate coverage preview for unsaved event-local structured matching rules.
final class PreviewEventAssignmentFeaturesCallableRequest {
  const PreviewEventAssignmentFeaturesCallableRequest({
    required this.eventId,
    required this.rules,
    this.sourceFormIds,
  });

  final String eventId;
  final List<Map<String, Object?>> rules;
  final List<String>? sourceFormIds;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'rules': rules,
    'sourceFormIds': ?sourceFormIds,
  };
}
