// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_list_inbox_items_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// One page of the Admin inbox: items waiting on a person, oldest first, with real totals per scope and type.
final class AdminListInboxItemsCallableRequest {
  const AdminListInboxItemsCallableRequest({
    required this.scope,
    required this.type,
    required this.city,
    required this.limit,
    required this.cursor,
  });

  final String scope;
  final String? type;
  final String? city;
  final int limit;
  final String? cursor;

  Map<String, Object?> toJson() => {
    'scope': scope,
    'type': type,
    'city': city,
    'limit': limit,
    'cursor': cursor,
  };
}
