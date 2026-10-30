// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/event_id_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by simple event actions that need only an eventId (plus optional inviteCode for invite-gated events).
final class EventIdCallableRequest {
  const EventIdCallableRequest({
    required this.eventId,
    this.inviteCode,
    this.inviteLinkId,
  });

  final String eventId;
  final String? inviteCode;
  final String? inviteLinkId;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'inviteCode': ?inviteCode,
    'inviteLinkId': ?inviteLinkId,
  };
}
