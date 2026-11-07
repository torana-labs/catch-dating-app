import 'package:catch_dating_app/contexts/insights/parts/host_analytics_bar_chart.dart';
import 'package:catch_dating_app/contexts/insights/parts/host_analytics_night_row.dart';
import 'package:catch_dating_app/contexts/insights/parts/host_analytics_source_meter.dart';
import 'package:flutter/foundation.dart';

/// The periods Insights offers.
enum HostInsightsRange { sevenDays, thirtyDays, ninetyDays }

/// Where Insights is: reading the report, showing it, or unable to read it.
enum HostInsightsStatus { loading, content, error }

/// The figures at the top of Insights.
enum HostInsightsStatKind { bookings, ticketSales }

@immutable
class HostInsightsStat {
  const HostInsightsStat({
    required this.kind,
    required this.value,
    this.previousValue,
    this.currencyCode,
  });

  final HostInsightsStatKind kind;
  final num value;

  /// The same figure for the period before, for the change note.
  final num? previousValue;

  /// Set for money in minor units.
  final String? currencyCode;
}

/// Everything the Insights body shows for one period, as plain values.
@immutable
class HostInsightsState {
  const HostInsightsState({
    required this.status,
    required this.range,
    this.stats = const <HostInsightsStat>[],
    this.bars = const <HostAnalyticsBar>[],
    this.sources = const <HostAnalyticsSourceShare>[],
    this.visits = 0,
    this.linkClicks = 0,
    this.nights = const <HostAnalyticsNight>[],
    this.error,
    this.stackTrace,
  });

  const HostInsightsState.loading(this.range)
    : status = HostInsightsStatus.loading,
      stats = const <HostInsightsStat>[],
      bars = const <HostAnalyticsBar>[],
      sources = const <HostAnalyticsSourceShare>[],
      visits = 0,
      linkClicks = 0,
      nights = const <HostAnalyticsNight>[],
      error = null,
      stackTrace = null;

  final HostInsightsStatus status;
  final HostInsightsRange range;
  final List<HostInsightsStat> stats;

  /// Bookings per day over seven days, per week otherwise, oldest first.
  final List<HostAnalyticsBar> bars;

  /// Link clicks on the organizer's page by where the visitor came from.
  final List<HostAnalyticsSourceShare> sources;

  /// Visits to the organizer's page in the period.
  final int visits;

  /// Clicks on the page's links in the period.
  final int linkClicks;

  /// The period's events, fullest first.
  final List<HostAnalyticsNight> nights;
  final Object? error;
  final StackTrace? stackTrace;

  /// Bars are one per day on the seven-day view.
  bool get daily => range == HostInsightsRange.sevenDays;

  bool get hasBookings => bars.any((bar) => bar.value > 0);

  bool get hasSources => sources.any((share) => share.count > 0);

  bool get hasVisits => visits > 0 || linkClicks > 0;
}
