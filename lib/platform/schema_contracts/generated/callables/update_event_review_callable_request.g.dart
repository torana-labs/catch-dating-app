// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/update_event_review_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by updateEventReview.
final class UpdateEventReviewCallableRequest {
  const UpdateEventReviewCallableRequest({
    required this.reviewId,
    required this.rating,
    required this.comment,
  });

  final String reviewId;
  final int rating;
  final String comment;

  Map<String, Object?> toJson() => {
    'reviewId': reviewId,
    'rating': rating,
    'comment': comment,
  };
}
