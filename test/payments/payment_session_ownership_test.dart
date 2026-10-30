import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/payments/data/payment_repository.dart';
import 'package:catch_dating_app/contexts/payments/data/razorpay_checkout.dart';
import 'package:catch_dating_app/contexts/payments/domain/payment_confirmation_data.dart';
import 'package:catch_dating_app/platform/device/external_links.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:url_launcher/url_launcher.dart';

import '../test_pump_helpers.dart';
import 'payment_test_fakes.dart';

Future<PaymentConfirmationData> _payStripe(PaymentRepository repository) =>
    repository.processPayment(eventId: 'event-a', currencyCode: 'USD');

void main() {
  late StreamController<String?> auth;
  late ProviderContainer container;
  late TestFirebaseFunctions functions;
  late OrganizerCheckoutFake server;
  late TestHttpsCallable verify;
  late List<FakeRazorpay> checkouts;
  late List<Uri> launched;

  setUp(() async {
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    auth = StreamController<String?>();
    functions = TestFirebaseFunctions();
    server = OrganizerCheckoutFake(functions);
    verify = server.callable;
    checkouts = [];
    launched = [];
    container = ProviderContainer(
      retry: (_, _) => null,
      overrides: [
        uidProvider.overrideWith((ref) => auth.stream),
        firebaseFunctionsProvider.overrideWithValue(functions),
        razorpayCheckoutFactoryProvider.overrideWithValue(() {
          final checkout = FakeRazorpay();
          checkouts.add(checkout);
          return checkout;
        }),
        externalUrlLauncherProvider.overrideWithValue((
          uri, {
          mode = LaunchMode.platformDefault,
        }) async {
          launched.add(uri);
          return true;
        }),
      ],
    );
    container.listen(
      paymentRepositoryProvider,
      (_, _) {},
      fireImmediately: true,
    );
    auth.add('account-a');
    await container.read(uidProvider.future);
    await container.pump();
  });

  tearDown(() async {
    container.dispose();
    await auth.close();
    debugDefaultTargetPlatformOverride = null;
  });

  Future<void> changeAccount(String? uid) async {
    auth.add(uid);
    await flushTestEventQueue();
    await container.pump();
  }

  test(
    'account switch retires an open checkout before it can verify',
    () async {
      final oldRepository = container.read(paymentRepositoryProvider);
      final oldPayment = payOrganizer(oldRepository, server.session('event-a'));
      final failed = expectLater(
        oldPayment,
        throwsA(isA<SignInRequiredException>()),
      );
      await flushTestEventQueue();
      final lateSuccess = checkouts.single.successHandler!;
      await changeAccount('account-b');
      await failed;
      expect(
        container.read(paymentRepositoryProvider),
        isNot(same(oldRepository)),
      );
      await lateSuccess(organizerSuccess('order_a'));
      await flushTestEventQueue();
      expect(checkouts.single.clearCalls, 1);
      expect(verify.calls, isEmpty);
    },
  );

  test(
    'signout and same-UID reentry cannot revive a verification attempt',
    () async {
      final session = server.session('event-a');
      final verification = Completer<Object?>();
      verify.onCall = (_) => verification.future;
      final oldRepository = container.read(paymentRepositoryProvider);
      final payment = payOrganizer(oldRepository, session);
      final failed = expectLater(
        payment,
        throwsA(isA<SignInRequiredException>()),
      );
      await flushTestEventQueue();
      checkouts.single.emitSuccess(organizerSuccess('order_a'));
      await flushTestEventQueue();
      await changeAccount(null);
      await changeAccount('account-a');
      await failed;
      final currentRepository = container.read(paymentRepositoryProvider);
      expect(currentRepository, isNot(same(oldRepository)));
      await expectLater(
        payOrganizer(oldRepository, session),
        throwsA(isA<SignInRequiredException>()),
      );
      verification.complete(server.admittedFor(session));
      await flushTestEventQueue();
      expect(checkouts.single.clearCalls, 1);
      verify.onCall = server.admit;
      final current = payOrganizer(currentRepository, session);
      await flushTestEventQueue();
      checkouts.last.emitSuccess(organizerSuccess('order_a', 'pay-new'));
      expect((await current).paymentId, session.payment.paymentId);
      expect(
        (verify.calls.last! as Map)['callback'],
        containsPair('paymentId', 'pay-new'),
      );
    },
  );

  test(
    'auth error and recovery with the same UID invalidate checkout callbacks',
    () async {
      final payment = payOrganizer(
        container.read(paymentRepositoryProvider),
        server.session('event-a'),
      );
      final failed = expectLater(
        payment,
        throwsA(isA<SignInRequiredException>()),
      );
      await flushTestEventQueue();
      final oldSuccess = checkouts.single.successHandler!;
      auth.addError(StateError('auth unavailable'));
      await flushTestEventQueue();
      await container.pump();
      await failed;
      await changeAccount('account-a');
      await oldSuccess(organizerSuccess('order_a', 'old-pay'));
      expect(verify.calls, isEmpty);
    },
  );

  test(
    'uninterrupted session keeps one repository and completes the correct receipt',
    () async {
      final repository = container.read(paymentRepositoryProvider);
      final session = server.session('event-a');
      final payment = payOrganizer(repository, session);
      await flushTestEventQueue();
      await container.pump();
      expect(container.read(paymentRepositoryProvider), same(repository));
      checkouts.single.emitSuccess(organizerSuccess('order_a'));
      final receipt = await payment;
      expect(receipt.paymentId, session.payment.paymentId);
      expect(receipt.orderId, 'order_a');
      expect(receipt.eventId, 'event-a');
      expect(receipt.amountInPaise, 25000);
    },
  );

  test(
    'account replacement prevents a delayed Stripe session from launching',
    () async {
      final session = Completer<Object?>();
      final stripe = TestHttpsCallable('createStripeCheckoutSession')
        ..onCall = (_) => session.future;
      functions.callables[stripe.name] = stripe;
      final payment = _payStripe(container.read(paymentRepositoryProvider));
      final failed = expectLater(
        payment,
        throwsA(isA<SignInRequiredException>()),
      );
      await changeAccount('account-b');
      session.complete({
        'sessionId': 'cs-a',
        'paymentId': 'payment-a',
        'amountMinor': 1900,
        'currency': 'USD',
        'checkoutUrl': 'https://checkout.stripe.com/c/pay/cs-a',
        'provider': 'stripe',
      });
      await failed;
      expect(launched, isEmpty);
      expect(checkouts, isEmpty);
    },
  );
}
