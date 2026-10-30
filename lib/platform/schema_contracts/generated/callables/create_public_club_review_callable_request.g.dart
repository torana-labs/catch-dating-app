// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/create_public_club_review_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by createPublicClubReview for unverified public organizer listing reviews.
final class CreatePublicClubReviewCallableRequest {
  const CreatePublicClubReviewCallableRequest({
    required this.clubId,
    required this.rating,
    required this.comment,
    required this.reviewerName,
    required this.isAnonymous,
    required this.submittedFromPath,
  });

  final String clubId;
  final int rating;
  final String comment;
  final String reviewerName;
  final bool isAnonymous;
  final String submittedFromPath;

  Map<String, Object?> toJson() => {
    'clubId': clubId,
    'rating': rating,
    'comment': comment,
    'reviewerName': reviewerName,
    'isAnonymous': isAnonymous,
    'submittedFromPath': submittedFromPath,
  };
}
