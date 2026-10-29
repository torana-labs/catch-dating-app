import 'package:catch_dating_app/contexts/reviews/data/reviews_repository.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/reviews/shared/reviews_section.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Host-owned review workspace for one event.
///
/// Responses are written through the existing callable and are rendered by the
/// same review document on the public organizer listing. Keeping this panel in
/// the Host report makes the review workflow available without the Consumer
/// app or a Consumer profile.
class HostEventReviewsPanel extends ConsumerWidget {
  const HostEventReviewsPanel({super.key, required this.eventId});

  final String eventId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reviewsAsync = ref.watch(watchReviewsForEventProvider(eventId));
    final title = context.l10n.hostsHostEventReviewsTitlePublicReviews;
    final message = context.l10n.hostsHostEventReviewsSubtitlePublicResponse;
    return CatchAsyncBoundary<List<Review>>(
      value: reviewsAsync,
      errorContext: AppErrorContext.event,
      onRetry: () => ref.invalidate(watchReviewsForEventProvider(eventId)),
      loadingBuilder: (_) => CatchSection.status(
        title: title,
        message: message,
        meta: const CatchLoadingIndicator(),
      ),
      errorBuilder: (_, error, _, retry) => CatchSection.action(
        title: title,
        message: appErrorMessage(
          error,
          l10n: context.l10n,
          context: AppErrorContext.event,
        ),
        actionLabel: context.l10n.sharedActionTryAgain,
        actionEmphasis: CatchSectionEmphasis.secondary,
        onAction: retry,
      ),
      builder: (context, reviews) => CatchSection.collection(
        title: title,
        message: message,
        emptyMessage: context.l10n.hostsHostEventReviewsMessageEmpty,
        children: [
          if (reviews.isNotEmpty)
            ReviewsPreviewSection(
              reviews: reviews,
              currentUid: null,
              maxVisibleReviews: 5,
              showAllAction: reviews.length > 5,
              showHeader: false,
              onRespondToReview: (review) =>
                  showReviewResponseSheet(context: context, review: review),
            ),
        ],
      ),
    );
  }
}
