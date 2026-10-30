// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/record_event_invite_link_open_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by recordEventInviteLinkOpen. inviteLinkId accepts a legacy document id or a versioned opaque bearer token.
final class RecordEventInviteLinkOpenCallableRequest {
  const RecordEventInviteLinkOpenCallableRequest({
    required this.eventId,
    required this.inviteLinkId,
    this.surface,
    this.sessionId,
  });

  final String eventId;
  final String inviteLinkId;
  final String? surface;
  final String? sessionId;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'inviteLinkId': inviteLinkId,
    'surface': ?surface,
    'sessionId': ?sessionId,
  };
}
