// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_requests_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostRequestsController)
final hostRequestsControllerProvider = HostRequestsControllerProvider._();

final class HostRequestsControllerProvider
    extends
        $FunctionalProvider<
          HostRequestsController,
          HostRequestsController,
          HostRequestsController
        >
    with $Provider<HostRequestsController> {
  HostRequestsControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostRequestsControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostRequestsControllerHash();

  @$internal
  @override
  $ProviderElement<HostRequestsController> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostRequestsController create(Ref ref) {
    return hostRequestsController(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostRequestsController value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostRequestsController>(value),
    );
  }
}

String _$hostRequestsControllerHash() =>
    r'd061eeb5f75f927894c6c9fa42787f2c0347e4f7';
