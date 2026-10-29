import 'package:catch_dating_app/contexts/account/domain/app_version_config.dart';
import 'package:catch_dating_app/core/app_config.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:firebase_remote_config/firebase_remote_config.dart';
import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'app_version_config_provider.g.dart';

/// Reads the force-update config from the already-initialized Remote Config
/// singleton so the paired-down Firebase initialization sequence in [main]
/// is complete.
///
/// Reads are synchronous — all Remote Config values were fetched and activated
/// at startup, falling back to [kAppVersionConfigDefaults] when the fetch
/// failed.
// keepalive: version config is a global route gate read synchronously after
// startup Remote Config activation.
@Riverpod(keepAlive: true)
AppVersionConfig appVersionConfig(Ref ref) {
  final remoteConfig = ref.watch(firebaseRemoteConfigProvider);
  final role = AppConfig.appRole;
  return AppVersionConfig(
    minVersion: _roleString(remoteConfig, role, 'min_version'),
    minBuildAndroid: _roleInt(remoteConfig, role, 'min_build_android'),
    minBuildIos: _roleInt(remoteConfig, role, 'min_build_ios'),
    minBuildWeb: _roleInt(remoteConfig, role, 'min_build_web'),
    minBuildMacos: _roleInt(remoteConfig, role, 'min_build_macos'),
    storeUrlAndroid: _roleString(remoteConfig, role, 'store_url_android'),
    storeUrlIos: _roleString(remoteConfig, role, 'store_url_ios'),
  );
}

@visibleForTesting
String appVersionConfigKeyFor(AppRole role, String suffix) {
  return '${role.value}_$suffix';
}

@visibleForTesting
T resolveAppVersionConfigValue<T>({
  required AppRole role,
  required T scopedValue,
  required bool scopedValueIsRemote,
  required T legacyConsumerValue,
}) {
  if (role.isHost || scopedValueIsRemote) return scopedValue;
  return legacyConsumerValue;
}

String _roleString(
  FirebaseRemoteConfig remoteConfig,
  AppRole role,
  String suffix,
) {
  final roleKey = appVersionConfigKeyFor(role, suffix);
  final roleValue = remoteConfig.getValue(roleKey);
  return resolveAppVersionConfigValue(
    role: role,
    scopedValue: roleValue.asString(),
    scopedValueIsRemote: roleValue.source == ValueSource.valueRemote,
    legacyConsumerValue: remoteConfig.getString(suffix),
  );
}

int _roleInt(FirebaseRemoteConfig remoteConfig, AppRole role, String suffix) {
  final roleKey = appVersionConfigKeyFor(role, suffix);
  final roleValue = remoteConfig.getValue(roleKey);
  return resolveAppVersionConfigValue(
    role: role,
    scopedValue: roleValue.asInt(),
    scopedValueIsRemote: roleValue.source == ValueSource.valueRemote,
    legacyConsumerValue: remoteConfig.getInt(suffix),
  );
}
