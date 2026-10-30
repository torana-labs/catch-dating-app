// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_list_action_executions_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class AdminListActionExecutionsCallableRequest {
  const AdminListActionExecutionsCallableRequest({
    this.limit,
    this.cursor,
  });

  final int? limit;
  final String? cursor;

  Map<String, Object?> toJson() => {
    'limit': ?limit,
    'cursor': ?cursor,
  };
}
