import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/core/time_formatters.dart';
import 'package:flutter_test/flutter_test.dart';

import 'events_test_helpers.dart';

void main() {
  group('EventFormatters', () {
    final dateTime = DateTime(2025, 4, 23, 6, 30);

    test('formats short and long date labels', () {
      expect(EventFormatters.shortMonth(dateTime), 'Apr');
      expect(EventFormatters.shortWeekday(dateTime), 'Wed');
      expect(EventFormatters.longWeekday(dateTime), 'Wednesday');
      expect(AppTimeFormatters.weekdayDayMonth(dateTime), 'Wed 23 Apr');
      expect(EventFormatters.shortDate(dateTime), 'Wed, 23 Apr');
      expect(EventFormatters.longDate(dateTime), 'Wednesday, 23 Apr');
    });

    test('formats times and time ranges', () {
      final endTime = DateTime(2025, 4, 23, 7, 45);

      expect(EventFormatters.time(dateTime), '6:30 AM');
      expect(EventFormatters.timeRange(dateTime, endTime), '6:30 AM – 7:45 AM');
      expect(
        EventFormatters.timeRange(dateTime, endTime, separator: ' to '),
        '6:30 AM to 7:45 AM',
      );
    });

    test('formats distances, prices, and durations', () {
      expect(EventFormatters.distanceKm(5), '5km');
      expect(EventFormatters.distanceKm(5.5), '5.5km');
      expect(EventFormatters.distanceKm(5.5, includeUnit: false), '5.5');
      expect(EventFormatters.priceInPaise(25000), '₹250');
      expect(EventFormatters.priceInPaise(24950), '₹249.50');
      expect(EventFormatters.priceInPaise(100000), '₹1,000');
      expect(EventFormatters.priceInPaise(2500, currencyCode: 'AUD'), 'A\$25');
      expect(
        EventFormatters.priceInPaise(1999, currencyCode: 'USD'),
        '\$19.99',
      );
      expect(
        EventFormatters.priceInPaise(50000, currencyCode: 'NPR'),
        'Rs 500',
      );
      expect(EventFormatters.priceInPaise(2500, currencyCode: 'JPY'), '¥2,500');
      expect(
        EventFormatters.priceInPaise(1999, currencyCode: 'ZAR'),
        'ZAR 19.99',
      );
      expect(EventFormatters.durationMinutes(45), '45m');
      expect(EventFormatters.durationMinutes(120), '2h');
      expect(EventFormatters.durationMinutes(90), '1h 30m');
    });
  });

  group('EventFormattingX', () {
    test('adds shared display labels to events', () {
      final event = buildEvent(
        startTime: DateTime(2025, 4, 23, 6, 30),
        endTime: DateTime(2025, 4, 23, 7, 45),
        distanceKm: 5.5,
        bookedCount: 2,
      );

      expect(event.shortDateLabel, 'Wed, 23 Apr');
      expect(event.longDateLabel, 'Wednesday, 23 Apr');
      expect(event.timeRangeLabel, '6:30 AM – 7:45 AM');
      expect(event.compactTimeRangeLabel, '6:30 AM–7:45 AM');
      expect(event.distanceLabel, '5.5km');
      expect(event.distanceValueLabel, '5.5');
      expect(event.activitySummaryLabel, '5.5km · Easy');
      expect(event.spotsLabel, '2/20');
    });

    test('uses activity labels for non-distance event formats', () {
      final event = buildEvent(
        eventFormat: EventFormatSnapshot.fromActivityKind(ActivityKind.dinner),
        distanceKm: 0,
      );

      expect(event.distanceLabel, 'Dinner');
      expect(event.distanceValueLabel, 'Dinner');
      expect(event.activitySummaryLabel, 'Dinner');
    });
  });
}
