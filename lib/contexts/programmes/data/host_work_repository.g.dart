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
    r'6b419812b44be454fa67fd1f50d1626c61cb3ba0';

/// The caller's live assignments, rebuilt whenever the signed-in account
/// changes so a different OTP session never sees another account's grants.

@ProviderFor(hostWorkAssignments)
final hostWorkAssignmentsProvider = HostWorkAssignmentsProvider._();

/// The caller's live assignments, rebuilt whenever the signed-in account
/// changes so a different OTP session never sees another account's grants.

final class HostWorkAssignmentsProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostWorkAssignments>,
          HostWorkAssignments,
          Stream<HostWorkAssignments>
        >
    with
        $FutureModifier<HostWorkAssignments>,
        $StreamProvider<HostWorkAssignments> {
  /// The caller's live assignments, rebuilt whenever the signed-in account
  /// changes so a different OTP session never sees another account's grants.
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
  $StreamProviderElement<HostWorkAssignments> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<HostWorkAssignments> create(Ref ref) {
    return hostWorkAssignments(ref);
  }
}

String _$hostWorkAssignmentsHash() =>
    r'4923cbd3c0fc6838e53e235a2fa37ded2238ae29';
