import 'package:catch_dating_app/contexts/account/domain/app_version_config.dart';

enum AppBuildPlatform { android, ios, web, macos, other }

/// Returns the minimum build number that applies to the current platform.
int minimumBuildForPlatform(
  AppVersionConfig config,
  AppBuildPlatform platform,
) {
  return switch (platform) {
    AppBuildPlatform.android => config.minBuildAndroid,
    AppBuildPlatform.ios => config.minBuildIos,
    AppBuildPlatform.web => config.minBuildWeb,
    AppBuildPlatform.macos => config.minBuildMacos,
    _ => 0,
  };
}
