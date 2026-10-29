import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/connections/data/swipe_repository.dart';
import 'package:catch_dating_app/contexts/connections/domain/swipe.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/design_fixtures/catches_surface_fixtures.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/swipes/presentation/swipe_keys.dart';
import 'package:catch_dating_app/swipes/presentation/swipe_queue_controller.dart';
import 'package:catch_dating_app/swipes/presentation/swipe_screen.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_surface.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

void main() {
  testWidgets('SwipeScreen shows profile-shaped skeleton while queue loads', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWithValue(const AsyncLoading<String?>()),
          watchUserProfileProvider.overrideWithValue(
            const AsyncData<UserProfile?>(null),
          ),
          watchEventProvider(
            'event-1',
          ).overrideWithValue(const AsyncData(null)),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          builder: catchNoticeOverlayBuilder,
          home: const SwipeScreen(eventId: 'event-1'),
        ),
      ),
    );
    await tester.pump();

    expect(find.byType(CatchScaffold), findsOneWidget);
    expect(find.byType(CatchesProfileBodySkeleton), findsOneWidget);
    expect(find.byType(ProfileSurfaceSkeleton), findsOneWidget);
    expect(find.byType(CatchSkeleton), findsWidgets);
    expect(find.byType(CircularProgressIndicator), findsNothing);
    expect(find.text('No catches left'), findsNothing);
  });

  testWidgets('SwipeScreen disables pass action while swipe write is pending', (
    tester,
  ) async {
    final swipeRepository = _FakeSwipeRepository()
      ..recordCompleter = Completer<void>();

    await _pumpLoadedSwipeScreen(tester, swipeRepository: swipeRepository);

    await tester.tap(find.byKey(SwipeKeys.passButton));
    await tester.pump();

    expect(swipeRepository.recordedSwipes, hasLength(1));
    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    await tester.tap(find.byKey(SwipeKeys.passButton));
    await tester.pump();

    expect(swipeRepository.recordedSwipes, hasLength(1));

    swipeRepository.recordCompleter!.complete();
    await tester.pump();
    await pumpFeatureUiFor(tester, const Duration(milliseconds: 180));

    expect(
      find.byKey(const ValueKey(CatchesSurfaceFixtures.candidateUid)),
      findsNothing,
    );
    expect(
      find.byKey(const ValueKey(CatchesSurfaceFixtures.secondCandidateUid)),
      findsOneWidget,
    );
  });

  testWidgets(
    'SwipeScreen keeps current profile and shows snackbar on failure',
    (tester) async {
      final swipeRepository = _FakeSwipeRepository()..throwOnRecord = true;

      await _pumpLoadedSwipeScreen(tester, swipeRepository: swipeRepository);

      await tester.tap(find.byKey(SwipeKeys.passButton));
      await tester.pump();

      expect(swipeRepository.recordedSwipes, hasLength(1));
      expect(
        find.byKey(const ValueKey(CatchesSurfaceFixtures.candidateUid)),
        findsOneWidget,
      );
      expect(
        find.text('Something went wrong. Please try again.'),
        findsOneWidget,
      );
      expect(find.text('Reload catches'), findsOneWidget);
    },
  );
}

Future<void> _pumpLoadedSwipeScreen(
  WidgetTester tester, {
  required SwipeRepository swipeRepository,
}) async {
  final event = CatchesSurfaceFixtures.openWindowEvent();

  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        uidProvider.overrideWithValue(
          const AsyncData<String?>(CatchesSurfaceFixtures.viewerUid),
        ),
        watchUserProfileProvider.overrideWith(
          (ref) => Stream<UserProfile?>.value(CatchesSurfaceFixtures.viewer),
        ),
        watchEventProvider(event.id).overrideWith((ref) => Stream.value(event)),
        watchEventParticipationProvider(
          event.id,
          CatchesSurfaceFixtures.viewerUid,
        ).overrideWith(
          (ref) => Stream.value(
            CatchesSurfaceFixtures.attendedParticipation(event: event),
          ),
        ),
        swipeQueueProvider(event.id).overrideWithBuild(
          (ref, notifier) async => CatchesSurfaceFixtures.candidates,
        ),
        swipeRepositoryProvider.overrideWithValue(swipeRepository),
      ],
      child: MaterialApp(
        theme: AppTheme.light,
        builder: catchNoticeOverlayBuilder,
        home: SwipeScreen(eventId: event.id, now: CatchesSurfaceFixtures.now),
      ),
    ),
  );
  await tester.pump();
  await tester.pump();
}

class _FakeSwipeRepository extends Fake implements SwipeRepository {
  final recordedSwipes = <Swipe>[];
  Completer<void>? recordCompleter;
  bool throwOnRecord = false;

  @override
  Future<Set<String>> fetchSwipedUserIds({required String uid}) async =>
      const <String>{};

  @override
  Future<void> recordSwipe({required Swipe swipe}) async {
    recordedSwipes.add(swipe);
    if (throwOnRecord) {
      throw const BackendOperationException(
        code: 'test-swipe-write-failed',
        message: 'Unable to save that catch. Please try again.',
        context: BackendErrorContext(
          service: BackendService.firestore,
          action: 'record swipe',
          resource: 'profile_decisions',
        ),
        retryable: true,
      );
    }
    await recordCompleter?.future;
  }
}
