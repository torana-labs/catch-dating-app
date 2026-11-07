import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_event_roster_insights.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation_roster.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/insights/data/host_analytics_repository.dart';
import 'package:catch_dating_app/contexts/reviews/data/reviews_repository.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/insights/host_event_report_state.dart';
import 'package:catch_dating_app/hosts/insights/host_insights_controller.dart';
import 'package:catch_dating_app/hosts/insights/host_insights_state.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';
import '../today/host_today_fixtures.dart';

const _uid = 'host-1';

HostAnalyticsEventRow _row(
  String id, {
  required int booked,
  required num fillRate,
  num rating = 0,
  int revenue = 0,
  int payments = 0,
  int matches = 0,
}) => HostAnalyticsEventRow(
  eventId: id,
  organizerId: 'org-1',
  title: 'Event $id',
  startTime: DateTime(2026, 10, 20, 19),
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
  reviewCount: 0,
  averageRating: rating,
  demandCount: 0,
  inviteOpenCount: 0,
  mutualMatchCount: matches,
  chatStartedCount: 0,
  repeatAttendeeCount: 0,
);

HostAnalyticsReport _report({
  List<HostAnalyticsEventRow> topEvents = const [],
}) {
  final source = HostOperationsFixtures.analyticsReport;
  return HostAnalyticsReport(
    generatedAt: DateTime(2026, 10, 30, 12),
    summaryCards: source.summaryCards,
    trend: [
      HostAnalyticsTrendPoint(
        periodStart: DateTime(2026, 10, 20),
        periodEnd: DateTime(2026, 10, 27),
        metrics: const {HostAnalyticsTrendKeys.bookings: 82},
      ),
      HostAnalyticsTrendPoint(
        periodStart: DateTime(2026, 10, 27),
        periodEnd: DateTime(2026, 11, 3),
        metrics: const {HostAnalyticsTrendKeys.bookings: 37},
      ),
    ],
    topEvents: topEvents,
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
      },
    ),
  );
}

final class _QueryRecordingRepository implements HostAnalyticsRepository {
  _QueryRecordingRepository(this.report);

  final HostAnalyticsReport report;
  final queries = <HostAnalyticsQuery>[];

  @override
  Future<HostAnalyticsReport> getHostAnalytics(HostAnalyticsQuery query) async {
    queries.add(query);
    return report;
  }
}

ProviderContainer _container(
  HostAnalyticsRepository repository, {
  List<Override> overrides = const [],
}) => ProviderContainer.test(
  overrides: [
    uidProvider.overrideWith((ref) => Stream.value(_uid)),
    hostAnalyticsRepositoryProvider.overrideWithValue(repository),
    hostAnalyticsDeviceTimezoneProvider.overrideWith(
      (ref) async => 'Asia/Kolkata',
    ),
    ...overrides,
  ],
);

