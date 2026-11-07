import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_event_roster_insights.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/parts/event_catch_format.dart';
import 'package:catch_dating_app/contexts/insights/data/host_analytics_repository.dart';
import 'package:catch_dating_app/contexts/insights/parts/host_analytics_bar_indicator.dart';
import 'package:catch_dating_app/contexts/insights/parts/host_analytics_night_row.dart';
import 'package:catch_dating_app/contexts/insights/parts/host_analytics_source_meter.dart';
import 'package:catch_dating_app/contexts/reviews/data/reviews_repository.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/hosts/insights/host_event_report_state.dart';
import 'package:catch_dating_app/hosts/insights/host_insights_state.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_screen_state.dart';
import 'package:catch_kernel/city_catalog.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart' show DateUtils;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_insights_controller.g.dart';

/// Which organizer Insights is for, over which period.
@immutable
class HostInsightsRequest {
  const HostInsightsRequest({
    required this.organizerId,
    required this.range,
    this.cityName,
  });

  final String organizerId;
  final HostInsightsRange range;

  /// The organizer's city: the report's fallback timezone and its currency.
  final String? cityName;

  @override
  bool operator ==(Object other) =>
      other is HostInsightsRequest &&
      other.organizerId == organizerId &&
      other.range == range &&
      other.cityName == cityName;

  @override
  int get hashCode => Object.hash(organizerId, range, cityName);
}

/// The organizer's report for one period through the cached host-reports
/// read ([hostAnalyticsProvider], tagged `hostReports`): the stats, bookings
/// per day or week, where visitors came from and the fullest nights.
@riverpod
HostInsightsState hostInsightsController(Ref ref, HostInsightsRequest request) {
  final read = _read(ref, request.cityName, _query(request));
  if (read == null) return HostInsightsState.loading(request.range);
  final value = ref.watch(hostAnalyticsProvider(read));
  final report = value.value?.data;
  if (report == null) {
    return switch (value) {
      AsyncValue(:final error?, :final stackTrace) => HostInsightsState(
        status: HostInsightsStatus.error,
        range: request.range,
        error: error,
        stackTrace: stackTrace,
      ),
      _ => HostInsightsState.loading(request.range),
    };
  }
  return hostInsightsStateFor(
    report,
    range: request.range,
    currencyCode: currencyCodeForCityName(request.cityName),
  );
}

/// Starts the report read again after it failed.
void retryHostInsights(WidgetRef ref, HostInsightsRequest request) {
  final read = _readNow(ref, request.cityName, _query(request));
  if (read != null) ref.invalidate(hostAnalyticsProvider(read));
}

/// One report as the Insights state.
@visibleForTesting
HostInsightsState hostInsightsStateFor(
  HostAnalyticsReport report, {
  required HostInsightsRange range,
  required String currencyCode,
}) {
  final cards = {for (final card in report.summaryCards) card.id: card};
  HostInsightsStat? stat(
    String id,
    HostInsightsStatKind kind, {
    String? currencyCode,
  }) {
    final card = cards[id];
    if (card == null || card.status == HostAnalyticsMetricStatus.missing) {
      return null;
    }
    return HostInsightsStat(
      kind: kind,
      value: card.value,
      previousValue: card.previousValue,
      currencyCode: currencyCode,
    );
  }

  final nights =
      [
        for (final event in report.topEvents)
          if (event.bookedCount > 0) event,
      ]..sort((a, b) {
        final fill = b.fillRate.compareTo(a.fillRate);
        return fill != 0 ? fill : b.bookedCount.compareTo(a.bookedCount);
      });
  return HostInsightsState(
    status: HostInsightsStatus.content,
    range: range,
    stats: List.unmodifiable([
      ?stat(HostAnalyticsMetricIds.bookings, HostInsightsStatKind.bookings),
      ?stat(
        HostAnalyticsMetricIds.revenue,
        HostInsightsStatKind.ticketSales,
        currencyCode: currencyCode,
      ),
    ]),
    bars: List.unmodifiable([
      for (final point in report.trend)
        HostAnalyticsBar(
          periodStart: point.periodStart,
          value: point.metrics[HostAnalyticsTrendKeys.bookings] ?? 0,
          partial: point.periodEnd.isAfter(report.generatedAt),
        ),
    ]),
    sources: List.unmodifiable([
      for (final entry in report.linkSummary.trafficSources.entries)
        HostAnalyticsSourceShare(source: entry.key.name, count: entry.value),
    ]),
    visits: report.discoverySummary.listingViews,
    linkClicks: report.discoverySummary.linkClicks,
    nights: List.unmodifiable([
      for (final event in nights.take(3))
        HostAnalyticsNight(
          eventId: event.eventId,
          title: event.title,
          startTime: event.startTime,
          booked: event.bookedCount,
          capacity: event.fillRate > 0
              ? (event.bookedCount * 100 / event.fillRate).round()
              : null,
          rating: event.averageRating > 0 ? event.averageRating : null,
        ),
    ]),
  );
}

