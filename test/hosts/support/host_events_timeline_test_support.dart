import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/core/data/cursor_page.dart';
import 'package:catch_dating_app/core/data/read_limit_policy.dart';
import 'package:catch_dating_app/core/firestore_converters.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_events_timeline_controller.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../events/events_test_helpers.dart';
import '../../test_pump_helpers.dart';

typedef TimelinePage = CursorPage<Event, DocumentSnapshot<Event>>;
typedef TimelinePageStep = Future<TimelinePage> Function();

Future<HostEventsTimelineData> settledTimeline(
  ProviderContainer container,
  HostEventsTimelineControllerProvider provider,
) async {
  await container.read(provider.future);
  final done = Completer<HostEventsTimelineData>();
  final subscription = container.listen(provider, (_, next) {
    if (next.hasError) {
      done.completeError(next.error!, next.stackTrace!);
    } else if (next.asData case final data? when !data.value.loadingMorePast) {
      done.complete(data.value);
    }
  }, fireImmediately: true);
  try {
    return await done.future;
  } finally {
    subscription.close();
  }
}

ProviderContainer timelineContainer(
  EventRepository repository, {
  PrivateEventSetupRepository? setups,
}) {
  final container = ProviderContainer(
    overrides: [
      uidProvider.overrideWithValue(const AsyncData('account-a')),
      eventRepositoryProvider.overrideWithValue(repository),
      privateEventSetupTimelineRepositoryProvider.overrideWithValue(
        setups ?? emptySetupRepository,
      ),
    ],
  );
  addTearDown(container.dispose);
  return container;
}

Future<DocumentSnapshot<Event>> timelineEventCursor(String id) async {
  final firestore = FakeFirebaseFirestore();
  final reference = firestore
      .collection('events')
      .withDocumentIdConverter<Event>(
        idField: 'id',
        fromJson: Event.fromJson,
        toJson: (event) => event.toJson(),
      )
      .doc(id);
  await reference.set(buildEvent(id: id));
  return reference.get();
}

class PagedEventRepository extends Fake implements EventRepository {
  PagedEventRepository({
    required this.activeSteps,
    required this.pastSteps,
    this.cancelledSteps = const [],
  });

  final List<TimelinePageStep> activeSteps;
  final List<TimelinePageStep> pastSteps;
  final List<TimelinePageStep> cancelledSteps;
  final List<DocumentSnapshot<Event>?> cancelledStartAfterCalls = [];
  final List<DocumentSnapshot<Event>?> activeStartAfterCalls = [];
  final List<DocumentSnapshot<Event>?> pastStartAfterCalls = [];

  @override
  Future<TimelinePage> fetchActiveEventsPage({
    required String organizerId,
    required DateTime sessionBoundary,
    DocumentSnapshot<Event>? startAfter,
    int limit = ReadLimitPolicy.directoryPage,
  }) {
    activeStartAfterCalls.add(startAfter);
    return activeSteps.removeAt(0)();
  }

  @override
  Future<TimelinePage> fetchPastEventsPage({
    required String organizerId,
    required DateTime sessionBoundary,
    DocumentSnapshot<Event>? startAfter,
    int limit = ReadLimitPolicy.directoryPage,
  }) {
    pastStartAfterCalls.add(startAfter);
    return pastSteps.removeAt(0)();
  }

  @override
  Future<TimelinePage> fetchCancelledEventsPage({
    required String organizerId,
    DocumentSnapshot<Event>? startAfter,
    int limit = ReadLimitPolicy.directoryPage,
  }) {
    cancelledStartAfterCalls.add(startAfter);
    return cancelledSteps.isEmpty
        ? Future.value(const TimelinePage(items: [], hasMore: false))
        : cancelledSteps.removeAt(0)();
  }
}

/// Stable instance so `updateOverrides` keeps the same empty inventory.
final emptySetupRepository = EmptySetupRepository();

class EmptySetupRepository extends Fake implements PrivateEventSetupRepository {
  @override
  Future<PrivateEventSetupInventoryPage> list({
    required String organizerId,
    PrivateEventSetupScope? scope,
    int limit = ReadLimitPolicy.privateEventSetupPage,
    String? cursor,
  }) async =>
      const PrivateEventSetupInventoryPage(events: [], nextCursor: null);
}

class SetupRepository extends Fake implements PrivateEventSetupRepository {
  final calls = <(PrivateEventSetupScope?, String?)>[];

  @override
  Future<PrivateEventSetupInventoryPage> list({
    required String organizerId,
    PrivateEventSetupScope? scope,
    int limit = ReadLimitPolicy.privateEventSetupPage,
    String? cursor,
  }) async {
    expect(limit, 20);
    calls.add((scope, cursor));
    final offset = cursor == null ? 0 : int.parse(cursor);
    final end = (offset + limit).clamp(0, 201);
    return PrivateEventSetupInventoryPage(
      events: [
        for (var i = offset; i < end; i++)
          PrivateEventSetupInventoryItem(
            eventId: '${scope!.name}-$i',
            name: 'Setup $i',
            city: const EventSetupCity(
              cityId: 'in-mh-mumbai',
              marketId: 'in-mh-mumbai',
            ),
            localDate: '2026-01-01',
            localStartTime: '19:00',
            timezone: 'Asia/Kolkata',
            startTimeMillis: DateTime(2026).millisecondsSinceEpoch,
            setupRevision: 1,
            detailsConfigured: false,
            status: scope == PrivateEventSetupScope.cancelled
                ? 'cancelled'
                : 'active',
          ),
      ],
      nextCursor: end < 201 ? '$end' : null,
    );
  }
}

