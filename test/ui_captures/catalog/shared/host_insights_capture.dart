// The Host insights report shared by the review and marketing insights
// captures: thirty days of bookings, the nights that did best, and where page
// visitors came from. Only the files that import this one depend on it.

import 'package:catch_dating_app/contexts/insights/data/host_analytics_repository.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';

import 'door_capture.dart';

/// The capture clock the report was generated at.
final hostInsightsNow = DateTime(2026, 10, 27, 17, 40);

HostAnalyticsEventRow hostInsightsNight(
  String id,
  String title,
  DateTime start, {
  required int booked,
  required num fillRate,
  required num rating,
  int revenue = 0,
  int payments = 0,
  int matches = 0,
}) => HostAnalyticsEventRow(
  eventId: id,
  organizerId: hostTodayOrganizer.id,
  title: title,
  startTime: start,
  status: 'completed',
  bookedCount: booked,
  checkedInCount: booked,
  waitlistedCount: 0,
  fillRate: fillRate,
  checkInRate: 100,
  grossRevenueMinor: revenue,
  currency: 'INR',
  checkoutStartedCount: payments,
  checkoutDropoffCount: 0,
  paymentCompletedCount: payments,
  paymentFailedCount: 0,
  paymentRefundedCount: 0,
  reviewCount: 14,
  averageRating: rating,
  demandCount: 0,
  inviteOpenCount: 0,
  mutualMatchCount: matches,
  chatStartedCount: 0,
  repeatAttendeeCount: 0,
);

HostAnalyticsReport hostInsightsReport({
  List<HostAnalyticsEventRow>? topEvents,
}) {
  final source = HostOperationsFixtures.analyticsReport;
  return HostAnalyticsReport(
    generatedAt: hostInsightsNow,
    timezone: 'Asia/Kolkata',
    summaryCards: const [
      HostAnalyticsMetricCard(
        id: HostAnalyticsMetricIds.bookings,
        label: 'Bookings',
        value: 312,
        previousValue: 264,
        unit: HostAnalyticsMetricUnit.count,
        status: HostAnalyticsMetricStatus.ready,
      ),
      HostAnalyticsMetricCard(
        id: HostAnalyticsMetricIds.revenue,
        label: 'Revenue',
        value: 14800000,
        previousValue: 13300000,
        unit: HostAnalyticsMetricUnit.moneyMinor,
        status: HostAnalyticsMetricStatus.ready,
      ),
    ],
    trend: [
      for (final (index, bookings) in const [58, 64, 71, 82, 37].indexed)
        HostAnalyticsTrendPoint(
          periodStart: DateTime(2026, 9, 29).add(Duration(days: 7 * index)),
          periodEnd: DateTime(2026, 10, 6).add(Duration(days: 7 * index)),
          metrics: {HostAnalyticsTrendKeys.bookings: bookings},
        ),
    ],
    topEvents:
        topEvents ??
        [
          hostInsightsNight(
            'design-insights-supper',
            'Long Table Supper',
            DateTime(2026, 10, 21, 20),
            booked: 14,
            fillRate: 100,
            rating: 4.9,
          ),
          hostInsightsNight(
            'design-insights-trivia',
            'Tuesday Trivia Night',
            DateTime(2026, 10, 20, 19, 30),
            booked: 29,
            fillRate: 96.67,
            rating: 4.8,
          ),
          hostInsightsNight(
            'design-insights-run',
            'Salt Air Social Run',
            DateTime(2026, 10, 18, 6, 30),
            booked: 32,
            fillRate: 80,
            rating: 4.7,
          ),
        ],
    reviewSummary: source.reviewSummary,
    discoverySummary: const HostAnalyticsDiscoverySummary(
      listingViews: 3412,
      searchAppearances: 0,
      eventViews: 0,
      organizerSaves: 0,
      eventSaves: 0,
      contactClicks: 0,
      claimClicks: 0,
      outboundClicks: 0,
      linkClicks: 1086,
    ),
    dataQuality: const [],
    linkSummary: const HostAnalyticsLinkSummary(
      trafficSources: {
        HostAnalyticsTrafficSource.instagram: 61,
        HostAnalyticsTrafficSource.whatsapp: 22,
        HostAnalyticsTrafficSource.direct: 11,
        HostAnalyticsTrafficSource.other: 6,
      },
    ),
  );
}
