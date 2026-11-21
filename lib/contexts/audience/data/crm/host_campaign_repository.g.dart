// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_campaign_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostCampaignRepository)
final hostCampaignRepositoryProvider = HostCampaignRepositoryProvider._();

final class HostCampaignRepositoryProvider
    extends
        $FunctionalProvider<
          HostCampaignRepository,
          HostCampaignRepository,
          HostCampaignRepository
        >
    with $Provider<HostCampaignRepository> {
  HostCampaignRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostCampaignRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostCampaignRepositoryHash();

  @$internal
  @override
  $ProviderElement<HostCampaignRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostCampaignRepository create(Ref ref) {
    return hostCampaignRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostCampaignRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostCampaignRepository>(value),
    );
  }
}

String _$hostCampaignRepositoryHash() =>
    r'1205f508a3322e5602059a7d3d6acb23a6555e56';

/// The organizer's Sends history, a page at a time, every row shown live.

@ProviderFor(HostSendPages)
final hostSendPagesProvider = HostSendPagesFamily._();

/// The organizer's Sends history, a page at a time, every row shown live.
final class HostSendPagesProvider
    extends $StreamNotifierProvider<HostSendPages, LivePages<HostSendSummary>> {
  /// The organizer's Sends history, a page at a time, every row shown live.
  HostSendPagesProvider._({
    required HostSendPagesFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostSendPagesProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostSendPagesHash();

  @override
  String toString() {
    return r'hostSendPagesProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  HostSendPages create() => HostSendPages();

  @override
  bool operator ==(Object other) {
    return other is HostSendPagesProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostSendPagesHash() => r'd0b3c49777d0d84ade60fdb8fae0e48f14b58fe4';

/// The organizer's Sends history, a page at a time, every row shown live.

final class HostSendPagesFamily extends $Family
    with
        $ClassFamilyOverride<
          HostSendPages,
          AsyncValue<LivePages<HostSendSummary>>,
          LivePages<HostSendSummary>,
          Stream<LivePages<HostSendSummary>>,
          String
        > {
  HostSendPagesFamily._()
    : super(
        retry: null,
        name: r'hostSendPagesProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The organizer's Sends history, a page at a time, every row shown live.

  HostSendPagesProvider call(String organizerId) =>
      HostSendPagesProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'hostSendPagesProvider';
}

/// The organizer's Sends history, a page at a time, every row shown live.

abstract class _$HostSendPages
    extends $StreamNotifier<LivePages<HostSendSummary>> {
  late final _$args = ref.$arg as String;
  String get organizerId => _$args;

  Stream<LivePages<HostSendSummary>> build(String organizerId);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<LivePages<HostSendSummary>>,
              LivePages<HostSendSummary>
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<LivePages<HostSendSummary>>,
                LivePages<HostSendSummary>
              >,
              AsyncValue<LivePages<HostSendSummary>>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
