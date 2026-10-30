// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/run_organizer_moment_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Fire a manual moment immediately. The caller-supplied requestKey scopes idempotency: retries and double-submits with the same key resolve to the same run.
final class RunOrganizerMomentCallableRequest {
  const RunOrganizerMomentCallableRequest({
    required this.scope,
    required this.momentId,
    required this.requestKey,
  });

  final Map<String, Object?> scope;
  final String momentId;
  final String requestKey;

  Map<String, Object?> toJson() => {
    'scope': scope,
    'momentId': momentId,
    'requestKey': requestKey,
  };
}
