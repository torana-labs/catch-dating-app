// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_record_support_message_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// Records a message in a support conversation: a reply staff sent (outbound; the conversation then waits on them), an email that came in (inbound, starting the conversation when conversationId is null), or an internal note. Replies are recorded, not sent: staff send them from WhatsApp, Instagram or email until replies go out through the provider.
final class AdminRecordSupportMessageCallableRequest {
  const AdminRecordSupportMessageCallableRequest({
    required this.conversationId,
    required this.channel,
    required this.contactAddress,
    required this.displayName,
    required this.direction,
    required this.text,
    required this.savedReplyId,
  });

  final String? conversationId;
  final String channel;
  final String? contactAddress;
  final String? displayName;
  final String direction;
  final String text;
  final String? savedReplyId;

  Map<String, Object?> toJson() => {
    'conversationId': conversationId,
    'channel': channel,
    'contactAddress': contactAddress,
    'displayName': displayName,
    'direction': direction,
    'text': text,
    'savedReplyId': savedReplyId,
  };
}
