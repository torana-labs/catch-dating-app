// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/act_on_event_chat_message_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class ActOnEventChatMessageCallableRequest {
  const ActOnEventChatMessageCallableRequest({
    required this.eventId,
    required this.expectedUid,
    required this.messageId,
    required this.action,
    required this.reasonCode,
    required this.requestId,
  });

  final String eventId;
  final String expectedUid;
  final String messageId;
  final String action;
  final String? reasonCode;
  final String requestId;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'expectedUid': expectedUid,
    'messageId': messageId,
    'action': action,
    'reasonCode': reasonCode,
    'requestId': requestId,
  };
}
