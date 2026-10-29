import 'dart:async';

import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/host_attendance_outbox.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/insights/data/host_attention_repository.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_attention_item.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_feed_controller.dart';
import 'package:catch_dating_app/platform/firebase/cursor_page.dart';
import 'package:catch_dating_app/platform/firebase/read_limit_policy.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../events/events_test_helpers.dart';

typedef _EventPage = CursorPage<Event, DocumentSnapshot<Event>>;

void main() {
  test(
    'Today fetches its bounded feed without the Events controller',
    () async {
      final boundary = DateTime(2026, 9, 1, 12);
      final active = buildEvent(
        id: 'active',
        startTime: boundary.add(const Duration(hours: 2)),
        endTime: boundary.add(const Duration(hours: 4)),
      );
      final past = buildEvent(
        id: 'past',
        startTime: boundary.subtract(const Duration(hours: 2)),
        endTime: boundary.subtract(const Duration(hours: 1)),
      );
      final repository = _TodayEventRepository(
        activePage: _EventPage(items: [active], hasMore: false),
        pastPage: _EventPage(items: [past], hasMore: false),
      );
      final attention = _FakeAttentionRepository(_projection(boundary));
      final container = _container(events: repository, attention: attention);
      addTearDown(container.dispose);
      final request = HostTodayFeedRequest(
        organizerId: 'organizer-1',
        accountId: 'host-1',
        sessionBoundary: boundary,
      );

      final result = await _settledFeed(container, request);

      expect(result.activeEvents, [active]);
      expect(result.pastEvents, [past]);
      expect(result.localAttendanceMerged, isTrue);
      expect(
        result.attentionCoverage,
        hasLength(HostAttentionKind.values.length),
      );
      expect(repository.activeRequests, 1);
      expect(repository.pastRequests, 1);
      expect(attention.organizerIds, ['organizer-1']);
    },
  );

  test('Today remains available when optional history fails', () async {
    final boundary = DateTime(2026, 9, 1, 12);
    final active = buildEvent(
      id: 'active',
      startTime: boundary.add(const Duration(hours: 2)),
      endTime: boundary.add(const Duration(hours: 4)),
    );
    final repository = _TodayEventRepository(
      activePage: _EventPage(items: [active], hasMore: false),
      pastError: StateError('history unavailable'),
    );
    final container = _container(
      events: repository,
      attention: _FakeAttentionRepository(_projection(boundary)),
    );
    addTearDown(container.dispose);

    final result = await _settledFeed(
      container,
      HostTodayFeedRequest(
        organizerId: 'organizer-1',
        accountId: 'host-1',
        sessionBoundary: boundary,
      ),
    );

    expect(result.activeEvents, [active]);
    expect(result.pastEvents, isEmpty);
    expect(result.attentionIssues, isEmpty);
    expect(result.historyError, same(repository.pastError));
    expect(result.historyStackTrace, isNotNull);
  });

  test('Today merges server tasks with the local attendance outbox', () async {
    final boundary = DateTime(2026, 9, 1, 12);
    final active = buildEvent(
      startTime: boundary.add(const Duration(hours: 2)),
      endTime: boundary.add(const Duration(hours: 4)),
    );
    final projection = _projection(
      boundary,
      items: [_serverAttentionItem(boundary)],
    );
    final store = _MemoryOutboxStore()
      ..entries = [
        HostAttendanceOutboxEntry(
          eventId: active.id,
          attendeeId: 'attendee-1',
          desiredCheckedIn: true,
          expectedRevision: 3,
          clientOperationId: 'operation-1',
          createdAt: boundary.subtract(const Duration(hours: 1)),
          status: HostAttendanceOutboxStatus.needsReview,
          lastErrorCode: 'aborted',
        ),
      ];
    final container = _container(
      events: _TodayEventRepository(
        activePage: _EventPage(items: [active], hasMore: false),
      ),
      attention: _FakeAttentionRepository(projection),
      store: store,
    );
    addTearDown(container.dispose);

    final result = await _settledFeed(
      container,
      HostTodayFeedRequest(
        organizerId: 'organizer-1',
        accountId: 'host-1',
        sessionBoundary: boundary,
      ),
    );

    expect(result.attentionItems.map((item) => item.kind), [
      HostAttentionKind.attendanceSync,
      HostAttentionKind.eventWaitlistReview,
    ]);
    final local = result.attentionItems.first;
    expect(local.context.eventName, active.title);
    expect(local.destination.eventId, active.id);
    expect(local.policyVersion, projection.policyVersion);
    expect(result.localAttendanceMerged, isTrue);
    expect(result.attentionIssues, isEmpty);
  });

  test(
    'Today exposes incomplete attention sources without dropping events',
    () async {
      final boundary = DateTime(2026, 9, 1, 12);
      final active = buildEvent(
        id: 'active',
        startTime: boundary.add(const Duration(hours: 2)),
        endTime: boundary.add(const Duration(hours: 4)),
      );
      final container = _container(
        events: _TodayEventRepository(
          activePage: _EventPage(items: [active], hasMore: false),
        ),
        attention: _ThrowingAttentionRepository(),
        store: _ThrowingOutboxStore(),
      );
      addTearDown(container.dispose);

      final result = await _settledFeed(
        container,
        HostTodayFeedRequest(
          organizerId: 'organizer-1',
          accountId: 'host-1',
          sessionBoundary: boundary,
        ),
      );

      expect(result.activeEvents, [active]);
      expect(result.attentionItems, isEmpty);
      expect(result.localAttendanceMerged, isFalse);
      expect(result.attentionIssues.map((issue) => issue.source).toSet(), {
        HostTodayAttentionIssueSource.serverProjection,
        HostTodayAttentionIssueSource.attendanceOutbox,
      });
    },
  );
}

