// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/reset_event_rehearsal_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Deterministically resets or forks a rehearsal run.
final class ResetEventRehearsalCallableRequest {
  const ResetEventRehearsalCallableRequest({
    required this.sessionId,
    required this.fork,
    required this.seed,
  });

  final String sessionId;
  final bool fork;
  final int? seed;

  Map<String, Object?> toJson() => {
    'sessionId': sessionId,
    'fork': fork,
    'seed': seed,
  };
}
