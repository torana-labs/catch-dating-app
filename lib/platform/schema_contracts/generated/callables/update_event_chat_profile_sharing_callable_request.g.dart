// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/update_event_chat_profile_sharing_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class UpdateEventChatProfileSharingCallableRequest {
  const UpdateEventChatProfileSharingCallableRequest({
    required this.eventId,
    required this.expectedUid,
    required this.expectedRevision,
    required this.requestId,
    required this.selection,
  });

  final String eventId;
  final String expectedUid;
  final int expectedRevision;
  final String requestId;
  final Map<String, Object?>? selection;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'expectedUid': expectedUid,
    'expectedRevision': expectedRevision,
    'requestId': requestId,
    'selection': selection,
  };
}
