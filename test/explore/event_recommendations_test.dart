import 'package:catch_dating_app/contexts/discovery/data/explore_recommendations_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_constraints.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart' as fixtures;
import '../support/dashboard_test_helpers.dart' show recommendationCandidate;

void main() {
  test('removes already booked events from recommendations', () {
    final now = DateTime(2030);
    final booked = fixtures.buildEvent(
      id: 'booked',
      startTime: now.add(const Duration(days: 1)),
    );
    final unbooked = fixtures.buildEvent(
      id: 'recommended',
      startTime: now.add(const Duration(days: 1)),
    );
    final recommendations = rankExploreEventRecommendations(
      candidates: [
        recommendationCandidate(booked),
        recommendationCandidate(unbooked),
      ],
      signedUpEventIds: {booked.id},
      attendedEvents: const [],
      signedUpEvents: [booked],
      now: now,
    );
    expect(recommendations.map((item) => item.event.id), ['recommended']);
  });

  test('ranks recommendations by preferences, proximity, and event time', () {
    final now = DateTime(2026, 4, 23, 9);
    final viewer = fixtures.buildUser().copyWith(
      city: 'in-mh-mumbai',
      latitude: 19.076,
      longitude: 72.8777,
      activityPreferences: const ActivityPreferences(
        running: RunningPreferences(
          paceMinSecsPerKm: 330,
          paceMaxSecsPerKm: 390,
          preferredDistances: [PreferredDistance.tenK],
        ),
      ),
    );
    final morningHistory = fixtures.buildEvent(
      id: 'morning-history',
      startTime: now.subtract(const Duration(days: 3, hours: 2)),
    );
    final strongMatch = fixtures.buildEvent(
      id: 'strong-match',
      distanceKm: 10,
      pace: PaceLevel.moderate,
      startTime: DateTime(2026, 4, 24, 7),
      startingPointLat: 19.08,
      startingPointLng: 72.88,
    );
    final weakMatch = fixtures.buildEvent(
      id: 'weak-match',
      pace: PaceLevel.competitive,
      startTime: DateTime(2026, 4, 24, 19),
      startingPointLat: 19.30,
      startingPointLng: 72.90,
    );

    final recommendations = rankExploreEventRecommendations(
      candidates: [
        recommendationCandidate(
          weakMatch,
          organizerName: 'Late Miles',
          organizerLocation: 'delhi',
        ),
        recommendationCandidate(strongMatch, organizerName: 'Bandra Club'),
      ],
      signedUpEventIds: const {},
      attendedEvents: [morningHistory],
      signedUpEvents: const [],
      viewer: viewer,
      now: now,
    );

    expect(recommendations.map((item) => item.event.id), [
      'strong-match',
      'weak-match',
    ]);
    expect(recommendations.first.organizerName, 'Bandra Club');
    expect(recommendations.first.reasonLabel, 'Matches your 10 km preference');
  });

  test('filters past, cancelled, full, booked, and ineligible events', () {
    final now = DateTime(2026, 4, 23, 9);
    final viewer = fixtures.buildUser();
    final eligible = fixtures.buildEvent(
      id: 'eligible',
      startTime: now.add(const Duration(hours: 3)),
    );
    final booked = fixtures.buildEvent(
      id: 'booked',
      startTime: now.add(const Duration(hours: 4)),
    );
    final cancelled = fixtures.buildEvent(
      id: 'cancelled',
      startTime: now.add(const Duration(hours: 5)),
      status: EventLifecycleStatus.cancelled,
    );
    final full = fixtures.buildEvent(
      id: 'full',
      startTime: now.add(const Duration(hours: 6)),
      capacityLimit: 2,
      bookedCount: 2,
    );
    final ineligible = fixtures.buildEvent(
      id: 'ineligible',
      startTime: now.add(const Duration(hours: 7)),
      constraints: const EventConstraints(minAge: 45),
    );
    final past = fixtures.buildEvent(
      id: 'past',
      startTime: now.subtract(const Duration(hours: 1)),
    );

    final recommendations = rankExploreEventRecommendations(
      candidates: [
        eligible,
        booked,
        cancelled,
        full,
        ineligible,
        past,
      ].map(recommendationCandidate).toList(),
      signedUpEventIds: {'booked'},
      attendedEvents: const [],
      signedUpEvents: const [],
      viewer: viewer,
      now: now,
    );

    expect(recommendations.map((item) => item.event.id), ['eligible']);
  });

  test('non-distance recommendations ignore legacy run distance and pace', () {
    final now = DateTime(2030);
    final viewer = fixtures.buildUser().copyWith(
      activityPreferences: const ActivityPreferences(
        running: RunningPreferences(
          paceMinSecsPerKm: 400,
          paceMaxSecsPerKm: 440,
          preferredDistances: [PreferredDistance.fiveK],
        ),
      ),
    );
    final dinner = fixtures.buildEvent(
      id: 'dinner',
      startTime: now.add(const Duration(days: 1)),
      eventFormat: const EventFormatSnapshot(
        activityKind: ActivityKind.dinner,
        interactionModel: EventInteractionModel.seatedTable,
      ),
      distanceKm: 0,
    );
    final alternateLegacyValues = dinner.copyWith(
      id: 'other-dinner',
      distanceKm: 5,
      pace: PaceLevel.competitive,
    );
    final run = dinner.copyWith(
      id: 'run',
      eventFormat: const EventFormatSnapshot.socialRun(),
      distanceKm: 5,
    );
    final results = rankExploreEventRecommendations(
      candidates: [
        for (final event in [dinner, alternateLegacyValues, run])
          ExploreEventRecommendationCandidate(
            event: event,
            organizerName: 'Club',
          ),
      ],
      signedUpEventIds: {},
      attendedEvents: [],
      signedUpEvents: [],
      now: now,
      viewer: viewer,
    );
    final firstDinner = results.singleWhere(
      (item) => item.event.id == 'dinner',
    );
    final otherDinner = results.singleWhere(
      (item) => item.event.id == 'other-dinner',
    );
    expect(firstDinner.score, otherDinner.score);
    expect(firstDinner.reasonLabel, 'From organizers you follow');
    expect(results.first.event.id, 'run');
    expect(results.first.reasonLabel, contains('5'));
  });
}
