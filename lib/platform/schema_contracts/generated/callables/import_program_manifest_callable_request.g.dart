// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/import_program_manifest_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Bulk manifest import for a program. Preview mode plans without writing; commit mode applies idempotently via clientOperationId. Rows describe one guest and, optionally, that guest's inbound travel leg.
final class ImportProgramManifestCallableRequest {
  const ImportProgramManifestCallableRequest({
    required this.programId,
    required this.mode,
    required this.clientOperationId,
    required this.rows,
  });

  final String programId;
  final String mode;
  final String clientOperationId;
  final List<Map<String, Object?>> rows;

  Map<String, Object?> toJson() => {
    'programId': programId,
    'mode': mode,
    'clientOperationId': clientOperationId,
    'rows': rows,
  };
}
