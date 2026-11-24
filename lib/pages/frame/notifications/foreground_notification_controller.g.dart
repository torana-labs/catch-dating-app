// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'foreground_notification_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Session lifetime: one arrival stream survives route changes for the
/// signed-in period, and its de-duplication never outlives it.

@ProviderFor(ForegroundNotificationController)
final foregroundNotificationControllerProvider =
    ForegroundNotificationControllerProvider._();

/// Session lifetime: one arrival stream survives route changes for the
/// signed-in period, and its de-duplication never outlives it.
final class ForegroundNotificationControllerProvider
    extends
        $NotifierProvider<
          ForegroundNotificationController,
          ForegroundNotification?
        > {
  /// Session lifetime: one arrival stream survives route changes for the
  /// signed-in period, and its de-duplication never outlives it.
  ForegroundNotificationControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'foregroundNotificationControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$foregroundNotificationControllerHash();

  @$internal
  @override
  ForegroundNotificationController create() =>
      ForegroundNotificationController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ForegroundNotification? value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ForegroundNotification?>(value),
    );
  }
}

String _$foregroundNotificationControllerHash() =>
    r'b4b49876a48fb4d09138ecdd824e8e6c9503821a';

/// Session lifetime: one arrival stream survives route changes for the
/// signed-in period, and its de-duplication never outlives it.

abstract class _$ForegroundNotificationController
    extends $Notifier<ForegroundNotification?> {
  ForegroundNotification? build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref as $Ref<ForegroundNotification?, ForegroundNotification?>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<ForegroundNotification?, ForegroundNotification?>,
              ForegroundNotification?,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
