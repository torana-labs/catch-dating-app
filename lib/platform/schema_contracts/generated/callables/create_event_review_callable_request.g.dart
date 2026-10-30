// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/create_event_review_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by createEventReview.
final class CreateEventReviewCallableRequest {
  const CreateEventReviewCallableRequest({
    required this.organizerId,
    required this.eventId,
    required this.rating,
    required this.comment,
  });

  final String organizerId;
  final String eventId;
  final int rating;
  final String comment;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'eventId': eventId,
    'rating': rating,
    'comment': comment,
  };
}
