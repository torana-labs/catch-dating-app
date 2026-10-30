// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/get_event_chat_profile_sharing_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class GetEventChatProfileSharingCallableRequest {
  const GetEventChatProfileSharingCallableRequest({
    required this.eventId,
    required this.expectedUid,
    this.previewSelection,
  });

  final String eventId;
  final String expectedUid;
  final Map<String, Object?>? previewSelection;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'expectedUid': expectedUid,
    'previewSelection': ?previewSelection,
  };
}
