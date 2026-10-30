// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_review_sales_privacy_policy_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class AdminReviewSalesPrivacyPolicyRequest {
  const AdminReviewSalesPrivacyPolicyRequest({
    required this.requestId,
    required this.expectedRevision,
    required this.sourceReference,
    required this.sourceHash,
    required this.financeReason,
    required this.auditReason,
  });

  final String requestId;
  final int expectedRevision;
  final String sourceReference;
  final String sourceHash;
  final String financeReason;
  final String auditReason;

  Map<String, Object?> toJson() => {
    'requestId': requestId,
    'expectedRevision': expectedRevision,
    'sourceReference': sourceReference,
    'sourceHash': sourceHash,
    'financeReason': financeReason,
    'auditReason': auditReason,
  };
}
