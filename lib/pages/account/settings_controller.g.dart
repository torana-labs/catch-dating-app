// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'settings_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// **Pattern A: Action controller + static Mutations**
///
/// Owns settings writes so the settings screen stays focused on local toggles,
/// confirmation UI, and rendering.

@ProviderFor(SettingsController)
final settingsControllerProvider = SettingsControllerProvider._();

/// **Pattern A: Action controller + static Mutations**
///
/// Owns settings writes so the settings screen stays focused on local toggles,
/// confirmation UI, and rendering.
final class SettingsControllerProvider
    extends $NotifierProvider<SettingsController, void> {
  /// **Pattern A: Action controller + static Mutations**
  ///
  /// Owns settings writes so the settings screen stays focused on local toggles,
  /// confirmation UI, and rendering.
  SettingsControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'settingsControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$settingsControllerHash();

  @$internal
  @override
  SettingsController create() => SettingsController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$settingsControllerHash() =>
    r'6df82e2d5ce9fdbbcc189cf7608bce02ed31ca18';

/// **Pattern A: Action controller + static Mutations**
///
/// Owns settings writes so the settings screen stays focused on local toggles,
/// confirmation UI, and rendering.

abstract class _$SettingsController extends $Notifier<void> {
  void build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<void, void>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<void, void>,
              void,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
