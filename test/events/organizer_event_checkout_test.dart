import 'package:catch_dating_app/contexts/payments/data/organizer_event_checkout.dart';
import 'package:catch_dating_app/contexts/payments/data/payment_repository.dart';
import 'package:catch_dating_app/contexts/payments/data/razorpay_checkout.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';

import '../payments/payment_test_fakes.dart';
import '../test_pump_helpers.dart';

const _eventId = 'event-1';
final _farFuture = DateTime(2100).millisecondsSinceEpoch;

Map<String, Object?> _quote() => {
  'eventId': _eventId,
  'eventName': 'Sunday Run',
  'registrationRevision': 1,
  'startTimeMillis': 100,
  'amountPaise': 10000,
  'currency': 'INR',
  'cancellationPolicy': {
    'refundDeadlineMillis': 50,
    'eventStartsAtMillis': 100,
  },
};

Map<String, Object?> _payment({
  String status = 'checkoutReady',
  bool checkout = true,
  int? refundQuote,
  int checkoutAmount = 10000,
}) => {
  'paymentId': 'pp_0123456789abcdef0123456789abcdef',
  'status': status,
  'amountPaise': 10000,
  'currency': 'INR',
  'mode': 'test',
  'refundedAmountPaise': 0,
  'expiresAtMillis': _farFuture,
  'checkout': checkout
      ? {
          'publicToken': 'rzp_test_oauth_organizer',
          'orderId': 'order_organizer1',
          'amountPaise': checkoutAmount,
          'currency': 'INR',
          'description': 'Sunday Run',
          'expiresAtMillis': _farFuture,
        }
      : null,
  'cancellationReason': null,
  'cancellationPolicy': {
    'refundDeadlineMillis': 50,
    'eventStartsAtMillis': 100,
  },
  'cancellationQuote': refundQuote == null
      ? null
      : {'refundAmountPaise': refundQuote},
  'eventId': _eventId,
  'eventName': 'Sunday Run',
  'startTimeMillis': 100,
};

Map<String, Object?> _response({
  Map<String, Object?>? quote,
  Map<String, Object?>? payment,
  bool admitted = false,
}) => {
  'quote': quote,
  'payment': payment,
  'admission': admitted
      ? {
          'eventId': _eventId,
          'attendeeId': 'attendee-1',
          'status': 'registered',
        }
      : null,
  'serverTimeMillis': 1,
};