HostEventsTimelineControllerProvider timelineProvider(
  ProviderContainer container, [
  String organizerId = 'club-1',
]) => hostEventsTimelineControllerProvider(
  HostEventsTimelineRequest(
    session: container.read(authenticatedSessionProvider).asData?.value,
    organizerId: organizerId,
    sessionBoundary: DateTime(2026),
  ),
);

// Drain queued provider publications through the shared deterministic helper.
Future<void> flushTimeline() => flushTestEventQueue();

enum TimelineSource {
  active,
  privateUpcoming,
  privatePast,
  privateCancelled,
  past,
  cancelled,
}

class PendingTimelineReads {
  PendingTimelineReads(this.prefix);
  final String prefix;
  final active = Completer<TimelinePage>();
  final past = Completer<TimelinePage>();
  final cancelled = Completer<TimelinePage>();
  final private = {
    for (final scope in PrivateEventSetupScope.values)
      scope: Completer<PrivateEventSetupInventoryPage>(),
  };

  void completeUpcoming({
    TimelineSource? failure,
    Object? error,
    Map<TimelineSource, Object> failures = const {},
  }) {
    final errors = {...failures, ?failure: error!};
    completeTimelineRead(
      active,
      TimelinePage(items: [buildEvent(id: '$prefix-active')], hasMore: false),
      errors[TimelineSource.active],
    );
    completePrivate(
      PrivateEventSetupScope.upcoming,
      errors[TimelineSource.privateUpcoming],
    );
  }

  void completeHistory({
    TimelineSource? failure,
    Object? error,
    Map<TimelineSource, Object> failures = const {},
    bool reverse = false,
  }) {
    final errors = {...failures, ?failure: error!};
    final completions = [
      () => completePrivate(
        PrivateEventSetupScope.past,
        errors[TimelineSource.privatePast],
      ),
      () => completePrivate(
        PrivateEventSetupScope.cancelled,
        errors[TimelineSource.privateCancelled],
      ),
      () => completeTimelineRead(
        past,
        TimelinePage(items: [buildEvent(id: '$prefix-past')], hasMore: false),
        errors[TimelineSource.past],
      ),
      () => completeTimelineRead(
        cancelled,
        TimelinePage(
          items: [buildEvent(id: '$prefix-cancelled')],
          hasMore: false,
        ),
        errors[TimelineSource.cancelled],
      ),
    ];
    for (final complete in reverse ? completions.reversed : completions) {
      complete();
    }
  }

  void completePrivate(PrivateEventSetupScope scope, Object? error) {
    completeTimelineRead(
      private[scope]!,
      PrivateEventSetupInventoryPage(
        events: [
          PrivateEventSetupInventoryItem(
            eventId: '$prefix-${scope.name}',
            name: 'Setup',
            city: const EventSetupCity(
              cityId: 'in-mh-mumbai',
              marketId: 'in-mh-mumbai',
            ),
            localDate: '2026-01-01',
            localStartTime: '19:00',
            timezone: 'Asia/Kolkata',
            startTimeMillis: DateTime(2026).millisecondsSinceEpoch,
            setupRevision: 1,
            detailsConfigured: false,
            status: scope == PrivateEventSetupScope.cancelled
                ? 'cancelled'
                : 'active',
          ),
        ],
        nextCursor: '$prefix-${scope.name}-cursor',
      ),
      error,
    );
  }
}

void completeTimelineRead<T>(Completer<T> completer, T value, Object? error) {
  if (error == null) {
    completer.complete(value);
  } else {
    completer.completeError(error, StackTrace.current);
  }
}

PagedEventRepository timelineRepositoryFor(List<PendingTimelineReads> reads) =>
    PagedEventRepository(
      activeSteps: [for (final read in reads) () => read.active.future],
      pastSteps: [for (final read in reads) () => read.past.future],
      cancelledSteps: [for (final read in reads) () => read.cancelled.future],
    );

class ControlledSetupRepository extends Fake
    implements PrivateEventSetupRepository {
  ControlledSetupRepository(List<PendingTimelineReads> reads)
    : steps = {
        for (final scope in PrivateEventSetupScope.values)
          scope: [for (final read in reads) read.private[scope]!.future],
      };
  final Map<
    PrivateEventSetupScope,
    List<Future<PrivateEventSetupInventoryPage>>
  >
  steps;
  final calls = <(PrivateEventSetupScope?, String?)>[];

  @override
  Future<PrivateEventSetupInventoryPage> list({
    required String organizerId,
    PrivateEventSetupScope? scope,
    int limit = ReadLimitPolicy.privateEventSetupPage,
    String? cursor,
  }) {
    expect(limit, 20);
    calls.add((scope, cursor));
    return steps[scope]!.removeAt(0);
  }
}
