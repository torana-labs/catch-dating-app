import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/kernel/brand.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  // ── helpers ────────────────────────────────────────────────────────────────

  Event buildEvent({
    String id = 'event-1',
    String name = '',
    DateTime? startTime,
    DateTime? endTime,
    int capacityLimit = 20,
    int priceInPaise = 0,
    int? bookedCount,
    int? checkedInCount,
    int? waitlistedCount,
    EventLifecycleStatus status = EventLifecycleStatus.active,
    EventFormatSnapshot eventFormat = const EventFormatSnapshot.socialRun(),
    EventOrigin? eventOrigin,
    EventRuntimeAccess? runtimeAccess,
  }) {
    final start = startTime ?? DateTime.now().add(const Duration(hours: 1));
    return Event(
      id: id,
      organizerId: 'club-1',
      name: name,
      startTime: start,
      endTime: endTime ?? start.add(const Duration(hours: 1)),
      meetingPoint: 'Carter Road',
      meetingLocation: const EventMeetingLocation(
        name: 'Carter Road',
        latitude: 19.0608,
        longitude: 72.8365,
      ),
      startingPointLat: 19.0608,
      startingPointLng: 72.8365,
      eventFormat: eventFormat,
      distanceKm: 5.0,
      pace: PaceLevel.easy,
      capacityLimit: capacityLimit,
      description: 'A test event',
      priceInPaise: priceInPaise,
      bookedCount: bookedCount,
      checkedInCount: checkedInCount,
      waitlistedCount: waitlistedCount,
      status: status,
      eventOrigin: eventOrigin,
      runtimeAccess: runtimeAccess,
    );
  }

  // ── #1-2: title ────────────────────────────────────────────────────────────

  group('Event.title', () {
    test('uses the authored event name verbatim after trimming', () {
      final event = buildEvent(name: '  Sunrise Social 5K  ');

      expect(event.title, 'Sunrise Social 5K');
      expect(event.legacyDerivedTitle, isNotEmpty);
    });

    test('#1 Saturday 6 AM -> "Saturday Morning Run"', () {
      // Find the next Saturday 06:00
      var dt = DateTime(2025, 1, 1, 6); // 2025-01-01 is a Wednesday
      while (dt.weekday != DateTime.saturday) {
        dt = dt.add(const Duration(days: 1));
      }
      final event = buildEvent(startTime: dt);
      expect(event.title, 'Saturday Morning Run');
    });

    test('#2 Wednesday 14:00 -> "Wednesday Afternoon Run"', () {
      var dt = DateTime(2025, 1, 1, 14);
      while (dt.weekday != DateTime.wednesday) {
        dt = dt.add(const Duration(days: 1));
      }
      final event = buildEvent(startTime: dt);
      expect(event.title, 'Wednesday Afternoon Run');
    });

    test('Evening period for 18:00', () {
      var dt = DateTime(2025, 1, 1, 18);
      while (dt.weekday != DateTime.friday) {
        dt = dt.add(const Duration(days: 1));
      }
      final event = buildEvent(startTime: dt);
      expect(event.title, 'Friday Evening Run');
    });

    test('uses activity kind for non-run event formats', () {
      final event = buildEvent(
        startTime: DateTime(2026, 5, 29, 14),
        eventFormat: EventFormatSnapshot.fromActivityKind(
          ActivityKind.pickleball,
        ),
      );

      expect(event.title, 'Friday Afternoon Pickleball');
    });

    test('uses custom activity labels for open event formats', () {
      final event = buildEvent(
        startTime: DateTime(2026, 5, 27, 18),
        eventFormat: EventFormatSnapshot.custom(
          label: 'salsa night',
          interactionModel: EventInteractionModel.freeFormMixer,
        ),
      );

      expect(event.title, 'Wednesday Evening Salsa Night');
    });
  });

  // ── #3-4: isUpcomingAt ─────────────────────────────────────────────────────

  group('Event.isUpcomingAt', () {
    final now = DateTime(2026, 5, 17, 12);

    test('#3 true when startTime is 1 h in the future', () {
      final event = buildEvent(startTime: now.add(const Duration(hours: 1)));
      expect(event.isUpcomingAt(now), isTrue);
    });

    test('#4 false when startTime is 1 h in the past', () {
      final event = buildEvent(
        startTime: now.subtract(const Duration(hours: 1)),
      );
      expect(event.isUpcomingAt(now), isFalse);
    });

    test('false when the event has been cancelled', () {
      final event = buildEvent(
        status: EventLifecycleStatus.cancelled,
        startTime: now.add(const Duration(hours: 1)),
      );

      expect(event.isCancelled, isTrue);
      expect(event.isUpcomingAt(now), isFalse);
    });
  });

  // ── #5-6: isFull ──────────────────────────────────────────────────────────

  group('Event.isFull', () {
    test('#5 false when signedUpCount < capacityLimit', () {
      final event = buildEvent(capacityLimit: 5, bookedCount: 2);
      expect(event.isFull, isFalse);
    });

    test('#6 true when signedUpCount == capacityLimit', () {
      final event = buildEvent(capacityLimit: 2, bookedCount: 2);
      expect(event.isFull, isTrue);
    });

    test('true when signedUpCount exceeds capacityLimit', () {
      final event = buildEvent(capacityLimit: 2, bookedCount: 3);
      expect(event.isFull, isTrue);
    });

    test('uses projected bookedCount for roster capacity', () {
      final event = buildEvent(capacityLimit: 5, bookedCount: 4);

      expect(event.signedUpCount, 4);
      expect(event.spotsRemaining, 1);
      expect(event.isFull, isFalse);
      expect(event.effectiveCohortCounts.values.single, 4);
    });

    test('uses projected checked-in and waitlist counts', () {
      final event = buildEvent(checkedInCount: 3, waitlistedCount: 2);

      expect(event.attendedCount, 3);
      expect(event.waitlistCount, 2);
    });
  });

  // ── #7: isFree ────────────────────────────────────────────────────────────

  group('Event.isFree', () {
    test('#7 true when priceInPaise == 0', () {
      expect(buildEvent().isFree, isTrue);
    });

    test('false when priceInPaise > 0', () {
      expect(buildEvent(priceInPaise: 50000).isFree, isFalse);
    });
  });

  group('Event.distanceMiles', () {
    test('converts kilometres to miles', () {
      final event = buildEvent();
      expect(event.distanceMiles, closeTo(3.106855, 0.000001));
    });
  });

  group('Event meeting location contract', () {
    test('reads a valid legacy pair through the compatibility view', () {
      final source = buildEvent();
      final json = <String, dynamic>{...source.toJson(), 'id': source.id}
        ..remove('meetingLocation');

      final decoded = Event.fromJson(json);

      expect(decoded.meetingLocation, isNull);
      expect(decoded.effectiveMeetingLocation?.name, source.meetingPoint);
      expect(decoded.effectiveStartingPointLat, source.startingPointLat);
      expect(decoded.effectiveStartingPointLng, source.startingPointLng);
    });

    test('keeps a coordinate-less legacy event readable until repair', () {
      final source = buildEvent();
      final json = <String, dynamic>{...source.toJson(), 'id': source.id}
        ..remove('meetingLocation')
        ..remove('startingPointLat')
        ..remove('startingPointLng');

      final decoded = Event.fromJson(json);

      expect(decoded.meetingLocation, isNull);
      expect(decoded.hasExactStartingPoint, isFalse);
    });
  });

  group('External companion runtime', () {
    test('round-trips provenance and builds a public join URL', () {
      final source = buildEvent(
        eventOrigin: const EventOrigin(
          mode: EventOriginMode.externalCompanion,
          bookingAuthority: EventBookingAuthority.external,
          rosterAuthority: EventRosterAuthority.hostImport,
          provider: ExternalBookingProvider.luma,
          externalEventId: 'luma-event-1',
          adapterVersion: 'luma-v1',
        ),
        runtimeAccess: const EventRuntimeAccess(
          enabled: true,
          publicRuntimeId: 'runtime_abcdefghijklmnopqrstu',
          walkInPolicy: EventRuntimeWalkInPolicy.hostApproval,
          termsVersion: 'event-runtime-v1',
        ),
      );

      final decoded = Event.fromJson({...source.toJson(), 'id': source.id});

      expect(decoded.isExternalCompanion, isTrue);
      expect(decoded.eventOrigin?.provider, ExternalBookingProvider.luma);
      expect(decoded.hasWebRuntime, isTrue);
      expect(
        decoded.runtimeJoinUri()?.toString(),
        '${Brand.webOrigin}/join/runtime_abcdefghijklmnopqrstu',
      );
    });

    test('maps Catch booking authority to the contract wire value', () {
      const origin = EventOrigin(
        mode: EventOriginMode.catchNative,
        bookingAuthority: EventBookingAuthority.catchPlatform,
        rosterAuthority: EventRosterAuthority.catchProjection,
        provider: ExternalBookingProvider.catchPlatform,
      );

      expect(origin.toJson()['bookingAuthority'], 'catch');
      expect(origin.toJson()['provider'], 'catch');
    });
  });
}
