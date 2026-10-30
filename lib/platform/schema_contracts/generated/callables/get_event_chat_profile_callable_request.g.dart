// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/get_event_chat_profile_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class GetEventChatProfileCallableRequest {
  const GetEventChatProfileCallableRequest({
    required this.eventId,
    required this.expectedUid,
    required this.participantUid,
  });

  final String eventId;
  final String expectedUid;
  final String participantUid;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'expectedUid': expectedUid,
    'participantUid': participantUid,
  };
}
