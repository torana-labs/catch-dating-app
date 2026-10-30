// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/duplicate_organizer_form_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Creates an idempotent new draft copy with entirely new nested identities.
final class DuplicateOrganizerFormCallableRequest {
  const DuplicateOrganizerFormCallableRequest({
    required this.organizerId,
    required this.sourceFormId,
    required this.requestId,
    required this.title,
  });

  final String organizerId;
  final String sourceFormId;
  final String requestId;
  final String? title;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'sourceFormId': sourceFormId,
    'requestId': requestId,
    'title': title,
  };
}
