// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_sales_import_compensation_preview_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class AdminSalesImportCompensationPreviewRequest {
  const AdminSalesImportCompensationPreviewRequest({
    required this.importId,
    required this.organizerId,
  });

  final String importId;
  final String organizerId;

  Map<String, Object?> toJson() => {
    'importId': importId,
    'organizerId': organizerId,
  };
}
