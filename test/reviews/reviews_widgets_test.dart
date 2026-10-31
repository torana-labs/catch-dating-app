import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/contexts/reviews/data/reviews_repository.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/reviews/presentation/reviews_history_screen.dart';
import 'package:catch_dating_app/reviews/shared/review_keys.dart';
import 'package:catch_dating_app/reviews/shared/reviews_section.dart';
import 'package:catch_dating_app/reviews/shared/star_rating_row.dart';
import 'package:catch_dating_app/reviews/shared/write_review_controller.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';
import '../test_pump_helpers.dart';

void main() {
  testWidgets('empty attended event section can submit a review', (
    tester,
  ) async {
    final repository = _FakeReviewsRepository();
    final user = buildUser(name: 'Asha');
    final container = _reviewsContainer(repository);
    addTearDown(container.dispose);

    await _pumpReviewsSection(
      tester,
      container: container,
      user: user,
      reviews: const [],
    );

    expect(find.text('No reviews yet'), findsNothing);
    expect(find.text('Be the first to review this event.'), findsOneWidget);
    expect(find.byKey(ReviewKeys.writeReviewButton), findsOneWidget);

    await tester.tap(find.byKey(ReviewKeys.writeReviewButton));
    await pumpFeatureUi(tester);

    await tester.tap(find.byKey(ReviewKeys.ratingStar(4)));
    await tester.tap(find.byKey(ReviewKeys.commentField));
    await pumpFeatureUi(tester);
    await tester.enterText(
      find.descendant(
        of: find.byKey(ReviewKeys.commentField),
        matching: find.byType(TextField),
      ),
      '  Friendly crew.  ',
    );
    await tester.tap(find.byKey(ReviewKeys.submitReviewButton));
    await pumpFeatureUi(tester);

    expect(repository.addedReview?.organizerId, 'club-1');
    expect(repository.addedReview?.eventId, 'event-1');
    expect(repository.addedReview?.reviewerUserId, 'runner-1');
    expect(repository.addedReview?.reviewerName, 'Asha');
    expect(repository.addedReview?.rating, 4);
    expect(repository.addedReview?.comment, 'Friendly crew.');
  });

  testWidgets(
    'empty event reviews keep copy full-width without an icon gutter',
    (tester) async {
      final repository = _FakeReviewsRepository();
      final user = buildUser(name: 'Asha');
      final container = _reviewsContainer(repository);
      addTearDown(container.dispose);

      await _pumpReviewsSection(
        tester,
        container: container,
        user: user,
        reviews: const [],
      );

      final emptyFinder = find.byType(CatchEmptyState);
      final emptyState = tester.widget<CatchEmptyState>(emptyFinder);
      final bounds = tester.getRect(emptyFinder);
      final message = tester.getRect(
        find.text('Be the first to review this event.'),
      );

      expect(
        find.descendant(
          of: emptyFinder,
          matching: find.byIcon(CatchIcons.feedback),
        ),
        findsNothing,
      );
      expect(message.left, bounds.left);
      expect(message.width, bounds.width);
      expect(
        tester.getRect(find.byKey(ReviewKeys.writeReviewButton)).top,
        greaterThan(message.bottom),
      );
      expect(emptyState.surface, false);
      expect(emptyState.variant, CatchEmptyStateVariant.inline);
      expect(emptyState.padding, EdgeInsets.zero);
      expect(find.text('No reviews yet'), findsNothing);
      expect(find.byKey(ReviewKeys.writeReviewButton), findsOneWidget);
    },
  );

  testWidgets('empty event reviews stay hidden without write access', (
    tester,
  ) async {
    final repository = _FakeReviewsRepository();
    final user = buildUser(name: 'Asha');
    final container = _reviewsContainer(repository);
    addTearDown(container.dispose);

    await _pumpReviewsSection(
      tester,
      container: container,
      user: user,
      reviews: const [],
      canWrite: false,
    );

    expect(find.byType(CatchEmptyState), findsNothing);
    expect(find.text('No reviews yet'), findsNothing);
    expect(find.byKey(ReviewKeys.writeReviewButton), findsNothing);
  });

  testWidgets('club and standalone empty presentations remain explicit', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(
          body: Column(
            children: [
              OrganizerReviewsSection(reviews: [], currentUid: 'runner-1'),
              ReviewsPreviewSection(reviews: [], currentUid: 'runner-1'),
            ],
          ),
        ),
      ),
    );

    final emptyStates = tester
        .widgetList<CatchEmptyState>(find.byType(CatchEmptyState))
        .toList(growable: false);

    expect(emptyStates, hasLength(2));
    expect(emptyStates.first.surface, true);
    expect(emptyStates.first.variant, CatchEmptyStateVariant.inline);
    expect(emptyStates.last.surface, false);
    expect(emptyStates.last.variant, CatchEmptyStateVariant.stacked);
    expect(
      find.text('Reviews appear after members attend an event.'),
      findsOneWidget,
    );
    expect(find.text('No reviews yet'), findsNWidgets(2));
  });

  testWidgets('own review can be edited and deleted from the sheet', (
    tester,
  ) async {
    final repository = _FakeReviewsRepository();
    final user = buildUser(name: 'Asha');
    final review = buildReview(
      reviewerUserId: user.uid,
      reviewerName: user.name,
      comment: 'Good event.',
    );
    final container = _reviewsContainer(repository);
    addTearDown(container.dispose);

    await _pumpReviewsSection(
      tester,
      container: container,
      user: user,
      reviews: [review],
    );

    await tester.tap(find.byKey(ReviewKeys.editReviewButton('review-1')));
    await pumpFeatureUi(tester);

    expect(find.text('Edit review'), findsOneWidget);
    expect(find.byKey(ReviewKeys.deleteReviewButton), findsOneWidget);

    await tester.tap(find.byKey(ReviewKeys.deleteReviewButton));
    await pumpFeatureUi(tester);

    expect(find.text('Delete review?'), findsOneWidget);

    await tester.tap(find.text('Delete'));
    await pumpFeatureUi(tester);

    expect(repository.deletedReviewId, 'review-1');
  });

  testWidgets('pending review write freezes draft and sheet dismissal', (
    tester,
  ) async {
    final repository = _FakeReviewsRepository();
    final user = buildUser(name: 'Asha');
    final container = _reviewsContainer(repository);
    addTearDown(container.dispose);

    await _pumpReviewsSection(
      tester,
      container: container,
      user: user,
      reviews: const [],
    );
    await tester.tap(find.byKey(ReviewKeys.writeReviewButton));
    await pumpFeatureUi(tester);
    await tester.tap(find.byKey(ReviewKeys.ratingStar(4)));

    final pendingWrite = Completer<void>();
    final request = WriteReviewController.submitMutation.run(
      container,
      (_) => pendingWrite.future,
    );
    await tester.pump();

    expect(
      tester.widget<StarRatingPicker>(find.byType(StarRatingPicker)).enabled,
      isFalse,
    );
    expect(
      tester.widget<CatchField>(find.byKey(ReviewKeys.commentField)).enabled,
      isFalse,
    );
    final submitButton = tester.widget<CatchButton>(
      find.byKey(ReviewKeys.submitReviewButton),
    );
    expect(submitButton.onPressed, isNull);
    expect(submitButton.isLoading, isTrue);
    expect(
      tester
          .widgetList<PopScope<dynamic>>(find.byType(PopScope))
          .any((scope) => !scope.canPop),
      isTrue,
    );

    pendingWrite.complete();
    await request;
    await tester.pump();
  });

  testWidgets('review cards display host responses', (tester) async {
    final repository = _FakeReviewsRepository();
    final user = buildUser(name: 'Asha');
    final review = buildReview(
      comment: 'Loved the pacing.',
      ownerResponse: ReviewOwnerResponse(
        hostUserId: 'host-1',
        hostName: 'Afterfly',
        message: 'Thanks for joining us.',
        createdAt: DateTime(2026, 6),
        updatedAt: DateTime(2026, 6),
      ),
    );
    final container = _reviewsContainer(repository);
    addTearDown(container.dispose);

    await _pumpReviewsSection(
      tester,
      container: container,
      user: user,
      reviews: [review],
    );

    expect(find.text('Host response · Afterfly'), findsOneWidget);
    expect(find.text('Thanks for joining us.'), findsOneWidget);
  });

  testWidgets('hosts can respond to event reviews', (tester) async {
    final repository = _FakeReviewsRepository();
    final user = buildUser(uid: 'host-1', name: 'Host');
    final review = buildReview(
      id: 'event-1~runner-1',
      reviewerName: 'Runner',
      comment: 'Loved the route.',
    );
    final container = _reviewsContainer(repository);
    addTearDown(container.dispose);

    await _pumpReviewsSection(
      tester,
      container: container,
      user: user,
      reviews: [review],
      canWrite: false,
      canRespond: true,
    );

    expect(find.byKey(ReviewKeys.writeReviewButton), findsNothing);

    await tester.tap(find.byKey(ReviewKeys.respondToReviewButton(review.id)));
    await pumpFeatureUi(tester);

    await tester.tap(find.byKey(ReviewKeys.ownerResponseField));
    await pumpFeatureUi(tester);
    await tester.enterText(
      find.descendant(
        of: find.byKey(ReviewKeys.ownerResponseField),
        matching: find.byType(TextField),
      ),
      '  Thanks for coming.  ',
    );
    await pumpFeatureUi(tester);
    await tester.tap(find.byKey(ReviewKeys.submitOwnerResponseButton));
    await pumpFeatureUi(tester);

    expect(repository.responseReviewId, 'event-1~runner-1');
    expect(repository.responseMessage, 'Thanks for coming.');
  });

  testWidgets('review history prompts signed-out users', (tester) async {
    await _pumpReviewsHistory(tester, uid: null);

    expect(find.text('Sign in to see reviews'), findsOneWidget);
    expect(
      find.text('Your past event reviews will appear here.'),
      findsOneWidget,
    );
  });

  testWidgets('review history shows loading while reviews resolve', (
    tester,
  ) async {
    final user = buildUser(name: 'Asha');

    await _pumpReviewsHistory(
      tester,
      uid: user.uid,
      user: user,
      repository: _FakeReviewsRepository(
        reviewsByUserStream: const Stream<List<Review>>.empty(),
      ),
      settle: false,
    );

    expect(find.text('Review history'), findsOneWidget);
    expect(find.byType(CatchSkeleton), findsAtLeastNWidgets(4));
  });

  testWidgets('review history shows profile load errors', (tester) async {
    final user = buildUser(name: 'Asha');

    await _pumpReviewsHistory(
      tester,
      uid: user.uid,
      userStream: Stream<UserProfile?>.error(Exception('profile failed')),
    );

    expect(find.text('Reviews unavailable'), findsOneWidget);
    expect(find.text('Could not load your profile.'), findsOneWidget);
  });

  testWidgets('review history shows review load errors', (tester) async {
    final user = buildUser(name: 'Asha');

    await _pumpReviewsHistory(
      tester,
      uid: user.uid,
      user: user,
      repository: _FakeReviewsRepository(
        reviewsByUserStream: Stream<List<Review>>.error(
          Exception('reviews failed'),
        ),
      ),
    );

    expect(find.text('Reviews unavailable'), findsOneWidget);
    expect(find.text('Could not load your reviews.'), findsOneWidget);
  });

  testWidgets('review history shows empty reviews state', (tester) async {
    final user = buildUser(name: 'Asha');

    await _pumpReviewsHistory(tester, uid: user.uid, user: user);

    expect(find.text('No reviews yet'), findsOneWidget);
    expect(
      find.text('After you review a completed event, it will appear here.'),
      findsOneWidget,
    );
  });

  testWidgets('review history lists own reviews and opens edit sheet', (
    tester,
  ) async {
    final user = buildUser(name: 'Asha');
    final event = buildEvent();
    final review = buildReview(
      id: 'event-1~runner-1',
      eventId: event.id,
      reviewerUserId: user.uid,
      reviewerName: user.name,
      comment: 'Great route.',
    );
    final repository = _FakeReviewsRepository(reviewsByUser: [review]);

    await _pumpReviewsHistory(
      tester,
      uid: user.uid,
      user: user,
      repository: repository,
      providerOverrides: [
        watchEventsByIdsProvider(
          EventsByIdQuery([event.id]),
        ).overrideWith((ref) => Stream.value([event])),
      ],
    );

    expect(find.text('Review history'), findsOneWidget);
    expect(find.text('Great route.'), findsOneWidget);

    await tester.tap(find.byKey(ReviewKeys.editReviewButton(review.id)));
    await pumpFeatureUi(tester);

    expect(find.text('Edit review'), findsOneWidget);
  });

  testWidgets('review history falls back when event context is missing', (
    tester,
  ) async {
    final user = buildUser(name: 'Asha');
    final review = buildReview(
      id: 'missing-event~runner-1',
      eventId: 'missing-event',
      reviewerUserId: user.uid,
      reviewerName: user.name,
      comment: 'Still worth remembering.',
    );

    await _pumpReviewsHistory(
      tester,
      uid: user.uid,
      user: user,
      repository: _FakeReviewsRepository(reviewsByUser: [review]),
      providerOverrides: [
        watchEventsByIdsProvider(
          EventsByIdQuery(['missing-event']),
        ).overrideWith((ref) => Stream.value(<Event>[])),
      ],
    );

    expect(find.text('Event review'), findsOneWidget);
    expect(find.text('Still worth remembering.'), findsOneWidget);
    expect(find.byKey(ReviewKeys.editReviewButton(review.id)), findsOneWidget);
  });
}

