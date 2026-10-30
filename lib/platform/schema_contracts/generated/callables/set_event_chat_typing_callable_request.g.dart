// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/set_event_chat_typing_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class SetEventChatTypingCallableRequest {
  const SetEventChatTypingCallableRequest({
    required this.eventId,
    required this.isTyping,
    required this.expectedRevision,
    required this.expectedUid,
  });

  final String eventId;
  final bool isTyping;
  final int expectedRevision;
  final String expectedUid;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'isTyping': isTyping,
    'expectedRevision': expectedRevision,
    'expectedUid': expectedUid,
  };
}
