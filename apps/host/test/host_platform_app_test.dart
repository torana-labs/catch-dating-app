import 'package:catch_dating_app/pages/frame/app.dart';
import 'package:catch_dating_app/routing/host_router.dart';
import 'package:catch_host_app/host_platform_app.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Host root installs only the Host router', () {
    final root = const HostPlatformApp().build(_FakeBuildContext());

    expect(root, isA<MyApp>());
    expect((root as MyApp).routerProvider, same(hostGoRouterProvider));
  });
}

class _FakeBuildContext extends Fake implements BuildContext {}
