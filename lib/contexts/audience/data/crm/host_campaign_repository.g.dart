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
    r'835b9a00b265320c8154b29924c6e5fe35ba8713';

@ProviderFor(hostSends)
final hostSendsProvider = HostSendsFamily._();

final class HostSendsProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostSendsPage>,
          HostSendsPage,
          FutureOr<HostSendsPage>
        >
    with $FutureModifier<HostSendsPage>, $FutureProvider<HostSendsPage> {
  HostSendsProvider._({
    required HostSendsFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostSendsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostSendsHash();

  @override
  String toString() {
    return r'hostSendsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<HostSendsPage> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HostSendsPage> create(Ref ref) {
    final argument = this.argument as String;
    return hostSends(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HostSendsProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostSendsHash() => r'd47dd53ab3f0e76adc681e94db8e251344160005';

final class HostSendsFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<HostSendsPage>, String> {
  HostSendsFamily._()
    : super(
        retry: null,
        name: r'hostSendsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  HostSendsProvider call(String organizerId) =>
      HostSendsProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'hostSendsProvider';
}
