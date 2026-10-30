// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/update_organizer_form_draft_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Optimistically replaces one organizer form draft definition.
final class UpdateOrganizerFormDraftCallableRequest {
  const UpdateOrganizerFormDraftCallableRequest({
    required this.organizerId,
    required this.formId,
    required this.expectedRevision,
    required this.definition,
  });

  final String organizerId;
  final String formId;
  final int expectedRevision;
  final Map<String, Object?> definition;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'formId': formId,
    'expectedRevision': expectedRevision,
    'definition': definition,
  };
}
