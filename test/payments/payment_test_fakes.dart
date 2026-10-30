import 'package:catch_dating_app/contexts/payments/data/organizer_event_checkout.dart';
import 'package:catch_dating_app/contexts/payments/data/payment_repository.dart';
import 'package:catch_dating_app/contexts/payments/data/razorpay_checkout.dart';
import 'package:catch_dating_app/contexts/payments/domain/payment_confirmation_data.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

class TestFirebaseFunctions extends Fake implements FirebaseFunctions {
  final callables = <String, TestHttpsCallable>{};

  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) {
    return callables.putIfAbsent(name, () => TestHttpsCallable(name));
  }
}

class TestHttpsCallable extends Fake implements HttpsCallable {
  TestHttpsCallable(this.name);

  final String name;
  final calls = <Object?>[];
  Object? resultData;
  Object? error;
  Future<Object?> Function(Object? parameters)? onCall;

  @override
  Future<HttpsCallableResult<T>> call<T>([dynamic parameters]) async {
    calls.add(parameters);
    if (error != null) {
      throw error!;
    }
    final handler = onCall;
    final result = handler == null ? resultData : await handler(parameters);
    return TestHttpsCallableResult<T>(result as T);
  }
}

class TestHttpsCallableResult<T> extends Fake
    implements HttpsCallableResult<T> {
  TestHttpsCallableResult(this.dataValue);

  final T dataValue;

  @override
  T get data => dataValue;
}

class FakeRazorpay implements RazorpayCheckout {
  RazorpaySuccessHandler? successHandler;
  RazorpayFailureHandler? errorHandler;
  final openCalls = <Map<String, dynamic>>[];
  bool cleared = false;
  int clearCalls = 0;
  Object? openError;

  @override
  void configure({
    required RazorpaySuccessHandler onSuccess,
    required RazorpayFailureHandler onFailure,
  }) {
    successHandler = onSuccess;
    errorHandler = onFailure;
  }

  @override
  void open(Map<String, dynamic> options) {
    openCalls.add(options);
    if (openError case final error?) throw error;
  }

  @override
  void clear() {
    cleared = true;
    clearCalls++;
  }

  void emitSuccess(RazorpaySuccessResponse response) {
    successHandler?.call(response);
  }

  void emitError(RazorpayFailureResponse response) {
    errorHandler?.call(response);
  }
}

class TestFirebaseFunctionsException extends FirebaseFunctionsException {
  TestFirebaseFunctionsException({
    required super.code,
    required super.message,
    super.details,
  });
}

/// Organizer-routed checkout, the only INR paid path. The shared attempt
/// lease, deadline and session-ownership checks run through
/// [PaymentRepository.payOrganizerCheckout], verified by
/// `managePublicEventCheckout` `status`.
final class OrganizerCheckoutFake {
  OrganizerCheckoutFake(TestFirebaseFunctions functions) {
    callable.onCall = admit;
    functions.callables[callable.name] = callable;
  }

  final callable = TestHttpsCallable('managePublicEventCheckout');
  final _sessions = <String, OrganizerCheckoutSession>{};

  /// A server-prepared checkout for [eventId] on the organizer's account.
  OrganizerCheckoutSession session(
    String eventId, {
    String orderId = 'order_a',
    int amountPaise = 25000,
  }) {
    final paymentId =
        'pp_${eventId.replaceAll(RegExp('[^a-z0-9]'), '').padRight(32, '0')}';
    final session = OrganizerCheckoutSession(
      eventId: eventId,
      admitted: false,
      payment: OrganizerCheckoutPayment(
        paymentId: paymentId,
        status: 'checkoutReady',
        amountPaise: amountPaise,
        currency: 'INR',
        checkout: OrganizerCheckout(
          publicToken: 'rzp_test_oauth_organizer',
          orderId: orderId,
          amountPaise: amountPaise,
          currency: 'INR',
          description: 'Event',
          expiresAtMillis: DateTime(2100).millisecondsSinceEpoch,
        ),
      ),
    );
    _sessions[paymentId] = session;
    return session;
  }

  /// The server's reply once it has verified and admitted [session].
  Map<String, Object?> admittedFor(OrganizerCheckoutSession session) => {
    'quote': null,
    'payment': {
      'paymentId': session.payment.paymentId,
      'status': 'admitted',
      'amountPaise': session.payment.amountPaise,
      'currency': 'INR',
      'checkout': null,
      'eventId': session.eventId,
    },
    'admission': {
      'eventId': session.eventId,
      'attendeeId': 'attendee-1',
      'status': 'registered',
    },
    'serverTimeMillis': 1,
  };

  /// Admits whichever prepared payment the status command names.
  Future<Object?> admit(Object? parameters) async {
    final command = parameters! as Map<Object?, Object?>;
    return admittedFor(_sessions[command['paymentId']]!);
  }
}

Future<PaymentConfirmationData> payOrganizer(
  PaymentRepository repository,
  OrganizerCheckoutSession session,
) => repository.payOrganizerCheckout(
  session: session,
  method: OrganizerPaymentMethod.googlePay,
  displayName: 'Guest',
  description: 'Event',
  userEmail: 'guest@example.com',
  userContact: '+919876543210',
);

RazorpaySuccessResponse organizerSuccess(String orderId, [String? payment]) =>
    RazorpaySuccessResponse(
      paymentId: payment ?? 'pay_$orderId',
      orderId: orderId,
      signature: 'sig_$orderId',
    );
