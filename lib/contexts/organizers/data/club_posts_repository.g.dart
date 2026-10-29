// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'club_posts_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(clubPostsRepository)
final clubPostsRepositoryProvider = ClubPostsRepositoryProvider._();

final class ClubPostsRepositoryProvider
    extends
        $FunctionalProvider<
          ClubPostsRepository,
          ClubPostsRepository,
          ClubPostsRepository
        >
    with $Provider<ClubPostsRepository> {
  ClubPostsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'clubPostsRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$clubPostsRepositoryHash();

  @$internal
  @override
  $ProviderElement<ClubPostsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ClubPostsRepository create(Ref ref) {
    return clubPostsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ClubPostsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ClubPostsRepository>(value),
    );
  }
}

String _$clubPostsRepositoryHash() =>
    r'b8a1107d4b539075d262290b8ef4277fe69f81a9';

@ProviderFor(watchClubPostRemainingWeeklyQuota)
final watchClubPostRemainingWeeklyQuotaProvider =
    WatchClubPostRemainingWeeklyQuotaFamily._();

final class WatchClubPostRemainingWeeklyQuotaProvider
    extends $FunctionalProvider<AsyncValue<int>, int, Stream<int>>
    with $FutureModifier<int>, $StreamProvider<int> {
  WatchClubPostRemainingWeeklyQuotaProvider._({
    required WatchClubPostRemainingWeeklyQuotaFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchClubPostRemainingWeeklyQuotaProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$watchClubPostRemainingWeeklyQuotaHash();

  @override
  String toString() {
    return r'watchClubPostRemainingWeeklyQuotaProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<int> $createElement($ProviderPointer pointer) =>
      $StreamProviderElement(pointer);

  @override
  Stream<int> create(Ref ref) {
    final argument = this.argument as String;
    return watchClubPostRemainingWeeklyQuota(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchClubPostRemainingWeeklyQuotaProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchClubPostRemainingWeeklyQuotaHash() =>
    r'c9d7bcad811fdf5f75605735f506f0e7f9eba734';

final class WatchClubPostRemainingWeeklyQuotaFamily extends $Family
    with $FunctionalFamilyOverride<Stream<int>, String> {
  WatchClubPostRemainingWeeklyQuotaFamily._()
    : super(
        retry: null,
        name: r'watchClubPostRemainingWeeklyQuotaProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchClubPostRemainingWeeklyQuotaProvider call(String clubId) =>
      WatchClubPostRemainingWeeklyQuotaProvider._(argument: clubId, from: this);

  @override
  String toString() => r'watchClubPostRemainingWeeklyQuotaProvider';
}
