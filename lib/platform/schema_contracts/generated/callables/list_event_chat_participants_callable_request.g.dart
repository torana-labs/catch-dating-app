// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/list_event_chat_participants_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class ListEventChatParticipantsCallableRequest {
  const ListEventChatParticipantsCallableRequest({
    required this.eventId,
    required this.expectedUid,
    required this.cursor,
    required this.limit,
  });

  final String eventId;
  final String expectedUid;
  final Map<String, Object?>? cursor;
  final int limit;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'expectedUid': expectedUid,
    'cursor': cursor,
    'limit': limit,
  };
}
