import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/app_version_config_provider.dart';
import 'package:catch_dating_app/contexts/account/data/force_update_provider.dart';
import 'package:catch_dating_app/contexts/account/domain/app_version_config.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

void main() {
  group('forceUpdateRequiredProvider', () {
    test('preloaded package info resolves on the first provider read', () {
      final container = ProviderContainer(
        overrides: [
          appVersionConfigProvider.overrideWithValue(const AppVersionConfig()),
          appPackageInfoProvider.overrideWith(
            (ref) => (version: '2.0.0', buildNumber: '99'),
          ),
        ],
      );
      addTearDown(container.dispose);

      final result = container.read(forceUpdateRequiredProvider);

      expect(result.hasValue, isTrue);
      expect(result.requireValue, isFalse);
    });

    test('returns false when no gate is configured', () async {
      final container = ProviderContainer(
        overrides: [
          appVersionConfigProvider.overrideWithValue(const AppVersionConfig()),
          appPackageInfoProvider.overrideWith(
            (ref) async => (version: '2.0.0', buildNumber: '99'),
          ),
        ],
      );

      await container.read(appPackageInfoProvider.future);
      final result = container.read(forceUpdateRequiredProvider);

      expect(result.hasValue, isTrue);
      expect(result.requireValue, isFalse);
    });

    test('returns true when current version is below semver minimum', () async {
      final container = ProviderContainer(
        overrides: [
          appVersionConfigProvider.overrideWithValue(
            const AppVersionConfig(minVersion: '2.0.0'),
          ),
          appPackageInfoProvider.overrideWith(
            (ref) async => (version: '1.5.0', buildNumber: '10'),
          ),
        ],
      );

      await container.read(appPackageInfoProvider.future);
      final result = container.read(forceUpdateRequiredProvider);

      expect(result.requireValue, isTrue);
    });

    test('returns false when current version equals semver minimum', () async {
      final container = ProviderContainer(
        overrides: [
          appVersionConfigProvider.overrideWithValue(
            const AppVersionConfig(minVersion: '2.0.0'),
          ),
          appPackageInfoProvider.overrideWith(
            (ref) async => (version: '2.0.0', buildNumber: '10'),
          ),
        ],
      );

      await container.read(appPackageInfoProvider.future);
      final result = container.read(forceUpdateRequiredProvider);

      expect(result.requireValue, isFalse);
    });

    test('uses build number gate when minBuild is configured', () async {
      final container = ProviderContainer(
        overrides: [
          appVersionConfigProvider.overrideWithValue(
            const AppVersionConfig(minBuildAndroid: 42),
          ),
          appPackageInfoProvider.overrideWith(
            (ref) async => (version: '3.0.0', buildNumber: '41'),
          ),
        ],
      );

      await container.read(appPackageInfoProvider.future);
      final result = container.read(forceUpdateRequiredProvider);

      expect(result.requireValue, isTrue);
    });

    test('returns false when build number meets minimum', () async {
      final container = ProviderContainer(
        overrides: [
          appVersionConfigProvider.overrideWithValue(
            const AppVersionConfig(minBuildAndroid: 42),
          ),
          appPackageInfoProvider.overrideWith(
            (ref) async => (version: '1.0.0', buildNumber: '42'),
          ),
        ],
      );

      await container.read(appPackageInfoProvider.future);
      final result = container.read(forceUpdateRequiredProvider);

      expect(result.requireValue, isFalse);
    });

    test('surfaces error when package info fails', () async {
      final completer = Completer<({String version, String buildNumber})>();

      final container = ProviderContainer(
        overrides: [
          appVersionConfigProvider.overrideWithValue(const AppVersionConfig()),
          appPackageInfoProvider.overrideWith((ref) => completer.future),
        ],
      );

      final sub = container.listen(
        forceUpdateRequiredProvider,
        (prev, next) {},
      );

      expect(container.read(forceUpdateRequiredProvider).isLoading, isTrue);

      completer.completeError(Exception('platform error'));
      await flushTestEventQueue();

      expect(container.read(forceUpdateRequiredProvider).hasError, isTrue);

      sub.close();
    });
  });
}
