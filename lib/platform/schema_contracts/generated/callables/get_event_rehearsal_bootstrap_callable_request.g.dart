// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/get_event_rehearsal_bootstrap_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Returns Host-safe rehearsal state.
final class GetEventRehearsalBootstrapCallableRequest {
  const GetEventRehearsalBootstrapCallableRequest({
    required this.sessionId,
    this.practiceOperatorId,
  });

  final String sessionId;
  final String? practiceOperatorId;

  Map<String, Object?> toJson() => {
    'sessionId': sessionId,
    'practiceOperatorId': ?practiceOperatorId,
  };
}
