import 'package:catch_dating_app/core/time_zone_calendar.dart';

enum ProgramTimezoneSource { organizer, city, device, manual }

class ProgramTimezoneDefault {
  const ProgramTimezoneDefault(this.identifier, this.source);

  final String identifier;
  final ProgramTimezoneSource source;
}

/// Only validated named zones can become a new program's default. Persisted
/// selections and submitted commands are handled before calling this resolver.
ProgramTimezoneDefault resolveProgramTimezoneDefault({
  String? organizerTimezone,
  String? cityTimezone,
  String? deviceTimezone,
}) {
  for (final candidate in [
    (organizerTimezone, ProgramTimezoneSource.organizer),
    (cityTimezone, ProgramTimezoneSource.city),
    (deviceTimezone, ProgramTimezoneSource.device),
  ]) {
    final identifier = candidate.$1?.trim();
    if (identifier != null &&
        identifier.isNotEmpty &&
        identifier.length <= 60 &&
        isIanaTimeZone(identifier)) {
      return ProgramTimezoneDefault(identifier, candidate.$2);
    }
  }
  return const ProgramTimezoneDefault('', ProgramTimezoneSource.manual);
}
