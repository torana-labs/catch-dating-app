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

  test('mismatched order cannot consume a current attempt', () async {
    final payment = _pay(repository);
    var settled = false;
    unawaited(payment.then((_) => settled = true));
    await flushTestEventQueue();
    checkouts.single.emitSuccess(_success('old-order'));
    await flushTestEventQueue();
    expect(verify.calls, isEmpty);
    expect(settled, isFalse);
    checkouts.single.emitSuccess(_success('order-a'));
    expect((await payment).orderId, 'order-a');
  });

  test(
    'duplicate success and failure during verification cannot complete twice',
    () async {
      final verification = Completer<Object?>();
      verify.onCall = (_) => verification.future;
      final payment = _pay(repository);
      await flushTestEventQueue();
      final checkout = checkouts.single;
      checkout
        ..emitSuccess(_success('order-a'))
        ..emitSuccess(_success('order-a'))
        ..emitError(const RazorpayFailureResponse(isCancelled: true));
      await flushTestEventQueue();
      expect(verify.calls, hasLength(1));
      verification.complete({'verified': true});
      expect((await payment).orderId, 'order-a');
      expect(checkout.clearCalls, 1);
    },
  );

  for (final reuseOrder in [false, true]) {
    test(
      'retired callbacks cannot consume retry with ${reuseOrder ? 'same' : 'different'} order',
      () async {
        final first = _pay(repository);
        final rejected = expectLater(
          first,
          throwsA(isA<PaymentCancelledException>()),
        );
        await flushTestEventQueue();
        final oldCheckout = checkouts.single;
        final lateSuccess = oldCheckout.successHandler!;
        final lateFailure = oldCheckout.errorHandler!;
        oldCheckout.emitError(const RazorpayFailureResponse(isCancelled: true));
        await rejected;
        final nextOrder = reuseOrder ? 'order-a' : 'order-b';
        create.resultData = _order(nextOrder, amount: 48000);
        final second = _pay(repository, 'event-b');
        await flushTestEventQueue();
        await lateSuccess(_success('order-a'));
        lateFailure(
          const RazorpayFailureResponse(
            isCancelled: false,
            message: 'Old failure',
          ),
        );
        expect(verify.calls, isEmpty);
        checkouts.last.emitSuccess(_success(nextOrder));
        final result = await second;
        expect(result.eventId, 'event-b');
        expect(result.amountInPaise, 48000);
        expect(oldCheckout.clearCalls, 1);
      },
    );
  }

  test('startup failure releases only its own reservation for retry', () async {
    create.error = StateError('order unavailable');
    await expectLater(_pay(repository), throwsA(isA<PaymentFailedException>()));
    expect(checkouts.single.cleared, isTrue);
    create.error = null;
    final retry = _pay(repository);
    await flushTestEventQueue();
    checkouts.last.emitSuccess(_success('order-a'));
    expect((await retry).eventId, 'event-a');
  });

  test('verification failure permits a later independent retry', () async {
    verify.error = StateError('verification unavailable');
    final payment = _pay(repository);
    final failed = expectLater(payment, throwsA(isA<PaymentFailedException>()));
    await flushTestEventQueue();
    checkouts.single.emitSuccess(_success('order-a'));
    await failed;
    verify.error = null;
    final retry = _pay(repository);
    await flushTestEventQueue();
    checkouts.last.emitSuccess(_success('order-a'));
    expect((await retry).orderId, 'order-a');
  });

  test(
    'dispose settles an order wait and never opens its late response',
    () async {
      final order = Completer<Object?>();
      create.onCall = (_) => order.future;
      final payment = _pay(repository);
      final failed = expectLater(
        payment,
        throwsA(isA<SignInRequiredException>()),
      );
      repository.dispose();
      await failed;
      order.complete(_order('order-a'));
      await flushTestEventQueue();
      expect(checkouts.single.openCalls, isEmpty);
      expect(checkouts.single.clearCalls, 1);
      await expectLater(
        _pay(repository),
        throwsA(isA<SignInRequiredException>()),
      );
      expect(create.calls, hasLength(1));
    },
  );

  test('dispose during verification cannot publish a late success', () async {
    final verification = Completer<Object?>();
    verify.onCall = (_) => verification.future;
    final payment = _pay(repository);
    final failed = expectLater(
      payment,
      throwsA(isA<SignInRequiredException>()),
    );
    await flushTestEventQueue();
    checkouts.single.emitSuccess(_success('order-a'));
    await flushTestEventQueue();
    repository.dispose();
    await failed;
    verification.complete({'verified': true});
    await flushTestEventQueue();
    expect(checkouts.single.clearCalls, 1);
    expect(verify.calls, hasLength(1));
  });

  testWidgets(
    'ten-minute caller deadline cannot let old verification clear a retry',
    (tester) async {
      final verification = Completer<Object?>();
      verify.onCall = (_) => verification.future;
      final payment = _pay(repository);
      final timedOut = expectLater(
        payment,
        throwsA(isA<PaymentFailedException>()),
      );
      await tester.pump();
      checkouts.single.emitSuccess(_success('order-a'));
      await tester.pump();
      await pumpFeatureUiFor(tester, const Duration(minutes: 10));
      await timedOut;
      final oldCheckout = checkouts.single;
      verify.onCall = null;
      create.resultData = _order('order-b');
      final retry = _pay(repository, 'event-b');
      await tester.pump();
      final nextCheckout = checkouts.last;
      verification.complete({'verified': true});
      await tester.pump();
      expect(nextCheckout.clearCalls, 0);
      expect(oldCheckout.clearCalls, 1);
      nextCheckout.emitSuccess(_success('order-b'));
      await tester.pump();
      expect((await retry).eventId, 'event-b');
    },
  );
}
