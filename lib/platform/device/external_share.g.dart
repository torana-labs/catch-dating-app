// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'external_share.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(externalShareLauncher)
final externalShareLauncherProvider = ExternalShareLauncherProvider._();

final class ExternalShareLauncherProvider
    extends
        $FunctionalProvider<
          ExternalShareLauncher,
          ExternalShareLauncher,
          ExternalShareLauncher
        >
    with $Provider<ExternalShareLauncher> {
  ExternalShareLauncherProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'externalShareLauncherProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$externalShareLauncherHash();

  @$internal
  @override
  $ProviderElement<ExternalShareLauncher> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ExternalShareLauncher create(Ref ref) {
    return externalShareLauncher(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ExternalShareLauncher value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ExternalShareLauncher>(value),
    );
  }
}

String _$externalShareLauncherHash() =>
    r'c860477465a3c025fb8e79ebc4388a041c934f00';

@ProviderFor(externalShareController)
final externalShareControllerProvider = ExternalShareControllerProvider._();

final class ExternalShareControllerProvider
    extends
        $FunctionalProvider<
          ExternalShareController,
          ExternalShareController,
          ExternalShareController
        >
    with $Provider<ExternalShareController> {
  ExternalShareControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'externalShareControllerProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$externalShareControllerHash();

  @$internal
  @override
  $ProviderElement<ExternalShareController> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ExternalShareController create(Ref ref) {
    return externalShareController(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ExternalShareController value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ExternalShareController>(value),
    );
  }
}

String _$externalShareControllerHash() =>
    r'8c4e837f74cf0ae058d2713ebaf178b2d954d893';
