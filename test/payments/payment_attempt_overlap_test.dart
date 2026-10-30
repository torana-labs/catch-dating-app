import 'dart:async';

import 'package:catch_dating_app/contexts/payments/data/payment_repository.dart';
import 'package:catch_dating_app/contexts/payments/data/razorpay_checkout.dart';
import 'package:catch_dating_app/contexts/payments/domain/payment_confirmation_data.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';
import 'payment_test_fakes.dart';

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
  late OrganizerCheckoutFake server;
  late TestHttpsCallable verify;
  late List<FakeRazorpay> checkouts;
  late PaymentRepository repository;

  setUp(() {
    functions = TestFirebaseFunctions();
    server = OrganizerCheckoutFake(functions);
    verify = server.callable;
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
    'an open checkout reserves the repository across independent callers',
    (tester) async {
      final first = _ObservedPayment(
        payOrganizer(repository, server.session('event-a')),
      );
      final overlapping = _ObservedPayment(
        payOrganizer(
          repository,
          server.session('event-b', orderId: 'order_b', amountPaise: 99000),
        ),
      );
      try {
        await tester.pump();
        expect(checkouts, hasLength(1));
        checkouts.single.emitSuccess(organizerSuccess('order_a'));
        await tester.pump();
        await pumpFeatureUiFor(tester, const Duration(minutes: 10));
        expect(first.settled, isTrue);
        expect(overlapping.settled, isTrue);
        expect(
          {
            'firstEventId': first.receipt?.eventId,
            'firstOrderId': first.receipt?.orderId,
            'firstAmount': first.receipt?.amountInPaise,
          },
          {
            'firstEventId': 'event-a',
            'firstOrderId': 'order_a',
            'firstAmount': 25000,
          },
        );
        expect(first.error, isNull);
        expect(overlapping.error, isA<PaymentFailedException>());
        expect(overlapping.receipt, isNull);
      } finally {
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
      final firstSession = server.session('event-a');
      final verification = Completer<Object?>();
      verify.onCall = (_) => verification.future;
      final first = _ObservedPayment(payOrganizer(repository, firstSession));
      try {
        await tester.pump();
        checkouts.single.emitSuccess(organizerSuccess('order_a'));
        await tester.pump();
        final secondSession = server.session(
          'event-b',
          orderId: 'order_b',
          amountPaise: 99000,
        );
        final overlapping = _ObservedPayment(
          payOrganizer(repository, secondSession),
        );
        final checkoutsWhileVerifying = checkouts.length;
        await tester.pump();
        verification.complete(server.admittedFor(firstSession));
        await tester.pump();
        // A stale callback to A cannot change A's receipt.
        checkouts.last.emitSuccess(organizerSuccess('order_b'));
        await tester.pump();
        await pumpFeatureUiFor(tester, const Duration(minutes: 10));

        verify.onCall = server.admit;
        final next = _ObservedPayment(payOrganizer(repository, secondSession));
        await tester.pump();
        checkouts.last.emitSuccess(organizerSuccess('order_b'));
        await tester.pump();
        await pumpFeatureUiFor(tester, const Duration(minutes: 10));
        expect(first.settled, isTrue);
        expect(overlapping.settled, isTrue);
        expect(next.settled, isTrue);
        expect(
          {
            'checkoutsWhileVerifying': checkoutsWhileVerifying,
            'firstEventId': first.receipt?.eventId,
            'firstOrderId': first.receipt?.orderId,
            'firstAmount': first.receipt?.amountInPaise,
            'firstCurrency': first.receipt?.currency,
          },
          {
            'checkoutsWhileVerifying': 1,
            'firstEventId': 'event-a',
            'firstOrderId': 'order_a',
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
          verification.complete(server.admittedFor(firstSession));
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
