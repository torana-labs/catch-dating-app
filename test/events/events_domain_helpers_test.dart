import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_constraints.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('EventConstraints.maxForGender', () {
    const constraints = EventConstraints(maxMen: 8, maxWomen: 10);

    test('returns the configured cap for men', () {
      expect(constraints.maxForGender(Gender.man), 8);
    });

    test('returns the configured cap for women', () {
      expect(constraints.maxForGender(Gender.woman), 10);
    });

    test('returns null for uncapped genders', () {
      expect(constraints.maxForGender(Gender.nonBinary), isNull);
      expect(constraints.maxForGender(Gender.other), isNull);
    });
  });

  group('EventConstraints display helpers', () {
    test('detects whether an event has requirements', () {
      expect(const EventConstraints().hasRequirements, isFalse);
      expect(const EventConstraints(minAge: 21).hasRequirements, isTrue);
    });

    test('builds requirement labels for each supported case', () {
      expect(
        const EventConstraints(
          minAge: 21,
          maxAge: 35,
          maxMen: 8,
          maxWomen: 10,
        ).requirementLabels,
        ['Age 21–35', 'Max 8 men', 'Max 10 women'],
      );
      expect(const EventConstraints(minAge: 21).requirementLabels, [
        '21+ years',
      ]);
      expect(const EventConstraints(maxAge: 35).requirementLabels, [
        'Up to 35 years',
      ]);
    });
  });

  group('Event derived helpers', () {
    test('exposes spots remaining and requirement presence', () {
      final event = Event(
        id: 'event-1',
        organizerId: 'club-1',
        startTime: DateTime.now().add(const Duration(hours: 1)),
        endTime: DateTime.now().add(const Duration(hours: 2)),
        meetingPoint: 'Carter Road',
        meetingLocation: const EventMeetingLocation(
          name: 'Carter Road',
          latitude: 19.0608,
          longitude: 72.8365,
        ),
        startingPointLat: 19.0608,
        startingPointLng: 72.8365,
        distanceKm: 5,
        pace: PaceLevel.easy,
        capacityLimit: 2,
        description: 'A event',
        priceInPaise: 0,
        bookedCount: 3,
        constraints: const EventConstraints(minAge: 21),
      );

      expect(event.spotsRemaining, 0);
      expect(event.hasRequirements, isTrue);
    });
  });
}
