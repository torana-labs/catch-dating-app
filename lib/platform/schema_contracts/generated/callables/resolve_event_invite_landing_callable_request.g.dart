// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/resolve_event_invite_landing_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Resolves an opaque invitation bearer token into one bounded event landing projection and records a deduplicated open.
final class ResolveEventInviteLandingCallableRequest {
  const ResolveEventInviteLandingCallableRequest({
    required this.inviteToken,
    this.sessionId,
  });

  final String inviteToken;
  final String? sessionId;

  Map<String, Object?> toJson() => {
    'inviteToken': inviteToken,
    'sessionId': ?sessionId,
  };
}
