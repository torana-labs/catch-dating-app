import 'dart:async';

import 'package:catch_dating_app/auth/data/auth_repository.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/app_bootstrap.dart';
import 'package:catch_dating_app/payments/data/payment_repository.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:catch_consumer_app/consumer_platform_app.dart';
import 'package:catch_dating_app/app.dart';
import 'package:catch_dating_app/payments/data/razorpay_checkout.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'Consumer app uses Consumer routing under the bootstrap provider root',
    () {
      final root = const ConsumerPlatformApp().build(_FakeBuildContext());

      expect(root, isA<MyApp>());
      expect((root as MyApp).routerProvider, same(consumerGoRouterProvider));
    },
  );

  testWidgets('reusable platform overrides expose native checkout', (
    tester,
  ) async {
    RazorpayCheckoutFactory? observedFactory;
    await tester.pumpWidget(
      ProviderScope(
        overrides: consumerPlatformOverrides(),
        child: Consumer(
          builder: (context, ref, child) {
            observedFactory = ref.watch(razorpayCheckoutFactoryProvider);
            return const SizedBox.shrink();
          },
        ),
      ),
    );

    expect(observedFactory, isNotNull);
  });

  testWidgets(
    'nested-only native checkout leaves the payment repository unsupported',
    (tester) async {
      debugDefaultTargetPlatformOverride = TargetPlatform.android;
      addTearDown(() => debugDefaultTargetPlatformOverride = null);
      final rootContainer = createCatchAppContainer(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value('test-account')),
          firebaseFunctionsProvider.overrideWithValue(_FakeFirebaseFunctions()),
        ],
      );
      addTearDown(rootContainer.dispose);
      RazorpayCheckoutFactory? observedFactory;
      PaymentRepository? observedRepository;

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: rootContainer,
          child: ProviderScope(
            overrides: consumerPlatformOverrides(),
            child: Consumer(
              builder: (context, ref, child) {
                observedFactory = ref.watch(razorpayCheckoutFactoryProvider);
                observedRepository = ref.watch(paymentRepositoryProvider);
                return const SizedBox.shrink();
              },
            ),
          ),
        ),
      );

      expect(observedFactory, isNotNull);
      expect(rootContainer.read(razorpayCheckoutFactoryProvider), isNull);
      expect(observedRepository!.supportsPaidBookings, isFalse);
      debugDefaultTargetPlatformOverride = null;
    },
  );

  testWidgets(
    'root-bound native checkout reaches payment repository through child scope',
    (tester) async {
      debugDefaultTargetPlatformOverride = TargetPlatform.android;
      addTearDown(() => debugDefaultTargetPlatformOverride = null);
      final rootContainer = createCatchAppContainer(
        overrides: [
          ...consumerPlatformOverrides(),
          uidProvider.overrideWith((ref) => Stream.value('test-account')),
          firebaseFunctionsProvider.overrideWithValue(_FakeFirebaseFunctions()),
        ],
      );
      addTearDown(rootContainer.dispose);
      RazorpayCheckoutFactory? observedFactory;
      PaymentRepository? observedRepository;

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: rootContainer,
          child: ProviderScope(
            child: Consumer(
              builder: (context, ref, child) {
                observedFactory = ref.watch(razorpayCheckoutFactoryProvider);
                observedRepository = ref.watch(paymentRepositoryProvider);
                return const SizedBox.shrink();
              },
            ),
          ),
        ),
      );

      expect(observedFactory, isNotNull);
      expect(observedRepository!.supportsPaidBookings, isTrue);
      debugDefaultTargetPlatformOverride = null;
    },
  );

  testWidgets(
    'bootstrap root retains an unresolved native lease across app rebuilds',
    (tester) async {
      const channel = MethodChannel('razorpay_flutter');
      final messenger =
          TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
      final native = Completer<Object?>();
      var openCalls = 0;
      messenger.setMockMethodCallHandler(channel, (call) {
        expect(call.method, 'open');
        openCalls++;
        return native.future;
      });
      addTearDown(() => messenger.setMockMethodCallHandler(channel, null));
      final rootContainer = createCatchAppContainer(
        overrides: consumerPlatformOverrides(),
      );
      addTearDown(rootContainer.dispose);
      RazorpayCheckoutFactory? observedFactory;
      Widget root() {
        return UncontrolledProviderScope(
          container: rootContainer,
          child: Consumer(
            builder: (context, ref, child) {
              observedFactory = ref.watch(razorpayCheckoutFactoryProvider);
              return const SizedBox.shrink();
            },
          ),
        );
      }

      await tester.pumpWidget(root());
      final initialFactory = observedFactory!;
      final checkout = initialFactory();
      checkout.configure(
        onSuccess: (_) async => fail('Detached success'),
        onFailure: (_) => fail('Detached failure'),
      );
      checkout.open({
        'key': 'rzp_test',
        'order_id': 'order-a',
        'amount': 25000,
      });
      await tester.pump();
      checkout.clear();
      for (var rebuild = 0; rebuild < 3; rebuild++) {
        await tester.pumpWidget(root());
        expect(observedFactory, same(initialFactory));
        expect(observedFactory!, throwsA(isA<PaymentFailedException>()));
      }
      expect(openCalls, 1);
      native.complete({
        'type': 1,
        'data': {'code': 2, 'message': 'Cancelled'},
      });
      await tester.pump();
      observedFactory!().clear();
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
}

class _FakeBuildContext extends Fake implements BuildContext {}

class _FakeFirebaseFunctions extends Fake implements FirebaseFunctions {}
