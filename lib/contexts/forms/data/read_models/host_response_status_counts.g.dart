// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_response_status_counts.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// One form's per-filter counts for Responses; null until the inbox is ready.

@ProviderFor(hostResponseStatusCounts)
final hostResponseStatusCountsProvider = HostResponseStatusCountsFamily._();

/// One form's per-filter counts for Responses; null until the inbox is ready.

final class HostResponseStatusCountsProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostResponseStatusCounts?>,
          HostResponseStatusCounts?,
          FutureOr<HostResponseStatusCounts?>
        >
    with
        $FutureModifier<HostResponseStatusCounts?>,
        $FutureProvider<HostResponseStatusCounts?> {
  /// One form's per-filter counts for Responses; null until the inbox is ready.
  HostResponseStatusCountsProvider._({
    required HostResponseStatusCountsFamily super.from,
    required ({String organizerId, String formId}) super.argument,
  }) : super(
         retry: null,
         name: r'hostResponseStatusCountsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostResponseStatusCountsHash();

  @override
  String toString() {
    return r'hostResponseStatusCountsProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<HostResponseStatusCounts?> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HostResponseStatusCounts?> create(Ref ref) {
    final argument = this.argument as ({String organizerId, String formId});
    return hostResponseStatusCounts(
      ref,
      organizerId: argument.organizerId,
      formId: argument.formId,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostResponseStatusCountsProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostResponseStatusCountsHash() =>
    r'91f734b9314e17d1bb6c9046cf416dae3173072d';

/// One form's per-filter counts for Responses; null until the inbox is ready.

final class HostResponseStatusCountsFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<HostResponseStatusCounts?>,
          ({String organizerId, String formId})
        > {
  HostResponseStatusCountsFamily._()
    : super(
        retry: null,
        name: r'hostResponseStatusCountsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One form's per-filter counts for Responses; null until the inbox is ready.

  HostResponseStatusCountsProvider call({
    required String organizerId,
    required String formId,
  }) => HostResponseStatusCountsProvider._(
    argument: (organizerId: organizerId, formId: formId),
    from: this,
  );

  @override
  String toString() => r'hostResponseStatusCountsProvider';
}
