// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/send_event_chat_message_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class SendEventChatMessageCallableRequest {
  const SendEventChatMessageCallableRequest({
    required this.eventId,
    required this.requestId,
    required this.text,
    required this.replyToMessageId,
    required this.expectedUid,
    this.kind,
  });

  final String eventId;
  final String requestId;
  final String text;
  final String? replyToMessageId;
  final String expectedUid;
  final String? kind;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'requestId': requestId,
    'text': text,
    'replyToMessageId': replyToMessageId,
    'expectedUid': expectedUid,
    'kind': ?kind,
  };
}
