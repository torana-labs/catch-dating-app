// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_work_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostWorkRepository)
final hostWorkRepositoryProvider = HostWorkRepositoryProvider._();

final class HostWorkRepositoryProvider
    extends
        $FunctionalProvider<
          HostWorkRepository,
          HostWorkRepository,
          HostWorkRepository
        >
    with $Provider<HostWorkRepository> {
  HostWorkRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostWorkRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostWorkRepositoryHash();

  @$internal
  @override
  $ProviderElement<HostWorkRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostWorkRepository create(Ref ref) {
    return hostWorkRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostWorkRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostWorkRepository>(value),
    );
  }
}

String _$hostWorkRepositoryHash() =>
    r'59b0d1ffbc2052446370f62bf38fdb2984f7cc45';

/// The caller's live assignments. Refetches whenever the signed-in account
/// changes so a different OTP session never sees stale grants.

@ProviderFor(hostWorkAssignments)
final hostWorkAssignmentsProvider = HostWorkAssignmentsProvider._();

/// The caller's live assignments. Refetches whenever the signed-in account
/// changes so a different OTP session never sees stale grants.

final class HostWorkAssignmentsProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostWorkAssignments>,
          HostWorkAssignments,
          FutureOr<HostWorkAssignments>
        >
    with
        $FutureModifier<HostWorkAssignments>,
        $FutureProvider<HostWorkAssignments> {
  /// The caller's live assignments. Refetches whenever the signed-in account
  /// changes so a different OTP session never sees stale grants.
  HostWorkAssignmentsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostWorkAssignmentsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostWorkAssignmentsHash();

  @$internal
  @override
  $FutureProviderElement<HostWorkAssignments> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HostWorkAssignments> create(Ref ref) {
    return hostWorkAssignments(ref);
  }
}

String _$hostWorkAssignmentsHash() =>
    r'6551d8b5672b782f3ed275c395b627d663cb6672';
