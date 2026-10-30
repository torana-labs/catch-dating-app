// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/request_organizer_form_export_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Idempotent response export request or status refresh.
final class RequestOrganizerFormExportCallableRequest {
  const RequestOrganizerFormExportCallableRequest({
    required this.organizerId,
    required this.formId,
    required this.requestId,
    required this.format,
    required this.statuses,
    required this.versionId,
    required this.fromMillis,
    required this.toMillis,
    this.responseQuery,
    this.expectedResultHash,
    this.expectedQueryHash,
  });

  final String organizerId;
  final String formId;
  final String requestId;
  final String format;
  final List<String> statuses;
  final String? versionId;
  final int? fromMillis;
  final int? toMillis;
  final Map<String, Object?>? responseQuery;
  final String? expectedResultHash;
  final String? expectedQueryHash;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'formId': formId,
    'requestId': requestId,
    'format': format,
    'statuses': statuses,
    'versionId': versionId,
    'fromMillis': fromMillis,
    'toMillis': toMillis,
    'responseQuery': ?responseQuery,
    'expectedResultHash': ?expectedResultHash,
    'expectedQueryHash': ?expectedQueryHash,
  };
}
