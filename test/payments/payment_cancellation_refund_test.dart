import 'package:catch_dating_app/contexts/payments/domain/payment.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'refund projection preserves confirmed partial cash and review state',
    () {
      final refund = PaymentCancellationRefund.fromJson({
        'state': 'complete',
        'targetAmountMinor': 12500,
        'confirmedAmountMinor': 12500,
        'providerPaymentId': 'pay_private',
        'attempts': [],
      });
      expect(refund.state, PaymentCancellationRefundState.complete);
      expect(refund.confirmedAmountMinor, 12500);
      expect(refund.toJson().containsKey('providerPaymentId'), isFalse);
    },
  );

  test(
    'unknown future refund states require review instead of claiming success',
    () {
      final refund = PaymentCancellationRefund.fromJson({
        'state': 'futureProviderState',
        'targetAmountMinor': 12500,
        'confirmedAmountMinor': 0,
      });
      expect(refund.state, PaymentCancellationRefundState.reviewRequired);
    },
  );
}
