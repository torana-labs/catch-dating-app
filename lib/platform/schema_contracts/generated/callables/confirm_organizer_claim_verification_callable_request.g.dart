// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/confirm_organizer_claim_verification_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by confirmOrganizerClaimVerification.
final class ConfirmOrganizerClaimVerificationCallableRequest {
  const ConfirmOrganizerClaimVerificationCallableRequest({
    required this.attemptId,
  });

  final String attemptId;

  Map<String, Object?> toJson() => {
    'attemptId': attemptId,
  };
}
