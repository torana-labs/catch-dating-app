// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_create_organizer_draft_from_candidate_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Creates one unclaimed, source-backed organizer draft from an exact reviewed Supply Intake work item. The callable cannot publish, index, expose in the app, enable crawling, or assign ownership.
final class AdminCreateOrganizerDraftFromCandidateCallableRequest {
  const AdminCreateOrganizerDraftFromCandidateCallableRequest({
    required this.workItemId,
    required this.candidateId,
    required this.publicSlug,
    required this.name,
    required this.organizerType,
    required this.reviewNote,
  });

  final String workItemId;
  final String candidateId;
  final String publicSlug;
  final String name;
  final String organizerType;
  final String reviewNote;

  Map<String, Object?> toJson() => {
    'workItemId': workItemId,
    'candidateId': candidateId,
    'publicSlug': publicSlug,
    'name': name,
    'organizerType': organizerType,
    'reviewNote': reviewNote,
  };
}
