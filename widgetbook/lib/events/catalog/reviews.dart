import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/contexts/reviews/data/reviews_repository.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/reviews/presentation/reviews_history_screen.dart';
import 'package:catch_dating_app/reviews/shared/reviews_section.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import '../../support/widgetbook_harness.dart';
import 'fixtures.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Review states',
  type: EventReviewsSection,
  path: '[Event Detail]/Sections',
)
Widget eventDetailReviewsSectionStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'EventReviewsSection',
    catalogId: 'section.event.reviews',
    children: [
      WidgetbookPageStateCard(
        label: 'hidden guest',
        child: const WidgetbookEventHiddenSectionState(
          message: 'Reviews are not composed for signed-out Event Detail.',
        ),
      ),
      WidgetbookPageStateCard(
        label: 'member before event',
        child: EventReviewsSection(
          clubId: widgetbookEventsClubId,
          eventId: widgetbookEvent.id,
          reviews: const [],
          currentUid: widgetbookEventsViewerUid,
          userProfile: widgetbookEventsViewer,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'attended can review',
        child: EventReviewsSection(
          clubId: widgetbookEventsClubId,
          eventId: widgetbookEventsPastEvent.id,
          reviews: widgetbookEventsReviews,
          currentUid: widgetbookEventsViewerUid,
          userProfile: widgetbookEventsViewer,
          canWrite: true,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'host response actions',
        child: EventReviewsSection(
          clubId: widgetbookEventsClubId,
          eventId: widgetbookEventsPastEvent.id,
          reviews: widgetbookEventsReviews,
          currentUid: 'host-mira',
          userProfile: widgetbookEventsViewer.copyWith(
            uid: 'host-mira',
            name: 'Mira Shah',
          ),
          canRespond: true,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Review history states',
  type: ReviewsHistoryScreen,
  path: '[Event Detail]/Screens',
)
Widget reviewsHistoryScreenStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ReviewsHistoryScreen',
    catalogId: 'screen.reviews.history',
    children: [
      WidgetbookPageStateCard(
        label: 'signed out',
        child: const WidgetbookEventDeviceFrame(
          child: _ReviewsHistoryFrame(
            uid: null,
            user: AsyncData<UserProfile?>(null),
            reviews: AsyncData<List<Review>>([]),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'loading',
        child: const WidgetbookEventDeviceFrame(
          child: _ReviewsHistoryFrame(
            uid: widgetbookEventsViewerUid,
            user: AsyncLoading<UserProfile?>(),
            reviews: AsyncLoading<List<Review>>(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'review history',
        child: WidgetbookEventDeviceFrame(
          child: _ReviewsHistoryFrame(
            uid: widgetbookEventsViewerUid,
            user: AsyncData(widgetbookEventsViewer),
            reviews: AsyncData(widgetbookEventsReviews),
            events: AsyncData([widgetbookEventsPastEvent]),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'reviews unavailable',
        child: WidgetbookEventDeviceFrame(
          child: _ReviewsHistoryFrame(
            uid: widgetbookEventsViewerUid,
            user: AsyncData(widgetbookEventsViewer),
            reviews: AsyncError<List<Review>>(
              StateError('Widgetbook review history failed'),
              StackTrace.empty,
            ),
          ),
        ),
      ),
    ],
  );
}

class _ReviewsHistoryFrame extends StatelessWidget {
  const _ReviewsHistoryFrame({
    required this.uid,
    required this.user,
    required this.reviews,
    this.events = const AsyncData<List<Event>>([]),
  });

  final String? uid;
  final AsyncValue<UserProfile?> user;
  final AsyncValue<List<Review>> reviews;
  final AsyncValue<List<Event>> events;

  @override
  Widget build(BuildContext context) {
    final effectiveUid = uid;
    final eventIds = _eventIdsFor(reviews.asData?.value ?? const []);

    return WidgetbookFixtureScope(
      overrides: [
        uidProvider.overrideWith((ref) => Stream<String?>.value(effectiveUid)),
        watchUserProfileProvider.overrideWith((ref) => _streamFor(user)),
        if (effectiveUid != null)
          watchReviewsByUserProvider(
            effectiveUid,
          ).overrideWith((ref) => _streamFor(reviews)),
        if (effectiveUid != null && eventIds.isNotEmpty)
          watchEventsByIdsProvider(
            EventsByIdQuery(eventIds),
          ).overrideWith((ref) => _streamFor(events)),
      ],
      child: const ReviewsHistoryScreen(),
    );
  }
}

List<String> _eventIdsFor(List<Review> reviews) {
  final eventIds = <String>{
    for (final review in reviews)
      if (review.eventId != null) review.eventId!,
  };
  return eventIds.toList()..sort();
}

Stream<T> _streamFor<T>(AsyncValue<T> value) {
  return switch (value) {
    AsyncData(:final value) => Stream<T>.value(value),
    AsyncError(:final error, :final stackTrace) => Stream<T>.error(
      error,
      stackTrace,
    ),
    _ => Stream<T>.empty(),
  };
}
