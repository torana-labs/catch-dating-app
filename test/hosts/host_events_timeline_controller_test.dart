import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_events_timeline_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';
import 'support/host_events_timeline_test_support.dart';

void main() {
  for (final pastFinishesFirst in [false, true]) {
    for (final pastFails in [false, true]) {
      test('independent page responses preserve sibling state '
          'pastFirst=$pastFinishesFirst pastFails=$pastFails', () async {
        final activeCursor = await timelineEventCursor('active-cursor');
        final pastCursor = await timelineEventCursor('past-cursor');
        final activeResponse = Completer<TimelinePage>();
        final pastResponse = Completer<TimelinePage>();
        final repository = PagedEventRepository(
          activeSteps: [
            () async => TimelinePage(
              items: [buildEvent(id: 'a1')],
              nextCursor: activeCursor,
              hasMore: true,
            ),
            () => activeResponse.future,
          ],
          pastSteps: [
            () async => TimelinePage(
              items: [buildEvent(id: 'p1')],
              nextCursor: pastCursor,
              hasMore: true,
            ),
            () => pastResponse.future,
          ],
        );
        final container = timelineContainer(repository);
        final provider = hostEventsTimelineControllerProvider(
          HostEventsTimelineRequest(
            session: container.read(authenticatedSessionProvider).asData?.value,
            organizerId: 'club-1',
            sessionBoundary: DateTime(2026, 9, 4),
          ),
        );
        final subscription = container.listen(provider, (_, _) {});
        addTearDown(subscription.close);
        await settledTimeline(container, provider);
        final notifier = container.read(provider.notifier);
        final active = notifier.loadMoreActive();
        final past = notifier.loadMorePast();
        expect(container.read(provider).requireValue.loadingMoreActive, isTrue);
        expect(container.read(provider).requireValue.loadingMorePast, isTrue);
        void completeActive() => activeResponse.complete(
          TimelinePage(items: [buildEvent(id: 'a2')], hasMore: false),
        );
        void completePast() {
          if (pastFails) {
            pastResponse.completeError(StateError('past unavailable'));
          } else {
            pastResponse.complete(
              TimelinePage(items: [buildEvent(id: 'p2')], hasMore: false),
            );
          }
        }

        if (pastFinishesFirst) {
          completePast();
          await past;
          expect(
            container.read(provider).requireValue.loadingMoreActive,
            isTrue,
          );
          completeActive();
          await active;
        } else {
          completeActive();
          await active;
          expect(container.read(provider).requireValue.loadingMorePast, isTrue);
          completePast();
          await past;
        }
        final result = container.read(provider).requireValue;
        expect(result.activeEvents.map((event) => event.id), ['a1', 'a2']);
        expect(
          result.pastEvents.map((event) => event.id),
          pastFails ? ['p1'] : ['p1', 'p2'],
        );
        expect(result.loadingMoreActive, isFalse);
        expect(result.loadingMorePast, isFalse);
        expect(result.hasMoreActive, isFalse);
        expect(result.pastError, pastFails ? isA<StateError>() : isNull);
      });
    }
  }

  test('a refresh ignores an old in-flight page response', () async {
    final cursor = await timelineEventCursor('old-cursor');
    final obsolete = Completer<TimelinePage>();
    final repository = PagedEventRepository(
      activeSteps: [
        () async => TimelinePage(
          items: [buildEvent(id: 'old')],
          nextCursor: cursor,
          hasMore: true,
        ),
        () => obsolete.future,
        () async =>
            TimelinePage(items: [buildEvent(id: 'fresh')], hasMore: false),
      ],
      pastSteps: [
        () async => const TimelinePage(items: [], hasMore: false),
        () async => const TimelinePage(items: [], hasMore: false),
      ],
    );
    final container = timelineContainer(repository);
    final provider = hostEventsTimelineControllerProvider(
      HostEventsTimelineRequest(
        session: container.read(authenticatedSessionProvider).asData?.value,
        organizerId: 'club-1',
        sessionBoundary: DateTime(2026, 9, 4),
      ),
    );
    final subscription = container.listen(provider, (_, _) {});
    addTearDown(subscription.close);
    await settledTimeline(container, provider);
    final pending = container.read(provider.notifier).loadMoreActive();
    container.invalidate(provider);
    await settledTimeline(container, provider);
    obsolete.complete(
      TimelinePage(items: [buildEvent(id: 'obsolete')], hasMore: false),
    );
    await pending;
    expect(
      container.read(provider).requireValue.activeEvents.map((e) => e.id),
      ['fresh'],
    );
  });

  test('appends and de-duplicates schedule and history pages', () async {
    final boundary = DateTime(2026, 8, 18, 12);
    final activeCursor = await timelineEventCursor('active-cursor');
    final pastCursor = await timelineEventCursor('past-cursor');
    final scheduleOne = buildEvent(
      id: 'schedule-1',
      startTime: boundary.add(const Duration(hours: 1)),
      endTime: boundary.add(const Duration(hours: 2)),
    );
    final scheduleTwo = buildEvent(
      id: 'schedule-2',
      startTime: boundary.add(const Duration(days: 1)),
      endTime: boundary.add(const Duration(days: 1, hours: 1)),
    );
    final historyOne = buildEvent(
      id: 'history-1',
      startTime: boundary.subtract(const Duration(hours: 2)),
      endTime: boundary.subtract(const Duration(hours: 1)),
    );
    final historyTwo = buildEvent(
      id: 'history-2',
      startTime: boundary.subtract(const Duration(days: 1, hours: 1)),
      endTime: boundary.subtract(const Duration(days: 1)),
    );
    final repository = PagedEventRepository(
      activeSteps: [
        () async => TimelinePage(
          items: [scheduleOne],
          nextCursor: activeCursor,
          hasMore: true,
        ),
        () async =>
            TimelinePage(items: [scheduleOne, scheduleTwo], hasMore: false),
      ],
      pastSteps: [
        () async => TimelinePage(
          items: [historyOne],
          nextCursor: pastCursor,
          hasMore: true,
        ),
        () async =>
            TimelinePage(items: [historyOne, historyTwo], hasMore: false),
      ],
    );
    final container = timelineContainer(repository);
    final request = HostEventsTimelineRequest(
      session: container.read(authenticatedSessionProvider).asData?.value,
      organizerId: 'club-1',
      sessionBoundary: boundary,
    );
    final provider = hostEventsTimelineControllerProvider(request);
    final subscription = container.listen(provider, (_, _) {});
    addTearDown(subscription.close);

    final initial = await settledTimeline(container, provider);
    expect(initial.activeEvents.map((event) => event.id), ['schedule-1']);
    expect(initial.pastEvents.map((event) => event.id), ['history-1']);

    await container.read(provider.notifier).loadMoreActive();
    await container.read(provider.notifier).loadMorePast();

    final accumulated = container.read(provider).requireValue;
    expect(accumulated.activeEvents.map((event) => event.id), [
      'schedule-1',
      'schedule-2',
    ]);
    expect(accumulated.pastEvents.map((event) => event.id), [
      'history-1',
      'history-2',
    ]);
    expect(accumulated.hasMoreActive, isFalse);
    expect(accumulated.hasMorePast, isFalse);
    expect(repository.activeStartAfterCalls, [null, activeCursor]);
    expect(repository.pastStartAfterCalls, [null, pastCursor]);
  });

  test(
    'preserves the schedule when history fails and retry recovers',
    () async {
      final boundary = DateTime(2026, 8, 18, 12);
      final schedule = buildEvent(
        id: 'schedule-1',
        startTime: boundary.add(const Duration(hours: 1)),
        endTime: boundary.add(const Duration(hours: 2)),
      );
      final history = buildEvent(
        id: 'history-1',
        startTime: boundary.subtract(const Duration(hours: 2)),
        endTime: boundary.subtract(const Duration(hours: 1)),
      );
      final repository = PagedEventRepository(
        activeSteps: [
          () async => TimelinePage(items: [schedule], hasMore: false),
        ],
        pastSteps: [
          () async => throw StateError('history unavailable'),
          () async => TimelinePage(items: [history], hasMore: false),
        ],
      );
      final container = timelineContainer(repository);
      final request = HostEventsTimelineRequest(
        session: container.read(authenticatedSessionProvider).asData?.value,
        organizerId: 'club-1',
        sessionBoundary: boundary,
      );
      final provider = hostEventsTimelineControllerProvider(request);
      final subscription = container.listen(provider, (_, _) {});
      addTearDown(subscription.close);

      final partial = await settledTimeline(container, provider);
      expect(partial.activeEvents.map((event) => event.id), ['schedule-1']);
      expect(partial.pastEvents, isEmpty);
      expect(partial.pastError, isA<StateError>());

      await container.read(provider.notifier).retryPast();

      final recovered = container.read(provider).requireValue;
      expect(recovered.activeEvents.map((event) => event.id), ['schedule-1']);
      expect(recovered.pastEvents.map((event) => event.id), ['history-1']);
      expect(recovered.pastError, isNull);
      expect(repository.pastStartAfterCalls, [null, null]);
    },
  );

  test(
    'suppresses a duplicate load-more request while one is active',
    () async {
      final boundary = DateTime(2026, 8, 18, 12);
      final activeCursor = await timelineEventCursor('active-cursor');
      final nextPage = Completer<TimelinePage>();
      final repository = PagedEventRepository(
        activeSteps: [
          () async => TimelinePage(
            items: [buildEvent(id: 'schedule-1')],
            nextCursor: activeCursor,
            hasMore: true,
          ),
          () => nextPage.future,
        ],
        pastSteps: [() async => const TimelinePage(items: [], hasMore: false)],
      );
      final container = timelineContainer(repository);
      final request = HostEventsTimelineRequest(
        session: container.read(authenticatedSessionProvider).asData?.value,
        organizerId: 'club-1',
        sessionBoundary: boundary,
      );
      final provider = hostEventsTimelineControllerProvider(request);
      final subscription = container.listen(provider, (_, _) {});
      addTearDown(subscription.close);
      await settledTimeline(container, provider);

      final notifier = container.read(provider.notifier);
      final first = notifier.loadMoreActive();
      final duplicate = notifier.loadMoreActive();

      expect(repository.activeStartAfterCalls, [null, activeCursor]);
      expect(container.read(provider).requireValue.loadingMoreActive, isTrue);
      nextPage.complete(const TimelinePage(items: [], hasMore: false));
      await Future.wait([first, duplicate]);
      expect(container.read(provider).requireValue.loadingMoreActive, isFalse);
    },
  );
  test(
    'cancelled-only continuation retry preserves every loaded page',
    () async {
      final firstCursor = await timelineEventCursor('cancelled-cursor-1');
      final secondCursor = await timelineEventCursor('cancelled-cursor-2');
      final repository = PagedEventRepository(
        activeSteps: [
          () async => const TimelinePage(items: [], hasMore: false),
        ],
        pastSteps: [() async => const TimelinePage(items: [], hasMore: false)],
        cancelledSteps: [
          () async => TimelinePage(
            items: [buildEvent(id: 'c1')],
            nextCursor: firstCursor,
            hasMore: true,
          ),
          () async => TimelinePage(
            items: [buildEvent(id: 'c2')],
            nextCursor: secondCursor,
            hasMore: true,
          ),
          () async => throw StateError('cancelled unavailable'),
          () async =>
              TimelinePage(items: [buildEvent(id: 'c3')], hasMore: false),
        ],
      );
      final container = timelineContainer(repository);
      final provider = hostEventsTimelineControllerProvider(
        HostEventsTimelineRequest(
          session: container.read(authenticatedSessionProvider).asData?.value,
          organizerId: 'club-1',
          sessionBoundary: DateTime(2026),
        ),
      );
      final subscription = container.listen(provider, (_, _) {});
      addTearDown(subscription.close);
      await settledTimeline(container, provider);
      final notifier = container.read(provider.notifier);
      await notifier.loadMorePast();
      await notifier.loadMorePast();
      expect(
        container.read(provider).requireValue.pastError,
        isA<StateError>(),
      );
      await notifier.retryPast();
      expect(
        container.read(provider).requireValue.cancelledEvents.map((e) => e.id),
        ['c1', 'c2', 'c3'],
      );
      expect(repository.cancelledStartAfterCalls, [
        null,
        firstCursor,
        secondCursor,
        secondCursor,
      ]);
      expect(repository.pastStartAfterCalls, [null]);
      expect(container.read(provider).requireValue.pastError, isNull);
    },
  );

  test(
    'cancelled bootstrap failure retains successfully loaded published history',
    () async {
      final repository = PagedEventRepository(
        activeSteps: [
          () async => const TimelinePage(items: [], hasMore: false),
        ],
        pastSteps: [
          () async =>
              TimelinePage(items: [buildEvent(id: 'past')], hasMore: false),
          () async =>
              TimelinePage(items: [buildEvent(id: 'past')], hasMore: false),
        ],
        cancelledSteps: [
          () async => throw StateError('cancelled unavailable'),
          () async => TimelinePage(
            items: [buildEvent(id: 'cancelled')],
            hasMore: false,
          ),
        ],
      );
      final container = timelineContainer(repository);
      final provider = hostEventsTimelineControllerProvider(
        HostEventsTimelineRequest(
          session: container.read(authenticatedSessionProvider).asData?.value,
          organizerId: 'club-1',
          sessionBoundary: DateTime(2026),
        ),
      );
      final subscription = container.listen(provider, (_, _) {});
      addTearDown(subscription.close);
      final initial = await settledTimeline(container, provider);
      expect(initial.pastEvents.single.id, 'past');
      expect(initial.historyInitialized, isFalse);
      await container.read(provider.notifier).retryPast();
      final result = container.read(provider).requireValue;
      expect(result.pastEvents.map((e) => e.id), ['past']);
      expect(result.cancelledEvents.single.id, 'cancelled');
      expect(result.historyInitialized, isTrue);
      expect(result.pastError, isNull);
    },
  );

  test(
    'unpublished scopes read bounded pages and continue beyond 200 rows',
    () async {
      final repository = PagedEventRepository(
        activeSteps: [
          () async => const TimelinePage(items: [], hasMore: false),
        ],
        pastSteps: [() async => const TimelinePage(items: [], hasMore: false)],
      );
      final setups = SetupRepository();
      final container = timelineContainer(repository, setups: setups);
      final provider = hostEventsTimelineControllerProvider(
        HostEventsTimelineRequest(
          session: container.read(authenticatedSessionProvider).asData?.value,
          organizerId: 'club-1',
          sessionBoundary: DateTime(2026),
        ),
      );
      final subscription = container.listen(provider, (_, _) {});
      addTearDown(subscription.close);
      final initial = await settledTimeline(container, provider);
      expect(setups.calls, [
        (PrivateEventSetupScope.upcoming, null),
        (PrivateEventSetupScope.past, null),
        (PrivateEventSetupScope.cancelled, null),
      ]);
      expect(initial.unpublishedUpcoming, hasLength(20));
      expect(initial.hasMoreUpcoming, isTrue);
      expect(initial.hasMoreHistory, isTrue);
      final notifier = container.read(provider.notifier);
      for (var page = 0; page < 10; page++) {
        await notifier.loadMoreActive();
        await notifier.loadMorePast();
      }
      final result = container.read(provider).requireValue;
      expect(result.unpublishedUpcoming, hasLength(201));
      expect(result.unpublishedHistory, hasLength(402));
      expect(result.unpublishedCursors, isEmpty);
      expect(result.hasMoreUpcoming, isFalse);
      expect(result.hasMoreHistory, isFalse);
      expect(setups.calls, hasLength(33));
      expect(repository.activeStartAfterCalls, [null]);
      expect(repository.pastStartAfterCalls, [null]);
    },
  );
}
