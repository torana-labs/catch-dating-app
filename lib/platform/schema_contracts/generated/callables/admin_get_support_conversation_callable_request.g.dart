// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_get_support_conversation_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// Opens one support conversation with its messages, the full contact address and its links. Audited.
final class AdminGetSupportConversationCallableRequest {
  const AdminGetSupportConversationCallableRequest({
    required this.conversationId,
  });

  final String conversationId;

  Map<String, Object?> toJson() => {
    'conversationId': conversationId,
  };
}
