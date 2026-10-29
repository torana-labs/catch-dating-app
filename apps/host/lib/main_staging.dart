import 'package:catch_dating_app/app_bootstrap.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_host_app/host_platform_app.dart';

Future<void> main() {
  return runCatchApp(
    appRole: AppRole.host,
    app: const HostPlatformApp(),
    environment: AppEnvironment.staging,
  );
}
