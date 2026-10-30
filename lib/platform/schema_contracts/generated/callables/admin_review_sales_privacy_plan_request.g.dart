// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_review_sales_privacy_plan_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class AdminReviewSalesPrivacyPlanRequest {
  const AdminReviewSalesPrivacyPlanRequest({
    required this.organizerId,
    required this.requestId,
    required this.restrictionRevision,
    required this.policyHash,
    required this.inventoryHash,
    required this.expectedActivePlanId,
  });

  final String organizerId;
  final String requestId;
  final int restrictionRevision;
  final String policyHash;
  final String inventoryHash;
  final String? expectedActivePlanId;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'requestId': requestId,
    'restrictionRevision': restrictionRevision,
    'policyHash': policyHash,
    'inventoryHash': inventoryHash,
    'expectedActivePlanId': expectedActivePlanId,
  };
}
