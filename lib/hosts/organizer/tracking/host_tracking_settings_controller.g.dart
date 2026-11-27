// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_tracking_settings_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostTrackingSettingsController)
final hostTrackingSettingsControllerProvider =
    HostTrackingSettingsControllerProvider._();

final class HostTrackingSettingsControllerProvider
    extends
        $FunctionalProvider<
          HostTrackingSettingsController,
          HostTrackingSettingsController,
          HostTrackingSettingsController
        >
    with $Provider<HostTrackingSettingsController> {
  HostTrackingSettingsControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostTrackingSettingsControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostTrackingSettingsControllerHash();

  @$internal
  @override
  $ProviderElement<HostTrackingSettingsController> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostTrackingSettingsController create(Ref ref) {
    return hostTrackingSettingsController(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostTrackingSettingsController value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostTrackingSettingsController>(
        value,
      ),
    );
  }
}

String _$hostTrackingSettingsControllerHash() =>
    r'4fa1bd6f856a58cc1ce0851f80d4348cbe317f73';
