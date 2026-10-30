// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/send_cross_paths_invitation_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Typed, message-free invitation intent accepted by sendCrossPathsInvitation.
final class SendCrossPathsInvitationCallableRequest {
  const SendCrossPathsInvitationCallableRequest({
    required this.eventId,
    required this.recipientUid,
    required this.suggestionToken,
  });

  final String eventId;
  final String recipientUid;
  final String suggestionToken;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'recipientUid': recipientUid,
    'suggestionToken': suggestionToken,
  };
}
