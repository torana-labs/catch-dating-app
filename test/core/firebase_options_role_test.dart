import 'package:catch_dating_app/firebase_options.dart';
import 'package:catch_dating_app/firebase_options_dev.dart';
import 'package:catch_dating_app/firebase_options_prod.dart';
import 'package:catch_dating_app/firebase_options_staging.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  tearDown(() {
    debugDefaultTargetPlatformOverride = null;
    AppConfig.resetEntrypointRoleOverrideForTesting();
  });

  test('dev iOS options follow the selected app role', () {
    debugDefaultTargetPlatformOverride = TargetPlatform.iOS;

    AppConfig.configureEntrypointRole(AppRole.consumer);
    expect(
      DefaultFirebaseOptionsDev.currentPlatform.appId,
      '1:619661127800:ios:e9456edea3f2427f077d8d',
    );
    expect(
      DefaultFirebaseOptionsDev.currentPlatform.iosBundleId,
      'com.catchdates.app.dev',
    );

    AppConfig.configureEntrypointRole(AppRole.host);
    expect(
      DefaultFirebaseOptionsDev.currentPlatform.appId,
      '1:619661127800:ios:730bbfd6550efac0077d8d',
    );
    expect(
      DefaultFirebaseOptionsDev.currentPlatform.iosBundleId,
      'com.catchdates.host.dev',
    );
  });

  test('staging and prod expose host iOS app ids', () {
    expect(
      DefaultFirebaseOptionsStaging.hostIos.appId,
      '1:822303414140:ios:1faa9261df8f53970c76f9',
    );
    expect(
      DefaultFirebaseOptionsStaging.hostIos.iosBundleId,
      'com.catchdates.host.staging',
    );
    expect(
      DefaultFirebaseOptionsProd.hostIos.appId,
      '1:574779808785:ios:dafe636b607e071f8ea5b0',
    );
    expect(
      DefaultFirebaseOptionsProd.hostIos.iosBundleId,
      'com.catchdates.host',
    );
  });

  test('top-level Firebase options route to host dev in host role', () {
    debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
    AppConfig.configureEntrypointRole(AppRole.host);

    expect(
      DefaultFirebaseOptions.currentPlatform.appId,
      '1:619661127800:ios:730bbfd6550efac0077d8d',
    );
    expect(
      DefaultFirebaseOptions.currentPlatform.iosBundleId,
      'com.catchdates.host.dev',
    );
  });
}