void main() {
  late TestFirebaseFunctions functions;
  late FakeRazorpay razorpay;
  late PaymentRepository repository;
  late TestHttpsCallable checkout;
  late List<Map<Object?, Object?>> commands;
  late Map<String, Object? Function(Map<Object?, Object?>)> replies;

  setUp(() {
    functions = TestFirebaseFunctions();
    razorpay = FakeRazorpay();
    repository = PaymentRepository(
      functions,
      razorpayFactory: () => razorpay,
      isWebOverride: false,
      targetPlatformOverride: TargetPlatform.android,
    );
    commands = [];
    replies = {};
    checkout = TestHttpsCallable('managePublicEventCheckout')
      ..onCall = (parameters) async {
        final command = parameters! as Map<Object?, Object?>;
        commands.add(command);
        return replies[command['action']]!(command);
      };
    functions.callables['managePublicEventCheckout'] = checkout;
  });

  Future<Object?> book([
    OrganizerPaymentMethod method = OrganizerPaymentMethod.googlePay,
  ]) async {
    final session = await repository.prepareOrganizerCheckout(
      eventId: _eventId,
      displayName: ' Ada Guest ',
    );
    return repository.payOrganizerCheckout(
      session: session,
      method: method,
      displayName: 'Ada Guest',
      description: 'Sunday Run · Sun 1 Nov',
      userEmail: 'ada@example.com',
      userContact: '+919876543210',
    );
  }

  test(
    'a new booking pays the organizer account and admits on the server',
    () async {
      replies['find'] = (_) => _response();
      replies['quote'] = (_) => _response(quote: _quote());
      replies['prepare'] = (_) => _response(payment: _payment());
      replies['status'] = (_) => _response(
        payment: _payment(status: 'admitted', checkout: false, refundQuote: 0),
        admitted: true,
      );

      final future = book();
      await flushTestEventQueue();

      final prepare = commands.firstWhere((c) => c['action'] == 'prepare');
      expect(prepare['reviewedQuote'], _quote());
      expect(prepare['displayName'], 'Ada Guest');
      expect(prepare['inviteToken'], isNull);
      expect(prepare['requestId'], matches(RegExp(r'^[0-9a-f]{32}$')));
      final options = razorpay.openCalls.single;
      expect(options['key'], 'rzp_test_oauth_organizer');
      expect((options['prefill'] as Map)['method'], 'upi');
      expect(
        options['config'],
        OrganizerPaymentMethod.googlePay.razorpayDisplayConfig(),
      );
      expect(options['order_id'], 'order_organizer1');
      expect(options['amount'], 10000);

      razorpay.emitSuccess(
        const RazorpaySuccessResponse(
          paymentId: 'pay_1',
          orderId: 'order_organizer1',
          signature: 'signature',
        ),
      );
      final result = await future;

      final status = commands.last;
      expect(status['action'], 'status');
      expect(status['callback'], {
        'paymentId': 'pay_1',
        'signature': 'signature',
      });
      expect(
        (result! as dynamic).paymentId,
        'pp_0123456789abcdef0123456789abcdef',
      );
      expect((result as dynamic).orderId, 'order_organizer1');
      expect(functions.callables.containsKey('createRazorpayOrder'), isFalse);
      expect(razorpay.cleared, isTrue);
    },
  );

  test('an existing admission completes without opening checkout', () async {
    replies['find'] = (_) => _response(
      payment: _payment(status: 'admitted', checkout: false),
      admitted: true,
    );
    final result = await book();
    expect((result! as dynamic).amountInPaise, 10000);
    expect(razorpay.openCalls, isEmpty);
    expect(commands.map((c) => c['action']), ['find']);
  });

  test('an open checkout resumes without a new quote', () async {
    replies['find'] = (_) => _response(payment: _payment());
    final future = book();
    await flushTestEventQueue();
    expect(commands.map((c) => c['action']), ['find']);
    expect(razorpay.openCalls.single['order_id'], 'order_organizer1');
    razorpay.emitError(const RazorpayFailureResponse(isCancelled: true));
    await expectLater(future, throwsA(isA<PaymentCancelledException>()));
  });

  test(
    'a callback for another order is ignored; a malformed one fails',
    () async {
      replies['find'] = (_) => _response(payment: _payment());
      final future = book();
      await flushTestEventQueue();
      razorpay.emitSuccess(
        const RazorpaySuccessResponse(
          paymentId: 'pay_other',
          orderId: 'order_other',
          signature: 'sig',
        ),
      );
      await flushTestEventQueue();
      expect(commands.where((c) => c['action'] == 'status'), isEmpty);
      razorpay.emitSuccess(
        const RazorpaySuccessResponse(
          paymentId: 'pay_1',
          orderId: 'order_organizer1',
          signature: null,
        ),
      );
      await expectLater(
        future,
        throwsA(isA<PaymentVerificationFailedException>()),
      );
    },
  );

  test('a failed verification is not reported as booked', () async {
    replies['find'] = (_) => _response(payment: _payment());
    replies['status'] = (_) =>
        _response(payment: _payment(status: 'failed', checkout: false));
    final future = book();
    await flushTestEventQueue();
    razorpay.emitSuccess(
      const RazorpaySuccessResponse(
        paymentId: 'pay_1',
        orderId: 'order_organizer1',
        signature: 'sig',
      ),
    );
    await expectLater(future, throwsA(isA<PaymentFailedException>()));
  });

  test(
    'a checkout whose amount disagrees with its payment is rejected',
    () async {
      replies['find'] = (_) => _response(payment: _payment(checkoutAmount: 1));
      await expectLater(
        book(),
        throwsA(isA<PaymentVerificationFailedException>()),
      );
      expect(razorpay.openCalls, isEmpty);
    },
  );

  test('cancellation confirms the server-quoted organizer refund', () async {
    replies['status'] = (_) => _response(
      payment: _payment(status: 'admitted', checkout: false, refundQuote: 0),
      admitted: true,
    );
    replies['cancelAdmission'] = (_) =>
        _response(payment: _payment(status: 'cancelled', checkout: false));
    await repository.cancelOrganizerBooking(
      eventId: _eventId,
      paymentId: 'pp_0123456789abcdef0123456789abcdef',
    );
    expect(commands.last, {
      'action': 'cancelAdmission',
      'paymentId': 'pp_0123456789abcdef0123456789abcdef',
      'expectedRefundAmountPaise': 0,
    });
  });

  test('cancellation is refused once the server offers no quote', () async {
    replies['status'] = (_) => _response(
      payment: _payment(status: 'admitted', checkout: false),
      admitted: true,
    );
    await expectLater(
      repository.cancelOrganizerBooking(
        eventId: _eventId,
        paymentId: 'pp_0123456789abcdef0123456789abcdef',
      ),
      throwsA(isA<PaymentFailedException>()),
    );
    expect(commands.map((c) => c['action']), ['status']);
  });

  test('each payment-page choice narrows Razorpay to that method', () {
    Map<Object?, Object?> instrument(OrganizerPaymentMethod method) {
      final display = method.razorpayDisplayConfig()['display']! as Map;
      final blocks = display['blocks']! as Map;
      final block = blocks['catch']! as Map;
      expect(display['sequence'], ['block.catch']);
      expect(display['preferences'], {'show_default_blocks': false});
      return (block['instruments']! as List).single as Map;
    }

    expect(instrument(OrganizerPaymentMethod.googlePay), {
      'method': 'upi',
      'flows': ['intent'],
      'apps': ['google_pay'],
    });
    expect(instrument(OrganizerPaymentMethod.phonePe)['apps'], ['phonepe']);
    expect(instrument(OrganizerPaymentMethod.paytm)['apps'], ['paytm']);
    expect(instrument(OrganizerPaymentMethod.otherUpi), {'method': 'upi'});
    expect(instrument(OrganizerPaymentMethod.card), {'method': 'card'});
    expect(instrument(OrganizerPaymentMethod.netbanking), {
      'method': 'netbanking',
    });
  });

  test(
    'prepare carries the frozen refund deadline to the payment page',
    () async {
      replies['find'] = (_) => _response(payment: _payment());
      final session = await repository.prepareOrganizerCheckout(
        eventId: _eventId,
        displayName: 'Ada',
      );
      expect(session.admitted, isFalse);
      expect(session.payment.refundDeadlineMillis, 50);
      expect(razorpay.openCalls, isEmpty);
    },
  );

  test('only organizer ledger ids mark an organizer booking', () {
    expect(isOrganizerPaymentId('pp_abc'), isTrue);
    expect(isOrganizerPaymentId('pay_native'), isFalse);
    expect(isOrganizerPaymentId(null), isFalse);
  });
}
