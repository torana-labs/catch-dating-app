// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_sales_opportunities_upsert_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Private bounded Sales callable request. Server authorization and transaction policy are enforced separately.
final class AdminUpsertSalesOpportunityCallableRequest {
  const AdminUpsertSalesOpportunityCallableRequest({
    required this.organizerId,
    required this.requestId,
    required this.expectedRevision,
    this.opportunityId,
    required this.fields,
    this.transitionReason,
    this.financeAttestationId,
  });

  final String organizerId;
  final String requestId;
  final int expectedRevision;
  final String? opportunityId;
  final Map<String, Object?> fields;
  final String? transitionReason;
  final String? financeAttestationId;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'requestId': requestId,
    'expectedRevision': expectedRevision,
    'opportunityId': ?opportunityId,
    'fields': fields,
    'transitionReason': ?transitionReason,
    'financeAttestationId': ?financeAttestationId,
  };
}