Future<HostTodayFeedData> _settledFeed(
  ProviderContainer container,
  HostTodayFeedRequest request,
) async {
  final provider = hostTodayFeedControllerProvider(request);
  final settled = Completer<HostTodayFeedData>();
  final subscription = container.listen(provider, (_, next) {
    final data = next.asData?.value;
    if (data != null && !data.hasPendingSources && !settled.isCompleted) {
      settled.complete(data);
    }
  }, fireImmediately: true);
  addTearDown(subscription.close);
  final initial = await container.read(provider.future);
  expect(initial.activeEvents, isNotEmpty);
  return settled.future;
}

ProviderContainer _container({
  required EventRepository events,
  required HostAttentionRepository attention,
  HostAttendanceOutboxStore? store,
}) => ProviderContainer(
  overrides: [
    eventRepositoryProvider.overrideWithValue(events),
    hostAttentionRepositoryProvider.overrideWithValue(attention),
    hostAttendanceOutboxProvider.overrideWithValue(
      HostAttendanceOutbox(
        store ?? _MemoryOutboxStore(),
        _NoopAttendanceMutator(),
      ),
    ),
  ],
);

class _TodayEventRepository extends Fake implements EventRepository {
  _TodayEventRepository({
    required this.activePage,
    this.pastPage = const _EventPage(items: [], hasMore: false),
    this.pastError,
  });

  final _EventPage activePage;
  final _EventPage pastPage;
  final Object? pastError;
  int activeRequests = 0;
  int pastRequests = 0;

  @override
  Future<_EventPage> fetchActiveEventsPage({
    required String organizerId,
    required DateTime sessionBoundary,
    DocumentSnapshot<Event>? startAfter,
    int limit = ReadLimitPolicy.directoryPage,
  }) async {
    activeRequests += 1;
    return activePage;
  }

  @override
  Future<_EventPage> fetchPastEventsPage({
    required String organizerId,
    required DateTime sessionBoundary,
    DocumentSnapshot<Event>? startAfter,
    int limit = ReadLimitPolicy.directoryPage,
  }) async {
    pastRequests += 1;
    final error = pastError;
    if (error != null) throw error;
    return pastPage;
  }
}

