import 'package:catch_dating_app/contexts/discovery/data/event_discovery_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/kernel/location_coordinate.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'events_test_helpers.dart';

void main() {
  group('EventDiscoveryQuery', () {
    test(
      'normalizes market and sorts activity filters for stable families',
      () {
        final now = DateTime(2026, 5, 26, 10);
        final left = EventDiscoveryQuery.forCity(
          marketId: ' IN-MH-MUMBAI ',
          startAt: now,
          activityKinds: const [ActivityKind.yoga, ActivityKind.running],
        );
        final right = EventDiscoveryQuery.forCity(
          marketId: 'in-mh-mumbai',
          startAt: now,
          activityKinds: const [ActivityKind.running, ActivityKind.yoga],
        );

        expect(left, right);
        expect(left.hashCode, right.hashCode);
        expect(left.marketId, 'in-mh-mumbai');
        expect(left.activityKinds, [ActivityKind.running, ActivityKind.yoga]);
      },
    );
  });

  group('EventDiscoveryRepository', () {
    test(
      'queries indexed discovery fields before exact distance post-filtering',
      () async {
        final firestore = FakeFirebaseFirestore();
        final repository = EventDiscoveryRepository(firestore);
        final now = DateTime(2026, 5, 26, 10);
        final matchingEvent = buildEvent(
          id: 'event-matching',
          organizerId: 'club-a',
          startTime: now.add(const Duration(days: 1)),
          startingPointLat: 19.001,
          startingPointLng: 72.001,
          eventFormat: EventFormatSnapshot.fromActivityKind(ActivityKind.yoga),
        );
        final farEvent = buildEvent(
          id: 'event-far',
          organizerId: 'club-a',
          startTime: now.add(const Duration(days: 1)),
          startingPointLat: 19.2,
          startingPointLng: 72.2,
          eventFormat: EventFormatSnapshot.fromActivityKind(ActivityKind.yoga),
        );
        final otherCityEvent = buildEvent(
          id: 'event-other-city',
          organizerId: 'club-b',
          startTime: now.add(const Duration(days: 1)),
          startingPointLat: 19.001,
          startingPointLng: 72.001,
          eventFormat: EventFormatSnapshot.fromActivityKind(ActivityKind.yoga),
        );
        final wrongActivityEvent = buildEvent(
          id: 'event-wrong-activity',
          organizerId: 'club-a',
          startTime: now.add(const Duration(days: 1)),
          startingPointLat: 19.001,
          startingPointLng: 72.001,
          eventFormat: EventFormatSnapshot.fromActivityKind(
            ActivityKind.dinner,
          ),
        );
        final fullEvent = buildEvent(
          id: 'event-full',
          organizerId: 'club-a',
          startTime: now.add(const Duration(days: 1)),
          startingPointLat: 19.001,
          startingPointLng: 72.001,
          eventFormat: EventFormatSnapshot.fromActivityKind(ActivityKind.yoga),
          bookedCount: 20,
        );
        await _seedDiscoverableEvent(firestore, matchingEvent);
        await _seedDiscoverableEvent(firestore, farEvent);
        await _seedDiscoverableEvent(
          firestore,
          otherCityEvent,
          marketId: 'in-dl-delhi-ncr',
        );
        await _seedDiscoverableEvent(firestore, wrongActivityEvent);
        await _seedDiscoverableEvent(
          firestore,
          fullEvent,
          availability: 'full',
          hasOpenSpots: false,
        );

        final events = await repository.fetchDiscoverableEvents(
          EventDiscoveryQuery.forCity(
            marketId: 'in-mh-mumbai',
            startAt: now,
            endBefore: now.add(const Duration(days: 7)),
            activityKinds: const [ActivityKind.yoga],
            center: const LocationCoordinate(19, 72),
            maxDistanceKm: 3,
            availabilityFilter: EventDiscoveryAvailabilityFilter.open,
          ),
        );

        expect(events.map((event) => event.id), ['event-matching']);
      },
    );

    test('publication filter precedes decoding and pagination', () async {
      final firestore = FakeFirebaseFirestore();
      final repository = EventDiscoveryRepository(firestore);
      final now = DateTime(2030);
      final published = buildEvent(
        id: 'published',
        startTime: now.add(const Duration(days: 2)),
      );
      final legacy = buildEvent(
        id: 'legacy',
        startTime: now.add(const Duration(days: 1)),
      );
      await _seedDiscoverableEvent(firestore, published);
      await _seedDiscoverableEvent(firestore, legacy, legacy: true);
      final privateData =
          (await firestore.collection('events').doc(legacy.id).get()).data()!;
      privateData['publicationState'] = 'private';
      privateData.remove('endTime');
      privateData.remove('meetingLocation');
      await firestore.collection('events').doc('private').set(privateData);
      final page = await repository.fetchDiscoverableEventsPage(
        EventDiscoveryQuery.forCity(
          marketId: 'in-mh-mumbai',
          startAt: now,
          limit: 1,
        ),
      );
      expect(page.items.map((event) => event.id), ['published']);
      expect(page.hasMore, isFalse);
    });

    test('excludes synthetic events from public discovery', () async {
      final firestore = FakeFirebaseFirestore();
      final repository = EventDiscoveryRepository(firestore);
      final now = DateTime(2026, 5, 26, 10);
      final syntheticEvent = buildEvent(
        id: 'synthetic-event',
        synthetic: true,
        seedPrefix: 'cross_paths_mumbai_qa',
        startTime: now.add(const Duration(days: 1)),
      );
      await _seedDiscoverableEvent(firestore, syntheticEvent);
      await firestore.collection('events').doc(syntheticEvent.id).update({
        'synthetic': true,
        'seedPrefix': 'cross_paths_mumbai_qa',
      });

      final events = await repository.fetchDiscoverableEvents(
        EventDiscoveryQuery.forCity(marketId: 'in-mh-mumbai', startAt: now),
      );

      expect(events, isEmpty);
    });

    test('provider builds a repository from Firebase providers', () async {
      final firestore = FakeFirebaseFirestore();
      final event = buildEvent(
        id: 'event-provider',
        organizerId: 'club-provider',
        startTime: DateTime(2026, 5, 27, 10),
        startingPointLat: 19.001,
        startingPointLng: 72.001,
      );
      await _seedDiscoverableEvent(firestore, event);
      final container = ProviderContainer(
        overrides: [firebaseFirestoreProvider.overrideWithValue(firestore)],
      );
      addTearDown(container.dispose);

      final results = await container.read(
        discoverableEventsProvider(
          EventDiscoveryQuery.forCity(
            marketId: 'in-mh-mumbai',
            startAt: DateTime(2026, 5, 26),
            endBefore: DateTime(2026, 6),
          ),
        ).future,
      );

      expect(results.map((event) => event.id), ['event-provider']);
    });

    test('uses viewer cohort indexes for open-slot discovery', () async {
      final firestore = FakeFirebaseFirestore();
      final repository = EventDiscoveryRepository(firestore);
      final now = DateTime(2026, 5, 26, 10);
      final matchingEvent = buildEvent(
        id: 'event-open-for-men',
        organizerId: 'club-a',
        startTime: now.add(const Duration(days: 1)),
      );
      final blockedEvent = buildEvent(
        id: 'event-open-for-women',
        organizerId: 'club-a',
        startTime: now.add(const Duration(days: 1)),
      );
      await _seedDiscoverableEvent(
        firestore,
        matchingEvent,
        openCohorts: const ['menInterestedInWomen'],
      );
      await _seedDiscoverableEvent(
        firestore,
        blockedEvent,
        openCohorts: const ['womenInterestedInMen'],
      );

      final events = await repository.fetchDiscoverableEvents(
        EventDiscoveryQuery.forCity(
          marketId: 'in-mh-mumbai',
          startAt: now,
          availabilityFilter: EventDiscoveryAvailabilityFilter.open,
          viewerCohortId: 'menInterestedInWomen',
        ),
      );

      expect(events.map((event) => event.id), ['event-open-for-men']);
    });

    test('does not narrow general discovery by viewer cohort', () async {
      final firestore = FakeFirebaseFirestore();
      final repository = EventDiscoveryRepository(firestore);
      final now = DateTime(2026, 5, 26, 10);
      final event = buildEvent(
        id: 'event-visible-in-general-feed',
        organizerId: 'club-a',
        startTime: now.add(const Duration(days: 1)),
      );
      await _seedDiscoverableEvent(
        firestore,
        event,
        openCohorts: const ['womenInterestedInMen'],
      );

      final events = await repository.fetchDiscoverableEvents(
        EventDiscoveryQuery.forCity(
          marketId: 'in-mh-mumbai',
          startAt: now,
          viewerCohortId: 'menInterestedInWomen',
        ),
      );

      expect(events.map((event) => event.id), [
        'event-visible-in-general-feed',
      ]);
    });

    test('cursor pages advance through Anytime discovery', () async {
      final firestore = FakeFirebaseFirestore();
      final repository = EventDiscoveryRepository(firestore);
      final now = DateTime(2026, 5, 26, 10);
      for (var day = 1; day <= 3; day += 1) {
        await _seedDiscoverableEvent(
          firestore,
          buildEvent(
            id: 'event-$day',
            organizerId: 'club-a',
            startTime: now.add(Duration(days: day)),
          ),
        );
      }
      final query = EventDiscoveryQuery.forCity(
        marketId: 'in-mh-mumbai',
        startAt: now,
        limit: 2,
      );

      final first = await repository.fetchDiscoverableEventsPage(query);
      final second = await repository.fetchDiscoverableEventsPage(
        query,
        startAfter: first.nextCursor,
      );

      expect(first.items.map((event) => event.id), ['event-1', 'event-2']);
      expect(first.hasMore, isTrue);
      expect(second.items.map((event) => event.id), ['event-3']);
      expect(second.hasMore, isFalse);
    });

    test('unlabelled events do not consume discovery cursor slots', () async {
      final firestore = FakeFirebaseFirestore();
      final repository = EventDiscoveryRepository(firestore);
      final now = DateTime(2026, 5, 26, 10);
      final legacy = buildEvent(
        id: 'legacy-first',
        startTime: now.add(const Duration(hours: 1)),
      );
      final public = buildEvent(
        id: 'published-second',
        startTime: now.add(const Duration(hours: 2)),
      );
      await _seedDiscoverableEvent(firestore, legacy, legacy: true);
      await _seedDiscoverableEvent(firestore, public);
      final query = EventDiscoveryQuery.forCity(
        marketId: 'in-mh-mumbai',
        startAt: now,
        limit: 1,
      );
      final first = await repository.fetchDiscoverableEventsPage(query);
      expect(first.items.map((event) => event.id), ['published-second']);
      expect(first.hasMore, isFalse);
      expect(first.nextCursor, isNull);
    });
  });
}

