// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'external_links.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(externalUrlLauncher)
final externalUrlLauncherProvider = ExternalUrlLauncherProvider._();

final class ExternalUrlLauncherProvider
    extends
        $FunctionalProvider<
          ExternalUrlLauncher,
          ExternalUrlLauncher,
          ExternalUrlLauncher
        >
    with $Provider<ExternalUrlLauncher> {
  ExternalUrlLauncherProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'externalUrlLauncherProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$externalUrlLauncherHash();

  @$internal
  @override
  $ProviderElement<ExternalUrlLauncher> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ExternalUrlLauncher create(Ref ref) {
    return externalUrlLauncher(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ExternalUrlLauncher value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ExternalUrlLauncher>(value),
    );
  }
}

String _$externalUrlLauncherHash() =>
    r'e6c30a96e24c2d868f344b7b4a0cb9ad2b112cdc';

@ProviderFor(externalLinkController)
final externalLinkControllerProvider = ExternalLinkControllerProvider._();

final class ExternalLinkControllerProvider
    extends
        $FunctionalProvider<
          ExternalLinkController,
          ExternalLinkController,
          ExternalLinkController
        >
    with $Provider<ExternalLinkController> {
  ExternalLinkControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'externalLinkControllerProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$externalLinkControllerHash();

  @$internal
  @override
  $ProviderElement<ExternalLinkController> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ExternalLinkController create(Ref ref) {
    return externalLinkController(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ExternalLinkController value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ExternalLinkController>(value),
    );
  }
}

String _$externalLinkControllerHash() =>
    r'7861bd7bb0c6bec66a6f94f1540908321a5317d8';
