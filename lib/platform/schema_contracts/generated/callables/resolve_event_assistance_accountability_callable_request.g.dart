// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/resolve_event_assistance_accountability_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class ResolveEventAssistanceAccountabilityCallableRequest {
  const ResolveEventAssistanceAccountabilityCallableRequest({
    required this.groupId,
    required this.command,
    required this.expectedSourceHash,
    this.checkpoint,
  });

  final String groupId;
  final Map<String, Object?> command;
  final String expectedSourceHash;
  final Map<String, Object?>? checkpoint;

  Map<String, Object?> toJson() => {
    'groupId': groupId,
    'command': command,
    'expectedSourceHash': expectedSourceHash,
    'checkpoint': ?checkpoint,
  };
}
