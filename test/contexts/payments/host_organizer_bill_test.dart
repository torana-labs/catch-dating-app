import 'dart:convert';

import 'package:catch_dating_app/contexts/payments/data/host_organizer_bills_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_organizer_bill.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_organizer_billing_status.dart';
import 'package:catch_dating_app/contexts/payments/parts/host_organizer_bill_row.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_test_support/repo_file.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';

Map<String, Object?> _bill({
  String status = 'sent',
  int total = 640000,
  int? paid,
  int? due = 1763164800000,
  String? url = 'https://rzp.io/l/bill',
}) => {
  'billId': 'lantern_2026-10',
  'month': '2026-10',
  'status': status,
  'sales': {
    'paymentCount': 412,
    'eventCount': 9,
    'grossMinor': 16150000,
    'refundedMinor': 150000,
    'providerFeeMinor': 377600,
  },
  'commission': {
    'amountMinor': total,
    'capMinor': 1000000,
    'capped': false,
    'trialWaivedMinor': 0,
  },
  'gst': {'registered': false, 'amountMinor': 0},
  'totalMinor': total,
  'invoiceNumber': '2026-27/031',
  'dueAtMillis': due,
  'paymentUrl': url,
  'paidAtMillis': paid == null ? null : 1763251200000,
  'paidMinor': paid,
};

