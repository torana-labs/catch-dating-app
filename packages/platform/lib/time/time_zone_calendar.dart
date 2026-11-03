import 'package:timezone/data/latest.dart' as timezone_data;
import 'package:timezone/timezone.dart' as timezone;

bool _initialized = false;

void _ensureTimeZones() {
  if (_initialized) return;
  timezone_data.initializeTimeZones();
  _initialized = true;
}

bool isIanaTimeZone(String identifier) {
  _ensureTimeZones();
  try {
    timezone.getLocation(identifier.trim());
    return true;
  } on timezone.LocationNotFoundException {
    return false;
  }
}

DateTime timeZoneCalendarDateInstant(DateTime date, String identifier) {
  _ensureTimeZones();
  final location = timezone.getLocation(identifier.trim());
  return timezone.TZDateTime(location, date.year, date.month, date.day);
}

DateTime timeZoneCalendarDateAtInstant(DateTime instant, String identifier) {
  _ensureTimeZones();
  final location = timezone.getLocation(identifier.trim());
  return timezone.TZDateTime.from(instant, location);
}
