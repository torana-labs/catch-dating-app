// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'device_location.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(deviceLocationGateway)
final deviceLocationGatewayProvider = DeviceLocationGatewayProvider._();

final class DeviceLocationGatewayProvider
    extends
        $FunctionalProvider<
          DeviceLocationGateway,
          DeviceLocationGateway,
          DeviceLocationGateway
        >
    with $Provider<DeviceLocationGateway> {
  DeviceLocationGatewayProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'deviceLocationGatewayProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$deviceLocationGatewayHash();

  @$internal
  @override
  $ProviderElement<DeviceLocationGateway> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  DeviceLocationGateway create(Ref ref) {
    return deviceLocationGateway(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(DeviceLocationGateway value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<DeviceLocationGateway>(value),
    );
  }
}

String _$deviceLocationGatewayHash() =>
    r'c94a9709956cfcbc7b6714f2255dcd426c334b04';

@ProviderFor(DeviceLocation)
final deviceLocationProvider = DeviceLocationProvider._();

final class DeviceLocationProvider
    extends $AsyncNotifierProvider<DeviceLocation, LocationCoordinate?> {
  DeviceLocationProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'deviceLocationProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$deviceLocationHash();

  @$internal
  @override
  DeviceLocation create() => DeviceLocation();
}

String _$deviceLocationHash() => r'aaa74a8a7d3ba3197e730d17e6774b1afbd9e77f';

abstract class _$DeviceLocation extends $AsyncNotifier<LocationCoordinate?> {
  FutureOr<LocationCoordinate?> build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref as $Ref<AsyncValue<LocationCoordinate?>, LocationCoordinate?>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<LocationCoordinate?>, LocationCoordinate?>,
              AsyncValue<LocationCoordinate?>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
