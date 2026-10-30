// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/get_sales_partner_workspace_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class GetSalesPartnerWorkspaceCallableRequest {
  const GetSalesPartnerWorkspaceCallableRequest({
    this.cursor,
  });

  final String? cursor;

  Map<String, Object?> toJson() => {
    'cursor': ?cursor,
  };
}
