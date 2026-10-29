import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment_record.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final row = <String, Object?>{
    'paymentId': 'fp_test',
    'status': 'captured',
    'mode': 'test',
    'amountPaise': 20050,
    'currency': 'INR',
    'refundedAmountPaise': 0,
    'createdAtMillis': 1000,
    'updatedAtMillis': 2000,
    'capturedAtMillis': 2000,
    'submittedAtMillis': null,
    'receipt': 'cfp_test',
    'responseId': null,
  };
  test('captured money does not invent a submitted response', () {
    final value = HostFormPaymentRecord.fromMap(row);
    expect(value.amountPaise, 20050);
    expect(value.responseId, isNull);
    expect(value.submittedAt, isNull);
    expect(value.status, HostFormPaymentStatus.captured);
  });
  test('rejects fractional money, excessive refunds and unknown status', () {
    for (final override in [
      {'amountPaise': 20050.5},
      {'currency': 'USD'},
      {'refundedAmountPaise': 20051},
      {'status': 'success'},
    ]) {
      expect(
        () => HostFormPaymentRecord.fromMap({...row, ...override}),
        throwsFormatException,
      );
    }
  });
  test(
    'filters partition every lifecycle state without losing failed attempts',
    () {
      final statuses = HostFormPaymentFilter.values
          .where((value) => value != HostFormPaymentFilter.all)
          .expand((value) => value.statuses)
          .toList();
      expect(statuses.toSet(), HostFormPaymentStatus.values.toSet());
      expect(statuses.length, statuses.toSet().length);
    },
  );
}
