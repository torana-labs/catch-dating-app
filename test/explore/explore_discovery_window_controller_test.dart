import 'dart:async';

import 'package:catch_dating_app/contexts/discovery/data/event_discovery_repository.dart';
import 'package:catch_dating_app/contexts/events/data/external_event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/external_event.dart';
import 'package:catch_dating_app/explore/presentation/explore_discovery_window_controller.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/platform/firebase/cursor_page.dart';
import 'package:catch_dating_app/platform/firebase/firestore_converters.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';

void main() {
  test(
    'loadNext accumulates the active query window without duplicates',
    () async {
      final now = DateTime(2026, 7, 18, 10);
      final firstEvent = buildEvent(
        startTime: now.add(const Duration(days: 1)),
      );
      final secondEvent = buildEvent(
        id: 'event-2',
        startTime: now.add(const Duration(days: 2)),
      );
      final cursorFirestore = FakeFirebaseFirestore();
      await cursorFirestore
          .collection('events')
          .doc('cursor')
          .set(firstEvent.toJson());
      final internalCursor = await cursorFirestore
          .collection('events')
          .withDocumentIdConverter<Event>(
            idField: 'id',
            fromJson: Event.fromJson,
            toJson: (event) => event.toJson(),
          )
          .doc('cursor')
          .get();
      final internalRepository = _PagedEventDiscoveryRepository(
        first: CursorPage(
          items: [firstEvent],
          nextCursor: internalCursor,
          hasMore: true,
        ),
        second: CursorPage(items: [firstEvent, secondEvent], hasMore: false),
      );
      final externalRepository = _PagedExternalEventRepository(
        CursorPage(items: [_externalEvent(now)], hasMore: false),
      );
      final container = ProviderContainer(
        overrides: [
          eventDiscoveryRepositoryProvider.overrideWithValue(
            internalRepository,
          ),
          externalEventRepositoryProvider.overrideWithValue(externalRepository),
        ],
      );
      addTearDown(container.dispose);

      final request = ExploreDiscoveryWindowRequest(
        internalQuery: EventDiscoveryQuery.forCity(
          marketId: 'in-mh-mumbai',
          startAt: now,
        ),
        externalQuery: ExternalEventDiscoveryQuery.forCity(
          citySlug: 'mumbai',
          startAt: now,
        ),
      );
      final provider = exploreDiscoveryWindowProvider(request);
      final subscription = container.listen(provider, (_, _) {});
      addTearDown(subscription.close);

      final first = await container.read(provider.future);
      expect(first.internalEvents.map((event) => event.id), ['event-1']);
      expect(first.externalEvents.map((event) => event.id), ['external-1']);
      expect(first.hasMore, isTrue);

      await container.read(provider.notifier).loadNext();

      final accumulated = container.read(provider).requireValue;
      expect(accumulated.internalEvents.map((event) => event.id), [
        'event-1',
        'event-2',
      ]);
      expect(accumulated.isExhaustive, isTrue);
      expect(internalRepository.startAfterCalls, [null, internalCursor]);
      expect(externalRepository.calls, 1);
    },
  );

  test('loadNext restores the current page and rethrows failures', () async {
    final now = DateTime(2026, 7, 18, 10);
    final firstEvent = buildEvent(startTime: now.add(const Duration(days: 1)));
    final cursorFirestore = FakeFirebaseFirestore();
    await cursorFirestore
        .collection('events')
        .doc('cursor')
        .set(firstEvent.toJson());
    final internalCursor = await cursorFirestore
        .collection('events')
        .withDocumentIdConverter<Event>(
          idField: 'id',
          fromJson: Event.fromJson,
          toJson: (event) => event.toJson(),
        )
        .doc('cursor')
        .get();
    final internalRepository = _PagedEventDiscoveryRepository(
      first: CursorPage(
        items: [firstEvent],
        nextCursor: internalCursor,
        hasMore: true,
      ),
      second: const CursorPage(items: [], hasMore: false),
      secondError: StateError('page failed'),
    );
    final container = ProviderContainer(
      overrides: [
        eventDiscoveryRepositoryProvider.overrideWithValue(internalRepository),
        externalEventRepositoryProvider.overrideWithValue(
          _PagedExternalEventRepository(
            const CursorPage(items: [], hasMore: false),
          ),
        ),
      ],
    );
    addTearDown(container.dispose);

    final request = ExploreDiscoveryWindowRequest(
      internalQuery: EventDiscoveryQuery.forCity(
        marketId: 'in-mh-mumbai',
        startAt: now,
      ),
      externalQuery: ExternalEventDiscoveryQuery.forCity(
        citySlug: 'mumbai',
        startAt: now,
      ),
    );
    final provider = exploreDiscoveryWindowProvider(request);
    final subscription = container.listen(provider, (_, _) {});
    addTearDown(subscription.close);
    await container.read(provider.future);

    await expectLater(
      container.read(provider.notifier).loadNext(),
      throwsA(isA<ParallelWaitError>()),
    );

    final restored = container.read(provider).requireValue;
    expect(restored.internalEvents.map((event) => event.id), ['event-1']);
    expect(restored.isLoadingMore, isFalse);
    expect(restored.hasMore, isTrue);
  });
}

class _PagedEventDiscoveryRepository extends Fake
    implements EventDiscoveryRepository {
  _PagedEventDiscoveryRepository({
    required this.first,
    required this.second,
    this.secondError,
  });

  final CursorPage<Event, DocumentSnapshot<Event>> first;
  final CursorPage<Event, DocumentSnapshot<Event>> second;
  final Object? secondError;
  final List<DocumentSnapshot<Event>?> startAfterCalls = [];

  @override
  Future<CursorPage<Event, DocumentSnapshot<Event>>>
  fetchDiscoverableEventsPage(
    EventDiscoveryQuery query, {
    DocumentSnapshot<Event>? startAfter,
  }) async {
    startAfterCalls.add(startAfter);
    final error = secondError;
    if (startAfter != null && error != null) throw error;
    return startAfter == null ? first : second;
  }
}

class _PagedExternalEventRepository extends Fake
    implements ExternalEventRepository {
  _PagedExternalEventRepository(this.page);

  final CursorPage<ExternalEvent, DocumentSnapshot<ExternalEvent>> page;
  int calls = 0;

  @override
  Future<CursorPage<ExternalEvent, DocumentSnapshot<ExternalEvent>>>
  fetchDiscoverableExternalEventsPage(
    ExternalEventDiscoveryQuery query, {
    DocumentSnapshot<ExternalEvent>? startAfter,
  }) async {
    calls += 1;
    return page;
  }
}

ExternalEvent _externalEvent(DateTime now) => ExternalEvent(
  id: 'external-1',
  canonicalHostId: 'host-1',
  compatibilityOrganizerId: 'club-1',
  title: 'External event',
  description: 'A reviewed external event.',
  startTime: now.add(const Duration(days: 1)),
  endTime: now.add(const Duration(days: 1, hours: 2)),
  meetingPoint: 'Bandra',
  activityKind: ActivityKind.openActivity,
  interactionModel: EventInteractionModel.freeFormMixer,
  status: 'active',
  publicationStatus: 'public',
  citySlug: 'mumbai',
  externalLinks: const [
    ExternalEventLink(
      platform: 'luma',
      url: 'https://luma.com/external-1',
      linkType: 'booking_or_event_page',
      sourceEventKey: 'external-1',
      candidateId: 'candidate-external-1',
      primary: true,
    ),
  ],
);
