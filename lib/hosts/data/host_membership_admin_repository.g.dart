// GENERATED CODE - DO NOT MODIFY BY HAND

part of '../../contexts/payments/data/host_membership_admin_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostMembershipAdminRepository)
final hostMembershipAdminRepositoryProvider =
    HostMembershipAdminRepositoryProvider._();

final class HostMembershipAdminRepositoryProvider
    extends
        $FunctionalProvider<
          HostMembershipAdminRepository,
          HostMembershipAdminRepository,
          HostMembershipAdminRepository
        >
    with $Provider<HostMembershipAdminRepository> {
  HostMembershipAdminRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostMembershipAdminRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostMembershipAdminRepositoryHash();

  @$internal
  @override
  $ProviderElement<HostMembershipAdminRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostMembershipAdminRepository create(Ref ref) {
    return hostMembershipAdminRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostMembershipAdminRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostMembershipAdminRepository>(
        value,
      ),
    );
  }
}

String _$hostMembershipAdminRepositoryHash() =>
    r'c7062de7c849ad2fa59c535f658e9f1db0d82f45';
