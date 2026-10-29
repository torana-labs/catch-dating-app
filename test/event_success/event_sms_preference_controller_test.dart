import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_sms_preference_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_sms_preference.dart';
import 'package:catch_dating_app/event_success/presentation/event_sms_preference_controller.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_sms_preference_fixtures.dart';

void main() {
  late SmsTestRepository repository;
  late StreamController<String?> auth;
  late ProviderContainer container;
  late ProviderSubscription<EventSmsPreferenceState> subscription;
  final provider = eventSmsPreferenceControllerProvider(smsScope());

  EventSmsPreferenceController controller() =>
      container.read(provider.notifier);
  EventSmsPreferenceState state() => container.read(provider);
  EventSmsPreferenceReady ready() => state() as EventSmsPreferenceReady;
  Future<void> signIn(String? uid) async {
    final count = repository.reads.length + 1;
    auth.add(uid);
    await container.pump();
    if (uid != null) await repository.waitForReads(count);
    await container.pump();
  }

  Future<void> load({Map<String, Object?> patch = const {}}) async {
    await signIn('guest-1');
    repository.reads.last.result.complete(smsView(patch: patch));
    await container.pump();
  }

  setUp(() {
    repository = SmsTestRepository();
    auth = StreamController<String?>.broadcast();
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => auth.stream),
        eventSmsPreferenceRepositoryProvider.overrideWith((ref) => repository),
      ],
    );
    subscription = container.listen(provider, (_, _) {});
  });
  tearDown(() async {
    container.dispose();
    await auth.close();
  });

  test(
    'loading, read errors, refresh and sign-out expose no old review',
    () async {
      expect(state(), isA<EventSmsPreferenceLoading>());
      expect(repository.reads, isEmpty);
      await load();
      final old = ready().review;
      final refresh = controller().refresh();
      expect(state(), isA<EventSmsPreferenceLoading>());
      await expectLater(
        controller().enable(old),
        throwsA(isA<ValidationException>()),
      );
      repository.reads.last.result.completeError(
        const NetworkException('unavailable', 'Offline'),
      );
      await refresh;
      expect(state(), isA<EventSmsPreferenceFailure>());
      await container.pump();
      expect(repository.reads, hasLength(2));
      final reload = controller().refresh();
      repository.reads.last.result.complete(smsView());
      await reload;
      expect(ready().review, isNot(same(old)));
      await signIn(null);
      expect(state(), isA<EventSmsPreferenceHidden>());
      expect(repository.writes, isEmpty);
    },
  );

  test(
    'repeated taps share one request and no preference changes optimistically',
    () async {
      await load();
      final review = ready().review;
      final first = controller().enable(review);
      final second = controller().enable(review);
      expect(first, same(second));
      expect(repository.writes, hasLength(1));
      expect(ready().phase, EventSmsPreferencePhase.saving);
      expect(ready().review.view.preference, EventSmsPreference.notSet);
      expect(ready().canEnable, isFalse);
      expect(ready().canDisable, isFalse);
      await controller().refresh();
      expect(repository.reads, hasLength(1));
      final write = repository.writes.single;
      expect(write.change.snapshot, same(review.view));
      expect(write.change.requestId, startsWith('sms:'));
      write.result.complete(smsApplied(write.change));
      await first;
      expect(ready().review.view.preference, EventSmsPreference.enabled);
      expect(ready().notice, EventSmsPreferenceNotice.saved);
      expect(ready().canDisable, isTrue);
    },
  );

  test(
    'uncertainty permits only an identical retry, including after resume',
    () async {
      await load();
      final review = ready().review;
      final first = controller().enable(review);
      final failure = expectLater(first, throwsA(isA<NetworkException>()));
      final change = repository.writes.single.change;
      repository.writes.single.result.completeError(
        const NetworkException('unavailable', 'Lost response'),
      );
      await failure;
      expect(ready().phase, EventSmsPreferencePhase.uncertain);
      expect(ready().canRetry, isTrue);
      expect(ready().canRefresh, isFalse);
      await controller().refresh();
      await expectLater(
        controller().disable(review),
        throwsA(isA<ValidationException>()),
      );
      expect(repository.reads, hasLength(1));
      expect(repository.writes, hasLength(1));
      final retry = controller().retry(review);
      expect(repository.writes.last.change, same(change));
      repository.writes.last.result.complete(
        smsApplied(
          change,
          outcome: 'replayed',
          patch: {'revision': 3, 'preference': 'disabled'},
        ),
      );
      final result = await retry;
      expect(result.outcome, EventSmsPreferenceOutcome.replayed);
      expect(ready().review.view.preference, EventSmsPreference.disabled);
      expect(ready().review.view.revision, 3);
    },
  );

  test(
    'same-revision conflict requires the returned review and a new request',
    () async {
      await load();
      final review = ready().review;
      final first = controller().enable(review);
      final change = repository.writes.single.change;
      repository.writes.single.result.complete(
        EventSmsPreferenceResult.fromCallableData(
          smsResponse(outcome: 'conflict', viewPatch: {'reviewHash': 'c' * 64}),
          expectedScope: smsScope(),
        ),
      );
      await first;
      expect(ready().notice, EventSmsPreferenceNotice.changed);
      expect(ready().review.view.revision, isNull);
      await expectLater(
        controller().enable(review),
        throwsA(isA<ValidationException>()),
      );
      final next = controller().enable(ready().review);
      final fresh = repository.writes.last.change;
      expect(fresh.requestId, isNot(change.requestId));
      expect(fresh.snapshot.reviewHash, 'c' * 64);
      repository.writes.last.result.complete(smsApplied(fresh));
      await next;
    },
  );

  test(
    'definite rejection requires a read; malformed replies remain uncertain',
    () async {
      await load();
      final firstReview = ready().review;
      final first = controller().enable(firstReview);
      final failure = expectLater(
        first,
        throwsA(isA<BackendOperationException>()),
      );
      repository.writes.last.result.completeError(
        const BackendOperationException(
          code: 'failed-precondition',
          message: 'Review changed',
          context: BackendErrorContext(
            service: BackendService.functions,
            action: 'save event texts',
          ),
        ),
      );
      await failure;
      expect(ready().phase, EventSmsPreferencePhase.refreshRequired);
      expect(ready().canEnable, isFalse);
      await expectLater(
        controller().retry(firstReview),
        throwsA(isA<ValidationException>()),
      );
      final refresh = controller().refresh();
      repository.reads.last.result.complete(smsView());
      await refresh;
      final next = controller().enable(ready().review);
      final malformed = expectLater(
        next,
        throwsA(isA<BackendOperationException>()),
      );
      repository.writes.last.result.completeError(
        const BackendOperationException(
          code: 'unexpected',
          message: 'Invalid response',
          context: BackendErrorContext(
            service: BackendService.functions,
            action: 'save event texts',
          ),
        ),
      );
      await malformed;
      expect(ready().phase, EventSmsPreferencePhase.uncertain);
      expect(
        repository.writes[0].change.requestId,
        isNot(repository.writes[1].change.requestId),
      );
    },
  );

  test(
    'old account reads and writes cannot replace current participant state',
    () async {
      await load();
      final review = ready().review;
      final pending = controller().enable(review);
      final oldWrite = repository.writes.single;
      final failed = expectLater(
        pending,
        throwsA(isA<BackendOperationException>()),
      );
      await signIn('guest-2');
      final bRead = repository.reads.last;
      await signIn('guest-1');
      final aRead = repository.reads.last;
      bRead.result.complete(smsView(patch: {'reviewHash': 'b' * 64}));
      oldWrite.result.complete(smsApplied(oldWrite.change));
      await failed;
      await container.pump();
      expect(state(), isA<EventSmsPreferenceLoading>());
      aRead.result.complete(smsView());
      await container.pump();
      expect(ready().review.account, isNot(same(review.account)));
      expect(ready().review.view.preference, EventSmsPreference.notSet);
      await expectLater(
        controller().enable(review),
        throwsA(isA<BackendOperationException>()),
      );
      expect(repository.writes, hasLength(1));
    },
  );

  test(
    'authentication errors discard pending choices before the same UID returns',
    () async {
      await load();
      final review = ready().review;
      auth.addError(StateError('Auth unavailable'));
      await container.pump();
      expect(state(), isA<EventSmsPreferenceFailure>());
      await signIn('guest-1');
      repository.reads.last.result.complete(smsView());
      await container.pump();
      await expectLater(
        controller().enable(review),
        throwsA(isA<BackendOperationException>()),
      );
      expect(repository.writes, isEmpty);
    },
  );

  test('inactive offers hide but existing grants retain withdrawal', () async {
    await load(
      patch: {'availability': 'senderUnavailable', 'canEnable': false},
    );
    expect(state(), isA<EventSmsPreferenceHidden>());
    final refresh = controller().refresh();
    repository.reads.last.result.complete(
      smsView(
        patch: {
          'availability': 'senderUnavailable',
          'canEnable': false,
          'preference': 'enabled',
          'revision': 1,
          'expiresAt': 3000,
        },
      ),
    );
    await refresh;
    expect(ready().canDisable, isTrue);
    final stop = controller().disable(ready().review);
    repository.writes.last.result.complete(
      smsApplied(
        repository.writes.last.change,
        patch: {'availability': 'senderUnavailable', 'canEnable': false},
      ),
    );
    await stop;
    expect(ready().review.view.preference, EventSmsPreference.disabled);
  });

  test(
    'different attendees have independent state and refresh scope',
    () async {
      await load();
      final other = eventSmsPreferenceControllerProvider(
        smsScope(attendeeId: 'other'),
      );
      container.listen(other, (_, _) {});
      await repository.waitForReads(2);
      expect(repository.reads.last.scope.attendeeId, 'other');
      final refresh = controller().refresh();
      expect(repository.reads.last.scope, smsScope());
      repository.reads.last.result.complete(smsView());
      await refresh;
      expect(container.read(other), isA<EventSmsPreferenceLoading>());
    },
  );

  test(
    'a submitted preference remains tracked when its observer is dismissed',
    () async {
      await load();
      final pending = controller().enable(ready().review);
      final write = repository.writes.single;
      subscription.close();
      await container.pump();
      write.result.complete(smsApplied(write.change));
      expect((await pending).outcome, EventSmsPreferenceOutcome.applied);
      expect(repository.writes, hasLength(1));
    },
  );

  test(
    'an uncertain SMS decision survives closing and reopening its sheet',
    () async {
      await load();
      final original = controller();
      final review = ready().review;
      final request = original.enable(review);
      final failed = expectLater(request, throwsA(isA<NetworkException>()));
      final first = repository.writes.single;
      first.result.completeError(
        const NetworkException('unavailable', 'Offline'),
      );
      await failed;
      subscription.close();
      await container.pump();
      subscription = container.listen(provider, (_, _) {});
      await container.pump();
      expect(controller(), same(original));
      expect(repository.reads, hasLength(1));
      expect(ready().canRetry, isTrue);
      final retry = controller().retry(ready().review);
      expect(repository.writes.last.change, same(first.change));
      repository.writes.last.result.complete(smsApplied(first.change));
      await retry;
      expect(ready().review.view.preference, EventSmsPreference.enabled);
    },
  );

  for (final transition in ['signOut', 'sameUidReturn', 'authError']) {
    test('a detached SMS retry cannot survive $transition', () async {
      await load();
      final review = ready().review;
      final original = controller();
      final request = original.enable(review);
      final failed = expectLater(request, throwsA(isA<NetworkException>()));
      repository.writes.single.result.completeError(
        const NetworkException('unavailable', 'Offline'),
      );
      await failed;
      subscription.close();
      await container.pump();
      if (transition == 'authError') {
        auth.addError(StateError('Auth unavailable'));
      } else {
        auth.add(null);
      }
      await container.pump();
      if (transition == 'sameUidReturn') {
        auth.add('guest-1');
        await container.pump();
      }
      subscription = container.listen(provider, (_, _) {});
      await container.pump();
      expect(state(), isNot(isA<EventSmsPreferenceReady>()));
      await expectLater(original.retry(review), throwsA(isA<Object>()));
      expect(repository.writes, hasLength(1));
    });
  }

  test(
    'the state owner rejects a receipt from a different participant',
    () async {
      await load();
      final request = controller().enable(ready().review);
      final rejected = expectLater(request, throwsFormatException);
      final change = repository.writes.single.change;
      repository.writes.single.result.complete(
        EventSmsPreferenceResult.fromCallableData(
          smsAppliedRaw(change, patch: {'attendeeId': 'foreign'}),
          expectedScope: smsScope(attendeeId: 'foreign'),
        ),
      );
      await rejected;
      expect(ready().phase, EventSmsPreferencePhase.uncertain);
      expect(ready().notice, EventSmsPreferenceNotice.none);
    },
  );

  test('a retry from the error state receives a fresh active future', () async {
    await load();
    Future<EventSmsPreferenceResult>? next;
    final observer = container.listen(provider, (_, state) {
      if (state is EventSmsPreferenceReady && state.canRetry && next == null) {
        next = controller().retry(state.review);
      }
    });
    final request = controller().enable(ready().review);
    final failed = expectLater(request, throwsA(isA<NetworkException>()));
    repository.writes.single.result.completeError(
      const NetworkException('unavailable', 'Offline'),
    );
    await failed;
    expect(next, isNot(same(request)));
    expect(repository.writes, hasLength(2));
    final retry = repository.writes.last;
    expect(retry.change, same(repository.writes.first.change));
    retry.result.complete(smsApplied(retry.change));
    await next;
    observer.close();
    expect(ready().notice, EventSmsPreferenceNotice.saved);
  });
}
