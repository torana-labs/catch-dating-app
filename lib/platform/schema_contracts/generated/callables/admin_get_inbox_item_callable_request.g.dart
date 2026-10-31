// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_get_inbox_item_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// One Admin inbox item and every step it took, oldest first.
final class AdminGetInboxItemCallableRequest {
  const AdminGetInboxItemCallableRequest({
    required this.itemId,
  });

  final String itemId;

  Map<String, Object?> toJson() => {
    'itemId': itemId,
  };
}
