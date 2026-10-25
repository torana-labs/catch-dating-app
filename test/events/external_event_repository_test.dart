import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/events/data/external_event_repository.dart';
import 'package:catch_dating_app/events/domain/external_event.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('decoder keeps a coordinate-less legacy external event readable', () {
    final event = ExternalEvent.fromJson({
      'startTime': Timestamp.fromDate(DateTime(2026, 6, 25, 10)),
      'meetingPoint': 'Legacy venue',
    });

    expect(event.meetingPoint, 'Legacy venue');
    expect(event.latitude, isNull);
    expect(event.longitude, isNull);
    expect(event.isBookableOnCatch, isFalse);
    expect(event.canRequestOrganizerClaim, isFalse);
  });

  group('ExternalEventDiscoveryQuery', () {
    test('normalizes city slug and sorts activity filters', () {
      final now = DateTime(2026, 6, 25, 10);
      final left = ExternalEventDiscoveryQuery.forCity(
        citySlug: ' Mumbai ',
        startAt: now,
        activityKinds: const [ActivityKind.yoga, ActivityKind.dinner],
      );
      final right = ExternalEventDiscoveryQuery.forCity(
        citySlug: 'mumbai',
        startAt: now,
        activityKinds: const [ActivityKind.dinner, ActivityKind.yoga],
      );

      expect(left, right);
      expect(left.hashCode, right.hashCode);
      expect(left.citySlug, 'mumbai');
      expect(left.activityKinds, [ActivityKind.dinner, ActivityKind.yoga]);
    });
  });

  group('ExternalEventRepository', () {
    test(
      'fetches only public active external events for the city window',
      () async {
        final firestore = FakeFirebaseFirestore();
        final repository = ExternalEventRepository(firestore);
        final now = DateTime(2026, 6, 25, 10);
        await _seedExternalEvent(
          firestore,
          id: 'external-match',
          citySlug: 'mumbai',
          startTime: now.add(const Duration(days: 1)),
          activityKind: ActivityKind.yoga,
        );
        await _seedExternalEvent(
          firestore,
          id: 'external-draft',
          citySlug: 'mumbai',
          publicationStatus: 'draft',
          startTime: now.add(const Duration(days: 2)),
          activityKind: ActivityKind.yoga,
        );
        await _seedExternalEvent(
          firestore,
          id: 'external-cancelled',
          citySlug: 'mumbai',
          status: 'cancelled',
          startTime: now.add(const Duration(days: 2)),
          activityKind: ActivityKind.yoga,
        );
        await _seedExternalEvent(
          firestore,
          id: 'external-delhi',
          citySlug: 'delhi',
          startTime: now.add(const Duration(days: 2)),
          activityKind: ActivityKind.yoga,
        );
        // The organizer is hidden in the app, so the event is website-only.
        await _seedExternalEvent(
          firestore,
          id: 'external-app-hidden',
          citySlug: 'mumbai',
          appVisibility: 'hidden',
          startTime: now.add(const Duration(days: 2)),
          activityKind: ActivityKind.yoga,
        );
        await _seedExternalEvent(
          firestore,
          id: 'external-dinner',
          citySlug: 'mumbai',
          startTime: now.add(const Duration(days: 3)),
          activityKind: ActivityKind.dinner,
        );

        final events = await repository.fetchDiscoverableExternalEvents(
          ExternalEventDiscoveryQuery.forCity(
            citySlug: 'mumbai',
            startAt: now,
            endBefore: now.add(const Duration(days: 7)),
            activityKinds: const [ActivityKind.yoga],
          ),
        );

        expect(events.map((event) => event.id), ['external-match']);
        expect(
          events.single.primaryExternalUri.toString(),
          'https://luma.com/e',
        );
        expect(events.single.platformLabel, 'Luma');
      },
    );

    test('provider builds a repository from Firebase providers', () async {
      final firestore = FakeFirebaseFirestore();
      final now = DateTime(2026, 6, 25, 10);
      await _seedExternalEvent(
        firestore,
        id: 'external-provider',
        citySlug: 'indore',
        startTime: now.add(const Duration(days: 1)),
      );
      final container = ProviderContainer(
        overrides: [firebaseFirestoreProvider.overrideWithValue(firestore)],
      );
      addTearDown(container.dispose);

      final results = await container.read(
        discoverableExternalEventsProvider(
          ExternalEventDiscoveryQuery.forCity(citySlug: 'indore', startAt: now),
        ).future,
      );

      expect(results.map((event) => event.id), ['external-provider']);
    });

    test('cursor pages advance through external discovery', () async {
      final firestore = FakeFirebaseFirestore();
      final repository = ExternalEventRepository(firestore);
      final now = DateTime(2026, 6, 25, 10);
      for (var day = 1; day <= 3; day += 1) {
        await _seedExternalEvent(
          firestore,
          id: 'external-$day',
          citySlug: 'mumbai',
          startTime: now.add(Duration(days: day)),
        );
      }
      final query = ExternalEventDiscoveryQuery.forCity(
        citySlug: 'mumbai',
        startAt: now,
        limit: 2,
      );

      final first = await repository.fetchDiscoverableExternalEventsPage(query);
      final second = await repository.fetchDiscoverableExternalEventsPage(
        query,
        startAfter: first.nextCursor,
      );

      expect(first.items.map((event) => event.id), [
        'external-1',
        'external-2',
      ]);
      expect(first.hasMore, isTrue);
      expect(second.items.map((event) => event.id), ['external-3']);
      expect(second.hasMore, isFalse);
    });
  });
}

