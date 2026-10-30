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
      'INR processPayment never creates an order on Catch\'s account',
      () async {
        var factoryCalls = 0;
        final inrRepository = PaymentRepository(
          functions,
          razorpayFactory: () {
            factoryCalls++;
            return razorpay;
          },
          isWebOverride: false,
          targetPlatformOverride: TargetPlatform.android,
        );
        await expectLater(
          inrRepository.processPayment(eventId: 'event-1', currencyCode: 'inr'),
          throwsA(
            isA<PaidBookingUnavailableException>().having(
              (error) => error.reason,
              'reason',
              PaidBookingUnavailableReason.notOfferedInApp,
            ),
          ),
        );
        expect(functions.callables, isEmpty);
        expect(factoryCalls, 0);
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
      'an organizer without a ready account is a typed unavailable booking',
      () async {
        functions.callables['managePublicEventCheckout'] =
            TestHttpsCallable('managePublicEventCheckout')
              ..error = TestFirebaseFunctionsException(
                code: 'failed-precondition',
                message:
                    'Paid booking is unavailable until this organiser '
                    'finishes connecting their Razorpay account.',
                details: const {'reason': 'organizerPaymentsNotReady'},
              );

        await expectLater(
          repository.prepareOrganizerCheckout(
            eventId: 'event-1',
            displayName: 'Priya',
          ),
          throwsA(
            isA<PaidBookingUnavailableException>().having(
              (error) => error.reason,
              'reason',
              PaidBookingUnavailableReason.organizerPaymentsNotReady,
            ),
          ),
        );
        expect(razorpay.openCalls, isEmpty);
      },
    );

    test(
      'other checkout refusals stay payment failures with their message',
      () async {
        functions.callables['managePublicEventCheckout'] =
            TestHttpsCallable('managePublicEventCheckout')
              ..error = TestFirebaseFunctionsException(
                code: 'failed-precondition',
                message: 'Event is full.',
                details: const {'reason': 'somethingElse'},
              );

        await expectLater(
          repository.prepareOrganizerCheckout(
            eventId: 'event-1',
            displayName: 'Priya',
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
        functions.callables['managePublicEventCheckout'] = TestHttpsCallable(
          'managePublicEventCheckout',
        )..error = StateError('private SDK response');

        await expectLater(
          repository.prepareOrganizerCheckout(
            eventId: 'event-1',
            displayName: 'Priya',
          ),
          throwsA(
            isA<PaymentFailedException>()
                .having(
                  (error) => error.message,
                  'message',
                  'Payment failed: Unable to reach checkout right now.',
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
      'success callback fails fast when Razorpay response is incomplete',
      () async {
        final server = OrganizerCheckoutFake(functions);
        final future = payOrganizer(repository, server.session('event-1'));
        await flushTestEventQueue();

        razorpay.emitSuccess(
          const RazorpaySuccessResponse(
            paymentId: 'pay_123',
            orderId: 'order_a',
            signature: null,
          ),
        );

        await expectLater(
          future,
          throwsA(isA<PaymentVerificationFailedException>()),
        );
        expect(server.callable.calls, isEmpty);
      },
    );

    test('error callback maps cancelled payments cleanly', () async {
      final server = OrganizerCheckoutFake(functions);
      final future = payOrganizer(repository, server.session('event-1'));
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
        final server = OrganizerCheckoutFake(functions);
        server.callable.error = TestFirebaseFunctionsException(
          code: 'failed-precondition',
          message: 'This event is now full.',
        );
        final future = payOrganizer(repository, server.session('event-1'));
        await flushTestEventQueue();

        razorpay.emitSuccess(organizerSuccess('order_a'));

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
