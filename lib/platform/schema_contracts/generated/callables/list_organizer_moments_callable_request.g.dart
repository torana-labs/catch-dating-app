// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/list_organizer_moments_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// List all moments for one event or program scope.
final class ListOrganizerMomentsCallableRequest {
  const ListOrganizerMomentsCallableRequest({
    required this.scope,
  });

  final Map<String, Object?> scope;

  Map<String, Object?> toJson() => {
    'scope': scope,
  };
}