Future<void> _seedExternalEvent(
  FakeFirebaseFirestore firestore, {
  required String id,
  required String citySlug,
  required DateTime startTime,
  ActivityKind activityKind = ActivityKind.openActivity,
  String publicationStatus = 'public',
  String status = 'active',
  String appVisibility = 'discoverable',
}) {
  return firestore.collection('externalEvents').doc(id).set({
    'schemaVersion': 1,
    'eventId': id,
    'canonicalHostId': 'host-afterfly',
    'compatibilityClubId': 'club-afterfly',
    'title': 'External event $id',
    'description': 'A reviewed external event.',
    'startTime': Timestamp.fromDate(startTime),
    'endTime': Timestamp.fromDate(startTime.add(const Duration(hours: 2))),
    'timezone': 'Asia/Kolkata',
    'meetingPoint': 'Bandra',
    'meetingLocation': {
      'name': 'Bandra Amphitheatre',
      'address': 'Bandra, Mumbai',
      'placeId': null,
      'latitude': 19.05,
      'longitude': 72.82,
      'notes': null,
    },
    'locationDetails': null,
    'photoUrl': null,
    'activity': {
      'version': 1,
      'activityKind': activityKind.name,
      'interactionModel': activityKind.defaultInteractionModel.name,
      'source': 'admin',
    },
    'price': {'displayText': null, 'parsedPriceInPaise': 0, 'currency': 'INR'},
    'status': status,
    'publicationStatus': publicationStatus,
    'organizerCapabilities': {
      'mode': 'unclaimed_read_only',
      'bookable': false,
      'paymentsEnabled': false,
      'waitlistEnabled': false,
      'hostContactEnabled': false,
      'claimable': true,
      'reviewPolicy': 'after_event_end',
    },
    'booking': {
      'mode': 'external_outbound_only',
      'catchBookingEnabled': false,
      'catchPaymentsEnabled': false,
      'catchReservationsEnabled': false,
      'catchWaitlistEnabled': false,
      'externalLinks': [
        {
          'platform': 'luma',
          'url': 'https://luma.com/e',
          'linkType': 'booking_or_event_page',
          'sourceEventKey': id,
          'candidateId': 'candidate-$id',
          'primary': true,
        },
      ],
    },
    'discovery': {
      'citySlug': citySlug,
      'countryCode': 'IN',
      'availability': 'read_only_external',
      'manualApprovalRequired': true,
      'appVisibility': appVisibility,
    },
    'dedupe': {
      'normalizedEventKey': id,
      'primaryCandidateId': 'candidate-$id',
      'duplicateCandidateIds': [],
      'conflictPolicy': 'single_read_only_event_with_multiple_outbound_links',
    },
    'externalSource': {
      'candidateId': 'candidate-$id',
      'sourceEventKey': id,
      'sourceEventId': id,
      'platform': 'luma',
      'eventUrl': 'https://luma.com/e',
      'sourceUrl': 'https://example.com/source',
    },
    'review': {
      'eventReviewBatchId': 'batch-1',
      'reviewer': 'codex',
      'decidedAt': '2026-06-25',
      'note': null,
      'importPolicyAcknowledged': true,
      'ownerSafeCopyReviewed': true,
      'blockerResolutions': const [],
    },
    'createdAt': Timestamp.fromDate(DateTime(2026, 6, 25)),
    'updatedAt': Timestamp.fromDate(DateTime(2026, 6, 25)),
  });
}
