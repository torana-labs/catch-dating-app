// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'organizer_posts_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(organizerPostsRepository)
final organizerPostsRepositoryProvider = OrganizerPostsRepositoryProvider._();

final class OrganizerPostsRepositoryProvider
    extends
        $FunctionalProvider<
          OrganizerPostsRepository,
          OrganizerPostsRepository,
          OrganizerPostsRepository
        >
    with $Provider<OrganizerPostsRepository> {
  OrganizerPostsRepositoryProvider._()
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
  String debugGetCreateSourceHash() => _$organizerPostsRepositoryHash();

  @$internal
  @override
  $ProviderElement<OrganizerPostsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  OrganizerPostsRepository create(Ref ref) {
    return organizerPostsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(OrganizerPostsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<OrganizerPostsRepository>(value),
    );
  }
}

String _$organizerPostsRepositoryHash() =>
    r'b8a1107d4b539075d262290b8ef4277fe69f81a9';

@ProviderFor(watchOrganizerPostRemainingWeeklyQuota)
final watchOrganizerPostRemainingWeeklyQuotaProvider =
    WatchOrganizerPostRemainingWeeklyQuotaFamily._();

final class WatchOrganizerPostRemainingWeeklyQuotaProvider
    extends $FunctionalProvider<AsyncValue<int>, int, Stream<int>>
    with $FutureModifier<int>, $StreamProvider<int> {
  WatchOrganizerPostRemainingWeeklyQuotaProvider._({
    required WatchOrganizerPostRemainingWeeklyQuotaFamily super.from,
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
      _$watchOrganizerPostRemainingWeeklyQuotaHash();

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
    return watchOrganizerPostRemainingWeeklyQuota(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchOrganizerPostRemainingWeeklyQuotaProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchOrganizerPostRemainingWeeklyQuotaHash() =>
    r'c9d7bcad811fdf5f75605735f506f0e7f9eba734';

final class WatchOrganizerPostRemainingWeeklyQuotaFamily extends $Family
    with $FunctionalFamilyOverride<Stream<int>, String> {
  WatchOrganizerPostRemainingWeeklyQuotaFamily._()
    : super(
        retry: null,
        name: r'watchClubPostRemainingWeeklyQuotaProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchOrganizerPostRemainingWeeklyQuotaProvider call(String clubId) =>
      WatchOrganizerPostRemainingWeeklyQuotaProvider._(argument: clubId, from: this);

  @override
  String toString() => r'watchClubPostRemainingWeeklyQuotaProvider';
}
