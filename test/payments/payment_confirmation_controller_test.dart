import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/kernel/brand.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/payments/presentation/payment_confirmation_controller.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';

final _l10n = AppLocalizationsEn();

void main() {
  test('builds a native calendar event from event details', () {
    final event = buildEvent(
      meetingPoint: 'Marine Drive',
      locationDetails: 'South entrance',
      startTime: DateTime.utc(2026, 5, 5, 18, 30),
      endTime: DateTime.utc(2026, 5, 5, 19, 30),
    );

    final calendarEvent = PaymentConfirmationController.calendarEvent(event);

    expect(calendarEvent.title, 'Tuesday Evening Run');
    expect(calendarEvent.startTime, DateTime.utc(2026, 5, 5, 18, 30));
    expect(calendarEvent.endTime, DateTime.utc(2026, 5, 5, 19, 30));
    expect(calendarEvent.location, 'Marine Drive, South entrance');
    expect(calendarEvent.description, contains('Catch event'));
    expect(calendarEvent.description, contains('5km · Easy'));
  });

  test('builds directions URI from coordinates when available', () {
    final event = buildEvent(
      startingPointLat: 19.076,
      startingPointLng: 72.878,
    );

    final uri = PaymentConfirmationController.directionsUri(event);

    expect(
      uri.toString(),
      'https://www.google.com/maps/dir/?api=1&destination=19.076%2C72.878&travelmode=walking',
    );
  });

  test(
    'builds directions URI from meeting point when coordinates are absent',
    () {
      final event = buildEvent().copyWith(
        meetingLocation: null,
        startingPointLat: null,
        startingPointLng: null,
      );

      final uri = PaymentConfirmationController.directionsUri(event);

      expect(uri.queryParameters['query'], 'Carter Road');
    },
  );

  test('builds invite and referral text without widget dependencies', () {
    final event = buildEvent(meetingPoint: 'Bandra');

    expect(
      PaymentConfirmationController.inviteSubject(event, _l10n),
      'Join me at ${event.title}',
    );
    expect(
      PaymentConfirmationController.inviteText(event, _l10n),
      contains('I just booked this. Come with me?'),
    );
    expect(
      PaymentConfirmationController.inviteText(event, _l10n),
      contains(Brand.webOrigin),
    );
    expect(
      PaymentConfirmationController.referralText(event, _l10n),
      contains('thought of you'),
    );
  });
}
