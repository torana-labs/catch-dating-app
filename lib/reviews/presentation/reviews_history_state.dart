import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';

sealed class ReviewsHistoryState {
  const ReviewsHistoryState();

  static List<String> eventIdsFor(Iterable<Review> reviews) {
    final eventIds = <String>{
      for (final review in reviews)
        if (review.eventId != null) review.eventId!,
    };
    return List.unmodifiable(eventIds.toList()..sort());
  }
}

final class ReviewsHistoryLoading extends ReviewsHistoryState {
  const ReviewsHistoryLoading();
}

final class ReviewsHistoryEmpty extends ReviewsHistoryState {
  const ReviewsHistoryEmpty({required this.title, required this.message});

  final String title;
  final String message;
}

enum ReviewsHistoryRetryTarget { profile, reviews }

final class ReviewsHistoryError extends ReviewsHistoryState {
  const ReviewsHistoryError({
    required this.title,
    required this.message,
    required this.retryTarget,
  });

  final String title;
  final String message;
  final ReviewsHistoryRetryTarget retryTarget;
}

final class ReviewsHistoryContent extends ReviewsHistoryState {
  const ReviewsHistoryContent({required this.user, required this.rows});

  final UserProfile user;
  final List<ReviewsHistoryRow> rows;
}

final class ReviewsHistoryRow {
  const ReviewsHistoryRow({
    required this.review,
    required this.contextLabel,
    required this.editEventId,
  });

  final Review review;
  final String contextLabel;
  final String? editEventId;

  bool get canEdit => editEventId != null;
}

String reviewHistoryContextLabel({required Review review, Event? event}) {
  if (event != null) {
    return '${event.longDateLabel} · ${event.timeRangeLabel}';
  }
  if (review.eventId != null) return 'Event review';
  return 'Legacy club review';
}
