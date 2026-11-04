import 'package:catch_dating_app/contexts/audience/domain/crm/host_event_roster_insights.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  Map<String, Object?> rosterView({
    List<String> signals = const ['returning', 'known_catch_spender'],
    List<Map<String, Object?>>? catchSpend,
    String sourceCoverage = 'exact',
  }) => {
    'schemaVersion': 1,
    'eventId': 'event-1',
    'organizerId': 'organizer-1',
    'cutoffAtMillis': 1786500000000,
    'revision': 2,
    'evaluatedAtMillis': 1786500001000,
    'sourceCoverage': sourceCoverage,
    'incompleteSource': null,
    'rows': [
      {
        'attendeeId': 'attendee-1',
        'contactId': 'contact-1',
        'availability': 'ready',
        'signals': [...signals, 'member'],
        'priorAttendedEventCount': 3,
        'priorExpectedEventCount': 4,
        'priorNoShowCount': 1,
        'lastAttendedAtMillis': 1780000000000,
        'attendanceRate': 0.75,
        'catchSpend':
            catchSpend ??
            [
              {'currency': 'INR', 'amountMinor': 600000, 'paidOrderCount': 3},
            ],
      },
    ],
  };

  Map<String, Object?> spendProjection({
    Map<String, int> thresholds = const {'INR': 500000},
    String spendCoverage = 'catchPaymentsOnly',
    String organizerId = 'organizer-1',
  }) => {
    'schemaVersion': 1,
    'organizerId': organizerId,
    'topQuartileThresholdByCurrency': thresholds,
    'spendCoverage': spendCoverage,
    'revision': 1,
  };

  test('parses event-relative roster labels without private profile data', () {
    final insights = HostEventRosterInsights.fromViews(
      eventId: 'event-1',
      view: rosterView(),
      projection: spendProjection(),
    );

    final row = insights.rows.single;
    expect(insights.organizerId, 'organizer-1');
    expect(insights.sourceCoverage, HostRosterInsightCoverage.exact);
    expect(insights.spendCoverage, HostRosterSpendCoverage.catchPaymentsOnly);
    expect(
      insights.cutoffAt,
      DateTime.fromMillisecondsSinceEpoch(1786500000000),
    );
    expect(
      insights.computedAt,
      DateTime.fromMillisecondsSinceEpoch(1786500001000),
    );
    expect(row.signals.toList(), [
      HostRosterInsightSignal.returning,
      HostRosterInsightSignal.knownCatchSpender,
      HostRosterInsightSignal.topCatchSpender,
      HostRosterInsightSignal.member,
    ]);
    expect(row.catchSpend.single.currency, 'INR');
    expect(row.catchSpend.single.amountMinor, 600000);
    expect(insights.byAttendeeId['attendee-1'], same(row));
  });

  test('top spenders need two paid orders at the currency threshold', () {
    Set<HostRosterInsightSignal> signalsFor({
      required int amountMinor,
      required int paidOrderCount,
      Map<String, int> thresholds = const {'INR': 500000},
      String spendCoverage = 'catchPaymentsOnly',
    }) => HostEventRosterInsights.fromViews(
      eventId: 'event-1',
      view: rosterView(
        catchSpend: [
          {
            'currency': 'INR',
            'amountMinor': amountMinor,
            'paidOrderCount': paidOrderCount,
          },
        ],
      ),
      projection: spendProjection(
        thresholds: thresholds,
        spendCoverage: spendCoverage,
      ),
    ).rows.single.signals;

    expect(
      signalsFor(amountMinor: 500000, paidOrderCount: 2),
      contains(HostRosterInsightSignal.topCatchSpender),
    );
    expect(
      signalsFor(amountMinor: 499999, paidOrderCount: 2),
      isNot(contains(HostRosterInsightSignal.topCatchSpender)),
    );
    expect(
      signalsFor(amountMinor: 900000, paidOrderCount: 1),
      isNot(contains(HostRosterInsightSignal.topCatchSpender)),
    );
    expect(
      signalsFor(amountMinor: 900000, paidOrderCount: 2, thresholds: {}),
      isNot(contains(HostRosterInsightSignal.topCatchSpender)),
    );
    expect(
      signalsFor(
        amountMinor: 900000,
        paidOrderCount: 2,
        spendCoverage: 'insufficientData',
      ),
      isNot(contains(HostRosterInsightSignal.topCatchSpender)),
    );
  });

  test('the member label follows the membership flag', () {
    final hidden = HostEventRosterInsights.fromViews(
      eventId: 'event-1',
      view: rosterView(),
      projection: null,
      includeHostMembership: false,
    );
    expect(
      hidden.rows.single.signals,
      isNot(contains(HostRosterInsightSignal.member)),
    );
    // No projection yet: the organizer has no counted Catch payment.
    expect(hidden.spendCoverage, HostRosterSpendCoverage.catchPaymentsOnly);
    expect(
      hidden.rows.single.signals,
      isNot(contains(HostRosterInsightSignal.topCatchSpender)),
    );
  });

  test('a missing view is missing; foreign documents are format errors', () {
    final missing = HostEventRosterInsights.fromViews(
      eventId: 'event-1',
      view: null,
      projection: null,
    );
    expect(missing.sourceCoverage, HostRosterInsightCoverage.missing);
    expect(missing.rows, isEmpty);
    expect(missing.organizerId, isNull);
    expect(
      HostEventRosterInsights.fromViews(
        eventId: 'event-1',
        view: rosterView(sourceCoverage: 'invalidSource'),
        projection: null,
      ).sourceCoverage,
      HostRosterInsightCoverage.invalidSource,
    );
    expect(
      () => HostEventRosterInsights.fromViews(
        eventId: 'event-2',
        view: rosterView(),
        projection: null,
      ),
      throwsFormatException,
    );
    expect(
      () => HostEventRosterInsights.fromViews(
        eventId: 'event-1',
        view: rosterView(),
        projection: spendProjection(organizerId: 'organizer-2'),
      ),
      throwsFormatException,
    );
  });
}
