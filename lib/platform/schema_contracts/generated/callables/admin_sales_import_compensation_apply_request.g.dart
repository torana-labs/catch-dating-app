// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_sales_import_compensation_apply_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class AdminSalesImportCompensationApplyRequest {
  const AdminSalesImportCompensationApplyRequest({
    required this.importId,
    required this.organizerId,
    required this.requestId,
    required this.previewHash,
    required this.reason,
  });

  final String importId;
  final String organizerId;
  final String requestId;
  final String previewHash;
  final String reason;

  Map<String, Object?> toJson() => {
    'importId': importId,
    'organizerId': organizerId,
    'requestId': requestId,
    'previewHash': previewHash,
    'reason': reason,
  };
}
