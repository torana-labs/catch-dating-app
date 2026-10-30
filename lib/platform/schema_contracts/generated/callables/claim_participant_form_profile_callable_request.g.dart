// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/claim_participant_form_profile_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Claim reviewed form data for the authenticated participant without enabling dating discovery or event admission.
final class ClaimParticipantFormProfileCallableRequest {
  const ClaimParticipantFormProfileCallableRequest({
    required this.responseId,
    required this.expectedProfileRevision,
    required this.requestId,
    required this.termsVersion,
    required this.selectedQuestionIds,
    required this.profile,
    required this.expectedIntakeRevision,
    this.reviewedLinkedinUrl,
  });

  final String responseId;
  final int expectedProfileRevision;
  final String requestId;
  final String termsVersion;
  final List<String> selectedQuestionIds;
  final Map<String, Object?> profile;
  final int expectedIntakeRevision;
  final String? reviewedLinkedinUrl;

  Map<String, Object?> toJson() => {
    'responseId': responseId,
    'expectedProfileRevision': expectedProfileRevision,
    'requestId': requestId,
    'termsVersion': termsVersion,
    'selectedQuestionIds': selectedQuestionIds,
    'profile': profile,
    'expectedIntakeRevision': expectedIntakeRevision,
    'reviewedLinkedinUrl': ?reviewedLinkedinUrl,
  };
}
