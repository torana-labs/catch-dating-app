// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/save_organizer_form_response_draft_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Optimistically saves respondent answers without file bytes.
final class SaveOrganizerFormResponseDraftCallableRequest {
  const SaveOrganizerFormResponseDraftCallableRequest({
    this.messagingChoices,
    required this.draftId,
    required this.draftToken,
    required this.expectedRevision,
    required this.answers,
    required this.consentAccepted,
  });

  final Map<String, Object?>? messagingChoices;
  final String draftId;
  final String? draftToken;
  final int expectedRevision;
  final Map<String, Object?> answers;
  final bool consentAccepted;

  Map<String, Object?> toJson() => {
    'messagingChoices': ?messagingChoices,
    'draftId': draftId,
    'draftToken': draftToken,
    'expectedRevision': expectedRevision,
    'answers': answers,
    'consentAccepted': consentAccepted,
  };
}
