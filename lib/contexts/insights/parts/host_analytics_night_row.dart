import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

/// One event in a host report, as the fullest-nights list reads it.
@immutable
class HostAnalyticsNight {
  const HostAnalyticsNight({
    required this.eventId,
    required this.title,
    required this.startTime,
    required this.booked,
    this.capacity,
    this.rating,
    this.format,
  });

  final String eventId;
  final String title;
  final DateTime startTime;
  final int booked;

  /// The places the event offered; null when the report has no capacity.
  final int? capacity;

  /// The average guest rating; null before anyone rated it.
  final num? rating;

  /// The event's format colour, when the events read knows its activity.
  final CatchFormat? format;

  /// Booked against capacity as a whole percentage, or null without one.
  int? get fillPercent {
    final capacity = this.capacity;
    if (capacity == null || capacity <= 0) return null;
    return (booked / capacity * 100).round();
  }

  @override
  bool operator ==(Object other) =>
      other is HostAnalyticsNight &&
      other.eventId == eventId &&
      other.title == title &&
      other.startTime == startTime &&
      other.booked == booked &&
      other.capacity == capacity &&
      other.rating == rating &&
      other.format == format;

  @override
  int get hashCode =>
      Object.hash(eventId, title, startTime, booked, capacity, rating, format);
}

/// A reported event as a system list row: the day-and-date tile, places
/// booked and the rating, Full (in success) or the fill percentage, and the
/// fill meter.
class HostAnalyticsNightRow extends StatelessWidget {
  const HostAnalyticsNightRow({super.key, required this.night, this.onTap});

  final HostAnalyticsNight night;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final start = night.startTime;
    final capacity = night.capacity;
    final fill = night.fillPercent;
    final full = fill != null && fill >= 100;
    final booked = capacity == null
        ? l10n.hostInsightsNightBooked(booked: night.booked)
        : l10n.hostInsightsNightBookedOf(
            booked: night.booked,
            capacity: capacity,
          );
    final rating = night.rating;
    return CatchIndexRow(
      title: night.title,
      onTap: onTap,
      date: CatchIndexRowDate(
        day: DateFormat.E(
          Localizations.localeOf(context).toLanguageTag(),
        ).format(start),
        date: '${start.day}',
        format: night.format,
      ),
      meta: rating == null || rating <= 0
          ? booked
          : l10n.hostInsightsNightRated(
              booked: booked,
              rating: rating.toStringAsFixed(1),
            ),
      status: fill == null
          ? null
          : full
          ? l10n.hostTodayWeekFull
          : l10n.hostInsightsNightFill(percent: fill),
      statusTone: full ? CatchIndexRowTone.success : CatchIndexRowTone.neutral,
      progress: capacity == null || capacity <= 0
          ? null
          : CatchIndexRowProgress(
              value: night.booked.clamp(0, capacity),
              max: capacity,
              label: l10n.hostTodayCountBooked,
            ),
      density: CatchIndexRowSize.regular,
    );
  }
}
