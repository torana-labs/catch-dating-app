import 'package:catch_dating_app/auth/data/auth_repository.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/events/data/event_repository.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/reviews/data/reviews_repository.dart';
import 'package:catch_dating_app/reviews/presentation/reviews_history_state.dart';
import 'package:catch_dating_app/reviews/presentation/reviews_history_view_model.dart';
import 'package:catch_dating_app/reviews/shared/reviews_section.dart';
import 'package:catch_dating_app/reviews/shared/write_review_sheet.dart';
import 'package:catch_dating_app/user_profile/data/user_profile_repository.dart';
import 'package:catch_dating_app/user_profile/domain/user_profile.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ReviewsHistoryScreen extends ConsumerWidget {
  const ReviewsHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final uidAsync = ref.watch(uidProvider);
    final uidState = catchAsyncStateFromAsyncValue(uidAsync);
    final uid = uidState.value;
    final userAsync = uid == null
        ? const AsyncData<UserProfile?>(null)
        : ref.watch(watchUserProfileProvider);
    final reviewsAsync = uid == null
        ? null
        : ref.watch(watchReviewsByUserProvider(uid));
    final reviewsState = reviewsAsync == null
        ? null
        : catchAsyncStateFromAsyncValue(reviewsAsync);
    final reviews = reviewsState?.value;
    AsyncValue<List<Event>> eventsAsync = const AsyncData<List<Event>>([]);
    if (reviews != null && reviews.isNotEmpty) {
      final eventIds = ReviewsHistoryState.eventIdsFor(reviews);
      if (eventIds.isNotEmpty) {
        eventsAsync = ref.watch(
          watchEventsByIdsProvider(EventsByIdQuery(eventIds)),
        );
      }
    }

    final state = uidAsync.when<ReviewsHistoryState>(
      loading: () => const ReviewsHistoryLoading(),
      error: (_, _) => ReviewsHistoryEmpty(
        title: context.l10n.reviewsReviewsHistoryScreenTitleSignInToSee,
        message:
            context.l10n.reviewsReviewsHistoryScreenMessageYourPastEventReviews,
      ),
      data: (uid) => buildReviewsHistoryState(
        l10n: context.l10n,
        uid: uid,
        user: catchAsyncStateFromAsyncValue(userAsync),
        reviews: reviewsState,
        events: catchAsyncStateFromAsyncValue(eventsAsync),
      ),
    );
    void onRetryProfile() => ref.invalidate(watchUserProfileProvider);
    VoidCallback? onRetryReviews;
    if (uid != null) {
      onRetryReviews = () => ref.invalidate(watchReviewsByUserProvider(uid));
    }

    return CatchRouteScaffold(
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: context.l10n.reviewsReviewsHistoryScreenTitleReviewHistory,
        navigation: const CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.back,
        ),
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
      ),
      body: CatchRouteBody.standardConstrained(
        child: ReviewsHistoryBody(
          state: state,
          onRetryProfile: onRetryProfile,
          onRetryReviews: onRetryReviews,
          onEditReview: state is ReviewsHistoryContent
              ? (row) => _showEditReviewSheet(context, state, row)
              : null,
        ),
      ),
    );
  }
}

class ReviewsHistoryBody extends StatelessWidget {
  const ReviewsHistoryBody({
    super.key,
    required this.state,
    required this.onRetryProfile,
    required this.onRetryReviews,
    required this.onEditReview,
  });

  final ReviewsHistoryState state;
  final VoidCallback onRetryProfile;
  final VoidCallback? onRetryReviews;
  final ValueChanged<ReviewsHistoryRow>? onEditReview;

  @override
  Widget build(BuildContext context) {
    return switch (state) {
      ReviewsHistoryLoading() => const ReviewsHistorySkeleton(),
      ReviewsHistoryEmpty(:final title, :final message) => Center(
        child: CatchEmptyState(
          icon: CatchIcons.rateReviewOutlined,
          title: title,
          message: message,
        ),
      ),
      ReviewsHistoryError(:final title, :final message, :final retryTarget) =>
        CatchErrorState(
          retryLabel: context.l10n.sharedActionTryAgain,
          title: title,
          message: message,
          onRetry: switch (retryTarget) {
            ReviewsHistoryRetryTarget.profile => onRetryProfile,
            ReviewsHistoryRetryTarget.reviews => onRetryReviews,
          },
        ),
      ReviewsHistoryContent(:final rows) => ReviewsHistoryList(
        rows: rows,
        onEditReview: onEditReview,
      ),
    };
  }
}

class ReviewsHistoryList extends StatelessWidget {
  const ReviewsHistoryList({
    super.key,
    required this.rows,
    required this.onEditReview,
  });

  final List<ReviewsHistoryRow> rows;
  final ValueChanged<ReviewsHistoryRow>? onEditReview;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var index = 0; index < rows.length; index++) ...[
          ReviewHistoryRow(row: rows[index], onEditReview: onEditReview),
          if (index < rows.length - 1) gapH14,
        ],
      ],
    );
  }
}

class ReviewHistoryRow extends StatelessWidget {
  const ReviewHistoryRow({
    super.key,
    required this.row,
    required this.onEditReview,
  });

  final ReviewsHistoryRow row;
  final ValueChanged<ReviewsHistoryRow>? onEditReview;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CatchText(
          row.contextLabel,
          variant: CatchTextVariant.statusLabel,
          color: t.ink2,
        ),
        gapH8,
        ReviewCard(
          review: row.review,
          isOwn: true,
          onEdit: row.canEdit && onEditReview != null
              ? () => onEditReview!(row)
              : null,
        ),
      ],
    );
  }
}

class ReviewsHistorySkeleton extends StatelessWidget {
  const ReviewsHistorySkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var index = 0; index < 4; index++) ...[
          const ReviewHistoryRowSkeleton(),
          if (index < 3) gapH14,
        ],
      ],
    );
  }
}

class ReviewHistoryRowSkeleton extends StatelessWidget {
  const ReviewHistoryRowSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CatchSkeleton.text(width: CatchLayout.skeletonTextTitleWidth),
        gapH8,
        CatchSurface(
          borderRole: CatchBorderRole.separator,
          padding: CatchInsets.tileContentCompact,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CatchSkeleton.circle(size: CatchLayout.rosterRowAvatarExtent),
                  gapW8,
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        CatchSkeleton.text(
                          width: CatchLayout.skeletonTextLabelWidth,
                        ),
                        gapH6,
                        Row(
                          children: [
                            for (var i = 0; i < 5; i++) ...[
                              CatchSkeleton.box(
                                width: CatchIcon.badge,
                                height: CatchIcon.badge,
                              ),
                              if (i < 4) gapW3,
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              gapH10,
              CatchSkeleton.textBlock(lines: 2),
            ],
          ),
        ),
      ],
    );
  }
}

Future<void> _showEditReviewSheet(
  BuildContext context,
  ReviewsHistoryContent state,
  ReviewsHistoryRow row,
) {
  final eventId = row.editEventId;
  if (eventId == null) return Future<void>.value();
  return showWriteReviewSheet(
    context: context,
    clubId: row.review.organizerId,
    eventId: eventId,
    reviewer: state.user,
    existingReview: row.review,
  );
}
