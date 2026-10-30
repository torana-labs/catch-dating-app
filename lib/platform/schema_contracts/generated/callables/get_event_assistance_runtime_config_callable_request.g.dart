// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/get_event_assistance_runtime_config_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class GetEventAssistanceRuntimeConfigCallableRequest {
  const GetEventAssistanceRuntimeConfigCallableRequest({
    required this.context,
    this.senderCursors,
  });

  final Map<String, Object?> context;
  final Map<String, Object?>? senderCursors;

  Map<String, Object?> toJson() => {
    'context': context,
    'senderCursors': ?senderCursors,
  };
}
