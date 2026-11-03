// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_sales_imports_list_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// Private bounded Sales callable request. Server authorization and transaction policy are enforced separately.
final class AdminListSalesImportsCallableRequest {
  const AdminListSalesImportsCallableRequest({
    this.limit,
    this.cursor,
  });

  final int? limit;
  final String? cursor;

  Map<String, Object?> toJson() => {
    'limit': ?limit,
    'cursor': ?cursor,
  };
}
