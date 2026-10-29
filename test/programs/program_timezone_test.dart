import 'package:catch_dating_app/contexts/programmes/domain/program_timezone.dart';
import 'package:catch_dating_app/platform/time/time_zone_catalog.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('organizer, city and device defaults have explicit precedence', () {
    final organizer = resolveProgramTimezoneDefault(
      organizerTimezone: ' Asia/Kolkata ',
      cityTimezone: 'Europe/London',
      deviceTimezone: 'America/New_York',
    );
    expect(organizer.identifier, 'Asia/Kolkata');
    expect(organizer.source, ProgramTimezoneSource.organizer);
    final city = resolveProgramTimezoneDefault(
      organizerTimezone: 'india/new_delhi',
      cityTimezone: 'Europe/London',
      deviceTimezone: 'America/New_York',
    );
    expect(city.identifier, 'Europe/London');
    expect(city.source, ProgramTimezoneSource.city);
    expect(
      resolveProgramTimezoneDefault(deviceTimezone: 'Asia/Kathmandu').source,
      ProgramTimezoneSource.device,
    );
    expect(
      resolveProgramTimezoneDefault(deviceTimezone: 'invalid').identifier,
      isEmpty,
    );
  });

  test('search accepts city names and technical identifiers', () {
    expect(ianaTimeZoneOptions(query: 'new delhi'), contains('Asia/Kolkata'));
    expect(ianaTimeZoneOptions(query: 'india'), contains('Asia/Kolkata'));
    expect(
      ianaTimeZoneOptions(query: 'San Francisco'),
      contains('America/Los_Angeles'),
    );
    expect(
      ianaTimeZoneOptions(query: 'new york'),
      contains('America/New_York'),
    );
    expect(ianaTimeZoneOptions(query: 'Asia/Kathmandu'), ['Asia/Kathmandu']);
    expect(ianaTimeZoneOptions(query: 'india/new_delhi'), isEmpty);
    final options = ianaTimeZoneOptions(selected: 'Europe/London');
    expect(options.first, 'Europe/London');
    expect(options.toSet().length, options.length);
  });

  test('offsets use the program date and preserve fractional hour zones', () {
    expect(
      timeZoneUtcOffset('Asia/Kolkata', DateTime(2026, 10, 16)),
      'UTC+05:30',
    );
    expect(
      timeZoneUtcOffset('Asia/Kathmandu', DateTime(2026, 10, 16)),
      'UTC+05:45',
    );
    expect(
      timeZoneUtcOffset('America/New_York', DateTime(2026, 1, 16)),
      'UTC-05:00',
    );
    expect(
      timeZoneUtcOffset('America/New_York', DateTime(2026, 7, 16)),
      'UTC-04:00',
    );
  });
}
