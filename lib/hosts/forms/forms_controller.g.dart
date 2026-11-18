// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'forms_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The offer gateways over the signed-in app's Firebase clients.

@ProviderFor(hostOfferGateways)
final hostOfferGatewaysProvider = HostOfferGatewaysProvider._();

/// The offer gateways over the signed-in app's Firebase clients.

final class HostOfferGatewaysProvider
    extends
        $FunctionalProvider<
          HostOfferGateways,
          HostOfferGateways,
          HostOfferGateways
        >
    with $Provider<HostOfferGateways> {
  /// The offer gateways over the signed-in app's Firebase clients.
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

String _$hostOfferGatewaysHash() => r'cfbcb527d0289352fe4754026d7d5ea48b18ca70';
