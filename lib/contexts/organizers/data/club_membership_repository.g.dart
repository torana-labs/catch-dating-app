// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'club_membership_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(clubMembershipRepository)
final clubMembershipRepositoryProvider = ClubMembershipRepositoryProvider._();

final class ClubMembershipRepositoryProvider
    extends
        $FunctionalProvider<
          ClubMembershipRepository,
          ClubMembershipRepository,
          ClubMembershipRepository
        >
    with $Provider<ClubMembershipRepository> {
  ClubMembershipRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'clubMembershipRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$clubMembershipRepositoryHash();

  @$internal
  @override
  $ProviderElement<ClubMembershipRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ClubMembershipRepository create(Ref ref) {
    return clubMembershipRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ClubMembershipRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ClubMembershipRepository>(value),
    );
  }
}

String _$clubMembershipRepositoryHash() =>
    r'0bdb64b7254031efa7d7aa84b0eabb87f9d5a2a8';

@ProviderFor(watchActiveClubMembershipsForUser)
final watchActiveClubMembershipsForUserProvider =
    WatchActiveClubMembershipsForUserFamily._();

final class WatchActiveClubMembershipsForUserProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<ClubMembership>>,
          List<ClubMembership>,
          Stream<List<ClubMembership>>
        >
    with
        $FutureModifier<List<ClubMembership>>,
        $StreamProvider<List<ClubMembership>> {
  WatchActiveClubMembershipsForUserProvider._({
    required WatchActiveClubMembershipsForUserFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchActiveClubMembershipsForUserProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$watchActiveClubMembershipsForUserHash();

  @override
  String toString() {
    return r'watchActiveClubMembershipsForUserProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<ClubMembership>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<ClubMembership>> create(Ref ref) {
    final argument = this.argument as String;
    return watchActiveClubMembershipsForUser(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchActiveClubMembershipsForUserProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchActiveClubMembershipsForUserHash() =>
    r'265f813ea75b6fe6bf29edb857ccf3eedabc4621';

final class WatchActiveClubMembershipsForUserFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<ClubMembership>>, String> {
  WatchActiveClubMembershipsForUserFamily._()
    : super(
        retry: null,
        name: r'watchActiveClubMembershipsForUserProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchActiveClubMembershipsForUserProvider call(String uid) =>
      WatchActiveClubMembershipsForUserProvider._(argument: uid, from: this);

  @override
  String toString() => r'watchActiveClubMembershipsForUserProvider';
}

@ProviderFor(watchActiveClubMembershipsForClub)
final watchActiveClubMembershipsForClubProvider =
    WatchActiveClubMembershipsForClubFamily._();

final class WatchActiveClubMembershipsForClubProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<ClubMembership>>,
          List<ClubMembership>,
          Stream<List<ClubMembership>>
        >
    with
        $FutureModifier<List<ClubMembership>>,
        $StreamProvider<List<ClubMembership>> {
  WatchActiveClubMembershipsForClubProvider._({
    required WatchActiveClubMembershipsForClubFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchActiveClubMembershipsForClubProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$watchActiveClubMembershipsForClubHash();

  @override
  String toString() {
    return r'watchActiveClubMembershipsForClubProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<ClubMembership>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<ClubMembership>> create(Ref ref) {
    final argument = this.argument as String;
    return watchActiveClubMembershipsForClub(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchActiveClubMembershipsForClubProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchActiveClubMembershipsForClubHash() =>
    r'8534f19fddfc838af6c8a7ebc872129abbc5c83a';

final class WatchActiveClubMembershipsForClubFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<ClubMembership>>, String> {
  WatchActiveClubMembershipsForClubFamily._()
    : super(
        retry: null,
        name: r'watchActiveClubMembershipsForClubProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchActiveClubMembershipsForClubProvider call(String clubId) =>
      WatchActiveClubMembershipsForClubProvider._(argument: clubId, from: this);

  @override
  String toString() => r'watchActiveClubMembershipsForClubProvider';
}

@ProviderFor(watchClubMembership)
final watchClubMembershipProvider = WatchClubMembershipFamily._();

final class WatchClubMembershipProvider
    extends
        $FunctionalProvider<
          AsyncValue<ClubMembership?>,
          ClubMembership?,
          Stream<ClubMembership?>
        >
    with $FutureModifier<ClubMembership?>, $StreamProvider<ClubMembership?> {
  WatchClubMembershipProvider._({
    required WatchClubMembershipFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'watchClubMembershipProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchClubMembershipHash();

  @override
  String toString() {
    return r'watchClubMembershipProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<ClubMembership?> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<ClubMembership?> create(Ref ref) {
    final argument = this.argument as (String, String);
    return watchClubMembership(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchClubMembershipProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchClubMembershipHash() =>
    r'4d727a070d21269f45abdb811b9365f3ad832637';

final class WatchClubMembershipFamily extends $Family
    with $FunctionalFamilyOverride<Stream<ClubMembership?>, (String, String)> {
  WatchClubMembershipFamily._()
    : super(
        retry: null,
        name: r'watchClubMembershipProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchClubMembershipProvider call(String clubId, String uid) =>
      WatchClubMembershipProvider._(argument: (clubId, uid), from: this);

  @override
  String toString() => r'watchClubMembershipProvider';
}

@ProviderFor(currentUserFollowedClubIds)
final currentUserFollowedClubIdsProvider =
    CurrentUserFollowedClubIdsProvider._();

final class CurrentUserFollowedClubIdsProvider
    extends
        $FunctionalProvider<
          AsyncValue<Set<String>>,
          AsyncValue<Set<String>>,
          AsyncValue<Set<String>>
        >
    with $Provider<AsyncValue<Set<String>>> {
  CurrentUserFollowedClubIdsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'currentUserFollowedClubIdsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$currentUserFollowedClubIdsHash();

  @$internal
  @override
  $ProviderElement<AsyncValue<Set<String>>> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  AsyncValue<Set<String>> create(Ref ref) {
    return currentUserFollowedClubIds(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<Set<String>> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AsyncValue<Set<String>>>(value),
    );
  }
}

String _$currentUserFollowedClubIdsHash() =>
    r'e5e4c6a9273db441397b74a35876969498099962';
