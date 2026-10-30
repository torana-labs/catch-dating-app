// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/get_event_assistance_checkpoint_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class GetEventAssistanceCheckpointCallableRequest {
  const GetEventAssistanceCheckpointCallableRequest({
    required this.context,
    required this.groupId,
    required this.checkpointId,
    required this.progressRevision,
  });

  final Map<String, Object?> context;
  final String groupId;
  final String checkpointId;
  final int progressRevision;

  Map<String, Object?> toJson() => {
    'context': context,
    'groupId': groupId,
    'checkpointId': checkpointId,
    'progressRevision': progressRevision,
  };
}
