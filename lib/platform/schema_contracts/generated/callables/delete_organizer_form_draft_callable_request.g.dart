// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/delete_organizer_form_draft_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Hard-deletes only a never-published organizer form draft.
final class DeleteOrganizerFormDraftCallableRequest {
  const DeleteOrganizerFormDraftCallableRequest({
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
