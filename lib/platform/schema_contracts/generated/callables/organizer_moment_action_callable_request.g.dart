// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/organizer_moment_action_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Lifecycle transition on one moment: arm (approve the rule once), pause, or resume. Scope must match the stored moment.
final class OrganizerMomentActionCallableRequest {
  const OrganizerMomentActionCallableRequest({
    required this.scope,
    required this.momentId,
  });

  final Map<String, Object?> scope;
  final String momentId;

  Map<String, Object?> toJson() => {
    'scope': scope,
    'momentId': momentId,
  };
}
