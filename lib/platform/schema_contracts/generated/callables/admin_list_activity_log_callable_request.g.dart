// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_list_activity_log_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// One page of the Admin activity log, newest first: people's decisions and agent receipts, filterable to problems.
final class AdminListActivityLogCallableRequest {
  const AdminListActivityLogCallableRequest({
    required this.filter,
    required this.limit,
    required this.cursor,
  });

  final String filter;
  final int limit;
  final String? cursor;

  Map<String, Object?> toJson() => {
    'filter': filter,
    'limit': limit,
    'cursor': cursor,
  };
}
