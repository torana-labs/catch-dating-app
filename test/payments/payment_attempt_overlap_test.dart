import 'dart:async';

import 'package:catch_dating_app/contexts/payments/data/payment_repository.dart';
import 'package:catch_dating_app/contexts/payments/data/razorpay_checkout.dart';
import 'package:catch_dating_app/contexts/payments/domain/payment_confirmation_data.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';
import 'payment_test_fakes.dart';

Map<String, Object?> _order(String id, {int amount = 25000}) => {
  'orderId': id,
  'amount': amount,
  'currency': 'INR',
  'keyId': 'rzp_test_server_environment',
};

RazorpaySuccessResponse _success(String id) => RazorpaySuccessResponse(
  paymentId: 'pay_$id',
  orderId: id,
  signature: 'sig_$id',
);

Future<PaymentConfirmationData> _pay(
  PaymentRepository repository, [
  String event = 'event-a',
]) => repository.processPayment(
  eventId: event,
  currencyCode: 'INR',
  description: 'Event',
  userName: 'Guest',
  userEmail: 'guest@example.com',
  userContact: '+919876543210',
);

final class _ObservedPayment {
  _ObservedPayment(Future<PaymentConfirmationData> payment) {
    unawaited(
      payment.then<void>(
        (value) {
          receipt = value;
          settled = true;
        },
        onError: (Object value, StackTrace _) {
          error = value;
          settled = true;
        },
      ),
    );
  }

  PaymentConfirmationData? receipt;
  Object? error;
  bool settled = false;
}

void main() {
  late TestFirebaseFunctions functions;
  late TestHttpsCallable create;
  late TestHttpsCallable verify;
  late List<FakeRazorpay> checkouts;
  late PaymentRepository repository;

  setUp(() {
    functions = TestFirebaseFunctions();
    create = TestHttpsCallable('createRazorpayOrder')
      ..resultData = _order('order-a');
    verify = TestHttpsCallable('verifyRazorpayPayment')
      ..resultData = {'verified': true};
    functions.callables.addAll({create.name: create, verify.name: verify});
    checkouts = [];
    repository = PaymentRepository(
      functions,
      razorpayFactory: () {
        final checkout = FakeRazorpay();
        checkouts.add(checkout);
        return checkout;
      },
      isWebOverride: false,
      targetPlatformOverride: TargetPlatform.android,
    );
  });

  tearDown(() => repository.dispose());

  testWidgets(
    'reserves before delayed order creation across independent callers',
    (tester) async {
      final order = Completer<Object?>();
      create.onCall = (_) => order.future;
      final first = _ObservedPayment(_pay(repository));
      final overlapping = _ObservedPayment(_pay(repository, 'event-b'));
      final createCallsWhileOrderPending = create.calls.length;
      try {
        order.complete(_order('order-a'));
        await tester.pump();
        checkouts.single.emitSuccess(_success('order-a'));
        await tester.pump();
        // cb00 loses A's completer when B overwrites it. Advance its real
        // repository deadline in the test clock so it settles before asserts.
        await pumpFeatureUiFor(tester, const Duration(minutes: 10));
        expect(first.settled, isTrue);
        expect(overlapping.settled, isTrue);
        expect(
          {
            'createCallsWhileOrderPending': createCallsWhileOrderPending,
            'firstEventId': first.receipt?.eventId,
            'firstOrderId': first.receipt?.orderId,
            'firstAmount': first.receipt?.amountInPaise,
          },
          {
            'createCallsWhileOrderPending': 1,
            'firstEventId': 'event-a',
            'firstOrderId': 'order-a',
            'firstAmount': 25000,
          },
        );
        expect(first.error, isNull);
        expect(overlapping.error, isA<PaymentFailedException>());
        expect(overlapping.receipt, isNull);
      } finally {
        if (!order.isCompleted) order.complete(_order('order-a'));
        await tester.pump();
        for (final checkout in checkouts) {
          checkout.emitError(const RazorpayFailureResponse(isCancelled: true));
        }
        await pumpFeatureUiFor(tester, const Duration(minutes: 10));
      }
    },
  );

  testWidgets(
    'holds ownership through delayed verification and preserves receipt metadata',
    (tester) async {
      final verification = Completer<Object?>();
      verify.onCall = (_) => verification.future;
      final first = _ObservedPayment(_pay(repository));
      try {
        await tester.pump();
        checkouts.single.emitSuccess(_success('order-a'));
        await tester.pump();
        create.resultData = _order('order-b', amount: 99000);
        final overlapping = _ObservedPayment(_pay(repository, 'event-b'));
        final createCallsWhileVerifying = create.calls.length;
        // Deliver any incorrectly admitted B order before A verifies. This is
        // the actual cross-attempt metadata race, not a simulated state model.
        await tester.pump();
        verification.complete({'verified': true});
        await tester.pump();
        // Drain B if it was incorrectly admitted. On the repaired repository
        // this is merely a stale callback to A and cannot change A's receipt.
        checkouts.last.emitSuccess(_success('order-b'));
        await tester.pump();
        await pumpFeatureUiFor(tester, const Duration(minutes: 10));

        verify.onCall = null;
        final next = _ObservedPayment(_pay(repository, 'event-b'));
        await tester.pump();
        checkouts.last.emitSuccess(_success('order-b'));
        await tester.pump();
        await pumpFeatureUiFor(tester, const Duration(minutes: 10));
        expect(first.settled, isTrue);
        expect(overlapping.settled, isTrue);
        expect(next.settled, isTrue);
        expect(
          {
            'createCallsWhileVerifying': createCallsWhileVerifying,
            'firstEventId': first.receipt?.eventId,
            'firstOrderId': first.receipt?.orderId,
            'firstAmount': first.receipt?.amountInPaise,
            'firstCurrency': first.receipt?.currency,
          },
          {
            'createCallsWhileVerifying': 1,
            'firstEventId': 'event-a',
            'firstOrderId': 'order-a',
            'firstAmount': 25000,
            'firstCurrency': 'INR',
          },
        );
        expect(first.error, isNull);
        expect(overlapping.error, isA<PaymentFailedException>());
        expect(overlapping.receipt, isNull);
        expect(next.error, isNull);
        expect(next.receipt?.eventId, 'event-b');
        expect(next.receipt?.amountInPaise, 99000);
      } finally {
        if (!verification.isCompleted) {
          verification.complete({'verified': true});
        }
        await tester.pump();
        for (final checkout in checkouts) {
          checkout.emitError(const RazorpayFailureResponse(isCancelled: true));
        }
        await pumpFeatureUiFor(tester, const Duration(minutes: 10));
      }
    },
  );
}
