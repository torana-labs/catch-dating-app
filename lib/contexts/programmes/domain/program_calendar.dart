import 'package:catch_dating_app/core/time_zone_calendar.dart';

bool isProgramTimeZone(String identifier) => isIanaTimeZone(identifier);

/// Resolves a date-picker calendar value to midnight in the program's IANA
/// timezone. The device timezone never participates in the resulting instant.
DateTime programCalendarDateInstant(DateTime date, String identifier) {
  return timeZoneCalendarDateInstant(date, identifier);
}

/// Projects a stored instant back into the Program's civil calendar. Date
/// labels must use this value instead of the device timezone.
DateTime programCalendarDateAtInstant(DateTime instant, String identifier) {
  return timeZoneCalendarDateAtInstant(instant, identifier);
}
