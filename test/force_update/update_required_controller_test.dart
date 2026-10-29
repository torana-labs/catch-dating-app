import 'package:catch_dating_app/contexts/account/domain/app_version_config.dart';
import 'package:catch_dating_app/core/external_links.dart';
import 'package:catch_dating_app/force_update/presentation/update_required_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:url_launcher/url_launcher.dart';

void main() {
  test('opens the iOS store URL on iOS', () async {
    Uri? launchedUri;
    final controller = UpdateRequiredController(
      ExternalLinkController((uri, {mode = LaunchMode.platformDefault}) async {
        launchedUri = uri;
        return true;
      }),
    );

    final opened = await controller.openStore(
      platform: TargetPlatform.iOS,
      config: const AppVersionConfig(
        storeUrlAndroid: 'https://play.example/catch',
        storeUrlIos: 'https://apps.example/catch',
      ),
    );

    expect(opened, isTrue);
    expect(launchedUri, Uri.parse('https://apps.example/catch'));
  });

  test('opens the Android store URL for non-iOS platforms', () async {
    Uri? launchedUri;
    final controller = UpdateRequiredController(
      ExternalLinkController((uri, {mode = LaunchMode.platformDefault}) async {
        launchedUri = uri;
        return true;
      }),
    );

    final opened = await controller.openStore(
      platform: TargetPlatform.android,
      config: const AppVersionConfig(
        storeUrlAndroid: 'https://play.example/catch',
        storeUrlIos: 'https://apps.example/catch',
      ),
    );

    expect(opened, isTrue);
    expect(launchedUri, Uri.parse('https://play.example/catch'));
  });

  test('fails cleanly when the configured store URL is empty', () async {
    var launchCallCount = 0;
    final controller = UpdateRequiredController(
      ExternalLinkController((uri, {mode = LaunchMode.platformDefault}) async {
        launchCallCount += 1;
        return true;
      }),
    );

    final opened = await controller.openStore(
      platform: TargetPlatform.android,
      config: const AppVersionConfig(),
    );

    expect(opened, isFalse);
    expect(launchCallCount, 0);
  });
}
