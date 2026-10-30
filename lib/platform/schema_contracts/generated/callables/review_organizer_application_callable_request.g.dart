// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/review_organizer_application_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Optimistic manager review mutation for one organizer application.
final class ReviewOrganizerApplicationCallableRequest {
  const ReviewOrganizerApplicationCallableRequest({
    required this.organizerId,
    required this.applicationId,
    required this.expectedRevision,
    required this.reviewStatus,
    required this.reviewNote,
  });

  final String organizerId;
  final String applicationId;
  final int expectedRevision;
  final String reviewStatus;
  final String? reviewNote;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'applicationId': applicationId,
    'expectedRevision': expectedRevision,
    'reviewStatus': reviewStatus,
    'reviewNote': reviewNote,
  };
}
