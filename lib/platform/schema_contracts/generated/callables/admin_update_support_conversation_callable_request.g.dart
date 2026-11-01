// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_update_support_conversation_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// Sets a support conversation's owner, status and links (to a booking, payment or safety case). Links replace the previous set; each linked document must exist.
final class AdminUpdateSupportConversationCallableRequest {
  const AdminUpdateSupportConversationCallableRequest({
    required this.conversationId,
    required this.ownerUid,
    required this.status,
    required this.links,
  });

  final String conversationId;
  final String? ownerUid;
  final String status;
  final List<Map<String, Object?>> links;

  Map<String, Object?> toJson() => {
    'conversationId': conversationId,
    'ownerUid': ownerUid,
    'status': status,
    'links': links,
  };
}
