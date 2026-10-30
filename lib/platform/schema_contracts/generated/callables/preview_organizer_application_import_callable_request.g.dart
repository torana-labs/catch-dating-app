// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/preview_organizer_application_import_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Provider-neutral tabular application preview after local CSV or XLSX decoding.
final class PreviewOrganizerApplicationImportCallableRequest {
  const PreviewOrganizerApplicationImportCallableRequest({
    required this.organizerId,
    required this.formVersionId,
    required this.headers,
    required this.mappings,
    required this.rows,
  });

  final String organizerId;
  final String formVersionId;
  final List<String> headers;
  final List<Map<String, Object?>> mappings;
  final List<Map<String, Object?>> rows;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'formVersionId': formVersionId,
    'headers': headers,
    'mappings': mappings,
    'rows': rows,
  };
}