HostAnalyticsQuery _query(HostInsightsRequest request) => HostAnalyticsQuery(
  organizerId: request.organizerId,
  rangePreset: switch (request.range) {
    HostInsightsRange.sevenDays => HostAnalyticsRangePreset.sevenDays,
    HostInsightsRange.thirtyDays => HostAnalyticsRangePreset.thirtyDays,
    HostInsightsRange.ninetyDays => HostAnalyticsRangePreset.ninetyDays,
  },
  granularity: request.range == HostInsightsRange.sevenDays
      ? HostAnalyticsGranularity.day
      : HostAnalyticsGranularity.week,
);

HostAnalyticsRead? _read(Ref ref, String? cityName, HostAnalyticsQuery query) {
  final session = ref.watch(authenticatedSessionProvider).value;
  if (session == null) return null;
  final timezone =
      ref.watch(hostAnalyticsDeviceTimezoneProvider).value ??
      marketForCityName(cityName).timeZone;
  return HostAnalyticsRead(session, _withTimezone(query, timezone));
}

HostAnalyticsRead? _readNow(
  WidgetRef ref,
  String? cityName,
  HostAnalyticsQuery query,
) {
  final session = ref.read(authenticatedSessionProvider).value;
  if (session == null) return null;
  final timezone =
      ref.read(hostAnalyticsDeviceTimezoneProvider).value ??
      marketForCityName(cityName).timeZone;
  return HostAnalyticsRead(session, _withTimezone(query, timezone));
}

HostAnalyticsQuery _withTimezone(HostAnalyticsQuery query, String timezone) =>
    HostAnalyticsQuery(
      organizerId: query.organizerId,
      eventId: query.eventId,
      rangePreset: query.rangePreset,
      startDate: query.startDate,
      endDate: query.endDate,
      granularity: query.granularity,
      timezone: timezone,
    );

/// Which past event the report is for, and the minute it is read.
@immutable
class HostEventReportRequest {
  HostEventReportRequest({
    required this.event,
    required DateTime now,
    this.cityName,
  }) : now = DateTime(now.year, now.month, now.day, now.hour, now.minute);

  final Event event;
  final DateTime now;
  final String? cityName;

  /// The event's report covers the ninety days before it (when bookings and
  /// payments land) to today (when reviews do), within the callable's
  /// year-long limit.
  HostAnalyticsQuery get query {
    final day = DateUtils.dateOnly(event.startTime);
    final start = day.subtract(const Duration(days: 90));
    final today = DateUtils.dateOnly(now);
    final latest = start.add(const Duration(days: 365));
    return HostAnalyticsQuery(
      organizerId: event.organizerId,
      eventId: event.id,
      rangePreset: HostAnalyticsRangePreset.custom,
      startDate: start,
      endDate: today.isAfter(latest)
          ? latest
          : today.isBefore(day)
          ? day
          : today,
    );
  }

  @override
  bool operator ==(Object other) =>
      other is HostEventReportRequest &&
      other.event == event &&
      other.now == now &&
      other.cityName == cityName;

