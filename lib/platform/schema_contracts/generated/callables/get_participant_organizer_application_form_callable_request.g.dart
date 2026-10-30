// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/get_participant_organizer_application_form_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Loads one published organizer application form and private, review-required suggestions for the authenticated participant.
final class GetParticipantOrganizerApplicationFormCallableRequest {
  const GetParticipantOrganizerApplicationFormCallableRequest({
    required this.organizerId,
    required this.formId,
    required this.targetKind,
    required this.targetId,
  });

  final String organizerId;
  final String formId;
  final String targetKind;
  final String? targetId;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'formId': formId,
    'targetKind': targetKind,
    'targetId': targetId,
  };
}
