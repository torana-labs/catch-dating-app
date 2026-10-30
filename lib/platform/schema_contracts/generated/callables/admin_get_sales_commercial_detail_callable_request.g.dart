// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_get_sales_commercial_detail_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Strict bounded private Sales commercial read.
final class AdminGetSalesCommercialDetailCallableRequest {
  const AdminGetSalesCommercialDetailCallableRequest({
    required this.organizerId,
    required this.opportunityId,
  });

  final String organizerId;
  final String opportunityId;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'opportunityId': opportunityId,
  };
}
