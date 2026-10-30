// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/review_organizer_contact_merge_candidate_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class ReviewOrganizerContactMergeCandidateCallableRequest {
  const ReviewOrganizerContactMergeCandidateCallableRequest({
    required this.organizerId,
    required this.candidateId,
    required this.contactIds,
    required this.decision,
    required this.expectedRevision,
  });

  final String organizerId;
  final String candidateId;
  final List<String> contactIds;
  final String decision;
  final int? expectedRevision;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'candidateId': candidateId,
    'contactIds': contactIds,
    'decision': decision,
    'expectedRevision': expectedRevision,
  };
}
