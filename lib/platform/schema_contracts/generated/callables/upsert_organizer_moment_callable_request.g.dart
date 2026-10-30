// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/upsert_organizer_moment_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Create or revise an organizer moment. New moments land as drafts; revising an existing moment keeps its scope (immutable) and drops it back to draft with approval cleared, requiring re-arm.
final class UpsertOrganizerMomentCallableRequest {
  const UpsertOrganizerMomentCallableRequest({
    required this.scope,
    this.momentId,
    required this.name,
    required this.initiation,
    required this.sense,
    required this.audience,
    required this.action,
  });

  final Map<String, Object?> scope;
  final String? momentId;
  final String name;
  final Map<String, Object?> initiation;
  final String sense;
  final Map<String, Object?> audience;
  final Map<String, Object?> action;

  Map<String, Object?> toJson() => {
    'scope': scope,
    'momentId': ?momentId,
    'name': name,
    'initiation': initiation,
    'sense': sense,
    'audience': audience,
    'action': action,
  };
}
