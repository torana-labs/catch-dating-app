import 'dart:async';

import 'package:catch_dating_app/contexts/payments/data/payment_repository.dart';
import 'package:catch_dating_app/contexts/payments/data/razorpay_checkout.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';
import 'payment_test_fakes.dart';

void main() {
  late TestFirebaseFunctions functions;
  late OrganizerCheckoutFake server;
  late TestHttpsCallable verify;
  late List<FakeRazorpay> checkouts;
  late PaymentRepository repository;
  Object? nextOpenError;

  setUp(() {
    functions = TestFirebaseFunctions();
    server = OrganizerCheckoutFake(functions);
    verify = server.callable;
    checkouts = [];
    nextOpenError = null;
    repository = PaymentRepository(
      functions,
      razorpayFactory: () {
        final checkout = FakeRazorpay()..openError = nextOpenError;
        nextOpenError = null;
        checkouts.add(checkout);
        return checkout;
      },
      isWebOverride: false,
      targetPlatformOverride: TargetPlatform.android,
    );
  });

  tearDown(() => repository.dispose());

  test('mismatched order cannot consume a current attempt', () async {
    final payment = payOrganizer(repository, server.session('event-a'));
    var settled = false;
    unawaited(payment.then((_) => settled = true));
    await flushTestEventQueue();
    checkouts.single.emitSuccess(organizerSuccess('order_old'));
    await flushTestEventQueue();
    expect(verify.calls, isEmpty);
    expect(settled, isFalse);
    checkouts.single.emitSuccess(organizerSuccess('order_a'));
    expect((await payment).orderId, 'order_a');
  });

  test(
    'duplicate success and failure during verification cannot complete twice',
    () async {
      final session = server.session('event-a');
      final verification = Completer<Object?>();
      verify.onCall = (_) => verification.future;
      final payment = payOrganizer(repository, session);
      await flushTestEventQueue();
      final checkout = checkouts.single;
      checkout
        ..emitSuccess(organizerSuccess('order_a'))
        ..emitSuccess(organizerSuccess('order_a'))
        ..emitError(const RazorpayFailureResponse(isCancelled: true));
      await flushTestEventQueue();
      expect(verify.calls, hasLength(1));
      verification.complete(server.admittedFor(session));
      expect((await payment).orderId, 'order_a');
      expect(checkout.clearCalls, 1);
    },
  );

  for (final reuseOrder in [false, true]) {
    test(
      'retired callbacks cannot consume retry with ${reuseOrder ? 'same' : 'different'} order',
      () async {
        final first = payOrganizer(repository, server.session('event-a'));
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
        final nextOrder = reuseOrder ? 'order_a' : 'order_b';
        final second = payOrganizer(
          repository,
          server.session('event-b', orderId: nextOrder, amountPaise: 48000),
        );
        await flushTestEventQueue();
        await lateSuccess(organizerSuccess('order_a'));
        lateFailure(
          const RazorpayFailureResponse(
            isCancelled: false,
            message: 'Old failure',
          ),
        );
        expect(verify.calls, isEmpty);
        checkouts.last.emitSuccess(organizerSuccess(nextOrder));
        final result = await second;
        expect(result.eventId, 'event-b');
        expect(result.amountInPaise, 48000);
        expect(oldCheckout.clearCalls, 1);
      },
    );
  }

  test('startup failure releases only its own reservation for retry', () async {
    nextOpenError = StateError('checkout unavailable');
    await expectLater(
      payOrganizer(repository, server.session('event-a')),
      throwsA(isA<PaymentFailedException>()),
    );
    expect(checkouts.single.cleared, isTrue);
    final retry = payOrganizer(repository, server.session('event-a'));
    await flushTestEventQueue();
    checkouts.last.emitSuccess(organizerSuccess('order_a'));
    expect((await retry).eventId, 'event-a');
  });

  test('verification failure permits a later independent retry', () async {
    verify.error = StateError('verification unavailable');
    final payment = payOrganizer(repository, server.session('event-a'));
    final failed = expectLater(payment, throwsA(isA<PaymentFailedException>()));
    await flushTestEventQueue();
    checkouts.single.emitSuccess(organizerSuccess('order_a'));
    await failed;
    verify.error = null;
    final retry = payOrganizer(repository, server.session('event-a'));
    await flushTestEventQueue();
    checkouts.last.emitSuccess(organizerSuccess('order_a'));
    expect((await retry).orderId, 'order_a');
  });

  test('dispose settles an open checkout and refuses new attempts', () async {
    final payment = payOrganizer(repository, server.session('event-a'));
    final failed = expectLater(
      payment,
      throwsA(isA<SignInRequiredException>()),
    );
    await flushTestEventQueue();
    final lateSuccess = checkouts.single.successHandler!;
    repository.dispose();
    await failed;
    await lateSuccess(organizerSuccess('order_a'));
    await flushTestEventQueue();
    expect(checkouts.single.clearCalls, 1);
    expect(verify.calls, isEmpty);
    await expectLater(
      payOrganizer(repository, server.session('event-a')),
      throwsA(isA<SignInRequiredException>()),
    );
    expect(checkouts, hasLength(1));
  });

  test('dispose during verification cannot publish a late success', () async {
    final session = server.session('event-a');
    final verification = Completer<Object?>();
    verify.onCall = (_) => verification.future;
    final payment = payOrganizer(repository, session);
    final failed = expectLater(
      payment,
      throwsA(isA<SignInRequiredException>()),
    );
    await flushTestEventQueue();
    checkouts.single.emitSuccess(organizerSuccess('order_a'));
    await flushTestEventQueue();
    repository.dispose();
    await failed;
    verification.complete(server.admittedFor(session));
    await flushTestEventQueue();
    expect(checkouts.single.clearCalls, 1);
    expect(verify.calls, hasLength(1));
  });

  testWidgets(
    'ten-minute caller deadline cannot let old verification clear a retry',
    (tester) async {
      final first = server.session('event-a');
      final verification = Completer<Object?>();
      verify.onCall = (_) => verification.future;
      final payment = payOrganizer(repository, first);
      final timedOut = expectLater(
        payment,
        throwsA(isA<PaymentFailedException>()),
      );
      await tester.pump();
      checkouts.single.emitSuccess(organizerSuccess('order_a'));
      await tester.pump();
      await pumpFeatureUiFor(tester, const Duration(minutes: 10));
      await timedOut;
      final oldCheckout = checkouts.single;
      verify.onCall = server.admit;
      final retry = payOrganizer(
        repository,
        server.session('event-b', orderId: 'order_b'),
      );
      await tester.pump();
      final nextCheckout = checkouts.last;
      verification.complete(server.admittedFor(first));
      await tester.pump();
      expect(nextCheckout.clearCalls, 0);
      expect(oldCheckout.clearCalls, 1);
      nextCheckout.emitSuccess(organizerSuccess('order_b'));
      await tester.pump();
      expect((await retry).eventId, 'event-b');
    },
  );
}
