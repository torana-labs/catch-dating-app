// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/publish_organizer_form_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Publishes an immutable version of one valid organizer form draft.
final class PublishOrganizerFormCallableRequest {
  const PublishOrganizerFormCallableRequest({
    required this.organizerId,
    required this.formId,
    required this.expectedRevision,
  });

  final String organizerId;
  final String formId;
  final int expectedRevision;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'formId': formId,
    'expectedRevision': expectedRevision,
  };
}
