// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_list_support_conversations_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// Lists support conversations for the Support inbox: open, mine, waiting on them, or closed, optionally only guests or organizers. Open lists the longest-waiting first.
final class AdminListSupportConversationsCallableRequest {
  const AdminListSupportConversationsCallableRequest({
    required this.view,
    required this.audience,
    required this.limit,
  });

  final String view;
  final String? audience;
  final int limit;

  Map<String, Object?> toJson() => {
    'view': view,
    'audience': audience,
    'limit': limit,
  };
}
