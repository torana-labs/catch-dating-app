import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/core/country_markets.dart';
import 'package:catch_dating_app/core/time_formatters.dart';
import 'package:catch_dating_app/core/time_zone_calendar.dart';

class EventFormatters {
  static String shortMonth(DateTime dateTime) =>
      AppTimeFormatters.shortMonth(dateTime);

  static String longMonth(DateTime dateTime) =>
      AppTimeFormatters.longMonth(dateTime);

  static String shortWeekday(DateTime dateTime) =>
      AppTimeFormatters.shortWeekday(dateTime);

  static String longWeekday(DateTime dateTime) =>
      AppTimeFormatters.longWeekday(dateTime);

  static String shortDate(DateTime dateTime) =>
      AppTimeFormatters.shortDate(dateTime);

  static String longDate(DateTime dateTime) =>
      AppTimeFormatters.longDate(dateTime);

  static String time(DateTime dateTime) => AppTimeFormatters.time(dateTime);

  static String timeRange(
    DateTime startTime,
    DateTime endTime, {
    String separator = ' – ',
  }) => '${time(startTime)}$separator${time(endTime)}';

  static String distanceKm(double distanceKm, {bool includeUnit = true}) {
    final value = distanceKm == distanceKm.roundToDouble()
        ? '${distanceKm.round()}'
        : distanceKm.toStringAsFixed(1);
    return includeUnit ? '${value}km' : value;
  }

  static String priceInPaise(
    int paise, {
    String currencyCode = defaultCurrencyCode,
  }) => formatMinorCurrency(paise, currencyCode: currencyCode);

  static String durationMinutes(int minutes) {
    final hours = minutes ~/ 60;
    final remainderMinutes = minutes % 60;
    if (hours == 0) return '${remainderMinutes}m';
    if (remainderMinutes == 0) return '${hours}h';
    return '${hours}h ${remainderMinutes}m';
  }
}

extension EventFormattingX on Event {
  DateTime localTime(DateTime instant) {
    final zone = eventTimezone;
    return zone != null && isIanaTimeZone(zone)
        ? timeZoneCalendarDateAtInstant(instant, zone)
        : instant;
  }

  DateTime get localStartTime => localTime(startTime);
  DateTime get localEndTime => localTime(endTime);

  String get shortDateLabel => EventFormatters.shortDate(localStartTime);
  String get longDateLabel => EventFormatters.longDate(localStartTime);
  String get timeRangeLabel =>
      EventFormatters.timeRange(localStartTime, localEndTime);
  String get compactTimeRangeLabel =>
      EventFormatters.timeRange(localStartTime, localEndTime, separator: '–');
  String get distanceLabel => eventFormat.isDistanceBased
      ? EventFormatters.distanceKm(distanceKm)
      : eventFormat.label;
  String get distanceValueLabel => eventFormat.isDistanceBased
      ? EventFormatters.distanceKm(distanceKm, includeUnit: false)
      : eventFormat.label;
  String get activitySummaryLabel => eventFormat.isDistanceBased
      ? '${EventFormatters.distanceKm(distanceKm)} · ${pace.label}'
      : eventFormat.label;
  String get spotsLabel => '$signedUpCount/$capacityLimit';
}
