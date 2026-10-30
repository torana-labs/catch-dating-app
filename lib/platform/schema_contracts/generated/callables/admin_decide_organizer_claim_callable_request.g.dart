// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_decide_organizer_claim_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by adminDecideOrganizerClaim.
final class AdminDecideOrganizerClaimCallableRequest {
  const AdminDecideOrganizerClaimCallableRequest({
    required this.requestId,
    required this.decision,
    this.decisionReason,
  });

  final String requestId;
  final String decision;
  final String? decisionReason;

  Map<String, Object?> toJson() => {
    'requestId': requestId,
    'decision': decision,
    'decisionReason': ?decisionReason,
  };
}
