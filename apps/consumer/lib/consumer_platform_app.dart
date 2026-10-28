import 'package:catch_dating_app/app.dart';
import 'package:catch_dating_app/health_activity/data/health_activity_client_provider.dart';
import 'package:catch_dating_app/payments/data/razorpay_checkout.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_consumer_app/mobile_health_activity_client.dart';
import 'package:catch_consumer_app/razorpay_checkout_adapter.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart' show Ref;
import 'package:flutter_riverpod/misc.dart' show Override;

/// Consumer routing shell; entrypoints install native bindings at bootstrap.
class ConsumerPlatformApp extends StatelessWidget {
  const ConsumerPlatformApp({super.key});

  @override
  Widget build(BuildContext context) =>
      MyApp(routerProvider: consumerGoRouterProvider);
}

/// Production native bindings shared by supervised native entrypoints.
///
/// Keeping these bindings in one list prevents an acceptance harness from
/// substituting a fake checkout while leaving the shipped app unchanged.
List<Override> consumerPlatformOverrides() => [
  healthActivityClientProvider.overrideWith(
    (ref) => MobileHealthActivityClient(),
  ),
  razorpayCheckoutFactoryProvider.overrideWith(_nativeCheckoutFactory),
];

// The keep-alive factory owns native exclusion across auth-scoped repository
// replacements. Each app root gets its own coordinator; no global test or
// account state is retained outside the app's provider container.
RazorpayCheckoutFactory _nativeCheckoutFactory(Ref ref) {
  final coordinator = RazorpayNativeCheckoutCoordinator();
  return () => PluginRazorpayCheckout(
    gateway: PluginRazorpayGateway(coordinator: coordinator),
  );
}
