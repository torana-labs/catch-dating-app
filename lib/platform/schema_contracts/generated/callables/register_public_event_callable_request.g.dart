// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/register_public_event_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Phone-authenticated website registration for a published Catch event without a Consumer profile.
final class RegisterPublicEventCallableRequest {
  const RegisterPublicEventCallableRequest({
    required this.eventId,
    required this.displayName,
    this.inviteToken,
    this.organizerUpdates,
  });

  final String eventId;
  final String displayName;
  final String? inviteToken;
  final Map<String, Object?>? organizerUpdates;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'displayName': displayName,
    'inviteToken': ?inviteToken,
    'organizerUpdates': ?organizerUpdates,
  };
}
