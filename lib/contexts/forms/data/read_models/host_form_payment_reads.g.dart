// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_form_payment_reads.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostFormPaymentReads)
final hostFormPaymentReadsProvider = HostFormPaymentReadsProvider._();

final class HostFormPaymentReadsProvider
    extends
        $FunctionalProvider<
          HostFormPaymentReads,
          HostFormPaymentReads,
          HostFormPaymentReads
        >
    with $Provider<HostFormPaymentReads> {
  HostFormPaymentReadsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostFormPaymentReadsProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostFormPaymentReadsHash();

  @$internal
  @override
  $ProviderElement<HostFormPaymentReads> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostFormPaymentReads create(Ref ref) {
    return hostFormPaymentReads(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostFormPaymentReads value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostFormPaymentReads>(value),
    );
  }
}

String _$hostFormPaymentReadsHash() =>
    r'65553f6903c7105054fe36ff6c4fbfd406a92061';
