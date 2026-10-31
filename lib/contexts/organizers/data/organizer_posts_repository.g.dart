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
        name: r'organizerPostsRepositoryProvider',
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
    r'1cb9c7c18e041fb2bbb46a082d7630c69715839f';

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
         name: r'watchOrganizerPostRemainingWeeklyQuotaProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$watchOrganizerPostRemainingWeeklyQuotaHash();

  @override
  String toString() {
    return r'watchOrganizerPostRemainingWeeklyQuotaProvider'
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
    r'3c466b39b3b0c8844962fcad907b96c9d588b600';

final class WatchOrganizerPostRemainingWeeklyQuotaFamily extends $Family
    with $FunctionalFamilyOverride<Stream<int>, String> {
  WatchOrganizerPostRemainingWeeklyQuotaFamily._()
    : super(
        retry: null,
        name: r'watchOrganizerPostRemainingWeeklyQuotaProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchOrganizerPostRemainingWeeklyQuotaProvider call(String organizerId) =>
      WatchOrganizerPostRemainingWeeklyQuotaProvider._(
        argument: organizerId,
        from: this,
      );

  @override
  String toString() => r'watchOrganizerPostRemainingWeeklyQuotaProvider';
}