void main() {
  setUpAll(() => initializeDateFormatting('en'));

  test('kept is sales after refunds, less Razorpay fees and the bill', () {
    final bill = HostOrganizerBill.fromJson(_bill());
    expect(bill.month, DateTime(2026, 10));
    expect(bill.salesMinor, 16000000);
    expect(bill.keptMinor, 16000000 - 377600 - 640000);
  });

  test('a written-off or free bill takes nothing from what was kept', () {
    for (final status in ['writtenOff', 'free']) {
      final bill = HostOrganizerBill.fromJson(_bill(status: status));
      expect(bill.billMinor, 0, reason: status);
      expect(bill.keptMinor, 16000000 - 377600, reason: status);
    }
  });

  test('a paid bill counts what was actually paid', () {
    final bill = HostOrganizerBill.fromJson(
      _bill(status: 'paid', paid: 600000),
    );
    expect(bill.billMinor, 600000);
    expect(bill.canPay, isFalse);
  });

  test('only a sent bill past its due date is overdue', () {
    final dueAt = DateTime.fromMillisecondsSinceEpoch(1763164800000);
    final after = dueAt.add(const Duration(days: 1));
    final before = dueAt.subtract(const Duration(days: 1));
    expect(HostOrganizerBill.fromJson(_bill()).isOverdueAt(after), isTrue);
    expect(HostOrganizerBill.fromJson(_bill()).isOverdueAt(before), isFalse);
    expect(
      HostOrganizerBill.fromJson(
        _bill(status: 'paid', paid: 640000),
      ).isOverdueAt(after),
      isFalse,
    );
  });

  test('a sent bill without its link cannot be paid in the app', () {
    expect(HostOrganizerBill.fromJson(_bill()).canPay, isTrue);
    expect(HostOrganizerBill.fromJson(_bill(url: null)).canPay, isFalse);
  });

  // Admin's test reads the same file, so the two surfaces can't drift apart on
  // money.
  group('the figures shared with Admin', () {
    final file = repoFile(
      'test/contexts/payments/fixtures/organizer_kept_months.json',
    );
    final months =
        (jsonDecode(file.readAsStringSync()) as Map<String, Object?>)['months']!
            as List<Object?>;
    for (final entry in months.cast<Map<String, Object?>>()) {
      final expected = entry['expected']! as Map<String, Object?>;
      test('gives the same answer for ${entry['name']}', () {
        final bill = HostOrganizerBill.fromJson(
          entry['bill']! as Map<String, Object?>,
        );
        expect(bill.salesMinor, expected['salesMinor']);
        expect(bill.billMinor, expected['billMinor']);
        expect(bill.keptMinor, expected['keptMinor']);
      });
    }
  });

  test('a bill from a server before cycles is a calendar month', () {
    final bill = HostOrganizerBill.fromJson(_bill());
    expect(bill.periodKind, HostOrganizerBillPeriodKind.calendarMonth);
    expect(bill.toolsOnly, isFalse);
    expect(hostOrganizerBillPeriodLabel(bill, 'en'), 'October 2026');
  });

  test('a cycle bill names its days, last day inclusive', () {
    final start = DateTime(2026, 11, 9);
    final end = DateTime(2026, 12, 9);
    final bill = HostOrganizerBill.fromJson({
      ..._bill(),
      'billId': 'lantern_c2026-11-09',
      'month': '2026-12',
      'periodKind': 'cycle',
      'periodStartMillis': start.millisecondsSinceEpoch,
      'periodEndMillis': end.millisecondsSinceEpoch,
      'plan': 'toolsOnly',
    });
    expect(bill.periodKind, HostOrganizerBillPeriodKind.cycle);
    expect(bill.toolsOnly, isTrue);
    expect(hostOrganizerBillPeriodLabel(bill, 'en'), 'Nov 9 – Dec 8 2026');
  });

  test('a refund credit reads from the server, and none from an older one', () {
    final older = HostOrganizerBill.fromJson(_bill());
    expect(older.hasRefundCredit, isFalse);
    expect(older.refundCreditAppliedMinor, 0);
    final credited = HostOrganizerBill.fromJson({
      ..._bill(),
      'refundCredit': {'appliedMinor': 2500, 'carriedForwardMinor': 0},
    });
    expect(credited.hasRefundCredit, isTrue);
    expect(credited.refundCreditAppliedMinor, 2500);
    expect(
      HostOrganizerBill.fromJson({
        ..._bill(),
        'refundCredit': null,
      }).hasRefundCredit,
      isFalse,
    );
  });

  test('the owner reads bill views newest first, live', () async {
    final db = FakeFirebaseFirestore();
    Future<void> view(
      String billId,
      String month,
      int periodEnd, {
      String organizerId = 'lantern',
    }) => db.collection('hostOrganizerBillViews').doc(billId).set({
      'organizerId': organizerId,
      'billId': billId,
      'periodEndMillis': periodEnd,
      'month': month,
      'bill': {..._bill(), 'billId': billId, 'month': month},
      'version': 1,
    });
    await view('lantern_2026-09', '2026-09', 1);
    await view('lantern_2026-10', '2026-10', 2);
    await view('other_2026-11', '2026-11', 3, organizerId: 'other');
    final repository = HostOrganizerBillsRepository(db);
    final bills = await repository.watch('lantern').first;
    expect(bills.map((bill) => bill.billId), [
      'lantern_2026-10',
      'lantern_2026-09',
    ]);
    final updates = repository.watch('lantern');
    await db.collection('hostOrganizerBillViews').doc('lantern_2026-10').set({
      'organizerId': 'lantern',
      'billId': 'lantern_2026-10',
      'periodEndMillis': 2,
      'month': '2026-10',
      'bill': {
        ..._bill(status: 'paid', paid: 640000, url: null),
        'billId': 'lantern_2026-10',
      },
      'version': 1,
    });
    final paid = await updates.first;
    expect(paid.first.status, HostOrganizerBillStatus.paid);
    expect(paid.first.canPay, isFalse);
  });

  group('billing status from the owner view', () {
    const day = Duration(days: 1);
    final start = DateTime.utc(2026, 10, 1, 12);
    Map<String, Object?> view({int? days = 30, bool started = true}) => {
      'organizerId': 'lantern',
      'trial': {
        'days': days,
        'anchor': started ? 'firstEvent' : null,
        'startsAtMillis': started ? start.millisecondsSinceEpoch : null,
        'endsAtMillis': started
            ? start.add(day * (days ?? 0)).millisecondsSinceEpoch
            : null,
      },
      'plan': {
        'plan': 'toolsOnly',
        'status': 'active',
        'startsAtMillis': 5,
        'endsAtMillis': null,
      },
      'version': 1,
    };
    HostOrganizerBillingStatus at(Map<String, Object?> data, DateTime now) =>
        HostOrganizerBillingStatus.fromView(data, now);

    test('works out the trial as the server did', () {
      final active = at(
        view(),
        start.add(day * 18 + const Duration(seconds: 5)),
      );
      expect(active.trial.state, HostTrialState.active);
      expect(active.trial.daysLeft, 12);
      expect(active.plan.kind, HostPlanKind.toolsOnly);
      expect(active.plan.state, HostPlanState.active);
      expect(
        at(view(), start.subtract(day)).trial.state,
        HostTrialState.scheduled,
      );
      expect(at(view(), start.add(day * 30)).trial.state, HostTrialState.ended);
      expect(
        at(view(started: false), start).trial.state,
        HostTrialState.notStarted,
      );
      expect(at(view(days: 0), start).trial.state, HostTrialState.none);
      expect(
        at(view(days: null, started: false), start).trial.state,
        HostTrialState.unconfigured,
      );
    });

    test('changes when the days left tick down', () {
      final now = start.add(day * 18 + const Duration(hours: 1));
      final trial = at(view(), now).trial;
      final next = trial.nextChangeAfter(now)!;
      expect(next.isAfter(now), isTrue);
      expect(at(view(), next).trial.daysLeft, trial.daysLeft! - 1);
    });

    test('the owner reads it live from the view', () async {
      final db = FakeFirebaseFirestore();
      await db
          .collection(HostOrganizerBillsRepository.billingViews)
          .doc('lantern')
          .set(view());
      final repository = HostOrganizerBillsRepository(
        db,
        AppClock.custom(() => start.add(day * 2)),
      );
      final status = await repository.watchStatus('lantern').first;
      expect(status.trial.state, HostTrialState.active);
      expect(status.trial.daysLeft, 28);
    });
  });

  test('a bill view for another organizer is rejected', () async {
    final db = FakeFirebaseFirestore();
    await db.collection('hostOrganizerBillViews').doc('forged').set({
      'organizerId': 'lantern',
      'billId': 'other_2026-10',
      'periodEndMillis': 1,
      'month': '2026-10',
      'bill': _bill(),
      'version': 1,
    });
    final repository = HostOrganizerBillsRepository(db);
    await expectLater(repository.watch('lantern').first, throwsA(anything));
  });
}
