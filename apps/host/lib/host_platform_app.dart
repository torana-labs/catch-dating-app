import 'package:catch_dating_app/app.dart';
import 'package:catch_dating_app/routing/host_router.dart';
import 'package:flutter/widgets.dart';

/// Host-owned app root selecting only the Host router and default capabilities.
class HostPlatformApp extends StatelessWidget {
  const HostPlatformApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MyApp(routerProvider: hostGoRouterProvider);
  }
}
