import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_events_timeline_controller.dart';
import 'package:catch_platform/firebase/cursor_page.dart';
import 'package:catch_platform/firebase/firestore_converters.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';
import 'package:catch_test_support/events_test_helpers.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

typedef TimelinePage = CursorPage<Event, PageCursor<Event>>;
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

ProviderContainer timelineContainer(EventRepository repository) {
  final container = ProviderContainer(
    overrides: [
      uidProvider.overrideWithValue(const AsyncData('account-a')),
      eventRepositoryProvider.overrideWithValue(repository),
    ],
  );
  addTearDown(container.dispose);
  return container;
}

Future<PageCursor<Event>> timelineEventCursor(String id) async {
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
  return PageCursor.after(await reference.get());
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
  final List<PageCursor<Event>?> cancelledStartAfterCalls = [];
  final List<PageCursor<Event>?> activeStartAfterCalls = [];
  final List<PageCursor<Event>?> pastStartAfterCalls = [];

  @override
  Future<TimelinePage> fetchActiveEventsPage({
    required String organizerId,
    required DateTime sessionBoundary,
    PageCursor<Event>? startAfter,
    int limit = ReadLimitPolicy.directoryPage,
  }) {
    activeStartAfterCalls.add(startAfter);
    return activeSteps.removeAt(0)();
  }

  @override
  Future<TimelinePage> fetchPastEventsPage({
    required String organizerId,
    required DateTime sessionBoundary,
    PageCursor<Event>? startAfter,
    int limit = ReadLimitPolicy.directoryPage,
  }) {
    pastStartAfterCalls.add(startAfter);
    return pastSteps.removeAt(0)();
  }

  @override
  Future<TimelinePage> fetchCancelledEventsPage({
    required String organizerId,
    PageCursor<Event>? startAfter,
    int limit = ReadLimitPolicy.directoryPage,
  }) {
    cancelledStartAfterCalls.add(startAfter);
    return cancelledSteps.isEmpty
        ? Future.value(const TimelinePage(items: [], hasMore: false))
        : cancelledSteps.removeAt(0)();
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

enum TimelineSource { active, past, cancelled }

class PendingTimelineReads {
  PendingTimelineReads(this.prefix);
  final String prefix;
  final active = Completer<TimelinePage>();
  final past = Completer<TimelinePage>();
  final cancelled = Completer<TimelinePage>();

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
  }

  void completeHistory({
    TimelineSource? failure,
    Object? error,
    Map<TimelineSource, Object> failures = const {},
    bool reverse = false,
  }) {
    final errors = {...failures, ?failure: error!};
    final completions = [
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
