import 'package:catch_dating_app/contexts/payments/data/payment_repository.dart';
import 'package:catch_dating_app/contexts/payments/data/razorpay_checkout.dart';
import 'package:catch_dating_app/contexts/payments/domain/payment.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:url_launcher/url_launcher.dart';

import '../test_pump_helpers.dart';
import 'payment_test_fakes.dart';

void main() {
  group('PaymentRepository', () {
    late TestFirebaseFunctions functions;
    late FakeRazorpay razorpay;
    late PaymentRepository repository;

    setUp(() {
      functions = TestFirebaseFunctions();
      razorpay = FakeRazorpay();
      repository = PaymentRepository(
        functions,
        razorpayFactory: () => razorpay,
        isWebOverride: false,
        targetPlatformOverride: TargetPlatform.android,
      );
    });

    test(
      'processPayment requests a trusted order and verifies without client event metadata',
      () async {
        functions.callables['createRazorpayOrder'] =
            TestHttpsCallable('createRazorpayOrder')
              ..resultData = {
                'orderId': 'order_123',
                'amount': 25000,
                'currency': 'INR',
                'keyId': 'rzp_test_server_environment',
              };
        functions.callables['verifyRazorpayPayment'] = TestHttpsCallable(
          'verifyRazorpayPayment',
        )..resultData = {'verified': true, 'eventId': 'trusted-event'};

        final future = repository.processPayment(
          eventId: 'event-1',
          currencyCode: 'INR',
          description: 'Sunrise Event',
          userName: 'Priya',
          userEmail: 'priya@example.com',
          userContact: '+919876543210',
        );
        await flushTestEventQueue();

        expect(functions.callables['createRazorpayOrder']!.calls.single, {
          'eventId': 'event-1',
        });
        expect(razorpay.openCalls.single['order_id'], 'order_123');
        expect(razorpay.openCalls.single['amount'], 25000);
        expect(razorpay.openCalls.single['currency'], 'INR');
        expect(razorpay.openCalls.single['key'], 'rzp_test_server_environment');

        razorpay.emitSuccess(
          const RazorpaySuccessResponse(
            paymentId: 'pay_123',
            orderId: 'order_123',
            signature: 'sig_123',
          ),
        );
        await future;

        expect(functions.callables['verifyRazorpayPayment']!.calls.single, {
          'paymentId': 'pay_123',
          'orderId': 'order_123',
          'signature': 'sig_123',
        });
      },
    );

    test('does not initialize Razorpay until a paid checkout starts', () {
      var factoryCalls = 0;
      final lazyRepository = PaymentRepository(
        functions,
        razorpayFactory: () {
          factoryCalls++;
          return FakeRazorpay();
        },
        isWebOverride: false,
        targetPlatformOverride: TargetPlatform.iOS,
      );

      expect(lazyRepository.supportsPaidBookings, isTrue);
      expect(lazyRepository.supportsPaidBookingsForCurrency('INR'), isTrue);
      expect(lazyRepository.supportsPaidBookingsForCurrency('USD'), isTrue);
      expect(factoryCalls, 0);
    });

    test(
      'processPayment opens Stripe checkout for non-INR currencies',
      () async {
        final openedUrls = <Uri>[];
        final stripeRepository = PaymentRepository(
          functions,
          razorpayFactory: () => razorpay,
          externalUrlLauncher:
              (uri, {mode = LaunchMode.platformDefault}) async {
                openedUrls.add(uri);
                return true;
              },
          isWebOverride: true,
        );
        functions.callables['createStripeCheckoutSession'] =
            TestHttpsCallable('createStripeCheckoutSession')
              ..resultData = {
                'sessionId': 'cs_test_123',
                'paymentId': 'payment-doc-1',
                'amountMinor': 1999,
                'currency': 'USD',
                'checkoutUrl': 'https://checkout.stripe.com/c/pay/cs_test_123',
                'provider': 'stripe',
              };

        final data = await stripeRepository.processPayment(
          eventId: 'event-1',
          currencyCode: 'USD',
          description: 'Sunrise Event',
          userName: 'Priya',
          userEmail: 'priya@example.com',
          userContact: '+919876543210',
          inviteCode: ' CATCH ',
          inviteLinkId: ' invite-link-1 ',
        );

        expect(
          functions.callables['createStripeCheckoutSession']!.calls.single,
          {
            'eventId': 'event-1',
            'inviteCode': 'CATCH',
            'inviteLinkId': 'invite-link-1',
          },
        );
        expect(openedUrls.single.toString(), contains('checkout.stripe.com'));
        expect(razorpay.openCalls, isEmpty);
        expect(data.paymentId, 'payment-doc-1');
        expect(data.orderId, 'cs_test_123');
        expect(data.status, PaymentStatus.pending);
        expect(data.provider, 'stripe');
      },
    );

    test('bookFreeEvent calls the free-event booking function', () async {
      await repository.bookFreeEvent(
        eventId: 'event-1',
        inviteCode: ' CATCH ',
        inviteLinkId: ' invite-link-1 ',
      );

      expect(functions.callables['signUpForFreeEvent']!.calls.single, {
        'eventId': 'event-1',
        'inviteCode': 'CATCH',
        'inviteLinkId': 'invite-link-1',
      });
    });

    test(
      'bookFreeEvent maps unauthenticated callable failures to sign-in errors',
      () async {
        functions.callables['signUpForFreeEvent'] =
            TestHttpsCallable('signUpForFreeEvent')
              ..error = TestFirebaseFunctionsException(
                code: 'unauthenticated',
                message: 'UNAUTHENTICATED',
              );

        await expectLater(
          repository.bookFreeEvent(eventId: 'event-1'),
          throwsA(
            isA<SignInRequiredException>().having(
              (error) => error.message,
              'message',
              'You need to be signed in to book an event.',
            ),
          ),
        );
      },
    );

    test(
      'bookFreeEvent preserves server-side booking failure messages',
      () async {
        functions.callables['signUpForFreeEvent'] =
            TestHttpsCallable('signUpForFreeEvent')
              ..error = TestFirebaseFunctionsException(
                code: 'failed-precondition',
                message: 'Event is full.',
              );

        await expectLater(
          repository.bookFreeEvent(eventId: 'event-1'),
          throwsA(
            isA<EventBookingFailedException>().having(
              (error) => error.message,
              'message',
              'Event is full.',
            ),
          ),
        );
      },
    );

    test(
      'processPayment maps callable startup failures to PaymentFailedException',
      () async {
        functions.callables['createRazorpayOrder'] =
            TestHttpsCallable('createRazorpayOrder')
              ..error = TestFirebaseFunctionsException(
                code: 'failed-precondition',
                message: 'Event is full.',
              );

        await expectLater(
          repository.processPayment(
            eventId: 'event-1',
            currencyCode: 'INR',
            description: 'Sunrise Event',
            userName: 'Priya',
            userEmail: 'priya@example.com',
            userContact: '+919876543210',
          ),
          throwsA(
            isA<PaymentFailedException>().having(
              (error) => error.message,
              'message',
              'Payment failed: Event is full.',
            ),
          ),
        );
        expect(razorpay.openCalls, isEmpty);
      },
    );

    test(
      'unexpected payment errors use the stable user-safe fallback',
      () async {
        functions.callables['createRazorpayOrder'] = TestHttpsCallable(
          'createRazorpayOrder',
        )..error = StateError('private SDK response');

        await expectLater(
          repository.processPayment(
            eventId: 'event-1',
            currencyCode: 'INR',
            description: 'Sunrise Event',
            userName: 'Priya',
            userEmail: 'priya@example.com',
            userContact: '+919876543210',
          ),
          throwsA(
            isA<PaymentFailedException>()
                .having(
                  (error) => error.message,
                  'message',
                  'Payment failed: Unable to start the payment.',
                )
                .having(
                  (error) => error.debugMessage,
                  'debugMessage',
                  contains('private SDK response'),
                ),
          ),
        );
        expect(razorpay.openCalls, isEmpty);
      },
    );

    test(
      'processPayment rejects malformed order responses before checkout',
      () async {
        functions.callables['createRazorpayOrder'] = TestHttpsCallable(
          'createRazorpayOrder',
        )..resultData = {'orderId': 'order_123', 'currency': 'INR'};

        await expectLater(
          repository.processPayment(
            eventId: 'event-1',
            currencyCode: 'INR',
            description: 'Sunrise Event',
            userName: 'Priya',
            userEmail: 'priya@example.com',
            userContact: '+919876543210',
          ),
          throwsA(isA<PaymentVerificationFailedException>()),
        );
        expect(razorpay.openCalls, isEmpty);
      },
    );

    test(
      'success callback fails fast when Razorpay response is incomplete',
      () async {
        functions.callables['createRazorpayOrder'] =
            TestHttpsCallable('createRazorpayOrder')
              ..resultData = {
                'orderId': 'order_123',
                'amount': 25000,
                'currency': 'INR',
                'keyId': 'rzp_test_server_environment',
              };

        final future = repository.processPayment(
          eventId: 'event-1',
          currencyCode: 'INR',
          description: 'Sunrise Event',
          userName: 'Priya',
          userEmail: 'priya@example.com',
          userContact: '+919876543210',
        );
        await flushTestEventQueue();

        razorpay.emitSuccess(
          const RazorpaySuccessResponse(
            paymentId: 'pay_123',
            orderId: 'order_123',
            signature: null,
          ),
        );

        await expectLater(
          future,
          throwsA(isA<PaymentVerificationFailedException>()),
        );
      },
    );

    test('error callback maps cancelled payments cleanly', () async {
      functions.callables['createRazorpayOrder'] =
          TestHttpsCallable('createRazorpayOrder')
            ..resultData = {
              'orderId': 'order_123',
              'amount': 25000,
              'currency': 'INR',
              'keyId': 'rzp_test_server_environment',
            };

      final future = repository.processPayment(
        eventId: 'event-1',
        currencyCode: 'INR',
        description: 'Sunrise Event',
        userName: 'Priya',
        userEmail: 'priya@example.com',
        userContact: '+919876543210',
      );
      await flushTestEventQueue();

      razorpay.emitError(
        const RazorpayFailureResponse(
          isCancelled: true,
          message: 'Cancelled by user',
        ),
      );

      await expectLater(future, throwsA(isA<PaymentCancelledException>()));
    });

    test(
      'verification callable failures surface as PaymentFailedException',
      () async {
        functions.callables['createRazorpayOrder'] =
            TestHttpsCallable('createRazorpayOrder')
              ..resultData = {
                'orderId': 'order_123',
                'amount': 25000,
                'currency': 'INR',
                'keyId': 'rzp_test_server_environment',
              };
        functions.callables['verifyRazorpayPayment'] =
            TestHttpsCallable('verifyRazorpayPayment')
              ..error = TestFirebaseFunctionsException(
                code: 'failed-precondition',
                message: 'This event is now full.',
              );

        final future = repository.processPayment(
          eventId: 'event-1',
          currencyCode: 'INR',
          description: 'Sunrise Event',
          userName: 'Priya',
          userEmail: 'priya@example.com',
          userContact: '+919876543210',
        );
        await flushTestEventQueue();

        razorpay.emitSuccess(
          const RazorpaySuccessResponse(
            paymentId: 'pay_123',
            orderId: 'order_123',
            signature: 'sig_123',
          ),
        );

        await expectLater(
          future,
          throwsA(
            isA<PaymentFailedException>().having(
              (error) => error.message,
              'message',
              'Payment failed: This event is now full.',
            ),
          ),
        );
      },
    );
  });
}
