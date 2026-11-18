// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_event_offer_reads.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostEventOfferReads)
final hostEventOfferReadsProvider = HostEventOfferReadsProvider._();

final class HostEventOfferReadsProvider
    extends
        $FunctionalProvider<
          HostEventOfferReads,
          HostEventOfferReads,
          HostEventOfferReads
        >
    with $Provider<HostEventOfferReads> {
  HostEventOfferReadsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostEventOfferReadsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostEventOfferReadsHash();

  @$internal
  @override
  $ProviderElement<HostEventOfferReads> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostEventOfferReads create(Ref ref) {
    return hostEventOfferReads(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostEventOfferReads value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostEventOfferReads>(value),
    );
  }
}

String _$hostEventOfferReadsHash() =>
    r'f87f8f0d652d99b18471d8191b98018e454ecc1a';