Future<void> _seedDiscoverableEvent(
  FakeFirebaseFirestore firestore,
  Event event, {
  String cityName = 'mumbai',
  String marketId = 'in-mh-mumbai',
  String availability = 'open',
  bool hasOpenSpots = true,
  List<String> openCohorts = const [
    'menInterestedInWomen',
    'womenInterestedInMen',
    'queerOrOpen',
    'nonBinaryOrOther',
  ],
  List<String> waitlistCohorts = const [],
  bool legacy = false,
}) {
  final latitude = event.effectiveStartingPointLat;
  final longitude = event.effectiveStartingPointLng;
  return firestore.collection('events').doc(event.id).set({
    ...event.toJson(),
    if (!legacy) 'publicationState': 'published',
    'discoveryCityName': cityName,
    'discoveryMarketId': marketId,
    'discoveryActivityKind': event.activityKind.name,
    'discoveryGeoCell': eventDiscoveryGeoCellFor(
      latitude: latitude!,
      longitude: longitude!,
    ),
    'discoveryHasOpenSpots': hasOpenSpots,
    'discoveryAvailability': availability,
    'discoveryOpenCohorts': openCohorts,
    'discoveryWaitlistCohorts': waitlistCohorts,
    'discoveryInviteRequired': false,
    'discoveryMembershipRequired': false,
    'discoveryManualApprovalRequired': false,
    'discoveryMinAge': event.constraints.minAge,
    'discoveryMaxAge': event.constraints.maxAge,
  });
}
