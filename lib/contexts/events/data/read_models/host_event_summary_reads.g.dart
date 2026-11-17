// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_event_summary_reads.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The signed-in manager's `hostEventSummaries` listener.

@ProviderFor(hostEventSummaryReads)
final hostEventSummaryReadsProvider = HostEventSummaryReadsProvider._();

/// The signed-in manager's `hostEventSummaries` listener.

final class HostEventSummaryReadsProvider
    extends
        $FunctionalProvider<
          HostEventSummaryReads,
          HostEventSummaryReads,
          HostEventSummaryReads
        >
    with $Provider<HostEventSummaryReads> {
  /// The signed-in manager's `hostEventSummaries` listener.
  HostEventSummaryReadsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostEventSummaryReadsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostEventSummaryReadsHash();

  @$internal
  @override
  $ProviderElement<HostEventSummaryReads> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostEventSummaryReads create(Ref ref) {
    return hostEventSummaryReads(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostEventSummaryReads value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostEventSummaryReads>(value),
    );
  }
}

String _$hostEventSummaryReadsHash() =>
    r'57b2a5598cca5210abee26ab658aa8d91c1bd209';
