import 'package:catch_consumer_app/consumer_platform_app.dart';
import 'package:catch_dating_app/app_bootstrap.dart';
import 'package:catch_dating_app/core/app_config.dart';

Future<void> main() {
  return runCatchApp(
    appRole: AppRole.consumer,
    app: const ConsumerPlatformApp(),
    rootOverrides: consumerPlatformOverrides(),
    environment: AppEnvironment.staging,
  );
}