void main() {
  group('hostInsightsController', () {
    const request = HostInsightsRequest(
      organizerId: 'org-1',
      range: HostInsightsRange.thirtyDays,
      cityName: 'Mumbai',
    );

    test('reads the period through the cached report and maps it', () async {
      final repository = _QueryRecordingRepository(
        _report(
          topEvents: [
            _row('half', booked: 10, fillRate: 50, rating: 4.2),
            _row('full', booked: 14, fillRate: 100, rating: 4.9),
            _row('empty', booked: 0, fillRate: 0),
            _row('most', booked: 29, fillRate: 96.67),
          ],
        ),
      );
      final container = _container(repository);
      container.listen(hostInsightsControllerProvider(request), (_, _) {});
      expect(
        container.read(hostInsightsControllerProvider(request)).status,
        HostInsightsStatus.loading,
      );

      await flushTestEventQueue();
      final state = container.read(hostInsightsControllerProvider(request));
      expect(state.status, HostInsightsStatus.content);
      expect(repository.queries.single.rangePreset.wireValue, '30d');
      expect(repository.queries.single.granularity?.wireValue, 'week');
      expect(repository.queries.single.timezone, 'Asia/Kolkata');
      expect(state.stats.map((stat) => stat.kind), [
        HostInsightsStatKind.bookings,
        HostInsightsStatKind.ticketSales,
      ]);
      expect(state.stats.last.currencyCode, 'INR');
      expect(state.bars.map((bar) => bar.value), [82, 37]);
      expect(state.bars.map((bar) => bar.partial), [false, true]);
      expect(state.sources.map((share) => share.source), [
        'instagram',
        'whatsapp',
      ]);
      expect(state.visits, 3412);
      expect(state.linkClicks, 1086);
      expect(state.nights.map((night) => night.eventId), [
        'full',
        'most',
        'half',
      ]);
      expect(state.nights.first.capacity, 14);
      expect(state.nights[1].capacity, 30);
      expect(state.nights[1].rating, isNull);
    });

    test('seven days asks for one bar per day', () async {
      final repository = _QueryRecordingRepository(_report());
      const week = HostInsightsRequest(
        organizerId: 'org-1',
        range: HostInsightsRange.sevenDays,
      );
      final container = _container(repository);
      container.listen(hostInsightsControllerProvider(week), (_, _) {});
      await flushTestEventQueue();

      expect(repository.queries.single.rangePreset.wireValue, '7d');
      expect(repository.queries.single.granularity?.wireValue, 'day');
      expect(container.read(hostInsightsControllerProvider(week)).daily, true);
    });

    test('a failed report is the screen error', () async {
      final container = _container(
        HostFixtureAnalyticsRepository(error: StateError('report failed')),
      );
      container.listen(hostInsightsControllerProvider(request), (_, _) {});
      await flushTestEventQueue();

      final state = container.read(hostInsightsControllerProvider(request));
      expect(state.status, HostInsightsStatus.error);
      expect(state.error, isA<StateError>());
    });
  });

  group('hostEventReportController', () {
    final event = todayEvent(
      'trivia',
      start: DateTime(2026, 10, 27, 19, 30),
      booked: 24,
    );
    final next = todayEvent('next', start: DateTime(2026, 11, 3, 19, 30));
    final now = DateTime(2026, 10, 27, 23);
    final request = HostEventReportRequest(
      event: event,
      now: now,
      cityName: 'Mumbai',
    );

    EventAttendee attendee(String name) => EventAttendee(
      id: 'a-$name',
      eventId: event.id,
      organizerId: 'org-1',
      displayName: name,
      searchName: name.toLowerCase(),
      source: EventAttendeeSource.catchBooking,
      status: EventAttendeeStatus.registered,
      createdAt: now,
      updatedAt: now,
    );

    Review review(String id, int rating) => Review(
      id: id,
      organizerId: 'org-1',
      eventId: event.id,
      reviewerName: 'Guest $id',
      rating: rating,
      comment: 'Good night',
      createdAt: now,
    );

    List<Override> reads({
      required Stream<EventParticipationRoster> roster,
      List<Event> coming = const [],
    }) => [
      watchEventParticipationRosterProvider(
        event.id,
      ).overrideWith((ref) => roster),
      hostEventRosterInsightsProvider(event.id).overrideWith(
        (ref) => Stream.value(
          HostEventRosterInsights(
            eventId: event.id,
            organizerId: 'org-1',
            cutoffAt: event.startTime,
            sourceCoverage: HostRosterInsightCoverage.exact,
            spendCoverage: HostRosterSpendCoverage.catchPaymentsOnly,
            rows: [
              for (var index = 0; index < 4; index++)
                HostEventRosterInsight(
                  attendeeId: 'r$index',
                  contactId: null,
                  availability: HostRosterInsightAvailability.ready,
                  signals: {
                    index < 3
                        ? HostRosterInsightSignal.firstTime
                        : HostRosterInsightSignal.returning,
                  },
                  priorAttendedEventCount: 0,
                  priorExpectedEventCount: 0,
                  priorNoShowCount: 0,
                  lastAttendedAt: null,
                  attendanceRate: null,
                  catchSpend: const [],
                ),
            ],
            computedAt: now,
          ),
        ),
      ),
      watchEventAttendeesProvider(event.id).overrideWith(
        (ref) => Stream.value([
          attendee('Rhea Kapoor'),
          attendee('Kabir Rao'),
          attendee('Ana Dsouza'),
          attendee('Zoya Merchant'),
        ]),
      ),
      watchReviewsForEventProvider(event.id).overrideWith(
        (ref) => Stream.value([review('1', 5), review('2', 4), review('3', 5)]),
      ),
      watchActiveEventsForOrganizerProvider(
        ActiveOrganizerEventsQuery(organizerId: 'org-1', day: now),
      ).overrideWith((ref) => Stream.value(coming)),
    ];

    test(
      'composes the roster, reviews, coming events and the report row',
      () async {
        final repository = _QueryRecordingRepository(
          _report(
            topEvents: [
              _row(
                'trivia',
                booked: 24,
                fillRate: 75,
                revenue: 1297400,
                payments: 24,
                matches: 11,
              ),
            ],
          ),
        );
        final container = _container(
          repository,
          overrides: reads(
            roster: Stream.value(
              EventParticipationRoster(
                bookedIds: [for (var i = 0; i < 24; i++) 'b$i'],
                checkedInIds: [for (var i = 0; i < 26; i++) 'c$i'],
                waitlistedIds: const [],
              ),
            ),
            coming: [next, event],
          ),
        );
        container.listen(hostEventReportControllerProvider(request), (_, _) {});
        await flushTestEventQueue();

        final state = container.read(
          hostEventReportControllerProvider(request),
        );
        expect(state.status, HostEventReportStatus.content);
        expect(state.booked, 24);
        expect(state.came, 26);
        expect(state.walkIns, 2);
        expect(state.newFaces, 3);
        expect(state.ticketSalesMinor, 1297400);
        expect(state.payments, 24);
        expect(state.stayInTouch, 11);
        expect(state.rating, closeTo(4.67, 0.01));
        expect(state.ratingCount, 3);
        expect(state.reviews, hasLength(2));
        expect(state.reviewCount, 3);
        expect(state.people, ['Rhea Kapoor', 'Kabir Rao', 'Ana Dsouza']);
        expect(state.nextEvent?.id, 'next');
        expect(state.tonight, isTrue);

        final query = repository.queries.single;
        expect(query.eventId, 'trivia');
        expect(query.rangePreset, HostAnalyticsRangePreset.custom);
        expect(query.startDate, DateTime(2026, 7, 29));
        expect(query.endDate, DateTime(2026, 10, 27));
      },
    );

    test('a report without the event leaves its figures out', () async {
      final container = _container(
        _QueryRecordingRepository(_report()),
        overrides: reads(
          roster: Stream.value(EventParticipationRoster.empty()),
        ),
      );
      container.listen(hostEventReportControllerProvider(request), (_, _) {});
      await flushTestEventQueue();

      final state = container.read(hostEventReportControllerProvider(request));
      expect(state.ticketSalesMinor, isNull);
      expect(state.stayInTouch, isNull);
      expect(state.nextEvent, isNull);
    });

    test('a failed roster is the screen error', () async {
      final container = _container(
        _QueryRecordingRepository(_report()),
        overrides: reads(roster: Stream.error(StateError('roster failed'))),
      );
      container.listen(hostEventReportControllerProvider(request), (_, _) {});
      await flushTestEventQueue();

      final state = container.read(hostEventReportControllerProvider(request));
      expect(state.status, HostEventReportStatus.error);
    });
  });
}
