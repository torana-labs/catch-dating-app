import 'dart:async';

import 'package:catch_consumer_app/consumer_platform_app.dart';
import 'package:catch_consumer_app/razorpay_checkout_adapter.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/payments/data/organizer_event_checkout.dart';
import 'package:catch_dating_app/contexts/payments/data/payment_repository.dart';
import 'package:catch_dating_app/contexts/payments/data/razorpay_checkout.dart'
    as catch_payment;
import 'package:catch_dating_app/contexts/payments/domain/payment_confirmation_data.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  _nativeOwnershipTests();
  test(
    'maps native success payload into the shared payment contract',
    () async {
      final gateway = _FakeRazorpayGateway();
      final checkout = PluginRazorpayCheckout(gateway: gateway);
      catch_payment.RazorpaySuccessResponse? result;
      checkout.configure(
        onSuccess: (response) async => result = response,
        onFailure: (_) {},
      );

      gateway.emitSuccess(
        PaymentSuccessResponse('payment-1', 'order-1', 'signature-1', const {}),
      );
      await pumpEventQueue();

      expect(result?.paymentId, 'payment-1');
      expect(result?.orderId, 'order-1');
      expect(result?.signature, 'signature-1');
    },
  );

  test('maps cancellation separately from an ordinary payment error', () {
    final gateway = _FakeRazorpayGateway();
    final checkout = PluginRazorpayCheckout(gateway: gateway);
    final failures = <catch_payment.RazorpayFailureResponse>[];
    checkout.configure(onSuccess: (_) async {}, onFailure: failures.add);

    gateway
      ..emitFailure(
        PaymentFailureResponse(
          Razorpay.PAYMENT_CANCELLED,
          'Checkout closed',
          null,
        ),
      )
      ..emitFailure(
        PaymentFailureResponse(Razorpay.NETWORK_ERROR, 'Try again', null),
      );

    expect(failures, hasLength(2));
    expect(failures.first.isCancelled, isTrue);
    expect(failures.first.message, 'Checkout closed');
    expect(failures.last.isCancelled, isFalse);
    expect(failures.last.message, 'Try again');
  });

  test('delegates open and clear without rewriting checkout options', () {
    final gateway = _FakeRazorpayGateway();
    final checkout = PluginRazorpayCheckout(gateway: gateway);
    final options = <String, dynamic>{'key': 'rzp_test', 'amount': 4200};

    checkout.open(options);
    checkout.clear();

    expect(gateway.openedOptions, same(options));
    expect(gateway.clearCalls, 1);
  });
}

class _FakeRazorpayGateway implements RazorpayGateway {
  void Function(PaymentSuccessResponse response)? successHandler;
  void Function(PaymentFailureResponse response)? failureHandler;
  Map<String, dynamic>? openedOptions;
  int clearCalls = 0;

  @override
  void onSuccess(void Function(PaymentSuccessResponse response) handler) {
    successHandler = handler;
  }

  @override
  void onFailure(void Function(PaymentFailureResponse response) handler) {
    failureHandler = handler;
  }

  void emitSuccess(PaymentSuccessResponse response) =>
      successHandler?.call(response);

  void emitFailure(PaymentFailureResponse response) =>
      failureHandler?.call(response);

  @override
  void open(Map<String, dynamic> options) {
    openedOptions = options;
  }

  @override
  void clear() {
    clearCalls += 1;
  }
}

