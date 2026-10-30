// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_sales_imports_apply_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Private bounded Sales callable request. Server authorization and transaction policy are enforced separately.
final class AdminApplySalesImportCallableRequest {
  const AdminApplySalesImportCallableRequest({
    required this.requestId,
    required this.previewHash,
    required this.sourceId,
    required this.contentHash,
    required this.mappingVersion,
    required this.rows,
  });

  final String requestId;
  final String previewHash;
  final String sourceId;
  final String contentHash;
  final String mappingVersion;
  final List<Map<String, Object?>> rows;

  Map<String, Object?> toJson() => {
    'requestId': requestId,
    'previewHash': previewHash,
    'sourceId': sourceId,
    'contentHash': contentHash,
    'mappingVersion': mappingVersion,
    'rows': rows,
  };
}
