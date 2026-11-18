// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_offer_event_targets_gateway.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The offer picker's event reads, built in the data layer so no screen or
/// controller holds Firestore.

@ProviderFor(hostOfferEventTargetsGateway)
final hostOfferEventTargetsGatewayProvider =
    HostOfferEventTargetsGatewayProvider._();

/// The offer picker's event reads, built in the data layer so no screen or
/// controller holds Firestore.

final class HostOfferEventTargetsGatewayProvider
    extends
        $FunctionalProvider<
          HostOfferEventTargetsGateway,
          HostOfferEventTargetsGateway,
          HostOfferEventTargetsGateway
        >
    with $Provider<HostOfferEventTargetsGateway> {
  /// The offer picker's event reads, built in the data layer so no screen or
  /// controller holds Firestore.
  HostOfferEventTargetsGatewayProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostOfferEventTargetsGatewayProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostOfferEventTargetsGatewayHash();

  @$internal
  @override
  $ProviderElement<HostOfferEventTargetsGateway> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostOfferEventTargetsGateway create(Ref ref) {
    return hostOfferEventTargetsGateway(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostOfferEventTargetsGateway value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostOfferEventTargetsGateway>(value),
    );
  }
}

String _$hostOfferEventTargetsGatewayHash() =>
    r'738dfbbbac0af92572bb637225dfeddcbc59c9b4';
