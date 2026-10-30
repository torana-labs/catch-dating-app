// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_get_sales_demo_partner_review_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class AdminGetSalesDemoPartnerReviewCallableRequest {
  const AdminGetSalesDemoPartnerReviewCallableRequest({
    required this.blueprintId,
  });

  final String blueprintId;

  Map<String, Object?> toJson() => {
    'blueprintId': blueprintId,
  };
}
