// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/get_event_invite_link_token_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Manager-authorized request for the shareable bearer token of one event invitation link.
final class GetEventInviteLinkTokenCallableRequest {
  const GetEventInviteLinkTokenCallableRequest({
    required this.eventId,
    required this.inviteLinkId,
  });

  final String eventId;
  final String inviteLinkId;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'inviteLinkId': inviteLinkId,
  };
}
