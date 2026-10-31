import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_constraints.dart';
import 'package:catch_dating_app/contexts/events/domain/event_eligibility.dart';
import 'package:catch_dating_app/contexts/events/domain/event_service.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final referenceNow = DateTime(2026, 1, 1, 8);

  // ── helpers ────────────────────────────────────────────────────────────────

  /// A future event with capacity, no sign-ups, no constraints — always Eligible.
  Event buildEvent({
    DateTime? startTime,
    int capacityLimit = 20,
    int? bookedCount,
    EventConstraints constraints = const EventConstraints(),
    Map<String, int> genderCounts = const {},
  }) {
    final start = startTime ?? DateTime.now().add(const Duration(hours: 2));
    return Event(
      id: 'event-1',
      organizerId: 'club-1',
      startTime: start,
      endTime: start.add(const Duration(hours: 1)),
      meetingPoint: 'Start line',
      meetingLocation: const EventMeetingLocation(
        name: 'Start line',
        latitude: 19.0608,
        longitude: 72.8365,
      ),
      startingPointLat: 19.0608,
      startingPointLng: 72.8365,
      distanceKm: 5.0,
      pace: PaceLevel.easy,
      capacityLimit: capacityLimit,
      description: '',
      priceInPaise: 0,
      bookedCount: bookedCount,
      constraints: constraints,
      genderCounts: genderCounts,
    );
  }

  UserProfile buildUser({
    String uid = 'user-1',
    int birthYear = 1990, // ~35 y/o — well within any reasonable constraint
    Gender gender = Gender.man,
  }) {
    return UserProfile(
      uid: uid,
      name: 'Test Runner',
      dateOfBirth: DateTime(birthYear, 6, 15),
      gender: gender,
      phoneNumber: '+910000000000',
      profileComplete: true,
      interestedInGenders: const [Gender.woman],
    );
  }

  test(
    'minimal identity can book unrestricted events without age or photos',
    () {
      const user = UserProfile(
        uid: 'minimal',
        profileComplete: false,
        name: 'Ada',
        phoneNumber: '+919876543210',
      );
      expect(
        EventService.eligibilityFor(buildEvent(), user, now: referenceNow),
        isA<Eligible>(),
      );
      for (final constraints in [
        const EventConstraints(minAge: 18),
        const EventConstraints(maxMen: 5),
      ]) {
        expect(
          EventService.eligibilityFor(
            buildEvent(constraints: constraints),
            user,
            now: referenceNow,
          ),
          isA<ProfileDetailsRequired>(),
        );
      }
    },
  );

  // ── #13: EventPast ──────────────────────────────────────────────────────────

  test(
    '#13 eligibilityFor returns EventPast for a past event the user never signed up for',
    () {
      final user = buildUser();
      final event = buildEvent(
        startTime: referenceNow.subtract(const Duration(hours: 2)),
      );
      expect(
        EventService.eligibilityFor(event, user, now: referenceNow),
        isA<EventPast>(),
      );
    },
  );

  test('eligibilityFor uses the supplied reference time', () {
    final now = DateTime(2026, 1, 1, 8);
    final user = buildUser();
    final event = buildEvent(startTime: now.add(const Duration(minutes: 30)));

    expect(EventService.eligibilityFor(event, user, now: now), isA<Eligible>());
    expect(
      EventService.eligibilityFor(
        event,
        user,
        now: now.add(const Duration(hours: 1)),
      ),
      isA<EventPast>(),
    );
  });

  // ── #15: AgeTooYoung ─────────────────────────────────────────────────────

  test('#15 eligibilityFor returns AgeTooYoung when user age < minAge', () {
    // User born 5 years ago → age ~5; minAge = 18
    final user = buildUser(birthYear: DateTime.now().year - 5);
    final event = buildEvent(constraints: const EventConstraints(minAge: 18));
    final result = EventService.eligibilityFor(event, user, now: referenceNow);
    expect(result, isA<AgeTooYoung>());
    expect((result as AgeTooYoung).minAge, 18);
  });

  // ── #16: AgeTooOld ───────────────────────────────────────────────────────

  test('#16 eligibilityFor returns AgeTooOld when user age > maxAge', () {
    // User born 60 years ago → age ~60; maxAge = 40
    final user = buildUser(birthYear: DateTime.now().year - 60);
    final event = buildEvent(constraints: const EventConstraints(maxAge: 40));
    final result = EventService.eligibilityFor(event, user, now: referenceNow);
    expect(result, isA<AgeTooOld>());
    expect((result as AgeTooOld).maxAge, 40);
  });

  // ── #17: Cohort cap reached ───────────────────────────────────────────────

  test(
    '#17 eligibilityFor returns EventFull when a waitlistable cohort slot is full',
    () {
      final user = buildUser();
      final event = buildEvent(
        constraints: const EventConstraints(maxMen: 2),
        genderCounts: {'man': 2}, // at cap
      );
      expect(
        EventService.eligibilityFor(event, user, now: referenceNow),
        isA<EventFull>(),
      );
    },
  );

  test('eligible when gender count is below cap', () {
    final user = buildUser();
    final event = buildEvent(
      constraints: const EventConstraints(maxMen: 5),
      genderCounts: {'man': 4},
    );
    expect(
      EventService.eligibilityFor(event, user, now: referenceNow),
      isA<Eligible>(),
    );
  });

  // ── #18: EventFull ──────────────────────────────────────────────────────────

  test(
    '#18 eligibilityFor returns EventFull when at capacity (user meets all criteria)',
    () {
      final user = buildUser();
      final event = buildEvent(capacityLimit: 2, bookedCount: 2);
      expect(
        EventService.eligibilityFor(event, user, now: referenceNow),
        isA<EventFull>(),
      );
    },
  );

  // ── #19: Eligible ─────────────────────────────────────────────────────────

  test(
    '#19 eligibilityFor returns Eligible for a future, non-full, qualifying event',
    () {
      final user = buildUser();
      final event =
          buildEvent(); // all defaults: future, 20 capacity, 0 sign-ups
      expect(
        EventService.eligibilityFor(event, user, now: referenceNow),
        isA<Eligible>(),
      );
    },
  );

  // ── #20: statusFor maps fresh-viewer eligibility to EventSignUpStatus ──────

  group('#20 statusFor', () {
    test('EventPast → EventSignUpStatus.past', () {
      final user = buildUser();
      final event = buildEvent(
        startTime: referenceNow.subtract(const Duration(days: 1)),
      );
      expect(event.statusFor(user, now: referenceNow), EventSignUpStatus.past);
    });

    test('EventFull → EventSignUpStatus.full', () {
      final user = buildUser();
      final event = buildEvent(capacityLimit: 1, bookedCount: 1);
      expect(event.statusFor(user, now: referenceNow), EventSignUpStatus.full);
    });

    test('Eligible → EventSignUpStatus.eligible', () {
      final user = buildUser();
      final event = buildEvent();
      expect(
        event.statusFor(user, now: referenceNow),
        EventSignUpStatus.eligible,
      );
    });

    test('Waitlistable cohort cap → EventSignUpStatus.full', () {
      final user = buildUser();
      final event = buildEvent(
        constraints: const EventConstraints(maxMen: 1),
        genderCounts: {'man': 1},
      );
      expect(event.statusFor(user, now: referenceNow), EventSignUpStatus.full);
    });
  });
}
