// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/start_organizer_host_conversation_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by startOrganizerHostConversation.
final class StartOrganizerHostConversationCallableRequest {
  const StartOrganizerHostConversationCallableRequest({
    required this.organizerId,
    required this.hostUid,
    this.eventId,
  });

  final String organizerId;
  final String hostUid;
  final String? eventId;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'hostUid': hostUid,
    'eventId': ?eventId,
  };
}
