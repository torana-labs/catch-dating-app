// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_rebuild_inbox_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// Owner-only: re-project one page of an inbox source collection, or of users into the people index.
final class AdminRebuildInboxCallableRequest {
  const AdminRebuildInboxCallableRequest({
    required this.source,
    required this.limit,
    required this.cursor,
  });

  final String source;
  final int limit;
  final String? cursor;

  Map<String, Object?> toJson() => {
    'source': source,
    'limit': limit,
    'cursor': cursor,
  };
}
