import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/connections/data/swipe_candidate_repository.dart';
import 'package:catch_dating_app/contexts/connections/data/swipe_repository.dart';
import 'package:catch_dating_app/contexts/connections/domain/swipe.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/core/connectivity_service.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/swipes/presentation/swipe_queue_controller.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../auth/auth_test_helpers.dart';
import '../events/events_test_helpers.dart';

class FakeSwipeRecordRepository extends Fake implements SwipeRepository {
  Swipe? recordedSwipe;
  final recordedSwipes = <Swipe>[];
  Completer<void>? recordCompleter;

  @override
  Future<void> recordSwipe({required Swipe swipe}) async {
    recordedSwipe = swipe;
    recordedSwipes.add(swipe);
    await recordCompleter?.future;
  }
}

class FakeSwipeCandidateRepository extends Fake
    implements SwipeCandidateRepository {
  FakeSwipeCandidateRepository([
    this.candidates = const [],
    this.loadCompleter,
  ]);

  final List<PublicProfile> candidates;
  final Completer<List<PublicProfile>>? loadCompleter;

  @override
  Future<List<PublicProfile>> fetchCandidates({required String eventId}) =>
      loadCompleter?.future ?? Future.value(candidates);
}

void main() {
  group('SwipeQueueNotifier.swipe', () {
    late FakeSwipeRecordRepository swipeRepository;
    late FakeSwipeCandidateRepository candidateRepository;
    late FakeAuthRepository authRepository;

    setUp(() {
      swipeRepository = FakeSwipeRecordRepository();
      candidateRepository = FakeSwipeCandidateRepository();
      authRepository = FakeAuthRepository();
      addTearDown(authRepository.dispose);
    });

    test('does not pop the queue when signed-in uid is unavailable', () async {
      final container = ProviderContainer(
        overrides: [
          isObviouslyOfflineProvider.overrideWithValue(false),
          uidProvider.overrideWith((ref) => Stream.value(null)),
          authRepositoryProvider.overrideWithValue(authRepository),
          swipeRepositoryProvider.overrideWith((ref) => swipeRepository),
          swipeCandidateRepositoryProvider.overrideWith(
            (ref) => candidateRepository,
          ),
        ],
      );
      addTearDown(container.dispose);

      final sub = container.listen(
        swipeQueueProvider('event-1'),
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(sub.close);
      await container.pump();

      final notifier = container.read(swipeQueueProvider('event-1').notifier);
      notifier.state = AsyncData([buildPublicProfile(uid: 'runner-2')]);

      await notifier.swipe(SwipeDirection.like);

      expect(swipeRepository.recordedSwipe, isNull);
      expect(
        container.read(swipeQueueProvider('event-1')).value?.map((p) => p.uid),
        ['runner-2'],
      );
    });

    test(
      'records the swipe and removes the top profile when uid is available',
      () async {
        authRepository.currentUserValue = TestUser(uid: 'runner-1');
        final container = ProviderContainer(
          overrides: [
            isObviouslyOfflineProvider.overrideWithValue(false),
            uidProvider.overrideWith((ref) => Stream.value('runner-1')),
            authRepositoryProvider.overrideWithValue(authRepository),
            swipeRepositoryProvider.overrideWith((ref) => swipeRepository),
            swipeCandidateRepositoryProvider.overrideWith(
              (ref) => candidateRepository,
            ),
          ],
        );
        addTearDown(container.dispose);

        final sub = container.listen(
          swipeQueueProvider('event-9'),
          (_, _) {},
          fireImmediately: true,
        );
        addTearDown(sub.close);
        await container.pump();

        final notifier = container.read(swipeQueueProvider('event-9').notifier);
        notifier.state = AsyncData([
          buildPublicProfile(uid: 'runner-2'),
          buildPublicProfile(uid: 'runner-3'),
        ]);

        await notifier.swipe(SwipeDirection.pass);

        expect(swipeRepository.recordedSwipe?.swiperId, 'runner-1');
        expect(swipeRepository.recordedSwipe?.targetId, 'runner-2');
        expect(swipeRepository.recordedSwipe?.eventId, 'event-9');
        expect(swipeRepository.recordedSwipe?.direction, SwipeDirection.pass);
        expect(
          container
              .read(swipeQueueProvider('event-9'))
              .value
              ?.map((p) => p.uid),
          ['runner-3'],
        );
      },
    );

    test('records reaction target and comment for a section like', () async {
      authRepository.currentUserValue = TestUser(uid: 'runner-1');
      final container = ProviderContainer(
        overrides: [
          isObviouslyOfflineProvider.overrideWithValue(false),
          uidProvider.overrideWith((ref) => Stream.value('runner-1')),
          authRepositoryProvider.overrideWithValue(authRepository),
          swipeRepositoryProvider.overrideWith((ref) => swipeRepository),
          swipeCandidateRepositoryProvider.overrideWith(
            (ref) => candidateRepository,
          ),
        ],
      );
      addTearDown(container.dispose);

      final sub = container.listen(
        swipeQueueProvider('event-9'),
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(sub.close);
      await container.pump();

      final notifier = container.read(swipeQueueProvider('event-9').notifier);
      notifier.state = AsyncData([buildPublicProfile(uid: 'runner-2')]);

      await notifier.swipe(
        SwipeDirection.like,
        reactionTarget: const ProfileReactionTarget(
          id: 'profile-prompt-perfectRun',
          type: SwipeReactionTargetType.profilePrompt,
          label: 'A perfect event with me looks like...',
          preview: 'Always up for a sunrise event.',
        ),
        comment: '  This sounds fun.  ',
      );

      expect(
        swipeRepository.recordedSwipe?.reactionTargetId,
        'profile-prompt-perfectRun',
      );
      expect(
        swipeRepository.recordedSwipe?.reactionTargetType,
        SwipeReactionTargetType.profilePrompt,
      );
      expect(
        swipeRepository.recordedSwipe?.reactionTargetLabel,
        'A perfect event with me looks like...',
      );
      expect(swipeRepository.recordedSwipe?.comment, 'This sounds fun.');
    });

    test(
      'ignores duplicate swipe attempts while a swipe write is pending',
      () async {
        authRepository.currentUserValue = TestUser(uid: 'runner-1');
        swipeRepository.recordCompleter = Completer<void>();
        final container = ProviderContainer(
          overrides: [
            isObviouslyOfflineProvider.overrideWithValue(false),
            uidProvider.overrideWith((ref) => Stream.value('runner-1')),
            authRepositoryProvider.overrideWithValue(authRepository),
            swipeRepositoryProvider.overrideWith((ref) => swipeRepository),
            swipeCandidateRepositoryProvider.overrideWith(
              (ref) => candidateRepository,
            ),
          ],
        );
        addTearDown(container.dispose);

        final sub = container.listen(
          swipeQueueProvider('event-9'),
          (_, _) {},
          fireImmediately: true,
        );
        addTearDown(sub.close);
        await container.pump();

        final notifier = container.read(swipeQueueProvider('event-9').notifier);
        notifier.state = AsyncData([
          buildPublicProfile(uid: 'runner-2'),
          buildPublicProfile(uid: 'runner-3'),
        ]);

        final firstSwipe = notifier.swipe(SwipeDirection.like);
        final secondSwipe = notifier.swipe(SwipeDirection.pass);

        await pumpEventQueue();
        expect(swipeRepository.recordedSwipes, hasLength(1));
        expect(
          swipeRepository.recordedSwipes.single.direction,
          SwipeDirection.like,
        );

        swipeRepository.recordCompleter!.complete();
        await Future.wait([firstSwipe, secondSwipe]);

        expect(
          container
              .read(swipeQueueProvider('event-9'))
              .value
              ?.map((p) => p.uid),
          ['runner-3'],
        );
      },
    );

    test('surfaces a retryable timeout instead of loading forever', () async {
      final hangingCandidates = Completer<List<PublicProfile>>();
      final container = ProviderContainer(
        overrides: [
          isObviouslyOfflineProvider.overrideWithValue(false),
          swipeQueueLoadTimeoutProvider.overrideWithValue(
            const Duration(milliseconds: 1),
          ),
          uidProvider.overrideWith((ref) => Stream.value('runner-1')),
          swipeCandidateRepositoryProvider.overrideWith(
            (ref) => FakeSwipeCandidateRepository(const [], hangingCandidates),
          ),
        ],
      );
      addTearDown(container.dispose);

      final sub = container.listen(
        swipeQueueProvider('event-1'),
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(sub.close);

      await Future<void>.delayed(const Duration(milliseconds: 5));
      await container.pump();

      final state = container.read(swipeQueueProvider('event-1'));
      expect(state.hasError, isTrue);
      expect(
        state.error,
        isA<BackendOperationException>()
            .having((e) => e.code, 'code', 'swipe-candidates-timeout')
            .having((e) => e.retryable, 'retryable', isTrue),
      );
    });

    test('surfaces obvious offline state before waiting for timeout', () async {
      final container = ProviderContainer(
        overrides: [
          isObviouslyOfflineProvider.overrideWithValue(true),
          uidProvider.overrideWith((ref) => Stream.value('runner-1')),
          swipeCandidateRepositoryProvider.overrideWith(
            (ref) => candidateRepository,
          ),
        ],
      );
      addTearDown(container.dispose);

      final sub = container.listen(
        swipeQueueProvider('event-1'),
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(sub.close);

      await container.pump();

      final state = container.read(swipeQueueProvider('event-1'));
      expect(state.hasError, isTrue);
      expect(
        state.error,
        isA<NetworkException>()
            .having((e) => e.code, 'code', 'offline')
            .having((e) => e.retryable, 'retryable', isTrue),
      );
    });

    test('keeps cached queue data when connectivity drops offline', () async {
      final connectivity = StreamController<List<ConnectivityResult>>();
      addTearDown(connectivity.close);

      final container = ProviderContainer(
        overrides: [
          appConnectivityProvider.overrideWith((ref) => connectivity.stream),
          uidProvider.overrideWith((ref) => Stream.value('runner-1')),
          swipeCandidateRepositoryProvider.overrideWith(
            (ref) => FakeSwipeCandidateRepository([
              buildPublicProfile(uid: 'runner-2'),
            ]),
          ),
        ],
      );
      addTearDown(container.dispose);

      final sub = container.listen(
        swipeQueueProvider('event-1'),
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(sub.close);

      connectivity.add(const [ConnectivityResult.wifi]);
      final profiles = await container.read(
        swipeQueueProvider('event-1').future,
      );
      expect(profiles.map((p) => p.uid), ['runner-2']);

      connectivity.add(const [ConnectivityResult.none]);
      await container.pump();

      final state = container.read(swipeQueueProvider('event-1'));
      expect(state.hasError, isFalse);
      expect(state.value?.map((p) => p.uid), ['runner-2']);
    });
  });
}