void _nativeOwnershipTests() {
  const channel = MethodChannel('razorpay_flutter');
  final messenger =
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
  final options = <String, dynamic>{
    'key': 'rzp_test',
    'order_id': 'order-a',
    'amount': 4200,
  };
  Map<String, Object?> success(String order) => {
    'type': 0,
    'data': {
      'razorpay_payment_id': 'pay-$order',
      'razorpay_order_id': order,
      'razorpay_signature': 'sig-$order',
    },
  };
  Map<String, Object?> failure() => {
    'type': 1,
    'data': {'code': Razorpay.PAYMENT_CANCELLED, 'message': 'Cancelled'},
  };

  group('native invocation ownership', () {
    late RazorpayNativeCheckoutCoordinator coordinator;
    late List<MethodCall> calls;
    late List<Completer<Object?>> nativeResults;

    setUp(() {
      coordinator = RazorpayNativeCheckoutCoordinator();
      calls = [];
      nativeResults = [];
      messenger.setMockMethodCallHandler(channel, (call) {
        calls.add(call);
        final pending = Completer<Object?>();
        nativeResults.add(pending);
        return pending.future;
      });
    });

    tearDown(() => messenger.setMockMethodCallHandler(channel, null));

    test(
      'reserve excludes another gateway before its order request and clear releases unopened lease',
      () {
        final first = PluginRazorpayGateway(coordinator: coordinator);
        expect(
          () => PluginRazorpayGateway(coordinator: coordinator),
          throwsA(isA<PaymentFailedException>()),
        );
        expect(calls, isEmpty);
        first.clear();
        final next = PluginRazorpayGateway(coordinator: coordinator);
        next.clear();
        expect(calls, isEmpty);
      },
    );

    test(
      'well-formed success belongs to the exact open and never invokes resync',
      () async {
        final checkout = PluginRazorpayCheckout(
          gateway: PluginRazorpayGateway(coordinator: coordinator),
        );
        final received = Completer<catch_payment.RazorpaySuccessResponse>();
        checkout.configure(
          onSuccess: (response) async => received.complete(response),
          onFailure: (_) => fail('Unexpected failure'),
        );
        checkout.open(options);
        await pumpEventQueue();
        expect(calls.map((call) => call.method), ['open']);
        expect(calls.single.arguments, options);
        nativeResults.single.complete(success('order-a'));
        final result = await received.future;
        expect(result.orderId, 'order-a');
        expect(result.paymentId, 'pay-order-a');
        checkout.clear();
        PluginRazorpayGateway(coordinator: coordinator).clear();
      },
    );

    test(
      'clear keeps unresolved native exclusion and late failure cannot reach a later checkout',
      () async {
        final oldCheckout = PluginRazorpayCheckout(
          gateway: PluginRazorpayGateway(coordinator: coordinator),
        );
        var oldCallbacks = 0;
        oldCheckout.configure(
          onSuccess: (_) async => oldCallbacks++,
          onFailure: (_) => oldCallbacks++,
        );
        oldCheckout.open(options);
        await pumpEventQueue();
        oldCheckout.clear();
        expect(
          () => PluginRazorpayGateway(coordinator: coordinator),
          throwsA(isA<PaymentFailedException>()),
        );
        expect(calls, hasLength(1));
        nativeResults.single.complete(failure());
        await pumpEventQueue();
        expect(oldCallbacks, 0);
        final current = PluginRazorpayCheckout(
          gateway: PluginRazorpayGateway(coordinator: coordinator),
        );
        final received = Completer<catch_payment.RazorpaySuccessResponse>();
        current.configure(
          onSuccess: (response) async => received.complete(response),
          onFailure: (_) => fail('Old failure leaked'),
        );
        current.open({...options, 'order_id': 'order-b'});
        await pumpEventQueue();
        expect(calls, hasLength(2));
        nativeResults.last.complete(success('order-b'));
        expect((await received.future).orderId, 'order-b');
        current.clear();
      },
    );

    test(
      'explicit cancellation releases native ownership for a retry',
      () async {
        final checkout = PluginRazorpayCheckout(
          gateway: PluginRazorpayGateway(coordinator: coordinator),
        );
        final received = Completer<catch_payment.RazorpayFailureResponse>();
        checkout.configure(
          onSuccess: (_) async => fail('Unexpected success'),
          onFailure: received.complete,
        );
        checkout.open(options);
        await pumpEventQueue();
        nativeResults.single.complete(failure());
        expect((await received.future).isCancelled, isTrue);
        checkout.clear();
        PluginRazorpayGateway(coordinator: coordinator).clear();
      },
    );

    for (final invalid in <String, Object?>{
      'different-order success': success('old-order'),
      'missing signature': {
        'type': 0,
        'data': {
          'razorpay_payment_id': 'pay-a',
          'razorpay_order_id': 'order-a',
        },
      },
      'unknown failure': {
        'type': 1,
        'data': {'code': 99999},
      },
      'malformed envelope': null,
      'external wallet handoff': {
        'type': 2,
        'data': {'external_wallet': 'wallet'},
      },
    }.entries) {
      test('${invalid.key} stays quarantined after clear', () async {
        final checkout = PluginRazorpayCheckout(
          gateway: PluginRazorpayGateway(coordinator: coordinator),
        );
        final received = Completer<catch_payment.RazorpayFailureResponse>();
        checkout.configure(
          onSuccess: (_) async => fail('Unexpected success'),
          onFailure: received.complete,
        );
        checkout.open(options);
        await pumpEventQueue();
        nativeResults.single.complete(invalid.value);
        expect((await received.future).isCancelled, isFalse);
        checkout.clear();
        expect(
          () => PluginRazorpayGateway(coordinator: coordinator),
          throwsA(isA<PaymentFailedException>()),
        );
        expect(calls, hasLength(1));
      });
    }

    test('transport error cannot pretend native checkout ended', () async {
      final checkout = PluginRazorpayCheckout(
        gateway: PluginRazorpayGateway(coordinator: coordinator),
      );
      final received = Completer<catch_payment.RazorpayFailureResponse>();
      checkout.configure(onSuccess: (_) async {}, onFailure: received.complete);
      checkout.open(options);
      await pumpEventQueue();
      nativeResults.single.completeError(
        PlatformException(code: 'unknown-native-outcome'),
      );
      expect((await received.future).isCancelled, isFalse);
      checkout.clear();
      expect(
        () => PluginRazorpayGateway(coordinator: coordinator),
        throwsA(isA<PaymentFailedException>()),
      );
    });

    test(
      'missing plugin proves no native open and releases the reservation',
      () async {
        messenger.setMockMethodCallHandler(channel, null);
        final checkout = PluginRazorpayCheckout(
          gateway: PluginRazorpayGateway(coordinator: coordinator),
        );
        final received = Completer<catch_payment.RazorpayFailureResponse>();
        checkout.configure(
          onSuccess: (_) async {},
          onFailure: received.complete,
        );
        checkout.open(options);
        await received.future;
        checkout.clear();
        PluginRazorpayGateway(coordinator: coordinator).clear();
      },
    );

    test(
      'account replacement retains native exclusion before a second checkout opens',
      () async {
        debugDefaultTargetPlatformOverride = TargetPlatform.android;
        addTearDown(() => debugDefaultTargetPlatformOverride = null);
        final auth = StreamController<String?>();
        final functions = _PaymentFunctions();
        final container = ProviderContainer(
          retry: (_, _) => null,
          overrides: [
            ...consumerPlatformOverrides(),
            uidProvider.overrideWith((ref) => auth.stream),
            firebaseFunctionsProvider.overrideWithValue(functions),
          ],
        );
        addTearDown(() async {
          container.dispose();
          await auth.close();
        });
        container.listen(paymentRepositoryProvider, (_, _) {});
        auth.add('account-a');
        await container.read(uidProvider.future);
        await container.pump();
        final repositoryA = container.read(paymentRepositoryProvider);
        final factory = container.read(
          catch_payment.razorpayCheckoutFactoryProvider,
        );
        final paymentA = _pay(repositoryA, 'order_1');
        final rejectedA = expectLater(
          paymentA,
          throwsA(isA<SignInRequiredException>()),
        );
        await pumpEventQueue();
        expect(calls, hasLength(1));

        auth.add('account-b');
        await pumpEventQueue();
        await container.pump();
        await rejectedA;
        final repositoryB = container.read(paymentRepositoryProvider);
        expect(repositoryB, isNot(same(repositoryA)));
        expect(
          container.read(catch_payment.razorpayCheckoutFactoryProvider),
          same(factory),
        );
        await expectLater(
          _pay(repositoryB, 'order_2'),
          throwsA(isA<PaymentFailedException>()),
        );
        expect(calls, hasLength(1));

        // A's terminal native response releases only native exclusion. It
        // cannot verify or complete a receipt for the replacement account.
        nativeResults.single.complete(failure());
        await pumpEventQueue();
        expect(functions.verifications, isEmpty);
        final paymentB = _pay(repositoryB, 'order_2');
        await pumpEventQueue();
        expect(calls, hasLength(2));
        expect(calls.last.arguments, containsPair('order_id', 'order_2'));
        // The order belongs to the organizer's account, keyed by its token.
        expect(
          calls.last.arguments,
          containsPair('key', 'rzp_test_oauth_organizer'),
        );
        nativeResults.last.complete(success('order_2'));
        final receipt = await paymentB;
        expect(receipt.orderId, 'order_2');
        expect(receipt.paymentId, _organizerPaymentId);
        expect(receipt.eventId, 'event');
        expect(functions.verifications, [
          {
            'action': 'status',
            'paymentId': _organizerPaymentId,
            'callback': {
              'paymentId': 'pay-order_2',
              'signature': 'sig-order_2',
            },
          },
        ]);
      },
    );
  });
}