ProviderContainer _reviewsContainer(_FakeReviewsRepository repository) {
  return ProviderContainer(
    overrides: [reviewsRepositoryProvider.overrideWith((ref) => repository)],
  );
}

Future<void> _pumpReviewsSection(
  WidgetTester tester, {
  required ProviderContainer container,
  required UserProfile user,
  required List<Review> reviews,
  bool canWrite = true,
  bool canRespond = false,
}) async {
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: Padding(
            padding: const EdgeInsets.all(16),
            child: EventReviewsSection(
              organizerId: 'club-1',
              eventId: 'event-1',
              reviews: reviews,
              currentUid: user.uid,
              userProfile: user,
              canWrite: canWrite,
              canRespond: canRespond,
            ),
          ),
        ),
      ),
    ),
  );
  await tester.pump();
}

Future<void> _pumpReviewsHistory(
  WidgetTester tester, {
  required String? uid,
  UserProfile? user,
  Stream<UserProfile?>? userStream,
  _FakeReviewsRepository? repository,
  Iterable providerOverrides = const [],
  bool settle = true,
}) async {
  final container = ProviderContainer(
    overrides: [
      uidProvider.overrideWith((ref) => Stream.value(uid)),
      watchUserProfileProvider.overrideWith(
        (ref) => userStream ?? Stream.value(user),
      ),
      reviewsRepositoryProvider.overrideWith(
        (ref) => repository ?? _FakeReviewsRepository(),
      ),
      ...providerOverrides,
    ],
  );
  addTearDown(container.dispose);

  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp(
        theme: AppTheme.light,
        home: const ReviewsHistoryScreen(),
      ),
    ),
  );
  if (settle) {
    await pumpFeatureUi(tester);
  } else {
    await tester.pump();
    await tester.pump();
  }
}

class _FakeReviewsRepository extends Fake implements ReviewsRepository {
  _FakeReviewsRepository({
    List<Review> reviewsByUser = const [],
    Stream<List<Review>>? reviewsByUserStream,
  }) : reviewsByUserStream = reviewsByUserStream ?? Stream.value(reviewsByUser);

  final Stream<List<Review>> reviewsByUserStream;
  Completer<void>? writeCompleter;
  Review? addedReview;
  String? deletedReviewId;
  String? responseReviewId;
  String? responseMessage;

  @override
  Stream<List<Review>> watchReviewsByUser(String reviewerUserId) =>
      reviewsByUserStream;

  @override
  Future<void> addReview(Review review) async {
    final pendingWrite = writeCompleter;
    if (pendingWrite != null) await pendingWrite.future;
    addedReview = review;
  }

  @override
  Future<void> deleteReview(String reviewId) async {
    deletedReviewId = reviewId;
  }

  @override
  Future<void> setReviewResponse({
    required String reviewId,
    required String message,
  }) async {
    responseReviewId = reviewId;
    responseMessage = message;
  }
}
