// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_sales_import_history_apply_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class AdminApplySalesImportHistoryRequest {
  const AdminApplySalesImportHistoryRequest({
    required this.sourceId,
    required this.contentHash,
    required this.mappingVersion,
    required this.promotionVersion,
    required this.rows,
    required this.requestId,
    required this.previewHash,
  });

  final String sourceId;
  final String contentHash;
  final String mappingVersion;
  final String promotionVersion;
  final List<Map<String, Object?>> rows;
  final String requestId;
  final String previewHash;

  Map<String, Object?> toJson() => {
    'sourceId': sourceId,
    'contentHash': contentHash,
    'mappingVersion': mappingVersion,
    'promotionVersion': promotionVersion,
    'rows': rows,
    'requestId': requestId,
    'previewHash': previewHash,
  };
}
