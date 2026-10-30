// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/import_organizer_applications_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Commits a bounded provider-neutral tabular application import.
final class ImportOrganizerApplicationsCallableRequest {
  const ImportOrganizerApplicationsCallableRequest({
    required this.organizerId,
    required this.formId,
    required this.formVersionId,
    required this.targetKind,
    required this.targetId,
    required this.mappingId,
    required this.importKey,
    required this.fileName,
    required this.format,
    required this.headers,
    required this.mappings,
    required this.rows,
  });

  final String organizerId;
  final String formId;
  final String formVersionId;
  final String targetKind;
  final String? targetId;
  final String? mappingId;
  final String importKey;
  final String fileName;
  final String format;
  final List<String> headers;
  final List<Map<String, Object?>> mappings;
  final List<Map<String, Object?>> rows;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'formId': formId,
    'formVersionId': formVersionId,
    'targetKind': targetKind,
    'targetId': targetId,
    'mappingId': mappingId,
    'importKey': importKey,
    'fileName': fileName,
    'format': format,
    'headers': headers,
    'mappings': mappings,
    'rows': rows,
  };
}
