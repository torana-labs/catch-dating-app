// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_requests_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostRequestsRepository)
final hostRequestsRepositoryProvider = HostRequestsRepositoryProvider._();

final class HostRequestsRepositoryProvider
    extends
        $FunctionalProvider<
          HostRequestsRepository,
          HostRequestsRepository,
          HostRequestsRepository
        >
    with $Provider<HostRequestsRepository> {
  HostRequestsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostRequestsRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostRequestsRepositoryHash();

  @$internal
  @override
  $ProviderElement<HostRequestsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostRequestsRepository create(Ref ref) {
    return hostRequestsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostRequestsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostRequestsRepository>(value),
    );
  }
}

String _$hostRequestsRepositoryHash() =>
    r'e78bb1da5895f9fd0ea571f12e5b76b57a5ff645';

/// The sidebar watches this from the Host shell, so a failed read must not
/// keep retrying in the background. The Requests screen offers its own Retry.

@ProviderFor(hostOrganizerRequests)
final hostOrganizerRequestsProvider = HostOrganizerRequestsFamily._();

/// The sidebar watches this from the Host shell, so a failed read must not
/// keep retrying in the background. The Requests screen offers its own Retry.

final class HostOrganizerRequestsProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostRequests>,
          HostRequests,
          FutureOr<HostRequests>
        >
    with $FutureModifier<HostRequests>, $FutureProvider<HostRequests> {
  /// The sidebar watches this from the Host shell, so a failed read must not
  /// keep retrying in the background. The Requests screen offers its own Retry.
  HostOrganizerRequestsProvider._({
    required HostOrganizerRequestsFamily super.from,
    required String super.argument,
  }) : super(
         retry: _noRequestsReadRetry,
         name: r'hostOrganizerRequestsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostOrganizerRequestsHash();

  @override
  String toString() {
    return r'hostOrganizerRequestsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<HostRequests> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<HostRequests> create(Ref ref) {
    final argument = this.argument as String;
    return hostOrganizerRequests(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HostOrganizerRequestsProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostOrganizerRequestsHash() =>
    r'15cf647274e8ec8c020e0a9a74967ebccc836634';

/// The sidebar watches this from the Host shell, so a failed read must not
/// keep retrying in the background. The Requests screen offers its own Retry.

final class HostOrganizerRequestsFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<HostRequests>, String> {
  HostOrganizerRequestsFamily._()
    : super(
        retry: _noRequestsReadRetry,
        name: r'hostOrganizerRequestsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The sidebar watches this from the Host shell, so a failed read must not
  /// keep retrying in the background. The Requests screen offers its own Retry.

  HostOrganizerRequestsProvider call(String organizerId) =>
      HostOrganizerRequestsProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'hostOrganizerRequestsProvider';
}