class _FakeAttentionRepository implements HostAttentionRepository {
  _FakeAttentionRepository(this.projection);

  final HostAttentionProjection projection;
  final List<String> organizerIds = [];

  @override
  Future<HostAttentionProjection> fetch(String organizerId) async {
    organizerIds.add(organizerId);
    return projection;
  }
}

class _ThrowingAttentionRepository implements HostAttentionRepository {
  @override
  Future<HostAttentionProjection> fetch(String organizerId) async {
    throw StateError('attention unavailable');
  }
}

class _MemoryOutboxStore extends Fake implements HostAttendanceOutboxStore {
  List<HostAttendanceOutboxEntry> entries = [];
  @override
  Future<List<HostAttendanceOutboxEntry>> load(
    String accountId, {
    String? scope,
    DateTime? now,
  }) async => List.of(entries);
}

class _ThrowingOutboxStore extends Fake implements HostAttendanceOutboxStore {
  @override
  Future<List<HostAttendanceOutboxEntry>> load(
    String accountId, {
    String? scope,
    DateTime? now,
  }) async => throw StateError('outbox unavailable');
}

class _NoopAttendanceMutator implements HostAttendanceMutator {
  @override
  Future<EventAttendeeAttendanceResult> setAttendance({
    required String eventId,
    required String attendeeId,
    required bool desiredCheckedIn,
    required int expectedRevision,
    required String clientOperationId,
  }) => throw UnimplementedError();
}

HostAttentionProjection _projection(
  DateTime now, {
  List<HostAttentionItem> items = const [],
}) => HostAttentionProjection(
  organizerId: 'organizer-1',
  policyVersion: 1,
  generatedAt: now,
  horizonEndsAt: now.add(const Duration(days: 7)),
  items: items,
  coverage: [
    for (final kind in HostAttentionKind.values)
      HostAttentionCoverage(
        kind: kind,
        state: switch (kind) {
          HostAttentionKind.attendanceSync =>
            HostAttentionCoverageState.clientMergeRequired,
          HostAttentionKind.dressRehearsal =>
            HostAttentionCoverageState.shortcutOnly,
          HostAttentionKind.eventSuccessPreparation ||
          HostAttentionKind.roomLayoutSetup ||
          HostAttentionKind.eventStaffing ||
          HostAttentionKind.formResponseReview ||
          HostAttentionKind.inboxReply ||
          HostAttentionKind.postEventReconciliation =>
            HostAttentionCoverageState.blockedMissingTruth,
          _ => HostAttentionCoverageState.complete,
        },
        reason: 'Fixture coverage for ${kind.name}.',
      ),
  ],
);

HostAttentionItem _serverAttentionItem(DateTime now) => HostAttentionItem(
  id: 'attention-waitlist',
  kind: HostAttentionKind.eventWaitlistReview,
  scope: HostAttentionScope.event,
  sourceOwner: HostAttentionSourceOwner.events,
  sourceId: 'event-1',
  sourceRevision: 'revision-1',
  eventId: 'event-1',
  status: HostAttentionStatus.open,
  consequence: HostAttentionConsequence.risksGuestExperience,
  blocking: false,
  urgency: HostAttentionUrgency.immediate,
  destination: const HostAttentionDestination(
    route: HostAttentionDestinationRoute.hostEventManage,
    section: 'guests',
    eventId: 'event-1',
  ),
  context: const HostAttentionContext(eventName: 'Sunday Run', count: 3),
  dedupeKey: 'eventWaitlistReview:event-1',
  policyVersion: 1,
  resolutionVersion: 1,
  assignedHostUid: null,
  openedAt: now,
  dueAt: now.add(const Duration(hours: 1)),
  expiresAt: now.add(const Duration(hours: 4)),
);
