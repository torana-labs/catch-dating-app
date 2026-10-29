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

Future<PaymentConfirmationData> _pay(
  PaymentRepository repository, {
  String currency = 'INR',
}) => repository.processPayment(
  eventId: 'event-a',
  currencyCode: currency,
  description: 'Event',
  userName: 'Guest',
  userEmail: 'guest@example.com',
  userContact: '+919876543210',
);

void main() {
  late StreamController<String?> auth;
  late ProviderContainer container;
  late TestFirebaseFunctions functions;
  late TestHttpsCallable create;
  late TestHttpsCallable verify;
  late List<FakeRazorpay> checkouts;
  late List<Uri> launched;

  setUp(() async {
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    auth = StreamController<String?>();
    functions = TestFirebaseFunctions();
    create = TestHttpsCallable('createRazorpayOrder')
      ..resultData = {
        'orderId': 'order-a',
        'amount': 25000,
        'currency': 'INR',
        'keyId': 'rzp_test',
      };
    verify = TestHttpsCallable('verifyRazorpayPayment')
      ..resultData = {'verified': true};
    functions.callables.addAll({create.name: create, verify.name: verify});
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
    'account switch disposes a delayed order before checkout can open',
    () async {
      final order = Completer<Object?>();
      create.onCall = (_) => order.future;
      final oldRepository = container.read(paymentRepositoryProvider);
      final oldPayment = _pay(oldRepository);
      final failed = expectLater(
        oldPayment,
        throwsA(isA<SignInRequiredException>()),
      );
      await changeAccount('account-b');
      await failed;
      expect(
        container.read(paymentRepositoryProvider),
        isNot(same(oldRepository)),
      );
      order.complete(create.resultData);
      await flushTestEventQueue();
      expect(checkouts.single.openCalls, isEmpty);
      expect(checkouts.single.clearCalls, 1);
      expect(verify.calls, isEmpty);
    },
  );

  test(
    'signout and same-UID reentry cannot revive a verification attempt',
    () async {
      final verification = Completer<Object?>();
      verify.onCall = (_) => verification.future;
      final oldRepository = container.read(paymentRepositoryProvider);
      final payment = _pay(oldRepository);
      final failed = expectLater(
        payment,
        throwsA(isA<SignInRequiredException>()),
      );
      await flushTestEventQueue();
      checkouts.single.emitSuccess(
        const RazorpaySuccessResponse(
          paymentId: 'pay-a',
          orderId: 'order-a',
          signature: 'sig-a',
        ),
      );
      await flushTestEventQueue();
      await changeAccount(null);
      await changeAccount('account-a');
      await failed;
      final currentRepository = container.read(paymentRepositoryProvider);
      expect(currentRepository, isNot(same(oldRepository)));
      await expectLater(
        _pay(oldRepository),
        throwsA(isA<SignInRequiredException>()),
      );
      verification.complete({'verified': true});
      await flushTestEventQueue();
      expect(checkouts.single.clearCalls, 1);
      verify.onCall = null;
      final current = _pay(currentRepository);
      await flushTestEventQueue();
      checkouts.last.emitSuccess(
        const RazorpaySuccessResponse(
          paymentId: 'pay-new',
          orderId: 'order-a',
          signature: 'sig-new',
        ),
      );
      expect((await current).paymentId, 'pay-new');
    },
  );

  test(
    'auth error and recovery with the same UID invalidate checkout callbacks',
    () async {
      final payment = _pay(container.read(paymentRepositoryProvider));
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
      await oldSuccess(
        const RazorpaySuccessResponse(
          paymentId: 'old-pay',
          orderId: 'order-a',
          signature: 'old-signature',
        ),
      );
      expect(verify.calls, isEmpty);
    },
  );

  test(
    'uninterrupted session keeps one repository and completes the correct receipt',
    () async {
      final repository = container.read(paymentRepositoryProvider);
      final payment = _pay(repository);
      await flushTestEventQueue();
      await container.pump();
      expect(container.read(paymentRepositoryProvider), same(repository));
      checkouts.single.emitSuccess(
        const RazorpaySuccessResponse(
          paymentId: 'pay-a',
          orderId: 'order-a',
          signature: 'sig-a',
        ),
      );
      final receipt = await payment;
      expect(receipt.paymentId, 'pay-a');
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
      final payment = _pay(
        container.read(paymentRepositoryProvider),
        currency: 'USD',
      );
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
