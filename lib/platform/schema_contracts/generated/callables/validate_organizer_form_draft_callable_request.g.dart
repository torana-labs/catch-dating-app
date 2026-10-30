// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/validate_organizer_form_draft_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Validates an unsaved organizer form definition using the publish validator.
final class ValidateOrganizerFormDraftCallableRequest {
  const ValidateOrganizerFormDraftCallableRequest({
    required this.organizerId,
    required this.formId,
    required this.definition,
  });

  final String organizerId;
  final String? formId;
  final Map<String, Object?> definition;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'formId': formId,
    'definition': definition,
  };
}
