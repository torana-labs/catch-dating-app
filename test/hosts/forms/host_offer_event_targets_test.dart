import 'package:catch_dating_app/contexts/forms/data/forms/host_offer_event_targets_gateway.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('manager event target page preserves private and published entries', () {
    final page = HostOfferEventTargetPage.fromCallableData({
      'events': [
        {
          'eventId': 'private-one',
          'name': 'Private planning',
          'startTimeMillis': 1800000000000,
          'timezone': 'Asia/Kolkata',
          'publicationState': 'private',
          'setupRevision': 2,
        },
        {
          'eventId': 'published-one',
          'name': null,
          'startTimeMillis': 1800000010000,
          'timezone': null,
          'publicationState': 'published',
          'setupRevision': null,
        },
      ],
      'nextCursor': 'next-page',
    });
    expect(page.events.map((event) => event.eventId),
      ['private-one', 'published-one']);
    expect(page.events.last.name, isNull);
    expect(page.nextCursor, 'next-page');
  });

  test('event setup requires reviewed server expiry and cannot fabricate it', () {
    final unavailable = HostOfferEventConfiguration.fromCallableData({
      'organizerId': 'organizer',
      'eventId': 'private-one',
      'eventSourceRevision': 2,
      'startsAtMillis': 1800000000000,
      'nowMillis': 1799990000000,
      'paymentTerms': null,
      'suggestedExpiresAtMillis': null,
    });
    expect(unavailable.suggestedExpiresAt, isNull);
    expect(() => HostOfferEventConfiguration.fromCallableData({
      'organizerId': 'organizer',
      'eventId': 'private-one',
      'eventSourceRevision': 2,
      'startsAtMillis': 1800000000000,
      'nowMillis': 1799990000000,
      'paymentTerms': null,
      'suggestedExpiresAtMillis': 1800000000001,
    }), throwsFormatException);
  });

  test('mixed or repeated picker identities fail closed', () {
    final event = {
      'eventId': 'event-one',
      'name': 'Run',
      'startTimeMillis': 1800000000000,
      'timezone': null,
      'publicationState': 'private',
      'setupRevision': 1,
    };
    expect(() => HostOfferEventTargetPage.fromCallableData({
      'events': [event, event], 'nextCursor': null,
    }), throwsFormatException);
    expect(() => HostOfferEventTargetPage.fromCallableData({
      'events': [{...event, 'publicationState': 'unknown'}],
      'nextCursor': null,
    }), throwsFormatException);
  });
}
