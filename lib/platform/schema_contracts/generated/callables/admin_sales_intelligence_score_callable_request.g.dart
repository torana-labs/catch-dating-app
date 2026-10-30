// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_sales_intelligence_score_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class AdminSalesIntelligenceScoreCallableRequest {
  const AdminSalesIntelligenceScoreCallableRequest({
    required this.requestId,
    required this.organizerId,
    required this.expectedAccountRevision,
    required this.expectedPolicyRevision,
  });

  final String requestId;
  final String organizerId;
  final int expectedAccountRevision;
  final int expectedPolicyRevision;

  Map<String, Object?> toJson() => {
    'requestId': requestId,
    'organizerId': organizerId,
    'expectedAccountRevision': expectedAccountRevision,
    'expectedPolicyRevision': expectedPolicyRevision,
  };
}
