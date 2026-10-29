import 'package:catch_dating_app/contexts/account/data/app_version_config_provider.dart';
import 'package:catch_dating_app/contexts/account/domain/platform_build_resolver.dart';
import 'package:catch_dating_app/contexts/account/domain/version.dart';
import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'force_update_provider.g.dart';

/// The current app version and build number from the platform.
// keepalive: package info is startup/platform metadata reused by the force
// update gate.
@Riverpod(keepAlive: true)
Future<({String version, String buildNumber})> appPackageInfo(Ref ref) async {
  final info = await PackageInfo.fromPlatform();
  return (version: info.version, buildNumber: info.buildNumber);
}

/// True when the running version is below the remote minimum.
///
/// Loading and error states are surfaced to the app shell so the app does not
/// silently continue when the compatibility check cannot complete.
// keepalive: force-update decision is a global app-shell gate shared by router
// and update-required surfaces.
@Riverpod(keepAlive: true)
AsyncValue<bool> forceUpdateRequired(Ref ref) {
  final config = ref.watch(appVersionConfigProvider);
  final packageAsync = ref.watch(appPackageInfoProvider);

  if (packageAsync.hasError) {
    return AsyncValue.error(
      packageAsync.error!,
      packageAsync.stackTrace ?? StackTrace.current,
    );
  }

  if (packageAsync.isLoading || !packageAsync.hasValue) {
    return const AsyncValue.loading();
  }

  final (:version, :buildNumber) = packageAsync.requireValue;

  final minimumBuild = minimumBuildForPlatform(config, _currentBuildPlatform());
  if (minimumBuild > 0) {
    return AsyncValue.data(
      isBuildUpdateRequired(
        currentBuild: buildNumber,
        minimumBuild: minimumBuild,
      ),
    );
  }

  return AsyncValue.data(
    isUpdateRequired(current: version, minimum: config.minVersion),
  );
}

AppBuildPlatform _currentBuildPlatform() {
  if (kIsWeb) return AppBuildPlatform.web;

  return switch (defaultTargetPlatform) {
    TargetPlatform.android => AppBuildPlatform.android,
    TargetPlatform.iOS => AppBuildPlatform.ios,
    TargetPlatform.macOS => AppBuildPlatform.macos,
    _ => AppBuildPlatform.other,
  };
}
