// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'app_version_config_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Reads the force-update config from the already-initialized Remote Config
/// singleton so the paired-down Firebase initialization sequence in [main]
/// is complete.
///
/// Reads are synchronous — all Remote Config values were fetched and activated
/// at startup, falling back to [kAppVersionConfigDefaults] when the fetch
/// failed.
// keepalive: version config is a global route gate read synchronously after
// startup Remote Config activation.

@ProviderFor(appVersionConfig)
final appVersionConfigProvider = AppVersionConfigProvider._();

/// Reads the force-update config from the already-initialized Remote Config
/// singleton so the paired-down Firebase initialization sequence in [main]
/// is complete.
///
/// Reads are synchronous — all Remote Config values were fetched and activated
/// at startup, falling back to [kAppVersionConfigDefaults] when the fetch
/// failed.
// keepalive: version config is a global route gate read synchronously after
// startup Remote Config activation.

final class AppVersionConfigProvider
    extends
        $FunctionalProvider<
          AppVersionConfig,
          AppVersionConfig,
          AppVersionConfig
        >
    with $Provider<AppVersionConfig> {
  /// Reads the force-update config from the already-initialized Remote Config
  /// singleton so the paired-down Firebase initialization sequence in [main]
  /// is complete.
  ///
  /// Reads are synchronous — all Remote Config values were fetched and activated
  /// at startup, falling back to [kAppVersionConfigDefaults] when the fetch
  /// failed.
  // keepalive: version config is a global route gate read synchronously after
  // startup Remote Config activation.
  AppVersionConfigProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'appVersionConfigProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$appVersionConfigHash();

  @$internal
  @override
  $ProviderElement<AppVersionConfig> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  AppVersionConfig create(Ref ref) {
    return appVersionConfig(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AppVersionConfig value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AppVersionConfig>(value),
    );
  }
}

String _$appVersionConfigHash() => r'41e44989431d23594590c2668c71fce22055bb4e';
