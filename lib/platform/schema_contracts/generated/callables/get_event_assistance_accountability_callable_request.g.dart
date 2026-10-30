// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/get_event_assistance_accountability_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class GetEventAssistanceAccountabilityCallableRequest {
  const GetEventAssistanceAccountabilityCallableRequest({
    required this.context,
    required this.groupId,
    required this.attendeeId,
    this.checkpoint,
  });

  final Map<String, Object?> context;
  final String groupId;
  final String attendeeId;
  final Map<String, Object?>? checkpoint;

  Map<String, Object?> toJson() => {
    'context': context,
    'groupId': groupId,
    'attendeeId': attendeeId,
    'checkpoint': ?checkpoint,
  };
}
