import 'package:catch_dating_app/contexts/events/events.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:flutter_test/flutter_test.dart';

import 'guest_event_card_fixtures.dart';

void main() {
  test('parses the stored card', () {
    final card = GuestEventCard.fromData(guestEventCardData())!;

    expect(card.eventId, 'event-1');
    expect(card.title, 'Sunday run');
    expect(card.activityKind, ActivityKind.pickleball);
    expect(card.pace, PaceLevel.easy);
    expect(card.published, isTrue);
    expect(card.locationName, 'Court 3');
    expect(card.effectiveStartingPointLat, 12.9);
    expect(card.locationNotes, 'Use the side gate');
    expect(card.endTime!.difference(card.startTime), const Duration(hours: 1));
  });

  test('an unnamed event gets the derived title an event gets', () {
    final card = GuestEventCard.fromData(guestEventCardData(name: ''))!;

    expect(
      card.title,
      eventLegacyDerivedTitle(
        startTime: card.startTime,
        eventFormat: card.eventFormat,
      ),
    );
  });

  test('a cancelled event is never upcoming', () {
    final card = GuestEventCard.fromData(
      guestEventCardData(status: 'cancelled'),
    )!;

    expect(card.isCancelled, isTrue);
    expect(card.isUpcomingAt(DateTime(2020)), isFalse);
  });

  test('a missing or malformed card reads as none', () {
    expect(GuestEventCard.fromData(null), isNull);
    expect(GuestEventCard.fromData({'eventId': 'event-1'}), isNull);
  });
}
