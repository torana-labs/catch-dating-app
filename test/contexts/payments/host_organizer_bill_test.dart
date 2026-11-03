import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/payments/domain/host_organizer_bill.dart';
import 'package:flutter_test/flutter_test.dart';

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
    final file = File(
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
}
