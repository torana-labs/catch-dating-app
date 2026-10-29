// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'public_profile_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(publicProfileRepository)
final publicProfileRepositoryProvider = PublicProfileRepositoryProvider._();

final class PublicProfileRepositoryProvider
    extends
        $FunctionalProvider<
          PublicProfileRepository,
          PublicProfileRepository,
          PublicProfileRepository
        >
    with $Provider<PublicProfileRepository> {
  PublicProfileRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'publicProfileRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$publicProfileRepositoryHash();

  @$internal
  @override
  $ProviderElement<PublicProfileRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  PublicProfileRepository create(Ref ref) {
    return publicProfileRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(PublicProfileRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<PublicProfileRepository>(value),
    );
  }
}

String _$publicProfileRepositoryHash() =>
    r'141d55cbd15e631ab5ff0497f7acec36de651f60';

@ProviderFor(watchPublicProfile)
final watchPublicProfileProvider = WatchPublicProfileFamily._();

final class WatchPublicProfileProvider
    extends
        $FunctionalProvider<
          AsyncValue<PublicProfile?>,
          PublicProfile?,
          Stream<PublicProfile?>
        >
    with $FutureModifier<PublicProfile?>, $StreamProvider<PublicProfile?> {
  WatchPublicProfileProvider._({
    required WatchPublicProfileFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchPublicProfileProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchPublicProfileHash();

  @override
  String toString() {
    return r'watchPublicProfileProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<PublicProfile?> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<PublicProfile?> create(Ref ref) {
    final argument = this.argument as String;
    return watchPublicProfile(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchPublicProfileProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchPublicProfileHash() =>
    r'c109a28d721065d734c731d5a04876e9187c1de3';

final class WatchPublicProfileFamily extends $Family
    with $FunctionalFamilyOverride<Stream<PublicProfile?>, String> {
  WatchPublicProfileFamily._()
    : super(
        retry: null,
        name: r'watchPublicProfileProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchPublicProfileProvider call(String uid) =>
      WatchPublicProfileProvider._(argument: uid, from: this);

  @override
  String toString() => r'watchPublicProfileProvider';
}
