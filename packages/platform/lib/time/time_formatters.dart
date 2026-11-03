import 'package:intl/intl.dart';

abstract final class AppTimeFormatters {
  static final DateFormat _month = DateFormat('MMM');
  static final DateFormat _monthLong = DateFormat('MMMM');
  static final DateFormat _weekdayShort = DateFormat('E');
  static final DateFormat _weekdayLong = DateFormat('EEEE');
  static final DateFormat _weekdayDayMonth = DateFormat('EEE d MMM');
  static final DateFormat _shortDate = DateFormat('E, d MMM');
  static final DateFormat _longDate = DateFormat('EEEE, d MMM');
  static final DateFormat _monthDay = DateFormat.MMMd();
  static final DateFormat _timeOfDay = DateFormat('h:mm a');
  static final DateFormat _dateTime = DateFormat('d MMM yyyy · h:mm a');

  static String shortMonth(DateTime dateTime) => _month.format(dateTime);

  static String longMonth(DateTime dateTime) => _monthLong.format(dateTime);

  static String shortWeekday(DateTime dateTime) =>
      _weekdayShort.format(dateTime);

  static String longWeekday(DateTime dateTime) => _weekdayLong.format(dateTime);

  static String weekdayDayMonth(DateTime dateTime) =>
      _weekdayDayMonth.format(dateTime);

  static String shortDate(DateTime dateTime) => _shortDate.format(dateTime);

  static String longDate(DateTime dateTime) => _longDate.format(dateTime);

  static String monthDay(DateTime dateTime) => _monthDay.format(dateTime);

  static String time(DateTime dateTime) => _timeOfDay.format(dateTime);

  static String chatTimestamp(DateTime? dateTime, {DateTime? now}) {
    if (dateTime == null) return '';
    final effectiveNow = now ?? DateTime.now();
    final age = effectiveNow.difference(dateTime);
    if (age.inDays == 0) return time(dateTime);
    if (age.inDays < 7) return shortWeekday(dateTime);
    return monthDay(dateTime);
  }

  /// Dense relative timestamp used by operational thread lists.
  ///
  /// Unlike [chatTimestamp], which keeps same-day clock time for the consumer
  /// inbox, this mirrors the Host design's recency labels (`12m`, `3h`, `2d`).
  static String compactRelativeTime(DateTime? dateTime, {DateTime? now}) {
    if (dateTime == null) return '';
    final effectiveNow = now ?? DateTime.now();
    final age = effectiveNow.difference(dateTime);
    if (age.isNegative) return chatTimestamp(dateTime, now: effectiveNow);
    if (age.inMinutes < 1) return 'now';
    if (age.inMinutes < 60) return '${age.inMinutes}m';
    if (age.inHours < 24) return '${age.inHours}h';
    if (age.inDays < 7) return '${age.inDays}d';
    return monthDay(dateTime);
  }

  static String clockTime({required int hour, required int minute}) {
    return time(DateTime(2000, 1, 1, hour, minute));
  }

  static String dateTime(DateTime dateTime) => _dateTime.format(dateTime);
}
