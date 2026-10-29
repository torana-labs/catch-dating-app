import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_events_timeline_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';
import 'support/host_events_timeline_test_support.dart';

void main() {
  test(
    'bootstrap retry retains each successful source and rejects duplicates',
    () async {
      final past = Completer<TimelinePage>();
      final cancelled = Completer<TimelinePage>();
      final repository = PagedEventRepository(
        activeSteps: [
          () async => const TimelinePage(items: [], hasMore: false),
        ],
        pastSteps: [
          () async => throw StateError('initial past'),
          () => past.future,
        ],
        cancelledSteps: [
          () async => TimelinePage(
            items: [buildEvent(id: 'old-cancelled')],
            hasMore: false,
          ),
          () => cancelled.future,
        ],
      );
      final container = timelineContainer(repository);
      final provider = timelineProvider(container);
      final subscription = container.listen(provider, (_, _) {});
      addTearDown(subscription.close);
      await settledTimeline(container, provider);
      final notifier = container.read(provider.notifier);
      final retry = notifier.retryPast();
      await notifier.retryPast();
      expect(repository.pastStartAfterCalls, [null, null]);
      expect(repository.cancelledStartAfterCalls, [null, null]);
      past.complete(
        TimelinePage(items: [buildEvent(id: 'recovered-past')], hasMore: false),
      );
      cancelled.completeError(StateError('retry cancelled'));
      await retry;
      final result = container.read(provider).requireValue;
      expect(result.pastEvents.single.id, 'recovered-past');
      expect(result.cancelledEvents.single.id, 'old-cancelled');
      expect(result.pastError, isA<StateError>());
      expect(result.historyInitialized, isFalse);
    },
  );

  test(
    'duplicate history continuations share the exact failed retry cursor',
    () async {
      final cursor = await timelineEventCursor('history-cursor');
      final response = Completer<TimelinePage>();
      final repository = PagedEventRepository(
        activeSteps: [
          () async => const TimelinePage(items: [], hasMore: false),
        ],
        pastSteps: [
          () async => TimelinePage(
            items: [buildEvent(id: 'old')],
            nextCursor: cursor,
            hasMore: true,
          ),
          () => response.future,
          () async =>
              TimelinePage(items: [buildEvent(id: 'next')], hasMore: false),
        ],
      );
      final container = timelineContainer(repository);
      final provider = timelineProvider(container);
      final subscription = container.listen(provider, (_, _) {});
      addTearDown(subscription.close);
      await settledTimeline(container, provider);
      final notifier = container.read(provider.notifier);
      final continuation = notifier.loadMorePast();
      await notifier.loadMorePast();
      expect(repository.pastStartAfterCalls, [null, cursor]);
      response.completeError(StateError('history continuation'));
      await continuation;
      await notifier.retryPast();
      expect(repository.pastStartAfterCalls, [null, cursor, cursor]);
      expect(
        container.read(provider).requireValue.pastEvents.map((e) => e.id),
        ['old', 'next'],
      );
    },
  );

  for (final failedSource in <TimelineSource?>[
    null,
    TimelineSource.past,
    TimelineSource.cancelled,
  ]) {
    test(
      'refresh retains pending history, replaces refreshed rows and retries $failedSource',
      () async {
        final old = PendingTimelineReads('old');
        final fresh = PendingTimelineReads('fresh');
        final repository = timelineRepositoryFor([old, fresh]);
        repository.pastSteps.add(
          () async => TimelinePage(
            items: [buildEvent(id: 'retry-past')],
            hasMore: false,
          ),
        );
        repository.cancelledSteps.add(
          () async => TimelinePage(
            items: [buildEvent(id: 'retry-cancelled')],
            hasMore: false,
          ),
        );
        final container = timelineContainer(
          repository,
          setups: ControlledSetupRepository([old, fresh]),
        );
        final provider = timelineProvider(container);
        final subscription = container.listen(provider, (_, _) {});
        addTearDown(subscription.close);
        old.completeUpcoming();
        old.completeHistory();
        await settledTimeline(container, provider);
        container.invalidate(provider);
        fresh.completeUpcoming();
        final refreshing = await container.read(provider.future);
        expect(refreshing.activeEvents.single.id, 'fresh-active');
        expect(refreshing.pastEvents.single.id, 'old-past');
        expect(refreshing.cancelledEvents.single.id, 'old-cancelled');
        expect(refreshing.unpublishedHistory.map((event) => event.eventId), [
          'old-past',
          'old-cancelled',
        ]);
        expect(refreshing.loadingMorePast, isTrue);
        fresh.completeHistory(
          failure: failedSource,
          error: StateError('refresh failed'),
        );
        final refreshed = await settledTimeline(container, provider);
        expect(
          refreshed.pastEvents.single.id,
          failedSource == TimelineSource.past ? 'old-past' : 'fresh-past',
        );
        expect(
          refreshed.cancelledEvents.single.id,
          failedSource == TimelineSource.cancelled
              ? 'old-cancelled'
              : 'fresh-cancelled',
        );
        expect(refreshed.unpublishedHistory.map((event) => event.eventId), [
          'fresh-past',
          'fresh-cancelled',
        ]);
        expect(
          refreshed.unpublishedCursors.values,
          everyElement(startsWith('fresh-')),
        );
        if (failedSource != null) {
          await container.read(provider.notifier).retryPast();
          final retried = container.read(provider).requireValue;
          expect(retried.pastEvents.single.id, 'retry-past');
          expect(retried.cancelledEvents.single.id, 'retry-cancelled');
          expect(retried.historyInitialized, isTrue);
          expect(retried.pastError, isNull);
          expect(repository.pastStartAfterCalls, [null, null, null]);
          expect(repository.cancelledStartAfterCalls, [null, null, null]);
        }
      },
    );
  }

  test(
    'retained old notifier cannot issue reads after session switch',
    () async {
      final reads = PendingTimelineReads('old');
      final repository = timelineRepositoryFor([reads]);
      final setups = ControlledSetupRepository([reads]);
      final container = timelineContainer(repository, setups: setups);
      final provider = timelineProvider(container);
      final subscription = container.listen(provider, (_, _) {});
      addTearDown(subscription.close);
      reads.completeUpcoming();
      reads.completeHistory();
      await settledTimeline(container, provider);
      final notifier = container.read(provider.notifier);
      container.updateOverrides([
        uidProvider.overrideWithValue(const AsyncData('account-b')),
        eventRepositoryProvider.overrideWithValue(repository),
        privateEventSetupTimelineRepositoryProvider.overrideWithValue(setups),
      ]);
      await Future.wait([
        notifier.loadMoreActive(),
        notifier.loadMorePast(),
        notifier.retryPast(),
      ]);
      expect(repository.activeStartAfterCalls, [null]);
      expect(repository.pastStartAfterCalls, [null]);
      expect(repository.cancelledStartAfterCalls, [null]);
      expect(setups.calls, hasLength(3));
    },
  );

  test(
    'initial history merges into active continuation without resetting its cursor',
    () async {
      final reads = PendingTimelineReads('initial');
      final cursor = await timelineEventCursor('next-active');
      final repository = timelineRepositoryFor([reads]);
      repository.activeSteps.add(
        () async => TimelinePage(
          items: [buildEvent(id: 'continued')],
          nextCursor: cursor,
          hasMore: true,
        ),
      );
      final container = timelineContainer(repository);
      final provider = timelineProvider(container);
      final subscription = container.listen(provider, (_, _) {});
      addTearDown(subscription.close);
      reads.active.complete(
        TimelinePage(
          items: [buildEvent(id: 'initial-active')],
          nextCursor: cursor,
          hasMore: true,
        ),
      );
      await container.read(provider.future);
      await container.read(provider.notifier).loadMoreActive();
      reads.completeHistory();
      final result = await settledTimeline(container, provider);
      expect(result.activeEvents.map((e) => e.id), [
        'initial-active',
        'continued',
      ]);
      expect(result.activeCursor, same(cursor));
      expect(result.hasMoreActive, isTrue);
      expect(repository.activeStartAfterCalls, [null, cursor]);
    },
  );

  for (final oldFails in [false, true]) {
    test('old initial Upcoming is fenced after account switch '
        ' fails=$oldFails', () async {
      final old = PendingTimelineReads('old');
      final fresh = PendingTimelineReads('fresh');
      final repository = timelineRepositoryFor([old, fresh]);
      final setups = ControlledSetupRepository([old, fresh]);
      final container = timelineContainer(repository, setups: setups);
      var provider = timelineProvider(container);
      var subscription = container.listen(provider, (_, _) {});
      addTearDown(() => subscription.close());
      container.updateOverrides([
        uidProvider.overrideWithValue(const AsyncData('account-b')),
        eventRepositoryProvider.overrideWithValue(repository),
        privateEventSetupTimelineRepositoryProvider.overrideWithValue(setups),
      ]);
      await container.pump();
      provider = timelineProvider(container);
      subscription.close();
      subscription = container.listen(provider, (_, _) {});
      fresh.completeUpcoming();
      fresh.completeHistory();
      await settledTimeline(container, provider);
      old.completeUpcoming(
        failures: oldFails
            ? {
                TimelineSource.active: StateError('old active'),
                TimelineSource.privateUpcoming: StateError('old upcoming'),
              }
            : const {},
      );
      old.completeHistory();
      await flushTimeline();
      expect(
        container.read(provider).requireValue.activeEvents.single.id,
        'fresh-active',
      );
    });
  }

  for (final transition in ['refresh', 'account', 'dispose']) {
    for (final oldFails in [false, true]) {
      test('continuation stops after $transition fails=$oldFails', () async {
        final cursor = await timelineEventCursor('old-active-cursor');
        final pending = Completer<TimelinePage>();
        final old = PendingTimelineReads('old');
        final fresh = PendingTimelineReads('fresh');
        final repository = PagedEventRepository(
          activeSteps: [
            () => old.active.future,
            () => pending.future,
            () => fresh.active.future,
          ],
          pastSteps: [() => old.past.future, () => fresh.past.future],
          cancelledSteps: [
            () => old.cancelled.future,
            () => fresh.cancelled.future,
          ],
        );
        final setups = ControlledSetupRepository([old, fresh]);
        final container = timelineContainer(repository, setups: setups);
        var provider = timelineProvider(container);
        var subscription = container.listen(provider, (_, _) {});
        addTearDown(() => subscription.close());
        old.active.complete(
          TimelinePage(
            items: [buildEvent(id: 'old-active')],
            nextCursor: cursor,
            hasMore: true,
          ),
        );
        old.completePrivate(PrivateEventSetupScope.upcoming, null);
        old.completeHistory();
        await settledTimeline(container, provider);
        final continuation = container.read(provider.notifier).loadMoreActive();
        if (transition == 'dispose') {
          subscription.close();
          await container.pump();
        } else {
          if (transition == 'account') {
            container.updateOverrides([
              uidProvider.overrideWithValue(const AsyncData('account-b')),
              eventRepositoryProvider.overrideWithValue(repository),
              privateEventSetupTimelineRepositoryProvider.overrideWithValue(
                setups,
              ),
            ]);
            provider = timelineProvider(container);
            subscription.close();
            subscription = container.listen(provider, (_, _) {});
          } else {
            container.invalidate(provider);
          }
          fresh.completeUpcoming();
          fresh.completeHistory();
          await settledTimeline(container, provider);
        }
        completeTimelineRead(
          pending,
          TimelinePage(items: [buildEvent(id: 'obsolete')], hasMore: false),
          oldFails ? StateError('obsolete') : null,
        );
        await continuation;
        expect(
          setups.calls.where((call) => call.$2 != null),
          isEmpty,
          reason: 'A stale continuation must not start the next private read',
        );
        if (transition != 'dispose') {
          final result = container.read(provider).requireValue;
          expect(result.activeEvents.single.id, 'fresh-active');
          expect(result.activeLoadMoreError, isNull);
        }
      });
    }
  }

  for (final historyFirst in [false, true]) {
    test(
      'Upcoming is independent of history; historyFirst=$historyFirst',
      () async {
        final reads = PendingTimelineReads('initial');
        final repository = timelineRepositoryFor([reads]);
        final setups = ControlledSetupRepository([reads]);
        final container = timelineContainer(repository, setups: setups);
        final provider = timelineProvider(container);
        final subscription = container.listen(provider, (_, _) {});
        addTearDown(subscription.close);
        // All six reads start before any answer is available.
        expect(repository.activeStartAfterCalls, [null]);
        expect(repository.pastStartAfterCalls, [null]);
        expect(repository.cancelledStartAfterCalls, [null]);
        expect(
          setups.calls.map((call) => call.$1),
          PrivateEventSetupScope.values,
        );
        if (historyFirst) {
          reads.completeHistory();
          await flushTimeline();
          expect(container.read(provider).isLoading, isTrue);
        }
        reads.completeUpcoming();
        final upcoming = await container.read(provider.future);
        expect(upcoming.activeEvents.single.id, 'initial-active');
        expect(upcoming.unpublishedUpcoming.single.eventId, 'initial-upcoming');
        expect(upcoming.loadingMorePast, isTrue);
        expect(upcoming.historyInitialized, isFalse);
        expect(upcoming.canLoadMorePast, isFalse);
        if (!historyFirst) {
          final notifier = container.read(provider.notifier);
          await Future.wait([notifier.loadMorePast(), notifier.retryPast()]);
          expect(repository.pastStartAfterCalls, [null]);
          expect(setups.calls, hasLength(3));
          reads.completeHistory();
        }
        final result = await settledTimeline(container, provider);
        expect(result.pastEvents.single.id, 'initial-past');
        expect(result.cancelledEvents.single.id, 'initial-cancelled');
        expect(result.unpublishedHistory.map((event) => event.eventId), [
          'initial-past',
          'initial-cancelled',
        ]);
        expect(result.loadingMorePast, isFalse);
        expect(result.historyInitialized, isTrue);
      },
    );
  }

  for (final source in TimelineSource.values) {
    for (final historyFirst in [false, true]) {
      test(
        'initial $source failure stays truthful; historyFirst=$historyFirst',
        () async {
          final reads = PendingTimelineReads('initial');
          final error = StateError(source.name);
          final container = timelineContainer(
            timelineRepositoryFor([reads]),
            setups: ControlledSetupRepository([reads]),
          );
          final provider = timelineProvider(container);
          final subscription = container.listen(provider, (_, _) {});
          addTearDown(subscription.close);
          if (historyFirst) {
            reads.completeHistory(failure: source, error: error);
            await flushTimeline();
            expect(container.read(provider).isLoading, isTrue);
          }
          reads.completeUpcoming(failure: source, error: error);
          if (source == TimelineSource.active ||
              source == TimelineSource.privateUpcoming) {
            await expectLater(
              container.read(provider.future),
              throwsA(same(error)),
            );
          } else {
            final first = await container.read(provider.future);
            expect(first.loadingMorePast, isTrue);
          }
          if (!historyFirst) {
            reads.completeHistory(failure: source, error: error);
          }
          await flushTimeline();
          final result = container.read(provider);
          if (source == TimelineSource.past ||
              source == TimelineSource.cancelled) {
            final data = result.requireValue;
            expect(data.pastError, same(error));
            expect(data.historyInitialized, isFalse);
            expect(data.loadingMorePast, isFalse);
            expect(data.activeEvents.single.id, 'initial-active');
            expect(data.unpublishedHistory, hasLength(2));
            if (source == TimelineSource.cancelled) {
              expect(data.pastEvents.single.id, 'initial-past');
            } else {
              expect(data.cancelledEvents.single.id, 'initial-cancelled');
            }
          } else {
            expect(result.error, same(error));
            expect(result.asData, isNull);
          }
        },
      );
    }
  }

  for (final firstFailure in TimelineSource.values) {
    test(
      'simultaneous failures use stable precedence from $firstFailure',
      () async {
        final reads = PendingTimelineReads('initial');
        final container = timelineContainer(
          timelineRepositoryFor([reads]),
          setups: ControlledSetupRepository([reads]),
        );
        final provider = timelineProvider(container);
        final subscription = container.listen(provider, (_, _) {});
        addTearDown(subscription.close);
        final failures = {
          for (final source in TimelineSource.values.skip(firstFailure.index))
            source: StateError(source.name),
        };
        // Complete in reverse precedence so response timing cannot choose errors.
        reads.completeHistory(failures: failures, reverse: true);
        reads.completeUpcoming(failures: failures);
        if (firstFailure.index <= TimelineSource.privateUpcoming.index) {
          await expectLater(
            container.read(provider.future),
            throwsA(same(failures[firstFailure])),
          );
        } else {
          await container.read(provider.future);
        }
        await flushTimeline();
        final result = container.read(provider);
        expect(
          result.hasError ? result.error : result.requireValue.pastError,
          same(failures[firstFailure]),
        );
      },
    );
  }

  for (final transition in [
    'refresh',
    'account',
    'signout',
    'reopen',
    'organizer',
  ]) {
    for (final oldFails in [false, true]) {
      test('late history is fenced: $transition fails=$oldFails', () async {
        final old = PendingTimelineReads('old');
        final fresh = PendingTimelineReads('fresh');
        final repository = timelineRepositoryFor([old, fresh]);
        final setups = ControlledSetupRepository([old, fresh]);
        final container = timelineContainer(repository, setups: setups);
        var provider = timelineProvider(container);
        var subscription = container.listen(provider, (_, _) {});
        addTearDown(() => subscription.close());
        old.completeUpcoming();
        await container.read(provider.future);
        if (transition == 'refresh') {
          container.invalidate(provider);
        } else if (transition == 'account' || transition == 'signout') {
          container.updateOverrides([
            uidProvider.overrideWithValue(
              AsyncData<String?>(transition == 'signout' ? null : 'account-b'),
            ),
            eventRepositoryProvider.overrideWithValue(repository),
            privateEventSetupTimelineRepositoryProvider.overrideWithValue(
              setups,
            ),
          ]);
          await container.pump();
          provider = timelineProvider(container);
          subscription.close();
          subscription = container.listen(provider, (_, _) {});
          await container.pump();
          expect(
            container.read(provider).hasValue,
            isFalse,
            reason: 'Old account rows must disappear before new reads resolve',
          );
          if (transition == 'signout') {
            expect(container.read(provider).hasError, isTrue);
            expect(repository.activeStartAfterCalls, hasLength(1));
            container.updateOverrides([
              uidProvider.overrideWithValue(const AsyncData('account-a')),
              eventRepositoryProvider.overrideWithValue(repository),
              privateEventSetupTimelineRepositoryProvider.overrideWithValue(
                setups,
              ),
            ]);
            provider = timelineProvider(container);
            subscription.close();
            subscription = container.listen(provider, (_, _) {});
          }
        } else {
          subscription.close();
          await container.pump();
          if (transition == 'organizer') {
            provider = timelineProvider(container, 'club-2');
          }
          subscription = container.listen(provider, (_, _) {});
        }
        final current = container.read(provider);
        if (transition == 'refresh') {
          expect(
            current.hasValue,
            isTrue,
            reason: 'Same-session refresh retains usable rows',
          );
        }
        fresh.completeUpcoming();
        fresh.completeHistory();
        final result = await settledTimeline(container, provider);
        expect(result.activeEvents.single.id, 'fresh-active');
        // Old history finishes only after the replacement is fully usable.
        old.completeHistory(
          failures: oldFails
              ? {
                  TimelineSource.privatePast: StateError('old private history'),
                  TimelineSource.privateCancelled: StateError(
                    'old private cancelled',
                  ),
                  TimelineSource.past: StateError('old past'),
                  TimelineSource.cancelled: StateError('old cancelled'),
                }
              : const {},
        );
        await flushTimeline();
        final finalState = container.read(provider).requireValue;
        expect(finalState.activeEvents.single.id, 'fresh-active');
        expect(finalState.pastEvents.single.id, 'fresh-past');
        expect(finalState.cancelledEvents.single.id, 'fresh-cancelled');
        expect(finalState.pastError, isNull);
        expect(finalState.pastCursor, isNull);
        expect(
          finalState.unpublishedCursors.values,
          everyElement(startsWith('fresh-')),
        );
        expect(setups.calls, hasLength(6));
      });
    }
  }

  test(
    'auth loading clears rows and starts no reads until authentication resolves',
    () async {
      final old = PendingTimelineReads('old');
      final fresh = PendingTimelineReads('fresh');
      final repository = timelineRepositoryFor([old, fresh]);
      final container = timelineContainer(repository);
      var provider = timelineProvider(container);
      var subscription = container.listen(provider, (_, _) {});
      addTearDown(() => subscription.close());
      old.completeUpcoming();
      old.completeHistory();
      await settledTimeline(container, provider);
      container.updateOverrides([
        uidProvider.overrideWithValue(const AsyncLoading<String?>()),
        eventRepositoryProvider.overrideWithValue(repository),
        privateEventSetupTimelineRepositoryProvider.overrideWithValue(
          emptySetupRepository,
        ),
      ]);
      await container.pump();
      provider = timelineProvider(container);
      subscription.close();
      subscription = container.listen(provider, (_, _) {});
      expect(container.read(provider).isLoading, isTrue);
      expect(container.read(provider).hasValue, isFalse);
      expect(repository.activeStartAfterCalls, hasLength(1));
      container.updateOverrides([
        uidProvider.overrideWithValue(const AsyncData('account-a')),
        eventRepositoryProvider.overrideWithValue(repository),
        privateEventSetupTimelineRepositoryProvider.overrideWithValue(
          emptySetupRepository,
        ),
      ]);
      provider = timelineProvider(container);
      subscription.close();
      subscription = container.listen(provider, (_, _) {});
      fresh.completeUpcoming();
      fresh.completeHistory();
      expect(
        (await settledTimeline(container, provider)).activeEvents.single.id,
        'fresh-active',
      );
    },
  );
}
