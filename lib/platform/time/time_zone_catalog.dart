import 'package:catch_dating_app/kernel/city_catalog.dart';
import 'package:catch_dating_app/platform/time/time_zone_calendar.dart';
import 'package:timezone/timezone.dart' as tz;

/// Uses the same bundled IANA database as program validation and scheduling.
List<String> ianaTimeZoneOptions({String selected = '', String query = ''}) {
  isIanaTimeZone('UTC'); // Initializes the shared database once.
  final terms = query.trim().toLowerCase().split(RegExp(r'\s+'));
  final identifiers = tz.timeZoneDatabase.locations.keys.where((identifier) {
    if (identifier.length > 60) {
      return false;
    }
    final searchable = [
      identifier.replaceAll('_', ' '),
      for (final city in defaultCityOptions)
        if (city.timeZone == identifier)
          [
            city.label,
            city.name,
            city.effectiveSlug,
            ...city.aliases,
          ].join(' ').replaceAll('-', ' '),
      if (identifier == 'Asia/Kolkata')
        'India New Delhi Mumbai Chennai Bengaluru Bangalore IST',
    ].join(' ').toLowerCase();
    return terms.every(searchable.contains);
  }).toList()..sort();
  // Keep the current selection reachable without duplicating it.
  if (identifiers.remove(selected)) identifiers.insert(0, selected);
  return List.unmodifiable(identifiers);
}

/// Geographic names come from IANA. User-facing explanatory copy is localized
/// by the caller; offsets reflect the selected program date, including DST.
String timeZoneUtcOffset(String identifier, DateTime date) {
  isIanaTimeZone('UTC');
  final location = tz.getLocation(identifier);
  final local = tz.TZDateTime(location, date.year, date.month, date.day);
  final minutes = local.timeZoneOffset.inMinutes;
  final absolute = minutes.abs();
  final hours = (absolute ~/ 60).toString().padLeft(2, '0');
  final remainder = (absolute % 60).toString().padLeft(2, '0');
  return 'UTC${minutes < 0 ? '-' : '+'}$hours:$remainder';
}

String timeZonePlace(String identifier) =>
    identifier.split('/').reversed.join(' · ').replaceAll('_', ' ');
