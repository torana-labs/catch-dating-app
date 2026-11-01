// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_recommend_organizer_claim_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// Ops recommend approving or rejecting a pending organizer claim; the owner decides it.
final class AdminRecommendOrganizerClaimCallableRequest {
  const AdminRecommendOrganizerClaimCallableRequest({
    required this.requestId,
    required this.decision,
    required this.note,
  });

  final String requestId;
  final String decision;
  final String note;

  Map<String, Object?> toJson() => {
    'requestId': requestId,
    'decision': decision,
    'note': note,
  };
}
