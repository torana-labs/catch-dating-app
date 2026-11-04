import 'package:catch_dating_app/contexts/audience/data/crm/host_roster_insight_reads.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_event_roster_insights.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

Map<String, Object?> _view() => {
  'schemaVersion': 1,
  'eventId': 'event-1',
  'organizerId': 'org-1',
  'cutoffAtMillis': 1786500000000,
  'revision': 1,
  'evaluatedAt': Timestamp.fromMillisecondsSinceEpoch(1786500001000),
  'sourceCoverage': 'exact',
  'incompleteSource': null,
  'rows': [
    {
      'attendeeId': 'attendee-1',
      'contactId': 'contact-1',
      'availability': 'ready',
      'signals': ['returning', 'known_catch_spender', 'member'],
      'priorAttendedEventCount': 2,
      'priorExpectedEventCount': 2,
      'priorNoShowCount': 0,
      'lastAttendedAtMillis': 1780000000000,
      'attendanceRate': 1.0,
      'catchSpend': [
        {'currency': 'INR', 'amountMinor': 3000, 'paidOrderCount': 2},
      ],
    },
  ],
};

Map<String, Object?> _projection(int threshold) => {
  'schemaVersion': 1,
  'organizerId': 'org-1',
  'topQuartileThresholdByCurrency': {'INR': threshold},
  'spendCoverage': 'catchPaymentsOnly',
  'revision': 1,
  'evaluatedAt': Timestamp.fromMillisecondsSinceEpoch(1786500001000),
};

DocumentReference<Map<String, Object?>> _viewRef(FakeFirebaseFirestore db) =>
    db.collection(HostRosterInsightReads.views).doc('event-1');

DocumentReference<Map<String, Object?>> _projectionRef(
  FakeFirebaseFirestore db,
) => db.collection(HostRosterInsightReads.projections).doc('org-1');

bool _isTop(HostEventRosterInsights insights) => insights.rows.single.signals
    .contains(HostRosterInsightSignal.topCatchSpender);

void main() {
  test('a view the server has not written is missing', () async {
    final insights = await HostRosterInsightReads(
      FakeFirebaseFirestore(),
    ).watch('event-1').first;

    expect(insights.sourceCoverage, HostRosterInsightCoverage.missing);
    expect(insights.rows, isEmpty);
  });

  test('composes the view with its organizer spend thresholds', () async {
    final db = FakeFirebaseFirestore();
    await _viewRef(db).set(_view());
    await _projectionRef(db).set(_projection(3000));

    final insights = await HostRosterInsightReads(db).watch('event-1').first;

    expect(insights.organizerId, 'org-1');
    expect(
      insights.computedAt,
      DateTime.fromMillisecondsSinceEpoch(1786500001000),
    );
    expect(insights.sourceCoverage, HostRosterInsightCoverage.exact);
    expect(_isTop(insights), isTrue);
    expect(
      insights.rows.single.signals,
      contains(HostRosterInsightSignal.member),
    );
  });

  test('a view without a projection shows spend without top labels', () async {
    final db = FakeFirebaseFirestore();
    await _viewRef(db).set(_view());

    final insights = await HostRosterInsightReads(db).watch('event-1').first;

    expect(insights.spendCoverage, HostRosterSpendCoverage.catchPaymentsOnly);
    expect(_isTop(insights), isFalse);
    expect(
      insights.rows.single.signals,
      contains(HostRosterInsightSignal.knownCatchSpender),
    );
  });

  test(
    'follows the view into existence and the thresholds as they move',
    () async {
      final db = FakeFirebaseFirestore();
      final deliveries = <HostEventRosterInsights>[];
      final subscription = HostRosterInsightReads(
        db,
      ).watch('event-1').listen(deliveries.add);
      await pumpEventQueue();
      expect(
        deliveries.single.sourceCoverage,
        HostRosterInsightCoverage.missing,
      );

      await _projectionRef(db).set(_projection(5000));
      await _viewRef(db).set(_view());
      await pumpEventQueue();
      expect(deliveries.last.sourceCoverage, HostRosterInsightCoverage.exact);
      expect(_isTop(deliveries.last), isFalse);

      await _projectionRef(db).set(_projection(2000));
      await pumpEventQueue();
      expect(_isTop(deliveries.last), isTrue);
      await subscription.cancel();
    },
  );

  test('a view for another event is a format error', () async {
    final db = FakeFirebaseFirestore();
    await _viewRef(db).set({..._view(), 'eventId': 'event-2'});

    await expectLater(
      HostRosterInsightReads(db).watch('event-1').first,
      throwsA(isA<FormatException>()),
    );
  });
}
