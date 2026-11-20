// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_applications_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostApplicationsController)
final hostApplicationsControllerProvider =
    HostApplicationsControllerProvider._();

final class HostApplicationsControllerProvider
    extends
        $FunctionalProvider<
          HostApplicationsController,
          HostApplicationsController,
          HostApplicationsController
        >
    with $Provider<HostApplicationsController> {
  HostApplicationsControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostApplicationsControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostApplicationsControllerHash();

  @$internal
  @override
  $ProviderElement<HostApplicationsController> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostApplicationsController create(Ref ref) {
    return hostApplicationsController(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostApplicationsController value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostApplicationsController>(value),
    );
  }
}

String _$hostApplicationsControllerHash() =>
    r'6bd9823ca821cf953b519c1d7ab648334bde7446';
