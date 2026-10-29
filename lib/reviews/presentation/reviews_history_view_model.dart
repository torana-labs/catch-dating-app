import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:catch_dating_app/reviews/presentation/reviews_history_state.dart';

ReviewsHistoryState buildReviewsHistoryState({
  required AppLocalizations l10n,
  required String? uid,
  required CatchAsyncState<UserProfile?> user,
  CatchAsyncState<List<Review>>? reviews,
  CatchAsyncState<List<Event>>? events,
}) {
  if (uid == null) {
    return ReviewsHistoryEmpty(
      title: l10n.reviewsReviewsHistoryViewModelTitleSignInToSee,
      message: l10n.reviewsReviewsHistoryViewModelMessageYourPastEventReviews,
    );
  }

  if (user.hasError) {
    return ReviewsHistoryError(
      title: l10n.reviewsReviewsHistoryViewModelTitleReviewsUnavailable,
      message: l10n.reviewsReviewsHistoryViewModelMessageCouldNotLoadYour,
      retryTarget: ReviewsHistoryRetryTarget.profile,
    );
  }

  final profile = user.value;
  if (profile == null || reviews == null) {
    return const ReviewsHistoryLoading();
  }

  if (reviews.hasError) {
    return ReviewsHistoryError(
      title: l10n.reviewsReviewsHistoryViewModelTitleReviewsUnavailable,
      message: l10n.reviewsReviewsHistoryViewModelMessageCouldNotLoadYourb38403,
      retryTarget: ReviewsHistoryRetryTarget.reviews,
    );
  }
  if (reviews.isLoading) return const ReviewsHistoryLoading();

  final reviewValues = reviews.value ?? const <Review>[];
  if (reviewValues.isEmpty) {
    return ReviewsHistoryEmpty(
      title: l10n.reviewsReviewsHistoryViewModelTitleNoReviewsYet,
      message: l10n.reviewsReviewsHistoryViewModelMessageAfterYouReviewA,
    );
  }

  final eventsById = <String, Event>{
    for (final event in events?.value ?? const <Event>[]) event.id: event,
  };
  final rows = [
    for (final review in reviewValues)
      ReviewsHistoryRow(
        review: review,
        contextLabel: reviewHistoryContextLabel(
          review: review,
          event: review.eventId == null ? null : eventsById[review.eventId],
        ),
        editEventId: review.eventId,
      ),
  ];

  return ReviewsHistoryContent(user: profile, rows: rows);
}
