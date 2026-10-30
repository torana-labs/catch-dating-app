// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/submit_participant_organizer_application_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Submits one participant-reviewed native application and an exact organizer field grant.
final class SubmitParticipantOrganizerApplicationCallableRequest {
  const SubmitParticipantOrganizerApplicationCallableRequest({
    required this.organizerId,
    required this.formId,
    required this.formVersionId,
    required this.targetKind,
    required this.targetId,
    required this.submissionKey,
    required this.answers,
    required this.reviewedQuestionIds,
    required this.saveToIntakeCanonicalFieldIds,
    required this.consentVersion,
    required this.confirmedConsent,
  });

  final String organizerId;
  final String formId;
  final String formVersionId;
  final String targetKind;
  final String? targetId;
  final String submissionKey;
  final List<Map<String, Object?>> answers;
  final List<String> reviewedQuestionIds;
  final List<String> saveToIntakeCanonicalFieldIds;
  final String consentVersion;
  final bool confirmedConsent;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'formId': formId,
    'formVersionId': formVersionId,
    'targetKind': targetKind,
    'targetId': targetId,
    'submissionKey': submissionKey,
    'answers': answers,
    'reviewedQuestionIds': reviewedQuestionIds,
    'saveToIntakeCanonicalFieldIds': saveToIntakeCanonicalFieldIds,
    'consentVersion': consentVersion,
    'confirmedConsent': confirmedConsent,
  };
}
