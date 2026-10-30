// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/get_organizer_form_editor_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Gets one manager-authorized form and its editable draft.
final class GetOrganizerFormEditorCallableRequest {
  const GetOrganizerFormEditorCallableRequest({
    required this.organizerId,
    required this.formId,
  });

  final String organizerId;
  final String formId;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'formId': formId,
  };
}