  @override
  int get hashCode => Object.hash(event, now, cityName);
}

/// The report for one past event, composed from its read owners: the
/// participation roster (who booked and came), the roster view (new faces),
/// the attendees (the faces), the reviews, the organizer's coming events,
/// and the event's row in the cached host report (ticket sales, payments and
/// pairs who matched). A failed or pending report leaves those figures out.
@riverpod
HostEventReportState hostEventReportController(
  Ref ref,
  HostEventReportRequest request,
) {
  final event = request.event;
  final rosterValue = ref.watch(
    watchEventParticipationRosterProvider(event.id),
  );
  final roster = rosterValue.value;
  if (roster == null) {
    return switch (rosterValue) {
      AsyncValue(:final error?, :final stackTrace) => HostEventReportState(
        status: HostEventReportStatus.error,
        event: event,
        error: error,
        stackTrace: stackTrace,
      ),
      _ => HostEventReportState(
        status: HostEventReportStatus.loading,
        event: event,
      ),
    };
  }
  final insights = ref.watch(hostEventRosterInsightsProvider(event.id)).value;
  final attendees = ref.watch(watchEventAttendeesProvider(event.id)).value;
  final reviews = ref.watch(watchReviewsForEventProvider(event.id)).value;
  final coming = ref
      .watch(
        watchActiveEventsForOrganizerProvider(
          ActiveOrganizerEventsQuery(
            organizerId: event.organizerId,
            day: request.now,
          ),
        ),
      )
      .value;
  final read = _read(ref, request.cityName, request.query);
  final report = read == null
      ? null
      : catchAsyncStateFromAsyncValue(
          ref.watch(hostAnalyticsProvider(read)),
        ).value?.data;
  final row = report?.topEvents
      .where((row) => row.eventId == event.id)
      .firstOrNull;
  final rated = [
    for (final review in reviews ?? const <Review>[])
      if (review.rating > 0) review.rating,
  ];
  final next =
      (coming ?? const <Event>[])
          .where(
            (other) =>
                other.id != event.id &&
                !other.isCancelled &&
                other.startTime.isAfter(request.now),
          )
          .toList()
        ..sort((a, b) => a.startTime.compareTo(b.startTime));

  return HostEventReportState(
    status: HostEventReportStatus.content,
    event: event,
    format: catchFormatForActivity(event.activityKind),
    booked: hostManageBookedCount(event, roster),
    came: hostManageCheckedInCount(event, roster),
    newFaces:
        insights == null ||
            insights.sourceCoverage == HostRosterInsightCoverage.missing
        ? null
        : insights.rows
              .where(
                (row) =>
                    row.signals.contains(HostRosterInsightSignal.firstTime),
              )
              .length,
    ticketSalesMinor: row?.grossRevenueMinor,
    currencyCode: row?.currency ?? event.currency,
    payments: row?.paymentCompletedCount,
    rating: rated.isEmpty
        ? null
        : rated.fold<int>(0, (sum, rating) => sum + rating) / rated.length,
    ratingCount: rated.length,
    stayInTouch: row == null || row.mutualMatchCount <= 0
        ? null
        : row.mutualMatchCount,
    people: [
      for (final attendee in (attendees ?? const []).take(3))
        attendee.displayName,
    ],
    reviews: List.unmodifiable((reviews ?? const <Review>[]).take(2)),
    reviewCount: reviews?.length ?? 0,
    nextEvent: next.firstOrNull,
    tonight:
        DateUtils.isSameDay(event.startTime, request.now) ||
        DateUtils.isSameDay(event.endTime, request.now),
  );
}

/// Starts again the reads behind the report after the roster failed.
void retryHostEventReport(WidgetRef ref, HostEventReportRequest request) {
  ref.invalidate(watchEventParticipationRosterProvider(request.event.id));
  final read = _readNow(ref, request.cityName, request.query);
  if (read != null && ref.read(hostAnalyticsProvider(read)).hasError) {
    ref.invalidate(hostAnalyticsProvider(read));
  }
}
