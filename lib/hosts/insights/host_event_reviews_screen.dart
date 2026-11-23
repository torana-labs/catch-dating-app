import 'package:catch_dating_app/contexts/insights/parts/host_event_review_row.dart';
import 'package:catch_dating_app/contexts/reviews/data/reviews_repository.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/pages/reviews/reviews_section.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Every review of one event, newest first; tapping one opens the existing
/// reply sheet (`setReviewResponse`), whose reply shows with the review on
/// the organizer's page.
class HostEventReviewsScreen extends ConsumerWidget {
  const HostEventReviewsScreen({
    super.key,
    required this.eventId,
    this.eventTitle,
  });

  final String eventId;
  final String? eventTitle;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final reviews = ref.watch(watchReviewsForEventProvider(eventId));
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-event-reviews-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          back: CatchTopBarBack(label: l10n.hostEventsBack),
          kicker: eventTitle,
          title: l10n.hostEventReportReviewsTitle,
        ),
        body: switch (reviews) {
          AsyncValue(:final error?, hasValue: false) =>
            CatchLocalizedErrorState(
              error,
              context: AppErrorContext.event,
              onRetry: () =>
                  ref.invalidate(watchReviewsForEventProvider(eventId)),
            ),
          AsyncValue(value: final list?) => HostEventReviewsBody(
            reviews: list,
            onReview: (review) =>
                showReviewResponseSheet(context: context, review: review),
          ),
          _ => const CatchPageBody.screen(child: CatchLoadingIndicator()),
        },
      ),
    );
  }
}

/// The reviews as rows, newest first, with a note on replying.
class HostEventReviewsBody extends StatelessWidget {
  const HostEventReviewsBody({
    super.key,
    required this.reviews,
    required this.onReview,
  });

  final List<Review> reviews;
  final ValueChanged<Review> onReview;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final sorted = [...reviews]
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return CatchPageBody.screen(
      child: CatchSection(
        kicker: l10n.hostEventReviewsReplyNote,
        empty: l10n.hostEventReportReviewsEmpty,
        children: [
          for (final review in sorted)
            HostEventReviewRow(
              key: ValueKey<String>('host-event-review-${review.id}'),
              name: review.reviewerName,
              rating: review.rating,
              comment: review.ownerResponse == null
                  ? review.comment
                  : l10n.hostEventReviewsWithReply(
                      comment: review.comment,
                      reply: review.ownerResponse!.message,
                    ),
              anonymous: review.isAnonymous,
              bookedOnCatch: review.source == 'catchEvent',
              onTap: () => onReview(review),
            ),
        ],
      ),
    );
  }
}
