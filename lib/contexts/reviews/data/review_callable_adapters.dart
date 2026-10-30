import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/callable_request_dtos.g.dart'
    show CreateEventReviewCallableRequest, UpdateEventReviewCallableRequest;

CreateEventReviewCallableRequest createEventReviewCallableRequestFromReview(
  Review review, {
  required String eventId,
}) => CreateEventReviewCallableRequest(
  organizerId: review.organizerId,
  eventId: eventId,
  rating: review.rating,
  comment: review.comment,
);

UpdateEventReviewCallableRequest updateEventReviewCallableRequestFromReview(
  Review review,
) => UpdateEventReviewCallableRequest(
  reviewId: review.id,
  rating: review.rating,
  comment: review.comment,
);
