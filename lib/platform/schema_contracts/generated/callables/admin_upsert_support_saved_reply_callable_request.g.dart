// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_upsert_support_saved_reply_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// Adds or edits a saved reply; switch one off with active false.
final class AdminUpsertSupportSavedReplyCallableRequest {
  const AdminUpsertSupportSavedReplyCallableRequest({
    required this.replyId,
    required this.title,
    required this.body,
    required this.active,
  });

  final String? replyId;
  final String title;
  final String body;
  final bool active;

  Map<String, Object?> toJson() => {
    'replyId': replyId,
    'title': title,
    'body': body,
    'active': active,
  };
}
