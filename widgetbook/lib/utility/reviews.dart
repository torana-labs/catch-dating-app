import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/contexts/reviews/data/reviews_repository.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/design_fixtures/utility_surface_fixtures.dart';
import 'package:catch_dating_app/reviews/presentation/reviews_history_screen.dart';
import 'package:catch_dating_app/reviews/presentation/reviews_history_state.dart';
import 'package:catch_dating_app/reviews/shared/reviews_section.dart';
import 'package:catch_dating_app/reviews/shared/star_rating_row.dart';
import 'package:catch_dating_app/reviews/shared/write_review_sheet.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../preview_layout_contracts.dart';
import '../support/contract_preview.dart';
import '../support/page_preview.dart';
import '../support/widgetbook_harness.dart';
import 'fixtures.dart';
import 'preview.dart';

final _reviews = UtilitySurfaceFixtures.reviews;

@widgetbook.UseCase(
  name: 'Screen states',
  type: ReviewsHistoryScreen,
  path: '[P3 utility surfaces]/Reviews history',
)
Widget reviewsHistoryScreenStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ReviewsHistoryScreen',
    contractId: 'screen.reviews.history',
    children: [
      WidgetbookPageStateCard(
        label: 'signed out',
        child: WidgetbookUtilityDeviceFrame(
          child: _ReviewsScope(
            uidStream: Stream<String?>.value(null),
            profileStream: Stream.value(null),
            reviewsStream: Stream.value(_reviews),
            child: const ReviewsHistoryScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'profile loading',
        child: WidgetbookUtilityDeviceFrame(
          child: _ReviewsScope(
            profileStream: widgetbookUtilityLoadingStream<UserProfile?>(),
            reviewsStream: Stream.value(_reviews),
            child: const ReviewsHistoryScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'profile error',
        child: WidgetbookUtilityDeviceFrame(
          child: _ReviewsScope(
            profileStream: widgetbookUtilityErrorStream('Profile failed'),
            reviewsStream: Stream.value(_reviews),
            child: const ReviewsHistoryScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'reviews loading',
        child: WidgetbookUtilityDeviceFrame(
          child: _ReviewsScope(
            reviewsStream: widgetbookUtilityLoadingStream<List<Review>>(),
            child: const ReviewsHistoryScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'reviews error',
        child: WidgetbookUtilityDeviceFrame(
          child: _ReviewsScope(
            reviewsStream: widgetbookUtilityErrorStream('Reviews failed'),
            child: const ReviewsHistoryScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'empty reviews',
        child: WidgetbookUtilityDeviceFrame(
          child: _ReviewsScope(
            reviewsStream: Stream.value(const <Review>[]),
            child: const ReviewsHistoryScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'review list with event context',
        child: WidgetbookUtilityDeviceFrame(
          child: _ReviewsScope(
            reviewsStream: Stream.value(_reviews),
            eventsStream: Stream.value([widgetbookUtilityEvent]),
            child: const ReviewsHistoryScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'event context missing',
        child: WidgetbookUtilityDeviceFrame(
          child: _ReviewsScope(
            reviewsStream: Stream.value(_reviews.take(1).toList()),
            eventsStream: Stream.value(const <Event>[]),
            child: const ReviewsHistoryScreen(),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'History body states',
  type: ReviewsHistoryBody,
  path: '[P3 utility surfaces]/Reviews history',
)
Widget reviewsHistoryBodyStates(BuildContext context) {
  final rows = _reviewHistoryRows();
  return WidgetbookPageCatalogFrame(
    title: 'ReviewsHistoryBody',
    contractId: 'screen.reviews.history.body',
    children: [
      WidgetbookPageStateCard(
        label: 'content',
        child: SizedBox(
          height: WidgetbookPreviewLayout.feedbackViewportHeight,
          child: ReviewsHistoryBody(
            state: ReviewsHistoryContent(
              user: widgetbookUtilityViewer,
              rows: rows,
            ),
            onRetryProfile: widgetbookNoop,
            onRetryReviews: widgetbookNoop,
            onEditReview: _noopReviewHistoryEdit,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'empty',
        child: SizedBox(
          height: WidgetbookPreviewLayout.sliverPreviewHeight,
          child: ReviewsHistoryBody(
            state: const ReviewsHistoryEmpty(
              title: 'No reviews yet',
              message: 'Reviews you write after events will appear here.',
            ),
            onRetryProfile: widgetbookNoop,
            onRetryReviews: widgetbookNoop,
            onEditReview: _noopReviewHistoryEdit,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'error',
        child: SizedBox(
          height: WidgetbookPreviewLayout.sliverPreviewHeight,
          child: ReviewsHistoryBody(
            state: const ReviewsHistoryError(
              title: 'Reviews unavailable',
              message: 'Could not load your reviews.',
              retryTarget: ReviewsHistoryRetryTarget.reviews,
            ),
            onRetryProfile: widgetbookNoop,
            onRetryReviews: widgetbookNoop,
            onEditReview: _noopReviewHistoryEdit,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'History list states',
  type: ReviewsHistoryList,
  path: '[P3 utility surfaces]/Reviews history',
)
Widget reviewsHistoryListStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ReviewsHistoryList',
    contractId: 'screen.reviews.history.list',
    children: [
      WidgetbookPageStateCard(
        label: 'rows',
        child: SizedBox(
          height: WidgetbookPreviewLayout.profileSectionPreviewHeight,
          child: ReviewsHistoryList(
            rows: _reviewHistoryRows(),
            onEditReview: _noopReviewHistoryEdit,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'History skeleton states',
  type: ReviewsHistorySkeleton,
  path: '[P3 utility surfaces]/Reviews history',
)
Widget reviewsHistorySkeletonStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'ReviewsHistorySkeleton',
    contractId: 'screen.reviews.history.skeleton',
    children: [
      WidgetbookPageStateCard(
        label: 'loading list',
        child: SizedBox(
          height: WidgetbookPreviewLayout.profileSectionPreviewHeight,
          child: ReviewsHistorySkeleton(),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'History row skeleton states',
  type: ReviewHistoryRowSkeleton,
  path: '[P3 utility surfaces]/Reviews history',
)
Widget reviewHistoryItemSkeletonStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'ReviewHistoryRowSkeleton',
    contractId: 'screen.reviews.history.row_skeleton',
    children: [
      WidgetbookPageStateCard(
        label: 'loading row',
        child: ReviewHistoryRowSkeleton(),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'History row states',
  type: ReviewHistoryRow,
  path: '[P3 utility surfaces]/Reviews history',
)
Widget reviewHistoryItemStates(BuildContext context) {
  final editableReview = _reviews.first;
  final responseReview = _reviewWithOwnerResponse();
  return WidgetbookPageCatalogFrame(
    title: 'ReviewHistoryRow',
    contractId: 'screen.reviews.history.row',
    children: [
      WidgetbookPageStateCard(
        label: 'editable own review',
        child: ReviewHistoryRow(
          row: ReviewsHistoryRow(
            review: editableReview,
            contextLabel: 'Sunday Sea Face Crew · Jun 22',
            editEventId: editableReview.eventId,
          ),
          onEditReview: _noopReviewHistoryEdit,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'host response',
        child: ReviewHistoryRow(
          row: ReviewsHistoryRow(
            review: responseReview,
            contextLabel: 'Bandra afterglow run · missing event context',
            editEventId: null,
          ),
          onEditReview: _noopReviewHistoryEdit,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Card states',
  type: ReviewCard,
  path: '[P3 utility surfaces]/Reviews history',
)
Widget reviewCardStates(BuildContext context) {
  final responseReview = _reviewWithOwnerResponse();
  return WidgetbookPageCatalogFrame(
    title: 'ReviewCard',
    contractId: 'component.reviews.card',
    children: [
      WidgetbookPageStateCard(
        label: 'attendee review',
        child: ReviewCard(review: _reviews.first, isOwn: false),
      ),
      WidgetbookPageStateCard(
        label: 'own editable review',
        child: ReviewCard(
          review: _reviews.first,
          isOwn: true,
          onEdit: widgetbookNoop,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'host response',
        child: ReviewCard(
          review: responseReview,
          isOwn: false,
          onRespond: widgetbookNoop,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Preview section states',
  type: ReviewsPreviewSection,
  path: '[P3 utility surfaces]/Reviews history',
)
Widget reviewsPreviewSectionStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ReviewsPreviewSection',
    contractId: 'component.reviews.preview_section',
    children: [
      WidgetbookPageStateCard(
        label: 'empty compact',
        child: const ReviewsPreviewSection(
          reviews: [],
          currentUid: widgetbookUtilityViewerUid,
          emptyPresentation: ReviewsEmptyPresentation.contained,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'preview with aggregate',
        child: ReviewsPreviewSection(
          reviews: _reviews,
          currentUid: widgetbookUtilityViewerUid,
          showAllAction: true,
          onEditReview: _noopReviewEdit,
          onRespondToReview: _noopReviewEdit,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Host response block',
  type: ReviewOwnerResponseCard,
  path: '[P3 utility surfaces]/Reviews history',
)
Widget reviewOwnerResponseBlockState(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'ReviewOwnerResponseCard',
    contractId: 'component.reviews.host_response',
    children: [
      WidgetbookPageStateCard(
        label: 'host response',
        child: ReviewOwnerResponseCard(
          response: _reviewWithOwnerResponse().ownerResponse!,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Response sheet states',
  type: ReviewResponseSheet,
  path: '[P3 utility surfaces]/Reviews history',
)
Widget reviewResponseSheetStates(BuildContext context) {
  final responseReview = _reviewWithOwnerResponse();
  return WidgetbookPageCatalogFrame(
    title: 'ReviewResponseSheet',
    contractId: 'component.reviews.response_sheet',
    children: [
      WidgetbookPageStateCard(
        label: 'new response',
        child: WidgetbookUtilitySheetFrame(
          child: IgnorePointer(
            child: ReviewResponseSheet(review: _reviews.first),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'edit response',
        child: WidgetbookUtilitySheetFrame(
          child: IgnorePointer(
            child: ReviewResponseSheet(review: responseReview),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Rating states',
  type: StarRatingRow,
  path: '[P3 utility surfaces]/Reviews history',
)
Widget starRatingStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'StarRatingRow',
    contractId: 'component.reviews.star_rating',
    children: const [
      WidgetbookPageStateCard(label: 'empty', child: StarRatingRow(rating: 0)),
      WidgetbookPageStateCard(
        label: 'three stars',
        child: StarRatingRow(rating: 3),
      ),
      WidgetbookPageStateCard(
        label: 'five stars',
        child: StarRatingRow(rating: 5),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Picker states',
  type: StarRatingPicker,
  path: '[P3 utility surfaces]/Reviews history',
)
Widget starRatingPickerStates(BuildContext context) {
  var rating = 3;
  return WidgetbookPageCatalogFrame(
    title: 'StarRatingPicker',
    contractId: 'component.reviews.star_rating_picker',
    children: [
      WidgetbookPageStateCard(
        label: 'interactive picker',
        child: StatefulBuilder(
          builder: (context, setState) {
            return StarRatingPicker(
              rating: rating,
              onChanged: (value) => setState(() => rating = value),
            );
          },
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Sheet states',
  type: WriteReviewSheet,
  path: '[P3 utility surfaces]/Reviews history',
)
Widget writeReviewSheetStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'WriteReviewSheet',
    contractId: 'screen.reviews.history.edit_sheet',
    children: [
      WidgetbookPageStateCard(
        label: 'write review',
        child: WidgetbookUtilitySheetFrame(
          child: IgnorePointer(
            child: WriteReviewSheet(
              clubId: 'widgetbook-club',
              eventId: widgetbookUtilityEvent.id,
              reviewer: widgetbookUtilityViewer,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'edit review with delete action',
        child: WidgetbookUtilitySheetFrame(
          child: IgnorePointer(
            child: WriteReviewSheet(
              clubId: 'widgetbook-club',
              eventId: widgetbookUtilityEvent.id,
              reviewer: widgetbookUtilityViewer,
              existingReview: _reviews.first,
            ),
          ),
        ),
      ),
    ],
  );
}

class _ReviewsScope extends StatelessWidget {
  const _ReviewsScope({
    required this.child,
    this.uidStream,
    this.profileStream,
    this.reviewsStream,
    this.eventsStream,
  });

  final Widget child;
  final Stream<String?>? uidStream;
  final Stream<UserProfile?>? profileStream;
  final Stream<List<Review>>? reviewsStream;
  final Stream<List<Event>>? eventsStream;

  @override
  Widget build(BuildContext context) {
    final eventIds = <String>{
      for (final review in _reviews)
        if (review.eventId != null) review.eventId!,
    };
    return WidgetbookFixtureScope(
      overrides: [
        uidProvider.overrideWith(
          (ref) =>
              uidStream ?? Stream<String?>.value(widgetbookUtilityViewerUid),
        ),
        watchUserProfileProvider.overrideWith(
          (ref) =>
              profileStream ??
              Stream<UserProfile?>.value(widgetbookUtilityViewer),
        ),
        watchReviewsByUserProvider(
          widgetbookUtilityViewerUid,
        ).overrideWith((ref) => reviewsStream ?? Stream.value(_reviews)),
        watchEventsByIdsProvider(EventsByIdQuery(eventIds)).overrideWith(
          (ref) => eventsStream ?? Stream.value([widgetbookUtilityEvent]),
        ),
      ],
      child: child,
    );
  }
}

Review _reviewWithOwnerResponse() {
  final existing = _reviews.where((review) => review.ownerResponse != null);
  if (existing.isNotEmpty) return existing.first;
  return _reviews.first.copyWith(
    ownerResponse: ReviewOwnerResponse(
      hostUserId: 'host-mira',
      hostName: 'Mira Shah',
      message: 'Thanks for the thoughtful review. We will keep this route.',
      createdAt: widgetbookUtilityCalendarNow,
      updatedAt: widgetbookUtilityCalendarNow,
    ),
  );
}

List<ReviewsHistoryRow> _reviewHistoryRows() {
  final editableReview = _reviews.first;
  final responseReview = _reviewWithOwnerResponse();
  return [
    ReviewsHistoryRow(
      review: editableReview,
      contextLabel: 'Sunday Sea Face Crew · Jun 22',
      editEventId: editableReview.eventId,
    ),
    ReviewsHistoryRow(
      review: responseReview,
      contextLabel: 'Bandra afterglow run · missing event context',
      editEventId: null,
    ),
  ];
}

void _noopReviewEdit(Review review) {}

void _noopReviewHistoryEdit(ReviewsHistoryRow row) {}
