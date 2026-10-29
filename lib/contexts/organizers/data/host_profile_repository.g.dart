// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_profile_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostProfileRepository)
final hostProfileRepositoryProvider = HostProfileRepositoryProvider._();

final class HostProfileRepositoryProvider
    extends
        $FunctionalProvider<
          HostProfileRepository,
          HostProfileRepository,
          HostProfileRepository
        >
    with $Provider<HostProfileRepository> {
  HostProfileRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostProfileRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostProfileRepositoryHash();

  @$internal
  @override
  $ProviderElement<HostProfileRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostProfileRepository create(Ref ref) {
    return hostProfileRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostProfileRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostProfileRepository>(value),
    );
  }
}

String _$hostProfileRepositoryHash() =>
    r'471794c8fba9d6c0784aef7924c690aa86f7a250';

@ProviderFor(watchHostProfile)
final watchHostProfileProvider = WatchHostProfileFamily._();

final class WatchHostProfileProvider
    extends
        $FunctionalProvider<
          AsyncValue<HostProfile?>,
          HostProfile?,
          Stream<HostProfile?>
        >
    with $FutureModifier<HostProfile?>, $StreamProvider<HostProfile?> {
  WatchHostProfileProvider._({
    required WatchHostProfileFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchHostProfileProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchHostProfileHash();

  @override
  String toString() {
    return r'watchHostProfileProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<HostProfile?> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<HostProfile?> create(Ref ref) {
    final argument = this.argument as String;
    return watchHostProfile(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchHostProfileProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchHostProfileHash() => r'0897adbbfddd9e96f9dfd2ce396e54c3e5198aa5';

final class WatchHostProfileFamily extends $Family
    with $FunctionalFamilyOverride<Stream<HostProfile?>, String> {
  WatchHostProfileFamily._()
    : super(
        retry: null,
        name: r'watchHostProfileProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchHostProfileProvider call(String uid) =>
      WatchHostProfileProvider._(argument: uid, from: this);

  @override
  String toString() => r'watchHostProfileProvider';
}