const _organizerPaymentId = 'pp_0123456789abcdef0123456789abcdef';

/// INR is sold only through the organizer's own Razorpay checkout; this is
/// the native open the shared attempt lease guards.
Future<PaymentConfirmationData> _pay(
  PaymentRepository repository,
  String orderId,
) => repository.payOrganizerCheckout(
  session: OrganizerCheckoutSession(
    eventId: 'event',
    admitted: false,
    payment: OrganizerCheckoutPayment(
      paymentId: _organizerPaymentId,
      status: 'checkoutReady',
      amountPaise: 4200,
      currency: 'INR',
      checkout: OrganizerCheckout(
        publicToken: 'rzp_test_oauth_organizer',
        orderId: orderId,
        amountPaise: 4200,
        currency: 'INR',
        description: 'Event',
        expiresAtMillis: DateTime(2100).millisecondsSinceEpoch,
      ),
    ),
  ),
  method: OrganizerPaymentMethod.card,
  displayName: 'Guest',
  description: 'Event',
  userEmail: 'guest@example.com',
  userContact: '+919876543210',
);

class _PaymentFunctions extends Fake implements FirebaseFunctions {
  final verifications = <Object?>[];

  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) =>
      _PaymentCallable((parameters) {
        switch (name) {
          case 'managePublicEventCheckout':
            verifications.add(parameters);
            return {
              'quote': null,
              'payment': {
                'paymentId': _organizerPaymentId,
                'status': 'admitted',
                'amountPaise': 4200,
                'currency': 'INR',
                'checkout': null,
                'eventId': 'event',
              },
              'admission': {
                'eventId': 'event',
                'attendeeId': 'attendee-1',
                'status': 'registered',
              },
              'serverTimeMillis': 1,
            };
          default:
            throw StateError('Unexpected callable: $name');
        }
      });
}

class _PaymentCallable extends Fake implements HttpsCallable {
  _PaymentCallable(this.handle);
  final Object? Function(Object?) handle;

  @override
  Future<HttpsCallableResult<T>> call<T>([dynamic parameters]) async =>
      _PaymentResult(handle(parameters) as T);
}

class _PaymentResult<T> extends Fake implements HttpsCallableResult<T> {
  _PaymentResult(this.data);
  @override
  final T data;
}
