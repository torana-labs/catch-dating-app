// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'forms_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The offer gateways over the signed-in app's Functions client.

@ProviderFor(hostOfferGateways)
final hostOfferGatewaysProvider = HostOfferGatewaysProvider._();

/// The offer gateways over the signed-in app's Functions client.

final class HostOfferGatewaysProvider
    extends
        $FunctionalProvider<
          HostOfferGateways,
          HostOfferGateways,
          HostOfferGateways
        >
    with $Provider<HostOfferGateways> {
  /// The offer gateways over the signed-in app's Functions client.
  HostOfferGatewaysProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostOfferGatewaysProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostOfferGatewaysHash();

  @$internal
  @override
  $ProviderElement<HostOfferGateways> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostOfferGateways create(Ref ref) {
    return hostOfferGateways(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostOfferGateways value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostOfferGateways>(value),
    );
  }
}

String _$hostOfferGatewaysHash() => r'c3a8c000fed3c245f608ca84444329dcce2c9c8e';
