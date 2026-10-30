// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/claim_event_runtime_access_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Claims one operational attendee after Firebase phone verification.
final class ClaimEventRuntimeAccessCallableRequest {
  const ClaimEventRuntimeAccessCallableRequest({
    required this.publicRuntimeId,
    required this.displayName,
    required this.runtimeTermsVersion,
    this.attendeeToken,
    this.inviteToken,
  });

  final String publicRuntimeId;
  final String displayName;
  final String runtimeTermsVersion;
  final String? attendeeToken;
  final String? inviteToken;

  Map<String, Object?> toJson() => {
    'publicRuntimeId': publicRuntimeId,
    'displayName': displayName,
    'runtimeTermsVersion': runtimeTermsVersion,
    'attendeeToken': ?attendeeToken,
    'inviteToken': ?inviteToken,
  };
}
