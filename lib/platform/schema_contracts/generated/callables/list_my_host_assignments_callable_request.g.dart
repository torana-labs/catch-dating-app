// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/list_my_host_assignments_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Lists the caller's live staff assignments across program and event scopes for the unified host work shell. No filters: the shell needs the caller's full live set.
final class ListMyHostAssignmentsCallableRequest {
  const ListMyHostAssignmentsCallableRequest({
    this.includeExpired,
  });

  final bool? includeExpired;

  Map<String, Object?> toJson() => {
    'includeExpired': ?includeExpired,
  };
}
